import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT ts FROM telemetry ORDER BY ts DESC LIMIT 1').get() as
      | { ts: number }
      | undefined;

    const lastPacketAgeMs = row ? Date.now() - row.ts : null;

    return res.status(200).json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      db: true,
      lastPacketAgeMs,
      timestamp: Date.now()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      db: false,
      error: (err as Error).message
    });
  }
});

export default router;
