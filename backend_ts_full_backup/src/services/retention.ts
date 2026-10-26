import { getDb } from '../db';
import { config } from '../config/env';

export function runRetentionCleanup(): number {
  try {
    const db = getDb();
    const days = config.RETENTION_DAYS;
    const cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;

    const result = db.prepare('DELETE FROM telemetry WHERE ts < ?').run(cutoffTs);
    return result.changes;
  } catch (err) {
    console.error('Data retention cleanup failed:', err);
    return 0;
  }
}

export function startRetentionScheduler(intervalHours = 24): NodeJS.Timeout {
  // Run on startup
  runRetentionCleanup();
  // Schedule recurring cleanup
  return setInterval(() => {
    runRetentionCleanup();
  }, intervalHours * 60 * 60 * 1000);
}
