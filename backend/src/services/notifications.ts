import webpush from 'web-push';
import { getDb } from '../db';
import { config } from '../config/env';
import { Alert } from '../alerts/types';

// Configure Web Push VAPID
if (config.VAPID_PUBLIC && config.VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(config.VAPID_EMAIL, config.VAPID_PUBLIC, config.VAPID_PRIVATE);
  } catch (err) {
    console.warn('VAPID setup warning:', (err as Error).message);
  }
}

export async function sendNotifications(alert: Alert): Promise<void> {
  const db = getDb();

  // Read settings
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settingsMap = new Map<string, string>();
  for (const row of settingsRows) {
    settingsMap.set(row.key, row.value);
  }

  const notifyTelegram = settingsMap.get('notify_telegram') !== 'false';
  const notifyWebPush = settingsMap.get('notify_webpush') !== 'false';

  const promises: Promise<unknown>[] = [];

  // Telegram notification
  if (notifyTelegram && config.TELEGRAM_TOKEN && config.TELEGRAM_CHAT_ID) {
    promises.push(sendTelegramAlert(alert));
  }

  // Web Push notification
  if (notifyWebPush) {
    promises.push(sendWebPushAlert(alert));
  }

  // Execute in parallel without allowing one channel to block others
  await Promise.allSettled(promises);
}

async function sendTelegramAlert(alert: Alert): Promise<void> {
  const timeStr = new Date(alert.ts).toLocaleTimeString('en-US', { hour12: false });
  const mapLink = `https://maps.google.com/?q=${alert.lat},${alert.lng}`;
  const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';

  const message = `${icon} ${alert.type} DETECTED
Device: ${alert.deviceId}
Severity: ${alert.severity.toUpperCase()}
Time: ${timeStr}
Details: ${alert.message}
Location: ${mapLink}`;

  const url = `https://api.telegram.org/bot${config.TELEGRAM_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      console.warn('Telegram notification error status:', res.status);
    }
  } catch (err) {
    console.warn('Telegram send failed:', (err as Error).message);
  }
}

async function sendWebPushAlert(alert: Alert): Promise<void> {
  const db = getDb();
  const subscriptions = db.prepare('SELECT id, keys_json FROM push_subscriptions').all() as {
    id: string;
    keys_json: string;
  }[];

  const payload = JSON.stringify({
    title: `DriveGuard: ${alert.type} Alert`,
    body: alert.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      alertId: alert.id,
      deviceId: alert.deviceId,
      lat: alert.lat,
      lng: alert.lng,
      ts: alert.ts
    }
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      const pushSub = JSON.parse(sub.keys_json);
      await webpush.sendNotification(pushSub, payload);
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      // If subscription expired or invalid (410 Gone / 404 Not Found), delete it
      if (error.statusCode === 410 || error.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}
