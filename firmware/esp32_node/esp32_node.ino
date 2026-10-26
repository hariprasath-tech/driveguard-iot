/**
 * DriveGuard IoT - ESP32 #2: Sensor Node Firmware (SAFETY_ESP32_2)
 *
 * Board: ESP32 Dev Module
 * Partition Scheme: Huge APP (3MB No OTA)
 * Required Libraries:
 *   - BluetoothSerial
 *   - TinyGPSPlus
 *   - Wire
 */

#include <Arduino.h>
#include <BluetoothSerial.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <Wire.h>

// ----------------- PIN DEFINITIONS -----------------
#define PIN_FLAME        26
#define PIN_MQ2_SMOKE    33
#define PIN_PIR_MOTION   27
#define PIN_TCT50_CTRL   25
#define PIN_GPS_RX       16
#define PIN_GPS_TX       17
#define PIN_I2C_SDA      21
#define PIN_I2C_SCL      22

#define MPU_ADDR         0x68 // or 0x70

// ----------------- GLOBALS -----------------
BluetoothSerial SerialBT;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

int flameIdleLevel = HIGH;
unsigned long lastPacketSend = 0;

// ----------------- MPU INITIALIZATION & READ -----------------
void initMPU() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Power Management 1 register
  Wire.write(0);    // Wake up MPU
  Wire.endTransmission(true);
}

bool checkAccident() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register for Accel X, Y, Z
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  if (Wire.available() >= 6) {
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();

    float totalG = sqrt(pow(ax / 16384.0, 2) + pow(ay / 16384.0, 2) + pow(az / 16384.0, 2));
    // High shock threshold (> 3.5g impact)
    if (totalG > 3.5) {
      return true;
    }
  }
  return false;
}

// ----------------- SETUP -----------------
void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);

  pinMode(PIN_FLAME, INPUT_PULLUP);
  pinMode(PIN_MQ2_SMOKE, INPUT);
  pinMode(PIN_PIR_MOTION, INPUT);
  pinMode(PIN_TCT50_CTRL, OUTPUT);
  digitalWrite(PIN_TCT50_CTRL, HIGH); // Enable ultrasonic transducer

  initMPU();

  // Learn flame idle baseline at boot (keep flame away during boot!)
  delay(1000);
  flameIdleLevel = digitalRead(PIN_FLAME);
  Serial.printf("[SensorNode] Flame baseline learned: %d\n", flameIdleLevel);

  // Bluetooth Classic advertising as SAFETY_ESP32_2
  SerialBT.begin("SAFETY_ESP32_2");
  Serial.println("[BT] Bluetooth Classic Node 2 advertising started.");
}

// ----------------- MAIN LOOP -----------------
void loop() {
  // Feed GPS parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastPacketSend >= 1000) {
    lastPacketSend = millis();

    // 1. Flame check (active state differs from boot baseline)
    int flameCurrent = digitalRead(PIN_FLAME);
    bool flameDetected = (flameCurrent != flameIdleLevel);

    // 2. Smoke check (raw ADC threshold)
    int smokeVal = analogRead(PIN_MQ2_SMOKE);
    bool smokeDetected = (smokeVal > 1800);

    // 3. Motion check
    bool motionDetected = (digitalRead(PIN_PIR_MOTION) == HIGH);

    // 4. Accident shock check
    bool accidentDetected = checkAccident();

    // 5. GPS fix check
    bool gpsFixed = gps.location.isValid();
    float lat = gpsFixed ? gps.location.lat() : 0.0;
    float lng = gpsFixed ? gps.location.lng() : 0.0;
    float speed = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

    // Send ASCII bluetooth packet to Gateway #1
    SerialBT.println(flameDetected ? "FLAME: DETECTED" : "FLAME: NOT DETECTED");
    SerialBT.println(smokeDetected ? "SMOKE: DETECTED" : "SMOKE: NOT DETECTED");
    SerialBT.println(motionDetected ? "MOTION: DETECTED" : "MOTION: NOT DETECTED");
    SerialBT.println("FREQUENCY: EMITTED");
    SerialBT.println(accidentDetected ? "ACCIDENT: DETECTED" : "ACCIDENT: NOT DETECTED");
    SerialBT.println(gpsFixed ? "GPS: FIXED" : "GPS: NO FIX");
    if (gpsFixed) {
      SerialBT.printf("LAT: %.6f\n", lat);
      SerialBT.printf("LNG: %.6f\n", lng);
      SerialBT.printf("SPEED: %.1f\n", speed);
    }
    SerialBT.println("END");

    // Local Serial Monitor debug
    Serial.printf("[Node2 Stream] Flame:%d, Smoke:%d, Motion:%d, Acc:%d, GPS:%s\n",
      flameDetected, smokeDetected, motionDetected, accidentDetected, gpsFixed ? "FIX" : "NO_FIX");
  }
}
