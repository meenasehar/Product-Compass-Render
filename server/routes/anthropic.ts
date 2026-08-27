import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();
router.use(requireAuth);

// POST /api/chat — proxies to Anthropic with server-side API key, streams back SSE
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.anthropicApiKey) {
    res.status(503).json({ error: 'Anthropic API key not configured on server' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-type', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (!upstream.body) { res.end(); return; }

    const reader = upstream.body.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(value);
      return pump();
    };
    await pump();
  } catch (err) {
    next(err);
  }
});

export default router;
