# 🚗 DriveGuard Frontend Dashboard & PWA

Real-time vehicle safety cockpit built with React 18, Vite, TypeScript, Tailwind CSS, Recharts, and Leaflet.

## Features
- **Live Automotive HUD**: Real-time status banner, 6 sensor indicators (flame, smoke, motion, ultrasound, accident, GPS), and connection telemetry chips.
- **Analog Health Gauges**: 90-second rolling sparklines for MQ-3 Alcohol ADC and Heart pulse waveforms.
- **Interactive Satellite Map**: Leaflet GPS map with vehicle marker and live historical breadcrumb trail.
- **Incident Logger**: Sortable, filterable audit table with CSV export and live WebSocket alarms.
- **Flashing Emergency Overlay**: Full-screen modal with European dual-tone Web Audio siren and one-click incident acknowledgement.
- **PWA Ready**: Offline service worker shell, Web Push notification subscription, and Capacitor config for Android APK generation.

## Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Production Build

```bash
npm run build
npm run preview
```
