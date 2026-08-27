import { Router, type Request, type Response } from 'express';
import { getFeatures } from '../services/jiraService.js';
import { generateCCDeck, type FeatureData } from '../services/slidesService.js';
import { config } from '../config.js';

const router = Router();

// Use AI to generate Problem / Solution / Benefits from whatever Jira data we have.
// Only called when customerProblem and businessValue are both sparse (< 40 chars).
async function aiEnrichFeature(f: FeatureData): Promise<{ problem: string; solution: string; benefits: string } | null> {
  if (!config.anthropicApiKey) return null;
  const context = [
    `Feature: ${f.title}`,
    f.pillar           ? `Product Pillar: ${f.pillar}`              : '',
    f.productComponent ? `Component: ${f.productComponent}`          : '',
    f.customerProblem  ? `Customer Problem: ${f.customerProblem}`   : '',
    f.businessValue    ? `Business Value: ${f.businessValue}`       : '',
    f.summary          ? `Description: ${f.summary.slice(0, 600)}`  : '',
  ].filter(Boolean).join('\n');
  try {
    const resp = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 450,
        messages: [{
          role: 'user',
          content: `You are writing content for a Prisma SD-WAN executive Concept Commit slide deck. Generate concise, executive-quality content for this SD-WAN feature.\n\n${context}\n\nReturn ONLY a JSON object (no markdown):\n{"problem":"2-3 sentences on the network/customer pain this solves","solution":"2-3 sentences on what the feature does and how it works","benefits":"2-3 sentences on business value and customer impact"}`,
        }],
      }),
    });
    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const raw = data.content?.find(c => c.type === 'text')?.text ?? '';
    const m = /\{[\s\S]*\}/.exec(raw);
    if (!m) return null;
    return JSON.parse(m[0]) as { problem: string; solution: string; benefits: string };
  } catch {
    return null;
  }
}

// POST /api/generate/ccdeck
// Body: { release: string }
// Returns: { url, title, featureCount }
router.post('/generate/ccdeck', async (req: Request, res: Response) => {
  const { release } = req.body as { release?: string };
  if (!release) {
    res.status(400).json({ error: 'release is required' });
    return;
  }

  // CC deck includes features tagged with the CC label for this release in Jira
  // e.g. release "7.0" → label "sdwan-7.0-cc"
  const ccLabel = `sdwan-${release}-cc`;
  const ecFeatures = await getFeatures(undefined, ccLabel);

  if (ecFeatures.length === 0) {
    res.status(404).json({ error: `No features with label "${ccLabel}" found in Jira` });
    return;
  }

  const featureData: FeatureData[] = ecFeatures.map(f => ({
    title:            String(f.title            ?? ''),
    jiraKey:          String(f.jiraKey          ?? ''),
    pmOwner:          String(f.pmOwner          ?? 'Unassigned'),
    pillar:           String(f.pillar           ?? 'Other'),
    productComponent: String(f.productComponent ?? ''),
    customerProblem:  String(f.customerProblem  ?? ''),
    summary:          String(f.summary          ?? ''),
    businessValue:    String(f.businessValue    ?? ''),
    releases:         (f.releases as string[])  ?? [],
    requirementsUrl:  f.requirementsUrl ? String(f.requirementsUrl) : undefined,
    priority:         typeof f.priority === 'number' ? f.priority : 3,
  }));

  // AI-enrich features where Jira custom fields are sparse.
  // Confluence PRD AI (in slidesService) will still override these if a PRD URL is present.
  const enriched = await Promise.all(featureData.map(async f => {
    const sparse = (f.customerProblem.trim().length < 40) && (f.businessValue.trim().length < 40);
    if (!sparse) return f;
    const ai = await aiEnrichFeature(f).catch(() => null);
    if (!ai) return f;
    return {
      ...f,
      customerProblem: ai.problem  || f.customerProblem,
      summary:         ai.solution || f.summary,
      businessValue:   ai.benefits || f.businessValue,
    };
  }));

  const result = await generateCCDeck(release, enriched);

  res.json({ url: result.url, title: result.title, featureCount: enriched.length });
});

export default router;
