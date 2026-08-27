import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  email: string;
  name: string;
  picture: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (process.env.SKIP_AUTH === 'true') {
    req.user = { email: 'dev@paloaltonetworks.com', name: 'Dev User', picture: '' };
    return next();
  }
  const token = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
