import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();

// GET /api/settings (admin only)
router.get('/settings', requireAdmin, (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return res.status(200).json(settings);
});

// PUT /api/settings (admin only)
router.put('/settings', requireAdmin, (req: Request, res: Response) => {
  if (typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Body must be an object of key-value pairs' });
  }

  const db = getDb();
  const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const updates = req.body as Record<string, unknown>;
  db.transaction(() => {
    for (const [key, val] of Object.entries(updates)) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        updateStmt.run(key, String(val));
      }
    }
  })();

  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const updatedSettings: Record<string, string> = {};
  for (const r of rows) {
    updatedSettings[r.key] = r.value;
  }

  return res.status(200).json(updatedSettings);
});

export default router;
