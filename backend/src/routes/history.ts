import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();

// GET /api/history?deviceId&from&to&limit&bucket
router.get('/history', requireAuth, (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  const from = req.query.from ? parseInt(req.query.from as string, 10) : 0;
  const to = req.query.to ? parseInt(req.query.to as string, 10) : Date.now();
  const limit = Math.min(parseInt((req.query.limit as string) || '500', 10), 2000);
  const bucketSec = req.query.bucket ? parseInt(req.query.bucket as string, 10) : 0;

  const db = getDb();

  let query = 'SELECT raw_json, ts FROM telemetry WHERE ts >= ? AND ts <= ?';
  const params: (string | number)[] = [from, to];

  if (deviceId) {
    query += ' AND device_id = ?';
    params.push(deviceId);
  }

  query += ' ORDER BY ts ASC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params) as { raw_json: string; ts: number }[];

  const rawData = rows.map(r => {
    try {
      return JSON.parse(r.raw_json);
    } catch {
      return null;
    }
  }).filter(Boolean);

  // If downsampling bucket requested
  if (bucketSec > 0 && rawData.length > 0) {
    const bucketMs = bucketSec * 1000;
    const bucketed: Record<number, typeof rawData> = {};

    for (const item of rawData) {
      const bucketKey = Math.floor(item.ts / bucketMs) * bucketMs;
      if (!bucketed[bucketKey]) {
        bucketed[bucketKey] = [];
      }
      bucketed[bucketKey].push(item);
    }

    const downsampled = Object.entries(bucketed).map(([bTs, items]) => {
      const avgMq3 = Math.round(items.reduce((acc, i) => acc + (i.mq3Raw || 0), 0) / items.length);
      const avgHeart = Math.round(items.reduce((acc, i) => acc + (i.heartRaw || 0), 0) / items.length);
      const lastItem = items[items.length - 1];

      return {
        ...lastItem,
        ts: parseInt(bTs, 10),
        mq3Raw: avgMq3,
        heartRaw: avgHeart,
        isDownsampled: true,
        sampleCount: items.length
      };
    });

    return res.status(200).json(downsampled);
  }

  return res.status(200).json(rawData);
});

export default router;
