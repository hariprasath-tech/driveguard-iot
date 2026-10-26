DRIVEGUARD IOT — COMPLETE STARTER PROJECT
==========================================

Folder contents:
- backend/                 Node.js + Express API and dashboard
- esp32/DriveGuard_ESP32.ino
                           ESP32 telemetry sketch

IMPORTANT NETWORK SETTINGS
--------------------------
Hotspot SSID: Deena
PC IPv4 at the time this code was prepared: 172.30.20.12
Backend port: 3000
Telemetry endpoint: /api/telemetry
Device key: dg_device_key_secret_12345

If the PC IPv4 changes, update SERVER_URL in the ESP32 sketch.
PC and ESP32 must be connected to the same hotspot. Some phone hotspots
block communication between connected devices; if connection still fails,
test from the ESP32 serial monitor and check hotspot client isolation.

BACKEND SETUP (Windows PowerShell)
----------------------------------
1. Install Node.js LTS if it is not installed.
2. Open PowerShell and run:

   cd C:\Users\arumu\driveguard-iot\backend
   npm install
   npm start

   If you extracted this ZIP somewhere else, use that extracted backend path.

3. Keep this terminal open. Expected message:
   DriveGuard API listening on http://0.0.0.0:3000

4. In another PowerShell window test:
   Test-NetConnection 172.30.20.12 -Port 3000

5. On the PC browser open:
   http://localhost:3000
   Or from another device on the same hotspot:
   http://172.30.20.12:3000

6. Health test:
   Invoke-RestMethod http://localhost:3000/api/health

7. If local PC test succeeds but ESP32 still fails, check Windows Firewall
   and whether the phone hotspot allows device-to-device traffic.

WINDOWS FIREWALL (only if needed)
---------------------------------
Open PowerShell as Administrator and run:
   New-NetFirewallRule -DisplayName "DriveGuard Node API 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private

Use only on a trusted private network. Remove the rule later if no longer needed:
   Remove-NetFirewallRule -DisplayName "DriveGuard Node API 3000"

ESP32 SETUP
-----------
1. Arduino IDE: install the ESP32 board package for your exact board.
2. Install ArduinoJson library (Library Manager -> ArduinoJson by Benoit Blanchon).
3. Open esp32/DriveGuard_ESP32.ino.
4. Select the correct ESP32 board and COM port.
5. Click Verify, then Upload (not Debug/OpenOCD).
6. Open Serial Monitor at 115200 baud.
7. Commands: f=toggle simulated flame, s=toggle smoke, a=toggle alcohol,
   c=toggle accident, n=clear simulated alerts, h=help.

PIN SAFETY / SENSOR NOTES
-------------------------
- Pin mapping is a starting template; change pins to match your actual wiring.
- ESP32 GPIO pins are 3.3V only. Never apply 5V directly to GPIO.
- MQ-3 analog output must not exceed the ESP32 ADC input limit; use a
  suitable divider/conditioning circuit if the sensor module outputs 5V.
- Some sensor modules are active HIGH, not active LOW. Adjust ACTIVE_LOW_*
  settings to match the module's output.
- The code reports simulated GPS coordinates and placeholder heart/Bluetooth
  data. It does not provide real GPS, heart-rate, or Bluetooth integration.
- MQ-3 raw values are not a certified alcohol concentration. Do not use this
  prototype to make safety-critical driving decisions.
- Backend telemetry history is in RAM and clears when the backend restarts.
- The default device key is for local testing only; replace it before deployment.
