# 🚗 DriveGuard Backend

High-performance real-time IoT backend for the DriveGuard vehicle safety monitoring platform.

## Features
- **Real-Time Telemetry Ingestion**: Sub-millisecond processing of ESP32 gateway telemetry packets (`POST /api/telemetry`).
- **Real-Time Alert Engine**: Edge detection for flame, smoke, alcohol, pulse abnormalities, accidents, and device online/offline states.
- **WebSocket Live Streaming**: High-throughput `/ws?token=` streaming of sensor updates and critical alerts.
- **Multi-Channel Dispatcher**: Immediate WebSocket broadcast, Web Push (VAPID), and Telegram bot alerts.
- **SQLite Database with WAL Mode**: Embedded zero-maintenance persistence with automated migrations and data retention cleanup.
- **OpenAPI / Swagger UI**: Interactive API documentation at `/docs`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP & WebSocket server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `JWT_SECRET` | Secret key for JWT signing | *Required in prod* |
| `DEVICE_API_KEY` | Expected `x-device-key` header from ESP32 | `dg_device_key_secret_12345` |
| `ADMIN_EMAIL` | Default administrator account email | `admin@driveguard.local` |
| `ADMIN_PASSWORD` | Default administrator password | `AdminSecurePass123!` |
| `VAPID_PUBLIC` | Web Push VAPID public key | Generated |
| `VAPID_PRIVATE` | Web Push VAPID private key | Generated |
| `TELEGRAM_TOKEN` | Optional Telegram bot API token | - |
| `TELEGRAM_CHAT_ID` | Optional Telegram chat ID for alerts | - |
| `CORS_ORIGINS` | Permitted CORS origins (comma-separated) | `http://localhost:5173,...` |
| `RETENTION_DAYS` | Telemetry history retention period | `30` |
| `DATABASE_PATH` | Path to SQLite database file | `./driveguard.db` |

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run unit and integration tests
npm test

# Build production bundle
npm run build
npm start
```

## Testing with Simulator

```bash
# Send single normal packet
node scripts/simulate.js normal

# Send critical flame alert packet
node scripts/simulate.js flame

# Send driver alcohol alert packet
node scripts/simulate.js alcohol

# Continuous stream every 1s
node scripts/simulate.js loop
```
