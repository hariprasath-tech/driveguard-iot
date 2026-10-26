import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/env';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.isAbsolute(config.DATABASE_PATH)
      ? config.DATABASE_PATH
      : path.resolve(process.cwd(), config.DATABASE_PATH);

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new Database(dbPath);
    // Enable WAL mode for high performance concurrency
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    initSchema(dbInstance);
    seedInitialData(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      raw_json TEXT NOT NULL,
      mq3_raw INTEGER NOT NULL,
      heart_raw INTEGER NOT NULL,
      flame TEXT NOT NULL,
      smoke TEXT NOT NULL,
      motion TEXT NOT NULL,
      frequency TEXT NOT NULL,
      accident TEXT NOT NULL,
      gps TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL NOT NULL,
      bt_connected INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_device_ts ON telemetry (device_id, ts);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      ts INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts (ts);
    CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts (device_id);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      keys_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function seedInitialData(db: Database.Database) {
  // Seed admin if no users exist
  const countUsers = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (countUsers.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(config.ADMIN_PASSWORD, salt);
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(id, config.ADMIN_EMAIL, hash, Date.now());
  }

  // Seed default settings
  const defaultSettings: Record<string, string> = {
    notify_telegram: 'true',
    notify_webpush: 'true',
    threshold_mq3: '2500',
    threshold_heart_low: '1000',
    threshold_heart_high: '3000',
    cooldown_seconds: '30',
    retention_days: String(config.RETENTION_DAYS)
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertSetting.run(key, val);
  }
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
