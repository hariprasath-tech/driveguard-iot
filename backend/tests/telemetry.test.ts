import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { closeDb } from '../src/db';

describe('Telemetry API Integration Tests', () => {
  const { app, alertEngine } = createApp();

  afterAll(() => {
    alertEngine.clear();
    closeDb();
  });

  const validPayload = {
    deviceId: 'CAR-001',
    mq3Raw: 1200,
    mq3Status: 'NORMAL',
    heartRaw: 2048,
    heartStatus: 'NORMAL',
    flame: 'NOT DETECTED',
    smoke: 'NOT DETECTED',
    motion: 'NOT DETECTED',
    frequency: 'EMITTED',
    accident: 'NOT DETECTED',
    gps: 'FIXED',
    lat: 12.9716,
    lng: 77.5946,
    speedKmph: 45.0,
    btConnected: true,
    uptimeS: 50
  };

  test('POST /api/telemetry should reject request without x-device-key with 401', async () => {
    const res = await request(app)
      .post('/api/telemetry')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  test('POST /api/telemetry should reject invalid device key with 401', async () => {
    const res = await request(app)
      .post('/api/telemetry')
      .set('x-device-key', 'wrong_key')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  test('POST /api/telemetry should reject unknown enums with 400', async () => {
    const res = await request(app)
      .post('/api/telemetry')
      .set('x-device-key', config.DEVICE_API_KEY)
      .send({
        ...validPayload,
        flame: 'UNKNOWN_STATE'
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/telemetry should accept valid packet with 204', async () => {
    const res = await request(app)
      .post('/api/telemetry')
      .set('x-device-key', config.DEVICE_API_KEY)
      .send(validPayload);

    expect(res.status).toBe(204);
  });

  test('GET /api/health returns 200 with server status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe(true);
  });
});
