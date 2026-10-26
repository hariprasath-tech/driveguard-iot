import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'viewer']).default('viewer')
});

// GET /api/users (admin only)
router.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC').all();
  return res.status(200).json(users);
});

// POST /api/users (admin only)
router.post('/users', requireAdmin, (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid user payload', issues: parsed.error.issues });
  }

  const { email, password, role } = parsed.data;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email, passwordHash, role, createdAt);

  return res.status(201).json({
    id,
    email,
    role,
    created_at: createdAt
  });
});

// DELETE /api/users/:id (admin only)
router.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    return res.status(400).json({ error: 'Cannot delete current logged-in user account' });
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ message: 'User deleted successfully' });
});

export default router;
