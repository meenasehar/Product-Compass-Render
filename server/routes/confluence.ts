import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as confluenceService from '../services/confluenceService.js';

const router = Router();

// ── Public image proxy — no auth required ─────────────────────────────────────
// The Google Slides API fetches createImage URLs without user credentials.
// This endpoint proxies Confluence attachment images using the server-side PAT,
// keeping internal content within PANW infrastructure.
// Security: restricted to numeric pageIds and image file extensions only.
router.get('/proxy/confluence-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pageId   = typeof req.query['pageId']   === 'string' ? req.query['pageId']   : '';
    const filename = typeof req.query['filename'] === 'string' ? req.query['filename'] : '';
    if (
      !/^\d+$/.test(pageId) ||
      !filename ||
      filename.includes('/') ||
      filename.includes('..') ||
      !/\.(png|jpg|jpeg|gif|webp)$/i.test(filename)
    ) {
      res.status(400).json({ error: 'invalid params' });
      return;
    }
    const result = await confluenceService.fetchImageBuffer(pageId, filename);
    if (!result) {
      res.status(404).json({ error: 'image not found' });
      return;
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

// GET /api/confluence/pages/:id
router.get('/confluence/pages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = await confluenceService.getPage(req.params['id'] as string);
    res.json(page);
  } catch (err) {
    next(err);
  }
});

// GET /api/confluence/search?q=...&space=PSDWPM
router.get('/confluence/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const space = typeof req.query.space === 'string' ? req.query.space : undefined;
    if (!q) { res.json([]); return; }
    const results = await confluenceService.searchPages(q, space);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
