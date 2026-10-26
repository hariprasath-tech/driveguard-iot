/**
 * DriveGuard Sensor Simulator
 * For testing and local validation ONLY. Never runs automatically.
 *
 * Usage:
 *   node scripts/simulate.js normal       # Send 1 normal packet
 *   node scripts/simulate.js flame        # Send 1 packet with FLAME: DETECTED
 *   node scripts/simulate.js smoke        # Send 1 packet with SMOKE: DETECTED
 *   node scripts/simulate.js alcohol      # Send 1 packet with ALCOHOL: ALERT
 *   node scripts/simulate.js accident     # Send 1 packet with ACCIDENT: DETECTED
 *   node scripts/simulate.js loop         # Stream packets continuously every 1s
 */

const http = require('http');

const API_KEY = process.env.DEVICE_API_KEY || 'dg_device_key_secret_12345';
const HOST = process.env.API_HOST || 'localhost';
const PORT = parseInt(process.env.PORT || '3000', 10);
const DEVICE_ID = process.env.DEVICE_ID || 'CAR-001';

const mode = process.argv[2] || 'normal';

function createPacket(override = {}) {
  return {
    deviceId: DEVICE_ID,
    mq3Raw: 1100 + Math.floor(Math.random() * 80),
    mq3Status: 'NORMAL',
    heartRaw: 2000 + Math.floor(Math.random() * 100),
    heartStatus: 'NORMAL',
    flame: 'NOT DETECTED',
    smoke: 'NOT DETECTED',
    motion: 'NOT DETECTED',
    frequency: 'EMITTED',
    accident: 'NOT DETECTED',
    gps: 'FIXED',
    lat: 12.9715987 + (Math.random() - 0.5) * 0.001,
    lng: 77.5945627 + (Math.random() - 0.5) * 0.001,
    speedKmph: 42.5 + (Math.random() - 0.5) * 5,
    btConnected: true,
    uptimeS: Math.floor(process.uptime()),
    ...override
  };
}

function sendPacket(packet) {
  const data = JSON.stringify(packet);
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-device-key': API_KEY
    }
  };

  const req = http.request(options, (res) => {
    console.log(`[Simulator] Sent ${packet.deviceId} packet. Status: ${res.statusCode}`);
  });

  req.on('error', (err) => {
    console.error(`[Simulator] Failed to send packet:`, err.message);
  });

  req.write(data);
  req.end();
}

console.log(`[Simulator] Running mode: ${mode} targeting http://${HOST}:${PORT}/api/telemetry`);

switch (mode) {
  case 'flame':
    sendPacket(createPacket({ flame: 'DETECTED' }));
    break;
  case 'smoke':
    sendPacket(createPacket({ smoke: 'DETECTED' }));
    break;
  case 'alcohol':
    sendPacket(createPacket({ mq3Raw: 3200, mq3Status: 'ALERT' }));
    break;
  case 'accident':
    sendPacket(createPacket({ accident: 'DETECTED' }));
    break;
  case 'heart':
    sendPacket(createPacket({ heartRaw: 3800, heartStatus: 'HIGH' }));
    break;
  case 'loop': {
    let tick = 0;
    console.log('[Simulator] Streaming packets every 1 second. Press Ctrl+C to stop.');
    setInterval(() => {
      tick++;
      // Occasionally simulate motion or heartbeat variations
      const motion = tick % 5 === 0 ? 'DETECTED' : 'NOT DETECTED';
      sendPacket(createPacket({ motion }));
    }, 1000);
    break;
  }
  case 'normal':
  default:
    sendPacket(createPacket());
    break;
}
