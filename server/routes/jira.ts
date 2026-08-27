import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as jiraService from '../services/jiraService.js';

const router = Router();
router.use(requireAuth);

// Shared in-memory cache — all PMs see the same data until next sync
const cache: { data: Record<string, unknown>[]; lastSyncedAt: Date | null } = {
  data: [],
  lastSyncedAt: null,
};

const kanbanCache: { keys: string[]; fetchedAt: number } = { keys: [], fetchedAt: 0 };

async function syncFromJira(): Promise<void> {
  cache.data = await jiraService.getFeatures();
  cache.lastSyncedAt = new Date();
}

// GET /api/features?release=7.0
router.get('/features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (cache.data.length === 0) await syncFromJira();
    const release = typeof req.query.release === 'string' ? req.query.release : undefined;
    const features = release
      ? cache.data.filter(f => (f.releases as string[]).includes(release))
      : cache.data;
    if (cache.lastSyncedAt) res.setHeader('X-Last-Synced-At', cache.lastSyncedAt.toISOString());
    res.json(features);
  } catch (err) {
    next(err);
  }
});

// POST /api/features/sync — any PM can trigger a Jira re-sync for everyone
router.post('/features/sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await syncFromJira();
    // Also bust the kanban order cache so the updated board rank is fetched fresh
    kanbanCache.fetchedAt = 0;
    res.json({ ok: true, count: cache.data.length, lastSyncedAt: cache.lastSyncedAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/features — create a new Jira Feature issue
router.post('/features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await jiraService.createFeature(req.body as Parameters<typeof jiraService.createFeature>[0]);
    res.status(201).json(result);
    // Refresh cache in the background so the new feature appears immediately
    syncFromJira().catch(() => {});
  } catch (err) {
    next(err);
  }
});

// GET /api/features/backlog — PSDWPM issues with no fixVersion and no CC labels
router.get('/features/backlog', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const features = await jiraService.getBacklogFeatures();
    res.json(features);
  } catch (err) {
    next(err);
  }
});

// GET /api/features/components — list of PSDWPM components (must be before /:key)
router.get('/features/components', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const components = await jiraService.getComponents();
    res.json(components);
  } catch (err) {
    next(err);
  }
});

// GET /api/features/kanban-order — ranked issue keys from sdwan-7.1.1-cc board (must be before /:key)
router.get('/features/kanban-order', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const TTL_MS = 10 * 60 * 1000;
    if (kanbanCache.keys.length === 0 || Date.now() - kanbanCache.fetchedAt > TTL_MS) {
      kanbanCache.keys = await jiraService.getKanbanOrder();
      kanbanCache.fetchedAt = Date.now();
    }
    res.json(kanbanCache.keys);
  } catch (err) {
    next(err);
  }
});

// GET /api/features/:key  (e.g. PSDWPM-101)
router.get('/features/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feature = await jiraService.getFeature(req.params['key'] as string);
    res.json(feature);
  } catch (err) {
    next(err);
  }
});

// PUT /api/features/:key  — update Jira issue fields
router.put('/features/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await jiraService.updateFeature(req.params['key'] as string, req.body as Record<string, unknown> ?? {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/jira/issuetypes — list valid issue types for the configured project
router.get('/jira/issuetypes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await jiraService.getIssueTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
});

// GET /api/jira/fields — helper to discover custom field IDs
router.get('/jira/fields', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await jiraService.getJiraFields();
    res.json(fields);
  } catch (err) {
    next(err);
  }
});

export default router;
