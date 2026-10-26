#include <WiFi.h>
#include <HTTPClient.h>

// ============================================================================
// DRIVEGUARD IOT — ESP32 TELEMETRY FIRMWARE
// Folder Name : DriveGuard_ESP32 (Matches sketch name for Arduino IDE)
// Target PC   : http://172.30.20.12:3000/api/telemetry
// Hotspot     : Deena
// ============================================================================

// ---------- Wi-Fi & Backend Configuration ----------
const char* WIFI_SSID     = "Deena";
const char* WIFI_PASSWORD = "your_hotspot_password_here"; // Set your hotspot password locally

// Target Node.js API endpoint on PC
const char* SERVER_URL    = "http://172.30.20.12:3000/api/telemetry";
// Device security authentication key
const char* DEVICE_KEY    = "dg_device_key_secret_12345";
const char* DEVICE_ID     = "CAR-001";

// ---------- Sensor Pin Mapping (ESP32 DevKit 38/30 Pin) ----------
const int MQ3_PIN      = 34;   // Analog Input (ADC1_CH6 - input only, 3.3V safe)
const int FLAME_PIN    = 27;   // Digital Input (Flame sensor DO)
const int SMOKE_PIN    = 26;   // Digital Input (MQ-2 / Smoke sensor DO)
const int ACCIDENT_PIN = 25;   // Digital Input (Vibration / SW-420 / Impact sensor)
const int MOTION_PIN   = 33;   // Digital Input (PIR / Microwave / Motion; -1 if unused)

// Set to true if sensor DO pulls LOW when triggered (standard for LM393 modules)
const bool ACTIVE_LOW_FLAME    = true;
const bool ACTIVE_LOW_SMOKE    = true;
const bool ACTIVE_LOW_ACCIDENT = true;
const bool ACTIVE_LOW_MOTION   = true;

// MQ-3 threshold for demonstration alert (ADC range: 0-4095)
const int MQ3_ALERT_THRESHOLD  = 2500;
const unsigned long POST_INTERVAL_MS = 2000;

unsigned long lastPostMs = 0;
unsigned long bootMs = 0;

// Wi-Fi Connection Manager variables (prevents "sta is connecting, cannot set config" error)
const unsigned long WIFI_RETRY_INTERVAL_MS = 15000; // 15-second backoff between reconnect attempts
unsigned long lastConnectAttemptMs = 0;
bool wifiConnectedPrevious = false;

// Simulated test flags toggled via Serial Monitor
bool simulatedFlame    = false;
bool simulatedSmoke    = false;
bool simulatedAccident = false;
bool simulatedAlcohol  = false;

bool readTriggered(int pin, bool activeLow) {
  if (pin < 0) return false;
  int value = digitalRead(pin);
  return activeLow ? (value == LOW) : (value == HIGH);
}

void printHelp() {
  Serial.println("\n--------------------------------------------------");
  Serial.println("       DriveGuard Serial Test Commands Menu       ");
  Serial.println("--------------------------------------------------");
  Serial.println("  [f] -> Toggle Simulated Flame Alert");
  Serial.println("  [s] -> Toggle Simulated Smoke Alert");
  Serial.println("  [a] -> Toggle Simulated MQ-3 Alcohol Alert");
  Serial.println("  [c] -> Toggle Simulated Accident / Impact Alert");
  Serial.println("  [n] -> Clear All Simulated Alerts (Normal)");
  Serial.println("  [h] -> Print this Help Menu");
  Serial.println("--------------------------------------------------\n");
}

void handleSerial() {
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\r' || ch == '\n' || ch == ' ') continue;

    switch (ch) {
      case 'f':
        simulatedFlame = !simulatedFlame;
        Serial.printf("[TEST] Simulated Flame: %s\n", simulatedFlame ? "ALERT (DETECTED)" : "OFF (NORMAL)");
        break;
      case 's':
        simulatedSmoke = !simulatedSmoke;
        Serial.printf("[TEST] Simulated Smoke: %s\n", simulatedSmoke ? "ALERT (DETECTED)" : "OFF (NORMAL)");
        break;
      case 'a':
        simulatedAlcohol = !simulatedAlcohol;
        Serial.printf("[TEST] Simulated Alcohol: %s\n", simulatedAlcohol ? "ALERT (HIGH)" : "OFF (NORMAL)");
        break;
      case 'c':
        simulatedAccident = !simulatedAccident;
        Serial.printf("[TEST] Simulated Accident: %s\n", simulatedAccident ? "ALERT (COLLISION)" : "OFF (NORMAL)");
        break;
      case 'n':
        simulatedFlame = simulatedSmoke = simulatedAlcohol = simulatedAccident = false;
        Serial.println("[TEST] All simulated test alerts cleared. Returning to real sensor readings.");
        break;
      case 'h':
        printHelp();
        break;
      default:
        Serial.println("Unknown command. Type 'h' for help.");
        break;
    }
  }
}

// ----------------------------------------------------------------------------
// ROBUST WI-FI CONNECTION LOGIC
// Avoids repeated WiFi.begin() spam while ESP32 is already connecting
// ----------------------------------------------------------------------------
void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiConnectedPrevious) {
      wifiConnectedPrevious = true;
      Serial.println("\n==================================================");
      Serial.println(" [SUCCESS] Wi-Fi Connected to Hotspot!");
      Serial.print(" ESP32 IP Address : ");
      Serial.println(WiFi.localIP());
      Serial.print(" Target Backend   : ");
      Serial.println(SERVER_URL);
      Serial.println("==================================================");
    }
    return;
  }

  // Detected connection loss
  if (wifiConnectedPrevious) {
    wifiConnectedPrevious = false;
    Serial.println("\n[WIFI] Connection lost! Waiting before reconnecting...");
  }

  // Only initiate a new connection attempt after the backoff window
  if (lastConnectAttemptMs == 0 || millis() - lastConnectAttemptMs >= WIFI_RETRY_INTERVAL_MS) {
    lastConnectAttemptMs = millis();
    Serial.printf("\n[WIFI] Connecting to Mobile Hotspot '%s'...\n", WIFI_SSID);

    // Clean disconnect resets ESP-IDF station state to avoid "cannot set config" conflict
    WiFi.disconnect(true, true);
    delay(100);

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.setSleep(false); // Disable modem sleep for reliable mobile hotspot link
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    // Non-blocking skip: do NOT call WiFi.begin() here to prevent driver config conflicts
    static unsigned long lastNoticeMs = 0;
    if (millis() - lastNoticeMs > 5000) {
      lastNoticeMs = millis();
      Serial.println("[TELEMETRY] Skipping upload: Wi-Fi still connecting...");
    }
    return;
  }

  // Read actual hardware sensors
  int mq3Raw = analogRead(MQ3_PIN);
  if (simulatedAlcohol) {
    mq3Raw = 3200; // Inject simulated high alcohol reading
  }

  bool flame = readTriggered(FLAME_PIN, ACTIVE_LOW_FLAME) || simulatedFlame;
  bool smoke = readTriggered(SMOKE_PIN, ACTIVE_LOW_SMOKE) || simulatedSmoke;
  bool accident = readTriggered(ACCIDENT_PIN, ACTIVE_LOW_ACCIDENT) || simulatedAccident;
  bool motion = readTriggered(MOTION_PIN, ACTIVE_LOW_MOTION);
  bool alcoholAlert = (mq3Raw >= MQ3_ALERT_THRESHOLD);

  // Native lightweight JSON serialization (No external ArduinoJson library required!)
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"mq3Raw\":" + String(mq3Raw) + ",";
  payload += "\"mq3Status\":\"" + String(alcoholAlert ? "ALERT" : "NORMAL") + "\",";
  payload += "\"heartRaw\":0,";
  payload += "\"heartStatus\":\"NOT_CONNECTED\",";
  payload += "\"flame\":" + String(flame ? "true" : "false") + ",";
  payload += "\"smoke\":" + String(smoke ? "true" : "false") + ",";
  payload += "\"motion\":" + String(motion ? "true" : "false") + ",";
  payload += "\"accident\":" + String(accident ? "true" : "false") + ",";
  payload += "\"speedKmph\":0,";
  payload += "\"btConnected\":false,";
  payload += "\"uptimeS\":" + String((millis() - bootMs) / 1000);
  payload += "}";

  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(3000);

  if (!http.begin(client, SERVER_URL)) {
    Serial.println("[ERROR] Failed to initialize HTTP client. Check SERVER_URL.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  int httpCode = http.POST(payload);

  Serial.printf("[POST -> %d] Flame: %s | Smoke: %s | MQ3: %d | Impact: %s\n",
    httpCode,
    flame ? "ALERT" : "OK",
    smoke ? "ALERT" : "OK",
    mq3Raw,
    accident ? "ALERT" : "OK"
  );

  if (httpCode < 0) {
    Serial.printf(" [HTTP ERROR] %s\n", http.errorToString(httpCode).c_str());
    Serial.println(" -> Check if PC backend is running at http://172.30.20.12:3000");
    Serial.println(" -> Check Windows Firewall on port 3000");
  } else if (httpCode == 401) {
    Serial.println(" [AUTH ERROR] Device key rejected by backend.");
  }

  http.end();
}

// ============================================================================
// MANDATORY ARDUINO ENTRY FUNCTIONS: setup() and loop()
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  bootMs = millis();

  analogReadResolution(12);

  pinMode(FLAME_PIN, INPUT_PULLUP);
  pinMode(SMOKE_PIN, INPUT_PULLUP);
  pinMode(ACCIDENT_PIN, INPUT_PULLUP);
  if (MOTION_PIN >= 0) pinMode(MOTION_PIN, INPUT_PULLUP);

  Serial.println("\n==================================================");
  Serial.println("      DRIVEGUARD IOT - ESP32 FIRMWARE            ");
  Serial.println("==================================================");

  printHelp();

  // Initial Wi-Fi connection
  ensureWiFi();

  // Allow initial connection window without blocking indefinitely
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnectedPrevious = true;
    Serial.println("==================================================");
    Serial.println(" [SUCCESS] Wi-Fi Connected to Hotspot!");
    Serial.print(" ESP32 IP Address : ");
    Serial.println(WiFi.localIP());
    Serial.print(" Target Backend   : ");
    Serial.println(SERVER_URL);
    Serial.println("==================================================");
  } else {
    Serial.println(" [STATUS] Connecting in background. No repeated config spam.");
    Serial.println(" -> Verify hotspot SSID is 'Deena' (2.4 GHz)");
    Serial.println(" -> Ensure phone hotspot has client isolation turned off");
  }
}

void loop() {
  handleSerial();

  // Safe background Wi-Fi connection check (respects backoff timer)
  ensureWiFi();

  if (millis() - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = millis();
    postTelemetry();
  }

  delay(20);
}
