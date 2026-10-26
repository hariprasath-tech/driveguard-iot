import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';
import { DriveGuardWebSocketServer } from '../ws/server';

export function createAlertsRouter(wsServer?: DriveGuardWebSocketServer) {
  const router = Router();

  // GET /api/alerts
  router.get('/alerts', requireAuth, (req: Request, res: Response) => {
    const status = req.query.status as string | undefined; // 'active' | 'acknowledged' | 'all'
    const severity = req.query.severity as string | undefined;
    const type = req.query.type as string | undefined;
    const from = req.query.from ? parseInt(req.query.from as string, 10) : 0;
    const to = req.query.to ? parseInt(req.query.to as string, 10) : Date.now();

    const db = getDb();
    let query = 'SELECT * FROM alerts WHERE ts >= ? AND ts <= ?';
    const params: (string | number)[] = [from, to];

    if (status === 'active') {
      query += ' AND acknowledged = 0';
    } else if (status === 'acknowledged') {
      query += ' AND acknowledged = 1';
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY ts DESC LIMIT 500';

    const rows = db.prepare(query).all(...params) as {
      id: string;
      device_id: string;
      type: string;
      severity: string;
      message: string;
      ts: number;
      lat: number;
      lng: number;
      acknowledged: number;
      acknowledged_by: string | null;
      acknowledged_at: number | null;
    }[];

    const alerts = rows.map(r => ({
      id: r.id,
      deviceId: r.device_id,
      type: r.type,
      severity: r.severity,
      message: r.message,
      ts: r.ts,
      lat: r.lat,
      lng: r.lng,
      acknowledged: Boolean(r.acknowledged),
      acknowledgedBy: r.acknowledged_by,
      acknowledgedAt: r.acknowledged_at
    }));

    return res.status(200).json(alerts);
  });

  // POST /api/alerts/:id/ack - Acknowledge alert
  router.post('/alerts/:id/ack', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDb();
    const now = Date.now();
    const userEmail = req.user?.email || 'user';

    const result = db.prepare(`
      UPDATE alerts
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
      WHERE id = ?
    `).run(userEmail, now, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as {
      id: string;
      device_id: string;
      type: string;
      severity: string;
      message: string;
      ts: number;
      lat: number;
      lng: number;
      acknowledged: number;
      acknowledged_by: string | null;
      acknowledged_at: number | null;
    };

    const formatted = {
      id: updated.id,
      deviceId: updated.device_id,
      type: updated.type,
      severity: updated.severity,
      message: updated.message,
      ts: updated.ts,
      lat: updated.lat,
      lng: updated.lng,
      acknowledged: true,
      acknowledgedBy: updated.acknowledged_by,
      acknowledgedAt: updated.acknowledged_at
    };

    // Broadcast acknowledgement to keep all dashboards in sync
    wsServer?.broadcast('alert', formatted);

    return res.status(200).json(formatted);
  });

  // GET /api/alerts/export.csv
  router.get('/alerts/export.csv', requireAuth, (_req: Request, res: Response) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM alerts ORDER BY ts DESC').all() as {
      id: string;
      device_id: string;
      type: string;
      severity: string;
      message: string;
      ts: number;
      lat: number;
      lng: number;
      acknowledged: number;
      acknowledged_by: string | null;
      acknowledged_at: number | null;
    }[];

    const headers = [
      'ID',
      'Device ID',
      'Type',
      'Severity',
      'Message',
      'Timestamp',
      'ISO Date',
      'Latitude',
      'Longitude',
      'Acknowledged',
      'Acknowledged By',
      'Acknowledged At'
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = [
        `"${r.id}"`,
        `"${r.device_id}"`,
        `"${r.type}"`,
        `"${r.severity}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`,
        r.ts,
        `"${new Date(r.ts).toISOString()}"`,
        r.lat,
        r.lng,
        r.acknowledged ? 'YES' : 'NO',
        `"${r.acknowledged_by || ''}"`,
        r.acknowledged_at ? `"${new Date(r.acknowledged_at).toISOString()}"` : '""'
      ].join(',');
      csvLines.push(line);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="driveguard-alerts.csv"');
    return res.status(200).send(csvLines.join('\n'));
  });

  return router;
}
