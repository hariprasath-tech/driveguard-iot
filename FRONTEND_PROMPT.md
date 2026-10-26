# DriveGuard: FRONTEND BUILD PROMPT

Paste this whole file into your AI coding tool (Antigravity / Claude Code / Cursor).

---

You are a senior frontend engineer. Build the complete frontend for **DriveGuard**, a real-time vehicle safety monitoring dashboard, in the folder `frontend/`.

## Absolute rule
**No fake data. No hardcoded sensor values.** Every number and status on screen must come from the backend REST API or WebSocket. When there is no data, show clear states: `WAITING FOR DEVICE`, `DEVICE OFFLINE`, skeleton loaders.

## Stack
React 18 + Vite + TypeScript, Tailwind CSS, Recharts, Leaflet (react-leaflet), React Router, Zustand (state), vite-plugin-pwa.

## Backend contract
- REST base: `VITE_API_URL` (default `http://localhost:3000`)
- WebSocket: `VITE_WS_URL` (default `ws://localhost:3000/ws`)
- Auth: `POST /api/auth/login` returns a JWT; send it as `Authorization: Bearer`.
- Telemetry object:
```json
{
 "deviceId":"CAR-001","ts":1730000000000,
 "mq3Raw":0,"mq3Status":"NORMAL|ALERT|WARMING UP",
 "heartRaw":0,"heartStatus":"LOW|NORMAL|HIGH",
 "flame":"DETECTED|NOT DETECTED|WAITING","smoke":"...","motion":"...",
 "frequency":"EMITTED|NOT EMITTED","accident":"...","gps":"FIXED|NO FIX",
 "lat":0,"lng":0,"speedKmph":0,"btConnected":true,"uptimeS":0
}
```
- WS messages: `{type:"telemetry",data:{...}}` and `{type:"alert",data:{id,type,severity,message,ts,lat,lng}}`
- Other routes: `GET /api/latest`, `/api/history?from&to&limit`, `/api/alerts`, `POST /api/alerts/:id/ack`, `GET /api/health`.

## Design
- Dark, professional, automotive feel. Background `#0a0e18`, cards `#131b2c`, accents: ok `#22c55e`, warn `#f59e0b`, bad `#ef4444`, info `#38bdf8`.
- Clean typography (Inter), generous spacing, rounded-2xl cards, subtle borders, smooth transitions.
- Fully responsive (phone first). Humanised copy: friendly, short, no jargon (e.g. "All clear. No alarms right now.").
- Accessible: contrast, focus rings, aria labels. Alerts never rely on colour alone (icon + text).

## Pages

### 1. Login (first screen)
Professional split layout: brand panel left, form right. Email and password, show/hide password, loading and error states. Redirect to Dashboard after login.

### 2. Live Dashboard
- **Status banner**: `ALL SYSTEMS SAFE`, `ALERT: FLAME` (pulsing red), `WAITING FOR DEVICE`, or `DEVICE OFFLINE` (no packet for 10 s).
- **Six sensor tiles**: Flame, Smoke, Motion, Frequency, Accident, GPS. Colour by state (Flame/Smoke/Accident detected = red; Motion/Frequency active = blue; GPS fixed = green, no fix = amber).
- **MQ-3 Alcohol card**: big raw value, status badge, meter with threshold marker, 90 s sparkline. Label clearly "RAW ADC (NOT BAC)".
- **Heart card**: raw value, status badge, meter with low/high markers, sparkline. Label "RAW SIGNAL (NOT BPM)".
- **Live map**: Leaflet marker for the vehicle plus a trail of the last 100 points. If GPS is NO FIX, show "Waiting for GPS fix".
- **Connection chips**: Backend live, ESP2 Bluetooth, last packet age.
- **Critical alert overlay**: full-width flashing red modal with the alert name, time and location, a siren sound (user can mute), and an Acknowledge button.

### 3. Alerts
Table with severity, type, message, time, location, status. Filters (severity, type, date), acknowledge button, export CSV. Live updates through WebSocket.

### 4. History
Date-range picker, line charts per sensor from `/api/history`, plus a downsampling toggle for large ranges.

### 5. Device and System
Device ID, Bluetooth state, ESP2 MAC, last packet age, uptime, firmware version, backend health.

### 6. Settings
Alert thresholds, notification toggles (browser push, Telegram), theme, user management (admin only).

## Behaviour
- A single `useLiveTelemetry` hook: loads `/api/latest`, opens the WebSocket, auto-reconnects with backoff, exposes `{data, status, history}`.
- Keep a rolling in-memory buffer (90 points) for sparklines.
- Protected routes with role check (`admin`, `viewer`).
- Error boundary and toast notifications.

## PWA (the mobile app)
- Manifest (name DriveGuard, icons, standalone, theme colour).
- Service worker with offline shell and Web Push subscription (`/api/push/subscribe` with the VAPID public key from `/api/push/key`).
- "Install app" button.
- Add `capacitor.config.ts` so an Android APK can be built.

## Folder structure
```
frontend/
 ├─ src/{pages,components,hooks,store,lib,types}
 ├─ public/{manifest.webmanifest,icons,siren.mp3}
 ├─ .env.example
 └─ README (run, build, deploy)
```

## Definition of done
- `npm run dev` works with only the backend running.
- Unplug the device: dashboard shows DEVICE OFFLINE within 10 s.
- Trigger FLAME: banner, tile, overlay, siren and alert row all appear within about 1 s.
- Lighthouse PWA and accessibility checks pass.
- Final checklist confirming every displayed value is live.
