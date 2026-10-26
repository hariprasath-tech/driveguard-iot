import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';
import { config } from '../config/env';

const router = Router();

// GET /api/push/key - Public VAPID key
router.get('/push/key', requireAuth, (_req: Request, res: Response) => {
  return res.status(200).json({
    publicKey: config.VAPID_PUBLIC
  });
});

// POST /api/push/subscribe - Store Web Push subscription
router.post('/push/subscribe', requireAuth, (req: Request, res: Response) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Valid PushSubscription required' });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const userId = req.user?.id || 'anonymous';
  const keysJson = JSON.stringify(subscription);
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, keys_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET keys_json = excluded.keys_json, user_id = excluded.user_id
    `).run(id, userId, subscription.endpoint, keysJson, now);

    return res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (err) {
    console.error('Failed to save push subscription:', err);
    return res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

export default router;
