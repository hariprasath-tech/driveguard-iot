import { AlertEngine } from '../src/alerts/engine';
import { TelemetryPayload } from '../src/alerts/types';

describe('AlertEngine Unit Tests', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine({
      cooldownMs: 30000,
      offlineTimeoutMs: 10000
    });
  });

  afterEach(() => {
    engine.clear();
  });

  const baseTelemetry: TelemetryPayload = {
    deviceId: 'CAR-001',
    ts: 1000000,
    mq3Raw: 1200,
    mq3Status: 'NORMAL',
    heartRaw: 2000,
    heartStatus: 'NORMAL',
    flame: 'NOT DETECTED',
    smoke: 'NOT DETECTED',
    motion: 'NOT DETECTED',
    frequency: 'EMITTED',
    accident: 'NOT DETECTED',
    gps: 'FIXED',
    lat: 12.9716,
    lng: 77.5946,
    speedKmph: 40.0,
    btConnected: true,
    uptimeS: 10
  };

  test('should not alert on initial normal packet', () => {
    const alerts = engine.processTelemetry(baseTelemetry);
    expect(alerts).toHaveLength(0);
  });

  test('should trigger critical FLAME alert on rising edge', () => {
    // Initial normal packet
    engine.processTelemetry(baseTelemetry);

    // Second packet with flame detected
    const flamePacket: TelemetryPayload = {
      ...baseTelemetry,
      ts: 1001000,
      flame: 'DETECTED'
    };

    const alerts = engine.processTelemetry(flamePacket);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('FLAME');
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].deviceId).toBe('CAR-001');
  });

  test('should trigger critical alert on first packet if condition is critical (flame, smoke, alcohol, accident)', () => {
    const freshEngine = new AlertEngine();
    const flameFirstPacket: TelemetryPayload = {
      ...baseTelemetry,
      flame: 'DETECTED'
    };

    const alerts = freshEngine.processTelemetry(flameFirstPacket);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('FLAME');
    freshEngine.clear();
  });

  test('should not trigger HEART alert on first packet after start', () => {
    const freshEngine = new AlertEngine();
    const heartFirstPacket: TelemetryPayload = {
      ...baseTelemetry,
      heartStatus: 'HIGH'
    };

    const alerts = freshEngine.processTelemetry(heartFirstPacket);
    expect(alerts).toHaveLength(0);
    freshEngine.clear();
  });

  test('should respect 30-second cooldown for repeated alerts', () => {
    engine.processTelemetry(baseTelemetry);

    // Alert 1 at ts 1000000
    const alert1 = engine.processTelemetry({
      ...baseTelemetry,
      ts: 1000000,
      smoke: 'DETECTED'
    });
    expect(alert1).toHaveLength(1);

    // Another smoke packet 10s later (within 30s cooldown)
    const alert2 = engine.processTelemetry({
      ...baseTelemetry,
      ts: 1010000,
      smoke: 'DETECTED'
    });
    expect(alert2).toHaveLength(0);

    // Packet 31s later (after 30s cooldown)
    const alert3 = engine.processTelemetry({
      ...baseTelemetry,
      ts: 1032000,
      smoke: 'DETECTED'
    });
    expect(alert3).toHaveLength(1);
  });

  test('should trigger DEVICE_ONLINE alert when packet arrives after device went offline', () => {
    const onAlert = jest.fn();
    const onDeviceState = jest.fn();
    engine.setOnAlert(onAlert);
    engine.setOnDeviceState(onDeviceState);

    // Send packet
    engine.processTelemetry({ ...baseTelemetry, ts: 1000000 });

    // Mark device offline manually or via callback
    const state = (engine as unknown as { devices: Map<string, { isOffline: boolean }> }).devices.get('CAR-001');
    if (state) state.isOffline = true;

    // Send subsequent packet
    const newAlerts = engine.processTelemetry({ ...baseTelemetry, ts: 1020000 });
    expect(newAlerts.some(a => a.type === 'DEVICE_ONLINE')).toBe(true);
    expect(onDeviceState).toHaveBeenCalledWith('CAR-001', true);
  });
});
