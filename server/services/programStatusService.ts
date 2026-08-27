import { google } from 'googleapis';
import type { slides_v1 } from 'googleapis';
import { config } from '../config.js';

process.env.GOOGLE_CLOUD_QUOTA_PROJECT = config.googleQuotaProject || 'google-mpf-pm05ow6g0l2l';

const PROGRAM_FOLDER_ID = '1Xo6zGxe1c92dRyfXD5R_stSQSQFsJdoK';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ── Types ──────────────────────────────────────────────────────────────────
export interface ProgramItem {
  program: string;
  notes:   string;
  atRisk:  boolean;
}

export interface ProgramStatus {
  deckName:  string;
  deckUrl:   string;
  fetchedAt: string;
  items:     ProgramItem[];
}

// ── Cache ─────────────────────────────────────────────────────────────────
let cache: { data: ProgramStatus; ts: number } | null = null;

// ── Auth (supports both ADC and service account) ───────────────────────────
function getAuth() {
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/presentations.readonly',
  ];
  if (config.googleServiceAccountJson) {
    const credentials = JSON.parse(config.googleServiceAccountJson);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }
  return new google.auth.GoogleAuth({ scopes });
}

// ── Text extraction ────────────────────────────────────────────────────────
function extractSlideText(slide: slides_v1.Schema$Page): string {
  const lines: string[] = [];
  for (const el of slide.pageElements ?? []) {
    // Shape text
    const shapeText = el.shape?.text?.textElements;
    if (shapeText) {
      const t = shapeText.map(te => te.textRun?.content ?? '').join('').trim();
      if (t) lines.push(t);
    }
    // Table cells — normalize intra-cell newlines so they don't split rows
    for (const row of el.table?.tableRows ?? []) {
      const cells = (row.tableCells ?? [])
        .map(cell =>
          (cell.text?.textElements ?? [])
            .map(te => te.textRun?.content ?? '')
            .join('')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        )
        .filter(Boolean);
      if (cells.length) lines.push(cells.join(' | '));
    }
  }
  return lines.join('\n');
}

function isReleasesSummarySlide(slide: slides_v1.Schema$Page): boolean {
  const allText = (slide.pageElements ?? [])
    .flatMap(el => el.shape?.text?.textElements ?? [])
    .map(te => te.textRun?.content ?? '')
    .join('')
    .toLowerCase();
  return allText.includes('releases/programs summary') ||
         allText.includes('release/programs summary');
}

// ── Fallback parser (no AI needed) ────────────────────────────────────────
const SKIP_PATTERNS  = /^(programs\s*\/|upcoming programs|other critical|releases\/programs|release\/programs|notes\s*\/|target customer|upcoming milestone)/i;
const AT_RISK_WORDS  = /\b(risk|delay|delayed|blocked|conditional|not yet|under review|in progress|evaluation|pending|scheduled for|needed|preview meeting|review complete)\b/i;
const ON_TRACK_WORDS = /\b(complete|completed|approved|active|delivered|enabled|done|launched|kick off.*complete)\b/i;

// Columns that are NOT the Notes column: short GA values, statuses, target customer cells
// Long strings (> 30 chars) are always treated as potential notes content.
function isNonNotes(s: string): boolean {
  if (s.length > 30) return false;
  return /^(hardware fcs|software fcs(\+\d)?|ec deck|ec slides|beta$|validation|delivered|ga$|tbd|all|npi-it|manufacturing ops|sec arch|tracked via|upcoming milestone|target customer|concept commit|in dev|indev)/i.test(s);
}

function deriveAtRisk(notes: string): boolean {
  if (ON_TRACK_WORDS.test(notes)) return false;
  return AT_RISK_WORDS.test(notes);
}

function parseRawText(rawText: string): ProgramItem[] {
  const items: ProgramItem[] = [];
  for (const line of rawText.split('\n')) {
    if (!line.includes('|')) continue;
    if (SKIP_PATTERNS.test(line.trim())) continue;

    const cols = line.split('|').map(c => c.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')).filter(Boolean);
    if (cols.length < 2) continue;

    const program = cols[0];
    if (!program || program.length < 3 || isNonNotes(program)) continue;

    // Search from the RIGHT — Notes is the rightmost meaningful column.
    // Skip GA/status/short values that aren't the notes.
    let notes = '';
    for (let i = cols.length - 1; i >= 1; i--) {
      const c = cols[i];
      if (c.length >= 15 && !isNonNotes(c)) {
        notes = c;
        break;
      }
    }

    if (!notes) continue; // skip rows with no extractable notes

    items.push({ program, notes, atRisk: deriveAtRisk(notes) });
  }
  return items;
}

// ── AI summarization ───────────────────────────────────────────────────────
async function summarizeWithAI(rawText: string): Promise<ProgramItem[]> {
  if (!config.anthropicApiKey) return parseRawText(rawText);
  try {
    const resp = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: `Extract program status from this Prisma SD-WAN weekly slide. The table columns are: Program | Release | GA | Status | Target Customer | Milestone | Notes.\n\nRaw text:\n${rawText}\n\nReturn ONLY a JSON array (no markdown): [{"program":"program name","notes":"1-2 sentence summary of the Notes column only — on-track status, risks, and mitigation. Do NOT include GA values like Hardware FCS / Software FCS / EC deck.","atRisk":true|false}]\n\nSet atRisk=true for risks/blockers/open issues. Skip header rows and rows with no meaningful notes.`,
        }],
      }),
    });
    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const raw = data.content?.find(c => c.type === 'text')?.text ?? '';
    const m = /\[[\s\S]*\]/.exec(raw);
    if (!m) return parseRawText(rawText);
    const parsed = JSON.parse(m[0]) as ProgramItem[];
    return parsed.length > 0 ? parsed : parseRawText(rawText);
  } catch {
    return parseRawText(rawText);
  }
}

// ── Main export ────────────────────────────────────────────────────────────
export let lastError: string | null = null;

export async function getProgramStatus(): Promise<ProgramStatus | null> {
  if (cache && cache.data.items.length > 0 && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  try {
    const auth   = getAuth();
    const drive  = google.drive({ version: 'v3', auth });
    const slides = google.slides({ version: 'v1', auth });

    // 1. Find the latest month subfolder
    const foldersRes = await drive.files.list({
      q: `'${PROGRAM_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      orderBy: 'modifiedTime desc',
      pageSize: 3,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id,name)',
    });
    const latestFolder = foldersRes.data.files?.[0];
    if (!latestFolder?.id) return null;

    // 2. Find the most recently modified presentation in that folder
    const presRes = await drive.files.list({
      q: `'${latestFolder.id}' in parents and mimeType = 'application/vnd.google-apps.presentation' and trashed = false`,
      orderBy: 'modifiedTime desc',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id,name,webViewLink)',
    });
    const latestDeck = presRes.data.files?.[0];
    if (!latestDeck?.id) return null;

    // 3. Get the presentation slides
    const pres = await slides.presentations.get({
      presentationId: latestDeck.id,
    });

    // 4. Find last "Releases/Programs Summary" slide
    let targetSlide: slides_v1.Schema$Page | null = null;
    for (const slide of pres.data.slides ?? []) {
      if (isReleasesSummarySlide(slide)) targetSlide = slide;
    }
    if (!targetSlide) return null;

    // 5. Extract and summarize
    const rawText = extractSlideText(targetSlide);
    const items   = await summarizeWithAI(rawText);

    const result: ProgramStatus = {
      deckName:  latestDeck.name ?? '',
      deckUrl:   latestDeck.webViewLink ?? '',
      fetchedAt: new Date().toISOString(),
      items,
    };

    cache = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    lastError = String(err);
    console.error('[programStatus] error:', err);
    return null;
  }
}

export function invalidateProgramStatusCache(): void {
  cache = null;
}
