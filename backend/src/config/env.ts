import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'driveguard_default_jwt_secret_9988_replace_me',
  DEVICE_API_KEY: process.env.DEVICE_API_KEY || 'dg_device_key_secret_12345',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@driveguard.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePass123!',
  VAPID_PUBLIC: process.env.VAPID_PUBLIC || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjDCWJ69WQRmg-0pnnOmNM1W2E2KM',
  VAPID_PRIVATE: process.env.VAPID_PRIVATE || 'UUx1l9pMvV5kQJ6v8W1tXQ2eY7Z8uI9oP0aB1cDefGh',
  VAPID_EMAIL: process.env.VAPID_EMAIL || 'mailto:admin@driveguard.local',
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim()),
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30', 10),
  DATABASE_PATH: process.env.DATABASE_PATH || './driveguard.db'
};
