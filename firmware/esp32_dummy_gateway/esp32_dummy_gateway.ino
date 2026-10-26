/**
 * DriveGuard IoT - ESP32 Standalone Dummy Gateway Tester
 *
 * Use this sketch to test the entire Wi-Fi -> Backend -> Dashboard -> Alert pipeline
 * without needing any physical sensors wired to the ESP32!
 *
 * It sends realistic telemetry every 1s and lets you trigger emergencies
 * by typing commands into the Arduino Serial Monitor:
 *   'f' -> Trigger FLAME ALERT
 *   's' -> Trigger SMOKE ALERT
 *   'a' -> Trigger ALCOHOL ALERT
 *   'c' -> Trigger ACCIDENT COLLISION ALERT
 *   'n' -> Return to NORMAL
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ----------------- CONFIGURATION -----------------
const char* STA_SSID     = "YOUR_WIFI_SSID";
const char* STA_PASS     = "YOUR_WIFI_PASSWORD";
// Point to your backend IP address (use your computer's LAN IP e.g. 192.168.1.5)
const char* API_URL      = "http://192.168.1.100:3000/api/telemetry";
const char* API_KEY      = "dg_device_key_secret_12345";
const char* DEVICE_ID    = "CAR-001";

// Simulated vehicle state
String currentFlame     = "NOT DETECTED";
String currentSmoke     = "NOT DETECTED";
String currentMotion    = "NOT DETECTED";
String currentFrequency = "EMITTED";
String currentAccident  = "NOT DETECTED";
String currentGps       = "FIXED";
String currentMq3Status = "NORMAL";
int    currentMq3Raw    = 1200;
int    currentHeartRaw  = 2048;
float  currentLat       = 12.971598;
float  currentLng       = 77.594562;
float  currentSpeed     = 42.5;

unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n==========================================");
  Serial.println("  🚗 DriveGuard ESP32 Dummy Gateway Tester ");
  Serial.println("==========================================");
  Serial.println("Controls via Serial Monitor (send letter):");
  Serial.println("  [f] -> Trigger FLAME ALERT");
  Serial.println("  [s] -> Trigger SMOKE ALERT");
  Serial.println("  [a] -> Trigger ALCOHOL ALERT");
  Serial.println("  [c] -> Trigger ACCIDENT COLLISION");
  Serial.println("  [n] -> Reset to NORMAL NOMINAL");
  Serial.println("==========================================\n");

  WiFi.begin(STA_SSID, STA_PASS);
  Serial.printf("Connecting to Wi-Fi: %s", STA_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[✓] Wi-Fi Connected! IP Address: " + WiFi.localIP().toString());
}

void loop() {
  // Check for Serial commands from user
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'f') {
      currentFlame = "DETECTED";
      Serial.println("\n>>> [COMMAND] FLAME ALERT INJECTED <<<");
    } else if (cmd == 's') {
      currentSmoke = "DETECTED";
      Serial.println("\n>>> [COMMAND] SMOKE ALERT INJECTED <<<");
    } else if (cmd == 'a') {
      currentMq3Raw = 3100;
      currentMq3Status = "ALERT";
      Serial.println("\n>>> [COMMAND] ALCOHOL ALERT INJECTED <<<");
    } else if (cmd == 'c') {
      currentAccident = "DETECTED";
      Serial.println("\n>>> [COMMAND] ACCIDENT IMPACT INJECTED <<<");
    } else if (cmd == 'n') {
      currentFlame = "NOT DETECTED";
      currentSmoke = "NOT DETECTED";
      currentAccident = "NOT DETECTED";
      currentMq3Status = "NORMAL";
      currentMq3Raw = 1200;
      Serial.println("\n>>> [COMMAND] RESET ALL TO NORMAL <<<");
    }
  }

  // Send telemetry every 1 second
  if (millis() - lastSend >= 1000) {
    lastSend = millis();

    // Subtle drift in GPS and pulse for realism
    currentLat += (random(-5, 6)) * 0.00005;
    currentLng += (random(-5, 6)) * 0.00005;
    currentHeartRaw = 2000 + random(-80, 80);
    if (currentMq3Status == "NORMAL") {
      currentMq3Raw = 1180 + random(-50, 50);
    }

    String payload = "{";
    payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
    payload += "\"mq3Raw\":" + String(currentMq3Raw) + ",";
    payload += "\"mq3Status\":\"" + currentMq3Status + "\",";
    payload += "\"heartRaw\":" + String(currentHeartRaw) + ",";
    payload += "\"heartStatus\":\"NORMAL\",";
    payload += "\"flame\":\"" + currentFlame + "\",";
    payload += "\"smoke\":\"" + currentSmoke + "\",";
    payload += "\"motion\":\"" + currentMotion + "\",";
    payload += "\"frequency\":\"" + currentFrequency + "\",";
    payload += "\"accident\":\"" + currentAccident + "\",";
    payload += "\"gps\":\"" + currentGps + "\",";
    payload += "\"lat\":" + String(currentLat, 6) + ",";
    payload += "\"lng\":" + String(currentLng, 6) + ",";
    payload += "\"speedKmph\":" + String(currentSpeed, 1) + ",";
    payload += "\"btConnected\":true,";
    payload += "\"uptimeS\":" + String(millis() / 1000);
    payload += "}";

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(API_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-device-key", API_KEY);
      http.setTimeout(1200);

      int httpCode = http.POST(payload);
      Serial.printf("[POST 1s] HTTP: %d | Flame: %s | Smoke: %s | Alc: %d | Acc: %s\n",
        httpCode, currentFlame.c_str(), currentSmoke.c_str(), currentMq3Raw, currentAccident.c_str());
      http.end();
    } else {
      Serial.println("[!] Wi-Fi Disconnected!");
    }
  }
}
