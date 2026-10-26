const express = require("express");
const path = require("path");

const app = express();
const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const DEVICE_KEY = process.env.DG_DEVICE_KEY || "dg_device_key_secret_12345";
const MAX_HISTORY = 1000;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

const history = [];

function authenticateDevice(req, res, next) {
  const supplied = req.get("x-device-key");
  if (!supplied || supplied !== DEVICE_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid or missing device key" });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "DriveGuard IoT API",
    port: PORT,
    time: new Date().toISOString()
  });
});

app.post("/api/telemetry", authenticateDevice, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: "JSON object required" });
  }

  const record = {
    ...body,
    deviceId: String(body.deviceId || "CAR-001"),
    receivedAt: new Date().toISOString()
  };

  history.push(record);
  if (history.length > MAX_HISTORY) history.shift();

  console.log(
    `[TELEMETRY] ${record.deviceId} | flame=${Boolean(record.flame)} | ` +
    `smoke=${Boolean(record.smoke)} | accident=${Boolean(record.accident)} | ` +
    `MQ3=${record.mq3Raw ?? "n/a"}`
  );

  res.status(201).json({ ok: true, message: "Telemetry received", receivedAt: record.receivedAt });
});

app.get("/api/telemetry/latest", (_req, res) => {
  res.json({ ok: true, data: history.length ? history[history.length - 1] : null });
});

app.get("/api/telemetry/history", (_req, res) => {
  res.json({ ok: true, data: history.slice(-100).reverse() });
});

app.use((err, _req, res, _next) => {
  console.error("[SERVER ERROR]", err.message);
  res.status(400).json({ ok: false, error: "Invalid request" });
});

app.listen(PORT, HOST, () => {
  console.log(`DriveGuard API listening on http://${HOST}:${PORT}`);
  console.log(`Local dashboard: http://localhost:${PORT}`);
  console.log(`LAN dashboard:   http://172.30.20.12:${PORT}`);
  console.log("Health endpoint: /api/health");
});
