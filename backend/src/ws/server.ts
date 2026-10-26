import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Alert, TelemetryPayload } from '../alerts/types';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  role?: string;
}

export class DriveGuardWebSocketServer {
  private wss: WebSocketServer;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      if (parsedUrl.pathname === '/ws') {
        const token = parsedUrl.query.token as string | undefined;

        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        try {
          const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: string };
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            const authWs = ws as AuthenticatedWebSocket;
            authWs.userId = decoded.id;
            authWs.role = decoded.role;
            authWs.isAlive = true;
            this.wss.emit('connection', authWs, request);
          });
        } catch {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
        }
      }
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('error', () => {
        // Handle WS error safely
      });
    });

    // Heartbeat check every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client as AuthenticatedWebSocket;
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public broadcast(type: 'telemetry' | 'alert' | 'device', data: unknown) {
    const payload = JSON.stringify({ type, data });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  public broadcastTelemetry(data: TelemetryPayload) {
    this.broadcast('telemetry', data);
  }

  public broadcastAlert(data: Alert) {
    this.broadcast('alert', data);
  }

  public broadcastDeviceState(deviceId: string, online: boolean) {
    this.broadcast('device', { deviceId, online });
  }

  public getConnectedClientsCount(): number {
    return this.wss.clients.size;
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
