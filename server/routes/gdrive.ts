import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as gdriveService from '../services/gdriveService.js';

const router = Router();
router.use(requireAuth);

// GET /api/gdrive/files?folderId=...
router.get('/gdrive/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
    const files = await gdriveService.listFiles(folderId);
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// GET /api/gdrive/files/:id
router.get('/gdrive/files/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await gdriveService.getFileMetadata(req.params['id'] as string);
    res.json(file);
  } catch (err) {
    next(err);
  }
});

export default router;
