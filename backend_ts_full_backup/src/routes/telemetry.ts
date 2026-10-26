import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireDeviceKey } from '../middleware/auth';
import { getDb } from '../db';
import { AlertEngine } from '../alerts/engine';
import { DriveGuardWebSocketServer } from '../ws/server';
import { sendNotifications } from '../services/notifications';
import { TelemetryPayload } from '../alerts/types';

export const telemetrySchema = z.object({
  deviceId: z.string().min(1),
  mq3Raw: z.number(),
  mq3Status: z.enum(['NORMAL', 'ALERT', 'WARMING UP']),
  heartRaw: z.number(),
  heartStatus: z.enum(['LOW', 'NORMAL', 'HIGH']),
  flame: z.enum(['DETECTED', 'NOT DETECTED', 'WAITING']),
  smoke: z.enum(['DETECTED', 'NOT DETECTED', 'WAITING']),
  motion: z.enum(['DETECTED', 'NOT DETECTED', 'WAITING']),
  frequency: z.enum(['EMITTED', 'NOT EMITTED', 'WAITING']),
  accident: z.enum(['DETECTED', 'NOT DETECTED', 'WAITING']),
  gps: z.enum(['FIXED', 'NO FIX', 'WAITING']),
  lat: z.number(),
  lng: z.number(),
  speedKmph: z.number(),
  btConnected: z.boolean(),
  uptimeS: z.number()
});

export function createTelemetryRouter(alertEngine: AlertEngine, wsServer?: DriveGuardWebSocketServer) {
  const router = Router();

  // POST /api/telemetry - Ingest device telemetry
  router.post('/telemetry', requireDeviceKey, (req: Request, res: Response) => {
    const parseResult = telemetrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid telemetry payload',
        details: parseResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const ts = Date.now();
    const data: TelemetryPayload = {
      ...parseResult.data,
      ts
    };

    // Respond 204 immediately as ESP32 requires fast response
    res.status(204).end();

    // Async persist & alert processing
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO telemetry (
          device_id, ts, raw_json, mq3_raw, heart_raw, flame, smoke,
          motion, frequency, accident, gps, lat, lng, speed, bt_connected
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.deviceId,
        ts,
        JSON.stringify(data),
        data.mq3Raw,
        data.heartRaw,
        data.flame,
        data.smoke,
        data.motion,
        data.frequency,
        data.accident,
        data.gps,
        data.lat,
        data.lng,
        data.speedKmph,
        data.btConnected ? 1 : 0
      );

      // Broadcast telemetry to connected clients
      wsServer?.broadcastTelemetry(data);

      // Process alert engine
      const alerts = alertEngine.processTelemetry(data);
      if (alerts.length > 0) {
        const insertAlert = db.prepare(`
          INSERT INTO alerts (id, device_id, type, severity, message, ts, lat, lng, acknowledged)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        for (const alert of alerts) {
          insertAlert.run(
            alert.id,
            alert.deviceId,
            alert.type,
            alert.severity,
            alert.message,
            alert.ts,
            alert.lat,
            alert.lng
          );

          // Broadcast alert live via WS
          wsServer?.broadcastAlert(alert);

          // Dispatch Web Push and Telegram notifications
          sendNotifications(alert).catch(err => {
            console.error('Failed to dispatch alert notifications:', err);
          });
        }
      }
    } catch (err) {
      console.error('Error processing telemetry in background:', err);
    }
  });

  // GET /api/latest?deviceId= - Get latest reading
  router.get('/latest', requireAuth, (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string | undefined;
    const db = getDb();

    let row;
    if (deviceId) {
      row = db
        .prepare('SELECT raw_json, ts FROM telemetry WHERE device_id = ? ORDER BY ts DESC LIMIT 1')
        .get(deviceId) as { raw_json: string; ts: number } | undefined;
    } else {
      row = db
        .prepare('SELECT raw_json, ts FROM telemetry ORDER BY ts DESC LIMIT 1')
        .get() as { raw_json: string; ts: number } | undefined;
    }

    if (!row) {
      return res.status(404).json({ error: 'No telemetry data available yet' });
    }

    const parsed = JSON.parse(row.raw_json);
    return res.status(200).json(parsed);
  });

  return router;
}
