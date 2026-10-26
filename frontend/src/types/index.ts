export type Severity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'FLAME'
  | 'SMOKE'
  | 'ACCIDENT'
  | 'ALCOHOL'
  | 'HEART'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_ONLINE';

export interface TelemetryData {
  deviceId: string;
  ts: number;
  mq3Raw: number;
  mq3Status: 'NORMAL' | 'ALERT' | 'WARMING UP';
  heartRaw: number;
  heartStatus: 'LOW' | 'NORMAL' | 'HIGH';
  flame: 'DETECTED' | 'NOT DETECTED' | 'WAITING';
  smoke: 'DETECTED' | 'NOT DETECTED' | 'WAITING';
  motion: 'DETECTED' | 'NOT DETECTED' | 'WAITING';
  frequency: 'EMITTED' | 'NOT EMITTED' | 'WAITING';
  accident: 'DETECTED' | 'NOT DETECTED' | 'WAITING';
  gps: 'FIXED' | 'NO FIX' | 'WAITING';
  lat: number;
  lng: number;
  speedKmph: number;
  btConnected: boolean;
  uptimeS: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: Severity;
  message: string;
  ts: number;
  lat: number;
  lng: number;
  acknowledged?: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: number | null;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
}

export interface SystemHealth {
  status: string;
  uptime: number;
  db: boolean;
  lastPacketAgeMs: number | null;
  timestamp: number;
}
