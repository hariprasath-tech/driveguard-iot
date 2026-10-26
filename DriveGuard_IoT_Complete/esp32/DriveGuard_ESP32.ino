#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------- Wi-Fi / backend configuration ----------
const char* WIFI_SSID = "Deena";
const char* WIFI_PASSWORD = "12347891";
const char* SERVER_URL = "http://172.30.20.12:3000/api/telemetry";
const char* DEVICE_KEY = "dg_device_key_secret_12345";
const char* DEVICE_ID = "CAR-001";

// ---------- Sensor pin mapping: change to match your wiring ----------
const int MQ3_PIN = 34;        // ESP32 ADC input-only pin
const int FLAME_PIN = 27;      // Digital output from flame module
const int SMOKE_PIN = 26;      // Digital output from smoke module
const int ACCIDENT_PIN = 25;   // Digital output from impact/accident module
const int MOTION_PIN = 33;     // Optional motion sensor; set -1 if unused

// Many sensor modules output LOW when triggered. Set false if yours outputs HIGH.
const bool ACTIVE_LOW_FLAME = true;
const bool ACTIVE_LOW_SMOKE = true;
const bool ACTIVE_LOW_ACCIDENT = true;
const bool ACTIVE_LOW_MOTION = true;

// MQ-3 raw value is only a demo indicator; it is NOT a calibrated alcohol concentration.
const int MQ3_ALERT_THRESHOLD = 2500;
const unsigned long POST_INTERVAL_MS = 2000;
unsigned long lastPostMs = 0;
unsigned long bootMs = 0;

bool simulatedFlame = false;
bool simulatedSmoke = false;
bool simulatedAccident = false;
bool simulatedAlcohol = false;
bool useSimulatedEvents = true;

bool readTriggered(int pin, bool activeLow) {
  if (pin < 0) return false;
  int value = digitalRead(pin);
  return activeLow ? value == LOW : value == HIGH;
}

void printHelp() {
  Serial.println("\nCommands: f=toggle simulated flame, s=toggle smoke, a=toggle alcohol alert, c=toggle accident, n=clear simulated alerts, h=help");
}

void handleSerial() {
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\r' || ch == '\n' || ch == ' ') continue;
    switch (ch) {
      case 'f': simulatedFlame = !simulatedFlame; Serial.printf("Simulated flame: %s\n", simulatedFlame ? "ON" : "OFF"); break;
      case 's': simulatedSmoke = !simulatedSmoke; Serial.printf("Simulated smoke: %s\n", simulatedSmoke ? "ON" : "OFF"); break;
      case 'a': simulatedAlcohol = !simulatedAlcohol; Serial.printf("Simulated alcohol: %s\n", simulatedAlcohol ? "ON" : "OFF"); break;
      case 'c': simulatedAccident = !simulatedAccident; Serial.printf("Simulated accident: %s\n", simulatedAccident ? "ON" : "OFF"); break;
      case 'n': simulatedFlame = simulatedSmoke = simulatedAlcohol = simulatedAccident = false; Serial.println("All simulated alerts cleared"); break;
      case 'h': printHelp(); break;
      default: Serial.println("Unknown command. Type h for help."); break;
    }
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to hotspot '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed. Check hotspot, password, and 2.4 GHz setting.");
  }
}

void postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected; reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  int mq3Raw = analogRead(MQ3_PIN);
  bool flame = readTriggered(FLAME_PIN, ACTIVE_LOW_FLAME) || simulatedFlame;
  bool smoke = readTriggered(SMOKE_PIN, ACTIVE_LOW_SMOKE) || simulatedSmoke;
  bool accident = readTriggered(ACCIDENT_PIN, ACTIVE_LOW_ACCIDENT) || simulatedAccident;
  bool motion = readTriggered(MOTION_PIN, ACTIVE_LOW_MOTION);
  bool alcoholAlert = (mq3Raw >= MQ3_ALERT_THRESHOLD) || simulatedAlcohol;

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["mq3Raw"] = mq3Raw;
  doc["mq3Status"] = alcoholAlert ? "ALERT" : "NORMAL";
  doc["heartRaw"] = 0;
  doc["heartStatus"] = "NOT_CONNECTED";
  doc["flame"] = flame;
  doc["smoke"] = smoke;
  doc["motion"] = motion;
  doc["frequency"] = 0;
  doc["accident"] = accident;
  doc["gps"] = "SIMULATED";
  doc["lat"] = 11.0168;
  doc["lng"] = 76.9558;
  doc["speedKmph"] = 0;
  doc["btConnected"] = false;
  doc["uptimeS"] = (millis() - bootMs) / 1000;

  String payload;
  serializeJson(doc, payload);

  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(4000);
  http.setTimeout(4000);

  if (!http.begin(client, SERVER_URL)) {
    Serial.println("HTTP begin failed. Check SERVER_URL.");
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  int code = http.POST(payload);

  Serial.printf("[POST] HTTP: %d | Flame: %s | Smoke: %s | MQ3: %d | Accident: %s\n",
    code, flame ? "DETECTED" : "NOT DETECTED",
    smoke ? "DETECTED" : "NOT DETECTED",
    mq3Raw, accident ? "DETECTED" : "NOT DETECTED");

  if (code < 0) {
    Serial.printf("Connection error: %s\n", http.errorToString(code).c_str());
  } else if (code == 401) {
    Serial.println("API key mismatch: check DEVICE_KEY in ESP32 and backend.");
  } else if (code >= 400) {
    Serial.printf("Backend response: %s\n", http.getString().c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(700);
  bootMs = millis();
  analogReadResolution(12);
  pinMode(FLAME_PIN, INPUT_PULLUP);
  pinMode(SMOKE_PIN, INPUT_PULLUP);
  pinMode(ACCIDENT_PIN, INPUT_PULLUP);
  if (MOTION_PIN >= 0) pinMode(MOTION_PIN, INPUT_PULLUP);
  Serial.println("\nDriveGuard IoT starting...");
  printHelp();
  connectWiFi();
}

void loop() {
  handleSerial();
  if (millis() - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = millis();
    postTelemetry();
  }
  delay(10);
}
