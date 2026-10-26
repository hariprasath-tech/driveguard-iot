# DriveGuard: BACKEND BUILD PROMPT

Paste this whole file into your AI coding tool (Antigravity / Claude Code / Cursor).

---

You are a senior backend engineer. Build the complete backend for **DriveGuard**, a real-time vehicle safety monitoring platform, in the folder `backend/`.

## Absolute rule
No mock or simulated sensor data in the running system. Data enters only through `POST /api/telemetry` from the ESP32 gateway. (A separate `scripts/simulate.js` for testing is allowed, but it must never run by default.)

## Stack
Node.js 20, Express, TypeScript, `ws` (WebSocket), `better-sqlite3`, `zod`, `jsonwebtoken`, `bcrypt`, `helmet`, `express-rate-limit`, `cors`, `web-push`, `node-telegram-bot-api` (or plain fetch to the Telegram API), `swagger-ui-express`, `jest` + `supertest`, `pino` logging.

## Device telemetry
The ESP32 #1 gateway sends every 1 second:

`POST /api/telemetry` with header `x-device-key: <DEVICE_API_KEY>`
```json
{
 "deviceId":"CAR-001",
 "mq3Raw":1200,"mq3Status":"NORMAL|ALERT|WARMING UP",
 "heartRaw":2048,"heartStatus":"LOW|NORMAL|HIGH",
 "flame":"DETECTED|NOT DETECTED|WAITING",
 "smoke":"DETECTED|NOT DETECTED|WAITING",
 "motion":"DETECTED|NOT DETECTED|WAITING",
 "frequency":"EMITTED|NOT EMITTED|WAITING",
 "accident":"DETECTED|NOT DETECTED|WAITING",
 "gps":"FIXED|NO FIX|WAITING",
 "lat":0.0,"lng":0.0,"speedKmph":0.0,
 "btConnected":true,"uptimeS":0
}
```
Validate with zod. Reject unknown enums with 400. Add server timestamp `ts`. Respond `204` quickly (the ESP32 has a short timeout).

## Endpoints
| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/telemetry` | device key | Ingest reading |
| POST | `/api/auth/login` | none | Returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/latest?deviceId=` | JWT | Latest reading |
| GET | `/api/history?deviceId&from&to&limit&bucket` | JWT | Past readings, optional downsampling |
| GET | `/api/alerts?status&severity&type&from&to` | JWT | Alert list |
| POST | `/api/alerts/:id/ack` | JWT | Acknowledge |
| GET | `/api/alerts/export.csv` | JWT | CSV export |
| GET/PUT | `/api/settings` | JWT admin | Thresholds and notification toggles |
| GET/POST/DELETE | `/api/users` | JWT admin | User management |
| GET | `/api/push/key` | JWT | VAPID public key |
| POST | `/api/push/subscribe` | JWT | Save push subscription |
| GET | `/api/health` | none | Uptime, DB ok, last packet age |
| WS | `/ws?token=` | JWT | Live stream |

WebSocket events: `{type:"telemetry",data}`, `{type:"alert",data}`, `{type:"device",data:{online:boolean}}`.

## Database (SQLite, migrations on boot)
- `users(id, email, password_hash, role, created_at)`
- `telemetry(id, device_id, ts, raw_json, mq3_raw, heart_raw, flame, smoke, motion, frequency, accident, gps, lat, lng, speed, bt_connected)` with an index on `(device_id, ts)`
- `alerts(id, device_id, type, severity, message, ts, lat, lng, acknowledged, acknowledged_by, acknowledged_at)`
- `push_subscriptions(id, user_id, endpoint, keys_json)`
- `settings(key, value)`
- Retention job: delete telemetry older than 30 days (configurable). Seed one admin from `.env` on first run only.

## Alert engine (separate module, unit tested)
Detect rising edges between the previous and current reading per device:

| Type | Condition | Severity |
|---|---|---|
| FLAME | flame becomes DETECTED | critical |
| SMOKE | smoke becomes DETECTED | critical |
| ACCIDENT | accident becomes DETECTED | critical |
| ALCOHOL | mq3Status becomes ALERT | critical |
| HEART | heartStatus becomes LOW or HIGH | warning |
| DEVICE_OFFLINE | no packet for 10 s | warning |
| DEVICE_ONLINE | packet after offline | info |

Rules: 30 s cooldown per (device, type); store the alert with the last known GPS position; ignore `WAITING` values; do not alert on the first packet after a server restart unless the value is critical.

## Notifications
On every new alert: broadcast over WebSocket, send Web Push to all subscriptions (remove expired ones), and send a Telegram message (`🔥 FLAME DETECTED, CAR-001, <time>, https://maps.google.com/?q=lat,lng`). Twilio SMS is optional and off by default. Each channel can be toggled in settings, and a failure in one channel must not block the others.

## Security
- Secrets only from `.env` (provide `.env.example`): `PORT, JWT_SECRET, DEVICE_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, VAPID_PUBLIC, VAPID_PRIVATE, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, CORS_ORIGINS, RETENTION_DAYS`.
- helmet, strict CORS allow-list, rate limiting (stricter on login), bcrypt hashes, JWT expiry, constant-time compare for the device key, request size limit, input validation everywhere.
- Never log secrets or full tokens.

## Quality
- Swagger/OpenAPI at `/docs`.
- Jest tests: alert engine (edges, cooldown, offline), telemetry validation, auth.
- `scripts/simulate.js` (manual use only) to post test packets.
- Dockerfile and `docker-compose.yml` (backend + frontend, volume for the SQLite file).
- Graceful shutdown, structured logs, `/api/health`.

## Folder structure
```
backend/
 ├─ src/{routes,services,alerts,db,ws,middleware,config}
 ├─ tests/
 ├─ scripts/simulate.js
 ├─ Dockerfile
 ├─ .env.example
 └─ README (setup, env table, API summary)
```

## Definition of done
- Posting a packet with `flame:"DETECTED"` creates a critical alert, pushes it over WebSocket within about 100 ms, sends Telegram and Web Push, and appears in `/api/alerts`.
- Stop posting for 10 s: a DEVICE_OFFLINE alert and a `device` WS event fire.
- All tests pass, and `docker compose up` starts the full system.
