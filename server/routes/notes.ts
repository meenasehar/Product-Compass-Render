import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Shared in-memory store: jiraKey → free-form note text
const notes = new Map<string, string>();

// GET /api/notes — returns { [jiraKey]: note }
router.get('/notes', (_req: Request, res: Response) => {
  res.json(Object.fromEntries(notes));
});

// PUT /api/notes/:key — upserts note for a feature
router.put('/notes/:key', (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params['key'] as string;
    const { note } = req.body as { note?: string };
    if (note === undefined) {
      res.status(400).json({ error: 'Missing note field' });
      return;
    }
    if (note.trim() === '') {
      notes.delete(key);
    } else {
      notes.set(key, note.trim());
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
