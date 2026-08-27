import { Router, type Request, type Response } from 'express';
import { getProgramStatus, invalidateProgramStatusCache, lastError } from '../services/programStatusService.js';

const router = Router();

// GET /api/program-status — returns latest weekly deck's Releases/Programs Summary
router.get('/program-status', async (_req: Request, res: Response) => {
  try {
    const data = await getProgramStatus();
    if (!data) {
      res.status(503).json({ error: 'Program status unavailable', detail: lastError });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('[programStatus route]', err);
    res.status(503).json({ error: String(err) });
  }
});

// POST /api/program-status/refresh — force cache invalidation
router.post('/program-status/refresh', (_req: Request, res: Response) => {
  invalidateProgramStatusCache();
  res.json({ ok: true });
});

export default router;
