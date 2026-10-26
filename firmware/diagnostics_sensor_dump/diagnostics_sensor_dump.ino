/**
 * DriveGuard IoT - Hardware Diagnostic Sensor Dump
 * 
 * Upload this sketch to verify all sensor connections, wiring, and I2C/Serial buses.
 * It dumps all raw sensor readings directly to Serial Monitor (115200 baud).
 * No Wi-Fi or Bluetooth required.
 *
 * Pin Map:
 *   - GPIO21: I2C SDA (MPU6050 Accelerometer)
 *   - GPIO22: I2C SCL (MPU6050 Accelerometer)
 *   - GPIO26: Flame Sensor Digital Out (DO)
 *   - GPIO27: PIR Motion Sensor Out
 *   - GPIO33: MQ-2 Smoke Sensor Analog (AO)
 *   - GPIO34: Pulse Sensor Analog (AO)
 *   - GPIO35: MQ-3 Alcohol Sensor Analog (AO)
 *   - GPIO16: GPS TX -> ESP32 RX2
 *   - GPIO17: GPS RX -> ESP32 TX2
 *   - GPIO25: TCT50 Ultrasonic Control
 */

#include <Arduino.h>
#include <Wire.h>

#define PIN_FLAME        26
#define PIN_PIR_MOTION   27
#define PIN_MQ2_SMOKE    33
#define PIN_PULSE_HEART  34
#define PIN_MQ3_ALCOHOL  35
#define PIN_TCT50_CTRL   25
#define PIN_GPS_RX       16
#define PIN_GPS_TX       17

#define I2C_SDA          21
#define I2C_SCL          22

HardwareSerial gpsSerial(2);

void scanI2C() {
  Serial.println("\n--- Scanning I2C Bus (SDA:21, SCL:22) ---");
  byte count = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("  [✓] I2C device detected at 0x%02X", address);
      if (address == 0x68 || address == 0x70) {
        Serial.print(" (MPU6050 Accelerometer/Gyro)");
      }
      Serial.println();
      count++;
    }
  }
  if (count == 0) {
    Serial.println("  [!] No I2C devices detected. Check SDA/SCL wires & common GND.");
  }
  Serial.println("-----------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("==========================================");
  Serial.println("   🚗 DriveGuard Hardware Diagnostic Dump  ");
  Serial.println("==========================================");

  // Initialize GPIO pins
  pinMode(PIN_FLAME, INPUT_PULLUP);
  pinMode(PIN_PIR_MOTION, INPUT);
  pinMode(PIN_MQ2_SMOKE, INPUT);
  pinMode(PIN_PULSE_HEART, INPUT);
  pinMode(PIN_MQ3_ALCOHOL, INPUT);
  pinMode(PIN_TCT50_CTRL, OUTPUT);
  digitalWrite(PIN_TCT50_CTRL, HIGH);

  // Initialize I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  scanI2C();

  // Initialize GPS UART2
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("Listening for NEO-6M GPS on GPIO16/17 at 9600 baud...");
}

void loop() {
  // Read Digital & Analog Sensors
  int flameVal   = digitalRead(PIN_FLAME);
  int motionVal  = digitalRead(PIN_PIR_MOTION);
  int mq2Smoke   = analogRead(PIN_MQ2_SMOKE);
  int heartPulse = analogRead(PIN_PULSE_HEART);
  int mq3Alcohol = analogRead(PIN_MQ3_ALCOHOL);

  // Check GPS raw characters
  int gpsBytes = gpsSerial.available();
  String gpsPreview = "";
  while (gpsSerial.available() > 0 && gpsPreview.length() < 30) {
    char c = gpsSerial.read();
    if (c >= 32 && c <= 126) gpsPreview += c;
  }

  // Print Formatted Dump
  Serial.println("---------------- SENSOR DUMP ----------------");
  Serial.printf("  [1] Flame DO (GPIO26):      %d (%s)\n", flameVal, flameVal == LOW ? "FLAME DETECTED" : "CLEAR");
  Serial.printf("  [2] PIR Motion (GPIO27):    %d (%s)\n", motionVal, motionVal == HIGH ? "MOTION DETECTED" : "IDLE");
  Serial.printf("  [3] MQ-2 Smoke AO (GPIO33): %d / 4095 ADC (%s)\n", mq2Smoke, mq2Smoke > 1800 ? "HIGH SMOKE" : "NORMAL");
  Serial.printf("  [4] MQ-3 Alcohol (GPIO35):  %d / 4095 ADC (%s)\n", mq3Alcohol, mq3Alcohol > 2500 ? "ALCOHOL ALERT" : "SOBER");
  Serial.printf("  [5] Pulse Signal (GPIO34):  %d / 4095 ADC\n", heartPulse);
  Serial.printf("  [6] GPS UART (GPIO16/17):   %d bytes available\n", gpsBytes);
  if (gpsPreview.length() > 0) {
    Serial.printf("      NMEA Sample: %s\n", gpsPreview.c_str());
  } else {
    Serial.println("      NMEA Sample: (Waiting for GPS satellite fix/data)");
  }
  Serial.printf("  [7] Uptime: %lu ms\n", millis());
  Serial.println("---------------------------------------------\n");

  delay(1000);
}
