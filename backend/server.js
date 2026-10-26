const express = require("express");
const path = require("path");

const app = express();
const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const DEVICE_KEY = process.env.DG_DEVICE_KEY || "dg_device_key_secret_12345";
const MAX_HISTORY = 1000;
const TIMEOUT_MS = 10000; // Consider disconnected if no data within 10s

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

const history = [];
let lastTelemetry = null;
let lastTelemetryTime = 0;

function authenticateDevice(req, res, next) {
  const supplied = req.get("x-device-key");
  if (!supplied || supplied !== DEVICE_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid or missing device key" });
  }
  next();
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  const isConnected = lastTelemetry && (Date.now() - lastTelemetryTime < TIMEOUT_MS);
  res.json({
    ok: true,
    service: "DriveGuard IoT API",
    port: PORT,
    lanIp: "172.30.20.12",
    esp32Connected: Boolean(isConnected),
    lastSeen: lastTelemetryTime ? new Date(lastTelemetryTime).toISOString() : null,
    time: new Date().toISOString()
  });
});

// Telemetry POST endpoint from ESP32
app.post("/api/telemetry", authenticateDevice, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: "JSON object required" });
  }

  const record = {
    ...body,
    deviceId: String(body.deviceId || "CAR-001"),
    receivedAt: new Date().toISOString(),
    serverTimestamp: Date.now()
  };

  lastTelemetry = record;
  lastTelemetryTime = Date.now();

  history.push(record);
  if (history.length > MAX_HISTORY) history.shift();

  console.log(
    `[TELEMETRY] ${record.deviceId} | flame=${Boolean(record.flame)} | ` +
    `smoke=${Boolean(record.smoke)} | accident=${Boolean(record.accident)} | ` +
    `MQ3=${record.mq3Raw ?? "0"}`
  );

  res.status(201).json({ ok: true, message: "Telemetry received", receivedAt: record.receivedAt });
});

// Latest telemetry endpoint
app.get("/api/telemetry/latest", (_req, res) => {
  const isConnected = lastTelemetry && (Date.now() - lastTelemetryTime < TIMEOUT_MS);
  
  if (!isConnected) {
    // If not connected, strictly return zero readings as required (no fake/dummy data)
    return res.json({
      ok: true,
      connected: false,
      data: null,
      fallback: {
        deviceId: "OFFLINE",
        flame: false,
        smoke: false,
        accident: false,
        mq3Raw: 0,
        mq3Status: "DISCONNECTED",
        speedKmph: 0,
        heartRaw: 0,
        heartStatus: "DISCONNECTED",
        btConnected: false,
        uptimeS: 0,
        receivedAt: null
      }
    });
  }

  res.json({
    ok: true,
    connected: true,
    data: lastTelemetry
  });
});

// Telemetry history endpoint
app.get("/api/telemetry/history", (_req, res) => {
  res.json({ ok: true, count: history.length, data: history.slice(-100).reverse() });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("[SERVER ERROR]", err.message);
  res.status(400).json({ ok: false, error: "Invalid request" });
});

// Bind to 0.0.0.0:3000
app.listen(PORT, HOST, () => {
  console.log(`DriveGuard API listening on http://${HOST}:${PORT}`);
  console.log(`Local dashboard: http://localhost:${PORT}`);
  console.log(`LAN dashboard:   http://172.30.20.12:${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
});
