import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const oAuth2Client = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri,
);

// Redirect browser to Google consent screen
router.get('/google', (_req: Request, res: Response) => {
  if (!config.googleClientId) {
    res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    return;
  }
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    hd: config.allowedDomain,
  });
  res.redirect(url);
});

// Google redirects back here with ?code=...
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Empty token payload');

    // Restrict to the allowed domain
    if (config.allowedDomain && payload.hd !== config.allowedDomain) {
      res.status(403).send('Access restricted to @' + config.allowedDomain + ' accounts');
      return;
    }

    const sessionToken = jwt.sign(
      { email: payload.email, name: payload.name, picture: payload.picture },
      config.jwtSecret,
      { expiresIn: '8h' },
    );

    const isProduction = config.nodeEnv === 'production';
    res.cookie('session', sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000,
    });

    // Redirect back to the SPA
    res.redirect('/');
  } catch (err) {
    console.error('[auth/callback]', err);
    res.status(401).send('Authentication failed');
  }
});

// Return current user from JWT cookie
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json(req.user);
});

// Clear session cookie
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

export default router;
