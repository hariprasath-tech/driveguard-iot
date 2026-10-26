import crypto from 'crypto';
import { Alert, AlertType, Severity, TelemetryPayload } from './types';

interface DeviceState {
  lastReading?: TelemetryPayload;
  lastKnownGps: { lat: number; lng: number };
  lastAlertTimestamp: Map<AlertType, number>;
  hasReceivedInitialPacket: boolean;
  isOffline: boolean;
  offlineTimer?: NodeJS.Timeout;
}

export type OnAlertCallback = (alert: Alert) => void;
export type OnDeviceStateCallback = (deviceId: string, online: boolean) => void;

export class AlertEngine {
  private devices: Map<string, DeviceState> = new Map();
  private cooldownMs: number;
  private offlineTimeoutMs: number;
  private onAlertCallback?: OnAlertCallback;
  private onDeviceStateCallback?: OnDeviceStateCallback;

  constructor(options?: {
    cooldownMs?: number;
    offlineTimeoutMs?: number;
    onAlert?: OnAlertCallback;
    onDeviceState?: OnDeviceStateCallback;
  }) {
    this.cooldownMs = options?.cooldownMs ?? 30 * 1000;
    this.offlineTimeoutMs = options?.offlineTimeoutMs ?? 10 * 1000;
    this.onAlertCallback = options?.onAlert;
    this.onDeviceStateCallback = options?.onDeviceState;
  }

  public setOnAlert(cb: OnAlertCallback) {
    this.onAlertCallback = cb;
  }

  public setOnDeviceState(cb: OnDeviceStateCallback) {
    this.onDeviceStateCallback = cb;
  }

  private getOrCreateDevice(deviceId: string): DeviceState {
    let state = this.devices.get(deviceId);
    if (!state) {
      state = {
        lastKnownGps: { lat: 0, lng: 0 },
        lastAlertTimestamp: new Map<AlertType, number>(),
        hasReceivedInitialPacket: false,
        isOffline: false
      };
      this.devices.set(deviceId, state);
    }
    return state;
  }

  public processTelemetry(current: TelemetryPayload): Alert[] {
    const state = this.getOrCreateDevice(current.deviceId);
    const now = current.ts || Date.now();
    const newAlerts: Alert[] = [];

    // Update GPS if valid
    if (current.lat !== 0 || current.lng !== 0) {
      state.lastKnownGps = { lat: current.lat, lng: current.lng };
    }

    const previous = state.lastReading;
    const isFirstPacket = !state.hasReceivedInitialPacket;
    state.hasReceivedInitialPacket = true;

    // Check if device was offline
    if (state.isOffline) {
      state.isOffline = false;
      const onlineAlert = this.createAlert(
        current.deviceId,
        'DEVICE_ONLINE',
        'info',
        `Device ${current.deviceId} reconnected`,
        now,
        state.lastKnownGps
      );
      if (onlineAlert) {
        newAlerts.push(onlineAlert);
        this.onAlertCallback?.(onlineAlert);
      }
      this.onDeviceStateCallback?.(current.deviceId, true);
    }

    // Reset offline watchdog timer
    if (state.offlineTimer) {
      clearTimeout(state.offlineTimer);
    }
    state.offlineTimer = setTimeout(() => {
      this.handleDeviceOffline(current.deviceId);
    }, this.offlineTimeoutMs);

    // Rising edge detection or persistent critical condition after cooldown
    // 1. FLAME
    if (current.flame === 'DETECTED') {
      const risingEdge = previous ? previous.flame !== 'DETECTED' : true;
      const lastAlertTime = state.lastAlertTimestamp.get('FLAME') || 0;
      if (risingEdge || now - lastAlertTime >= this.cooldownMs) {
        const alert = this.createAlert(
          current.deviceId,
          'FLAME',
          'critical',
          `🔥 Flame detected on ${current.deviceId}!`,
          now,
          state.lastKnownGps
        );
        if (alert) newAlerts.push(alert);
      }
    }

    // 2. SMOKE
    if (current.smoke === 'DETECTED') {
      const risingEdge = previous ? previous.smoke !== 'DETECTED' : true;
      const lastAlertTime = state.lastAlertTimestamp.get('SMOKE') || 0;
      if (risingEdge || now - lastAlertTime >= this.cooldownMs) {
        const alert = this.createAlert(
          current.deviceId,
          'SMOKE',
          'critical',
          `💨 High smoke/gas detected on ${current.deviceId}!`,
          now,
          state.lastKnownGps
        );
        if (alert) newAlerts.push(alert);
      }
    }

    // 3. ACCIDENT
    if (current.accident === 'DETECTED') {
      const risingEdge = previous ? previous.accident !== 'DETECTED' : true;
      const lastAlertTime = state.lastAlertTimestamp.get('ACCIDENT') || 0;
      if (risingEdge || now - lastAlertTime >= this.cooldownMs) {
        const alert = this.createAlert(
          current.deviceId,
          'ACCIDENT',
          'critical',
          `💥 Vehicle collision/impact detected on ${current.deviceId}!`,
          now,
          state.lastKnownGps
        );
        if (alert) newAlerts.push(alert);
      }
    }

    // 4. ALCOHOL (MQ-3)
    if (current.mq3Status === 'ALERT') {
      const risingEdge = previous ? previous.mq3Status !== 'ALERT' : true;
      const lastAlertTime = state.lastAlertTimestamp.get('ALCOHOL') || 0;
      if (risingEdge || now - lastAlertTime >= this.cooldownMs) {
        const alert = this.createAlert(
          current.deviceId,
          'ALCOHOL',
          'critical',
          `🍷 Driver alcohol alert on ${current.deviceId}! Raw ADC: ${current.mq3Raw}`,
          now,
          state.lastKnownGps
        );
        if (alert) newAlerts.push(alert);
      }
    }

    // 5. HEART (Pulse)
    // Warning severity: ignored on first packet after server start
    if (!isFirstPacket && (current.heartStatus === 'LOW' || current.heartStatus === 'HIGH')) {
      const prevWasAbnormal = previous && (previous.heartStatus === 'LOW' || previous.heartStatus === 'HIGH');
      const lastAlertTime = state.lastAlertTimestamp.get('HEART') || 0;
      if (!prevWasAbnormal || now - lastAlertTime >= this.cooldownMs) {
        const alert = this.createAlert(
          current.deviceId,
          'HEART',
          'warning',
          `💓 Driver abnormal pulse (${current.heartStatus}) on ${current.deviceId}! Raw: ${current.heartRaw}`,
          now,
          state.lastKnownGps
        );
        if (alert) newAlerts.push(alert);
      }
    }

    state.lastReading = current;

    for (const a of newAlerts) {
      this.onAlertCallback?.(a);
    }

    return newAlerts;
  }

  private createAlert(
    deviceId: string,
    type: AlertType,
    severity: Severity,
    message: string,
    ts: number,
    gps: { lat: number; lng: number }
  ): Alert | null {
    const state = this.getOrCreateDevice(deviceId);
    const lastAlertTime = state.lastAlertTimestamp.get(type) || 0;

    // Cooldown check (30 s)
    if (ts - lastAlertTime < this.cooldownMs) {
      return null;
    }

    state.lastAlertTimestamp.set(type, ts);

    return {
      id: crypto.randomUUID(),
      deviceId,
      type,
      severity,
      message,
      ts,
      lat: gps.lat,
      lng: gps.lng,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null
    };
  }

  private handleDeviceOffline(deviceId: string) {
    const state = this.devices.get(deviceId);
    if (!state || state.isOffline) return;

    state.isOffline = true;
    const now = Date.now();

    const offlineAlert = this.createAlert(
      deviceId,
      'DEVICE_OFFLINE',
      'warning',
      `⚠️ Device ${deviceId} telemetry offline (no packet received for 10s)`,
      now,
      state.lastKnownGps
    );

    if (offlineAlert) {
      this.onAlertCallback?.(offlineAlert);
    }
    this.onDeviceStateCallback?.(deviceId, false);
  }

  public getDeviceState(deviceId: string): { isOffline: boolean; lastReading?: TelemetryPayload } | null {
    const state = this.devices.get(deviceId);
    if (!state) return null;
    return {
      isOffline: state.isOffline,
      lastReading: state.lastReading
    };
  }

  public clear() {
    for (const state of this.devices.values()) {
      if (state.offlineTimer) {
        clearTimeout(state.offlineTimer);
      }
    }
    this.devices.clear();
  }
}
