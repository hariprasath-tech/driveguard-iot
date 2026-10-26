import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryData, Alert } from '../types';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export interface UseLiveTelemetryReturn {
  data: TelemetryData | null;
  history: TelemetryData[];
  trail: [number, number][];
  wsConnected: boolean;
  isOffline: boolean;
  activeCriticalAlert: Alert | null;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  lastPacketAgeS: number | null;
}

export function useLiveTelemetry(): UseLiveTelemetryReturn {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeCriticalAlert, setActiveCriticalAlert] = useState<Alert | null>(null);
  const [lastPacketAgeS, setLastPacketAgeS] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(1000);
  const lastPacketTimeRef = useRef<number | null>(null);

  // Watchdog interval checking last packet age
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (lastPacketTimeRef.current) {
        const diffS = Math.floor((Date.now() - lastPacketTimeRef.current) / 1000);
        setLastPacketAgeS(diffS);
        if (diffS >= 10) {
          setIsOffline(true);
        }
      }
    }, 1000);

    return () => clearInterval(watchdog);
  }, []);

  // Fetch initial latest reading from REST API
  useEffect(() => {
    if (!token) return;

    apiFetch<TelemetryData>('/api/latest')
      .then((latest) => {
        if (latest && latest.ts) {
          setData(latest);
          lastPacketTimeRef.current = latest.ts;
          const diffS = Math.floor((Date.now() - latest.ts) / 1000);
          setLastPacketAgeS(diffS);
          if (diffS >= 10) {
            setIsOffline(true);
          } else {
            setIsOffline(false);
          }

          setHistory([latest]);
          if (latest.lat !== 0 || latest.lng !== 0) {
            setTrail([[latest.lat, latest.lng]]);
          }
        }
      })
      .catch(() => {
        // No data yet or device waiting
      });
  }, [token]);

  // WebSocket live streaming connection
  const connectWs = useCallback(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${host}/ws?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'telemetry' && message.data) {
            const telemetry: TelemetryData = message.data;
            setData(telemetry);
            lastPacketTimeRef.current = telemetry.ts || Date.now();
            setLastPacketAgeS(0);
            setIsOffline(false);

            // Rolling 90 points sparkline history
            setHistory((prev) => {
              const updated = [...prev, telemetry];
              return updated.length > 90 ? updated.slice(updated.length - 90) : updated;
            });

            // Trail for live map (up to 100 points)
            if (telemetry.lat !== 0 || telemetry.lng !== 0) {
              setTrail((prev) => {
                const nextTrail: [number, number][] = [...prev, [telemetry.lat, telemetry.lng]];
                return nextTrail.length > 100 ? nextTrail.slice(nextTrail.length - 100) : nextTrail;
              });
            }
          } else if (message.type === 'alert' && message.data) {
            const alert: Alert = message.data;
            if (alert.severity === 'critical' && !alert.acknowledged) {
              setActiveCriticalAlert(alert);
            }
          } else if (message.type === 'device' && message.data) {
            if (message.data.online !== undefined) {
              setIsOffline(!message.data.online);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Exponential backoff reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 1.5, 15000);
          connectWs();
        }, backoffRef.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Reconnect after failure
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, 3000);
    }
  }, [token]);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiFetch(`/api/alerts/${alertId}/ack`, { method: 'POST' });
      if (activeCriticalAlert?.id === alertId) {
        setActiveCriticalAlert(null);
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return {
    data,
    history,
    trail,
    wsConnected,
    isOffline,
    activeCriticalAlert,
    acknowledgeAlert,
    lastPacketAgeS
  };
}
