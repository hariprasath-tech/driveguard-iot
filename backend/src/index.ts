import http from 'http';
import { config } from './config/env';
import { createApp } from './app';
import { AlertEngine } from './alerts/engine';
import { DriveGuardWebSocketServer } from './ws/server';
import { sendNotifications } from './services/notifications';
import { startRetentionScheduler } from './services/retention';
import { getDb, closeDb } from './db';

// Ensure DB is initialized
getDb();

const alertEngine = new AlertEngine();

// Create HTTP server placeholder
let wsServerInstance: DriveGuardWebSocketServer | undefined;
const server = http.createServer();

// Attach WebSocket server
wsServerInstance = new DriveGuardWebSocketServer(server);

// Configure alertEngine callbacks
alertEngine.setOnAlert((alert) => {
  wsServerInstance?.broadcastAlert(alert);
  sendNotifications(alert).catch(err => {
    console.error('Failed to dispatch alert notifications:', err);
  });
});

alertEngine.setOnDeviceState((deviceId, online) => {
  wsServerInstance?.broadcastDeviceState(deviceId, online);
});

// Create Express app with alertEngine and wsServer
const { app } = createApp(alertEngine, wsServerInstance);

// Attach express app to HTTP server
server.on('request', app);

// Start retention job
const retentionTimer = startRetentionScheduler();

server.listen(config.PORT, () => {
  console.log(`🚀 DriveGuard backend listening on port ${config.PORT}`);
  console.log(`📚 Swagger documentation available at http://localhost:${config.PORT}/docs`);
  console.log(`🔌 WebSocket live stream available at ws://localhost:${config.PORT}/ws`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down DriveGuard server gracefully...');
  clearInterval(retentionTimer);
  alertEngine.clear();
  wsServerInstance?.close();
  server.close(() => {
    closeDb();
    console.log('Server and database closed. Bye!');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forceful shutdown timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
