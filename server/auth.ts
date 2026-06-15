import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

const AUTH_USER = process.env.OBSERVATORY_USER || process.env.APP_USER || 'admin';
const AUTH_PASSWORD = process.env.OBSERVATORY_PASSWORD || process.env.APP_PASSWORD || 'changeme';

declare module 'express-session' {
  interface SessionData {
    authed?: boolean;
    username?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authed) return next();
  res.status(401).json({ error: 'unauthorized' });
}

export const authRouter = Router();

authRouter.get('/me', (req, res) => {
  if (req.session?.authed) {
    res.json({ authed: true, username: req.session.username });
  } else {
    res.json({ authed: false });
  }
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const userOk = username === AUTH_USER;
  const hashed = await bcrypt.hash(AUTH_PASSWORD, 8);
  const passOk = await bcrypt.compare(password, hashed);

  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  req.session.authed = true;
  req.session.username = username;
  res.json({ authed: true, username });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});
