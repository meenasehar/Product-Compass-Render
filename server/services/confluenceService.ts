import axios from 'axios';
import { config } from '../config.js';

// ── PRD content extraction ────────────────────────────────────────────────

export interface PRDContent {
  problemStatement: string;
  solution:         string;
  benefits:         string;
}

function extractPageId(url: string): string | null {
  const m1 = /[?&]pageId=(\d+)/i.exec(url);
  if (m1) return m1[1];
  const m2 = /\/pages\/(\d+)\//i.exec(url);
  if (m2) return m2[1];
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Strip inner tags from heading text so we can match against clean text
function cleanHeadings(html: string): string {
  return html.replace(/(<h[1-6][^>]*>)([\s\S]*?)(<\/h[1-6]>)/gi, (_, open, content, close) =>
    open + content.replace(/<[^>]+>/g, '').replace(/\xa0/g, ' ').trim() + close
  );
}

function extractSection(html: string, terms: string[]): string {
  const cleaned = cleanHeadings(html);
  for (const term of terms) {
    const p1 = new RegExp(`<h[1-6][^>]*>[^<]*${term}[^<]*</h[1-6]>([\\s\\S]*?)(?=<h[1-6]|$)`, 'i');
    const m1 = p1.exec(cleaned);
    const text1 = m1?.[1] ? stripHtml(m1[1]).replace(/\s+/g, ' ').trim() : '';
    // Require at least 60 chars of real content — skip skeleton sections
    if (text1.length >= 60) return text1.slice(0, 600);
  }
  return '';
}

// Grab the first N substantial paragraphs from the full page — used as fallback
function extractLeadParagraphs(html: string, minLen = 80, take = 3, maxOut = 500): string {
  const paras = html
    .replace(/<\/?(ul|ol|table|tr|thead|tbody)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\xa0/g, ' ')
    .split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= minLen && !/^(important note|note:|warning:|tip:)/i.test(s));
  return paras.slice(0, take).join(' ').slice(0, maxOut).trim();
}

async function summarizePRDWithAI(html: string, featureTitle: string): Promise<PRDContent | null> {
  if (!config.anthropicApiKey) return null;
  const text = stripHtml(html).slice(0, 6000);
  if (text.length < 50) return null;
  try {
    const resp = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Summarize this product PRD for an executive slide deck. Feature: "${featureTitle}"\n\nPRD:\n${text}\n\nReturn ONLY a JSON object:\n{"problemStatement":"2-3 sentences on the customer problem","solution":"2-3 sentences on the solution/feature","benefits":"2-3 sentences on business value and benefits"}`,
        }],
      }),
    });
    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const raw = data.content?.find(c => c.type === 'text')?.text ?? '';
    const m = /\{[\s\S]*\}/.exec(raw);
    if (!m) return null;
    return JSON.parse(m[0]) as PRDContent;
  } catch {
    return null;
  }
}

export async function fetchPRDContent(url: string): Promise<PRDContent | null> {
  if (!url || !config.confluencePat) return null;
  const pageId = extractPageId(url);
  if (!pageId) return null;
  try {
    const res = await confluence.get(`/content/${pageId}`, {
      params: { expand: 'body.storage' },
      timeout: 5000,
    });
    const data = res.data as { title?: string; body?: { storage?: { value?: string } } };
    const html: string = data.body?.storage?.value ?? '';
    if (!html) return null;
    // AI summarization is more reliable than regex for varied PRD structures
    const aiSummary = await summarizePRDWithAI(html, data.title ?? '');
    if (aiSummary?.problemStatement && aiSummary?.solution) return aiSummary;

    // Regex section extraction — works well for standard PRD headings
    const ps  = extractSection(html, ['problem statement', 'problem', 'background', 'overview', 'context', 'introduction', 'motivation']);
    const sol = extractSection(html, ['solution', 'approach', 'feature description', 'description', 'design', 'architecture', 'requirement', 'specification', 'performance', 'scale']);
    const ben = extractSection(html, ['benefit', 'business value', 'value proposition', 'customer value', 'impact', 'objective', 'goal', 'performance', 'scale']);

    // Always compute a lead extract — used as fallback for any empty field
    const lead = extractLeadParagraphs(html);

    return {
      problemStatement: ps || sol || lead,
      solution:         sol || lead,
      benefits:         ben || lead,
    };
  } catch {
    return null;
  }
}

const confluence = axios.create({
  baseURL: `${config.confluenceBaseUrl}/rest/api`,
  headers: {
    Authorization: `Bearer ${config.confluencePat}`,
    'Content-Type': 'application/json',
  },
});

export async function getPage(pageId: string): Promise<Record<string, unknown>> {
  const res = await confluence.get(`/content/${pageId}`, {
    params: { expand: 'body.storage,version,space,ancestors' },
  });
  const page = res.data as Record<string, unknown>;
  const body = page.body as { storage?: { value?: string } } | undefined;
  return {
    id: page.id,
    title: page.title,
    spaceKey: (page.space as { key?: string } | undefined)?.key,
    version: (page.version as { number?: number } | undefined)?.number,
    bodyHtml: body?.storage?.value ?? '',
    webUrl: `${config.confluenceBaseUrl}/pages/viewpage.action?pageId=${page.id}`,
  };
}

// Returns the first meaningful image URL from a PRD page (Confluence DC).
// Strategy 1: parse <ri:attachment> tags from the already-fetched HTML storage format —
//   these are images actually embedded in the PRD content (most reliable).
// Strategy 2: fall back to the attachment listing API.
export async function fetchFirstImageUrl(prdUrl: string): Promise<string | null> {
  if (!prdUrl || !config.confluencePat) return null;
  const pageId = extractPageId(prdUrl);
  if (!pageId) return null;

  const skipTerms = ['icon', 'logo', 'avatar', 'thumbnail', 'check', 'bullet', 'arrow', 'badge'];
  function isUsableImage(name: string): boolean {
    const lower = name.toLowerCase();
    return /\.(png|jpg|jpeg|gif)$/.test(lower) && !skipTerms.some(t => lower.includes(t));
  }

  // Strategy 1: parse HTML storage format for embedded images
  try {
    const res = await confluence.get(`/content/${pageId}`, {
      params: { expand: 'body.storage' },
      timeout: 5000,
    });
    const html: string = (res.data as { body?: { storage?: { value?: string } } }).body?.storage?.value ?? '';
    const imageRegex = /<ri:attachment[^>]*ri:filename="([^"]+)"[^>]*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = imageRegex.exec(html)) !== null) {
      const filename = m[1];
      if (isUsableImage(filename)) {
        const url = `${config.confluenceBaseUrl}/download/attachments/${pageId}/${encodeURIComponent(filename)}`;
        console.log(`[confluence] found embedded image for page ${pageId}: ${filename}`);
        return url;
      }
    }
    console.log(`[confluence] no embedded images found in HTML for page ${pageId}, trying attachment API`);
  } catch (e) {
    console.warn(`[confluence] HTML parse failed for page ${pageId}:`, e);
  }

  // Strategy 2: attachment listing API fallback
  try {
    const res = await confluence.get(`/content/${pageId}/child/attachment`, {
      params: { limit: 30, expand: 'version' },
      timeout: 6000,
    });
    const results = (res.data as { results?: Array<{ title?: string; _links?: { download?: string } }> }).results ?? [];
    const imageFile = results.find(a => isUsableImage(a.title ?? ''));
    if (!imageFile?._links?.download) return null;
    const dl = imageFile._links.download;
    return dl.startsWith('http') ? dl : `${config.confluenceBaseUrl}${dl}`;
  } catch {
    return null;
  }
}

// Fetch a Confluence attachment as a buffer (for the server-side image proxy).
export async function fetchImageBuffer(
  pageId: string,
  filename: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!config.confluencePat) return null;
  try {
    const res = await confluence.get(
      `${config.confluenceBaseUrl}/download/attachments/${pageId}/${encodeURIComponent(filename)}`,
      { responseType: 'arraybuffer', timeout: 10000 },
    );
    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      contentType: (res.headers['content-type'] as string | undefined) ?? 'image/png',
    };
  } catch {
    return null;
  }
}

export async function searchPages(query: string, spaceKey?: string): Promise<Record<string, unknown>[]> {
  const cql = spaceKey
    ? `space = "${spaceKey}" AND text ~ "${query}" ORDER BY lastModified DESC`
    : `text ~ "${query}" ORDER BY lastModified DESC`;

  const res = await confluence.get('/content/search', {
    params: { cql, limit: 10, expand: 'space' },
  });
  const results = (res.data as { results?: Record<string, unknown>[] }).results ?? [];
  return results.map(p => ({
    id: p.id,
    title: p.title,
    spaceKey: (p.space as { key?: string } | undefined)?.key,
    webUrl: `${config.confluenceBaseUrl}/pages/viewpage.action?pageId=${p.id}`,
  }));
}
