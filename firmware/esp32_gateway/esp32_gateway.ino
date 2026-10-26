/**
 * DriveGuard IoT - ESP32 #1: Gateway Firmware (SAFETY_ESP32_1)
 *
 * Board: ESP32 Dev Module
 * Partition Scheme: Huge APP (3MB No OTA)
 * Required Libraries:
 *   - Arduino_GFX
 *   - BluetoothSerial
 *   - WiFi
 *   - HTTPClient
 *   - WebServer
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <BluetoothSerial.h>

// ----------------- CONFIGURATION -----------------
const char* STA_SSID     = "YOUR_WIFI_SSID";
const char* STA_PASS     = "YOUR_WIFI_PASSWORD";
const char* API_URL      = "http://192.168.1.100:3000/api/telemetry";
const char* API_KEY      = "dg_device_key_secret_12345";
const char* DEVICE_ID    = "CAR-001";

// Node 2 Bluetooth Classic target
const char* NODE2_NAME   = "SAFETY_ESP32_2";
uint8_t NODE2_MAC[6]     = {0x14, 0x08, 0x08, 0xA6, 0x3B, 0x56};

// Pins for ESP32 Gateway
#define PIN_MQ3_ALCOHOL  35
#define PIN_PULSE_HEART  34

// ----------------- GLOBALS -----------------
BluetoothSerial SerialBT;
WebServer offlineServer(80);

// Sensor states from Node 2
String flameState     = "WAITING";
String smokeState     = "WAITING";
String motionState    = "WAITING";
String frequencyState = "WAITING";
String accidentState  = "WAITING";
String gpsState       = "WAITING";
float gpsLat          = 0.0;
float gpsLng          = 0.0;
float speedKmph       = 0.0;
bool btConnected      = false;

unsigned long lastUploadTime = 0;

// ----------------- OFFLINE DASHBOARD -----------------
void handleOfflineRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>DriveGuard Offline In-Car</title>";
  html += "<style>body{font-family:sans-serif;background:#0a0e18;color:#e2e8f0;padding:20px;}";
  html += ".card{background:#131b2c;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:12px;}";
  html += ".alert{color:#ef4444;font-weight:bold;}.ok{color:#22c55e;}h1{color:#38bdf8;font-size:20px;}</style></head><body>";
  html += "<h1>DriveGuard In-Car Offline Panel</h1>";
  html += "<div class='card'><b>MQ-3 Alcohol ADC:</b> " + String(analogRead(PIN_MQ3_ALCOHOL)) + "</div>";
  html += "<div class='card'><b>Pulse Signal:</b> " + String(analogRead(PIN_PULSE_HEART)) + "</div>";
  html += "<div class='card'><b>Flame:</b> <span class='" + String(flameState == "DETECTED" ? "alert" : "ok") + "'>" + flameState + "</span></div>";
  html += "<div class='card'><b>Smoke:</b> <span class='" + String(smokeState == "DETECTED" ? "alert" : "ok") + "'>" + smokeState + "</span></div>";
  html += "<div class='card'><b>Accident:</b> <span class='" + String(accidentState == "DETECTED" ? "alert" : "ok") + "'>" + accidentState + "</span></div>";
  html += "<div class='card'><b>GPS:</b> " + gpsState + " (" + String(gpsLat, 5) + ", " + String(gpsLng, 5) + ")</div>";
  html += "<p style='font-size:11px;color:#64748b;'>Auto-refreshes every 2s</p>";
  html += "<script>setTimeout(()=>location.reload(),2000);</script></body></html>";
  offlineServer.send(200, "text/html", html);
}

// ----------------- SETUP -----------------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_MQ3_ALCOHOL, INPUT);
  pinMode(PIN_PULSE_HEART, INPUT);

  // 1. Start Bluetooth Classic Master
  SerialBT.begin("SAFETY_ESP32_1", true);
  Serial.println("[BT] Connecting to Node 2...");
  btConnected = SerialBT.connect(NODE2_MAC);
  if (btConnected) {
    Serial.println("[BT] Connected to Node 2!");
  } else {
    Serial.println("[BT] Failed to connect to Node 2. Will retry in loop.");
  }

  // 2. Start Wi-Fi Station & SoftAP
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("DriveGuard-Offline", "driveguard123");
  Serial.print("[AP] Offline IP: ");
  Serial.println(WiFi.softAPIP());

  WiFi.begin(STA_SSID, STA_PASS);

  offlineServer.on("/", handleOfflineRoot);
  offlineServer.begin();
  Serial.println("[HTTP] Offline server running on port 80");
}

// ----------------- PARSE BLUETOOTH PACKET -----------------
void readBluetoothData() {
  if (!SerialBT.connected()) {
    btConnected = false;
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 5000) {
      lastRetry = millis();
      Serial.println("[BT] Attempting reconnect to Node 2...");
      btConnected = SerialBT.connect(NODE2_MAC);
    }
    return;
  }
  btConnected = true;

  while (SerialBT.available()) {
    String line = SerialBT.readStringUntil('\n');
    line.trim();

    if (line.startsWith("FLAME:")) {
      flameState = line.substring(6);
      flameState.trim();
    } else if (line.startsWith("SMOKE:")) {
      smokeState = line.substring(6);
      smokeState.trim();
    } else if (line.startsWith("MOTION:")) {
      motionState = line.substring(7);
      motionState.trim();
    } else if (line.startsWith("FREQUENCY:")) {
      frequencyState = line.substring(10);
      frequencyState.trim();
    } else if (line.startsWith("ACCIDENT:")) {
      accidentState = line.substring(9);
      accidentState.trim();
    } else if (line.startsWith("GPS:")) {
      gpsState = line.substring(4);
      gpsState.trim();
    } else if (line.startsWith("LAT:")) {
      gpsLat = line.substring(4).toFloat();
    } else if (line.startsWith("LNG:")) {
      gpsLng = line.substring(4).toFloat();
    } else if (line.startsWith("SPEED:")) {
      speedKmph = line.substring(6).toFloat();
    }
  }
}

// ----------------- CLOUD TELEMETRY POST -----------------
void uploadTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  int mq3Raw = analogRead(PIN_MQ3_ALCOHOL);
  int heartRaw = analogRead(PIN_PULSE_HEART);

  String mq3Status = "NORMAL";
  if (mq3Raw > 2500) {
    mq3Status = "ALERT";
  }

  String heartStatus = "NORMAL";
  if (heartRaw < 1000) heartStatus = "LOW";
  else if (heartRaw > 3000) heartStatus = "HIGH";

  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"mq3Raw\":" + String(mq3Raw) + ",";
  payload += "\"mq3Status\":\"" + mq3Status + "\",";
  payload += "\"heartRaw\":" + String(heartRaw) + ",";
  payload += "\"heartStatus\":\"" + heartStatus + "\",";
  payload += "\"flame\":\"" + flameState + "\",";
  payload += "\"smoke\":\"" + smokeState + "\",";
  payload += "\"motion\":\"" + motionState + "\",";
  payload += "\"frequency\":\"" + frequencyState + "\",";
  payload += "\"accident\":\"" + accidentState + "\",";
  payload += "\"gps\":\"" + gpsState + "\",";
  payload += "\"lat\":" + String(gpsLat, 6) + ",";
  payload += "\"lng\":" + String(gpsLng, 6) + ",";
  payload += "\"speedKmph\":" + String(speedKmph, 1) + ",";
  payload += "\"btConnected\":" + String(btConnected ? "true" : "false") + ",";
  payload += "\"uptimeS\":" + String(millis() / 1000);
  payload += "}";

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", API_KEY);
  http.setTimeout(1500);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    // 204 No Content expected
  } else {
    Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ----------------- MAIN LOOP -----------------
void loop() {
  offlineServer.handleClient();
  readBluetoothData();

  if (millis() - lastUploadTime >= 1000) {
    lastUploadTime = millis();
    uploadTelemetry();
  }
}
