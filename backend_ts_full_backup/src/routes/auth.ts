import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../db';
import { config } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }

  const { email, password } = result.data;
  const db = getDb();

  const user = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?').get(email) as {
    id: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'viewer';
  } | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({
    token,
    user: tokenPayload
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
});

export default router;
