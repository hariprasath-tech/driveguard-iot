================================================================================
DRIVEGUARD IOT — COMPLETE WORKING SETUP GUIDE
Hotspot: Deena | PC IP: 172.30.20.12 | Port: 3000
================================================================================

PROJECT STRUCTURE:
- backend/server.js          : Node.js Express API listening on 0.0.0.0:3000
- backend/public/index.html  : Real-time Cockpit Dashboard (Zero readings when offline)
- backend/package.json       : Configured with `npm start` -> `node server.js`
- esp32/DriveGuard_ESP32.ino : ESP32 firmware configured for 'Deena' hotspot & PC IP
- README.txt                 : This complete guide

--------------------------------------------------------------------------------
STEP 1: START THE BACKEND SERVER
--------------------------------------------------------------------------------
1. Open PowerShell on your PC:
   cd C:\Users\arumu\driveguard-iot\backend
   npm start

2. Expected terminal output:
   DriveGuard API listening on http://0.0.0.0:3000
   Local dashboard: http://localhost:3000
   LAN dashboard:   http://172.30.20.12:3000
   Health endpoint: http://localhost:3000/api/health

   * DO NOT CLOSE THIS POWERSHELL WINDOW *

--------------------------------------------------------------------------------
STEP 2: VERIFY API & HEALTH ENDPOINT
--------------------------------------------------------------------------------
1. Open your browser and visit:
   http://localhost:3000
   or
   http://172.30.20.12:3000

2. Check API health:
   http://localhost:3000/api/health

   Expected Response:
   {
     "ok": true,
     "service": "DriveGuard IoT API",
     "port": 3000,
     "lanIp": "172.30.20.12",
     "esp32Connected": false,
     "time": "..."
   }

3. Test port connectivity from another PowerShell window:
   Test-NetConnection 172.30.20.12 -Port 3000

   Expected result:
   TcpTestSucceeded : True

--------------------------------------------------------------------------------
STEP 3: UPLOAD CODE TO ESP32
--------------------------------------------------------------------------------
1. Connect ESP32 to PC via USB cable.
2. Open Arduino IDE.
3. Install required library if not already installed:
   - Go to Tools -> Manage Libraries...
   - Search for "ArduinoJson" by Benoit Blanchon and install version 6 or 7.
4. Open the file:
   C:\Users\arumu\driveguard-iot\esp32\DriveGuard_ESP32.ino
5. Check Wi-Fi Credentials in code:
   - const char* WIFI_SSID = "Deena";
   - const char* WIFI_PASSWORD = "your_hotspot_password"; (Make sure hotspot is 2.4 GHz)
6. Select your Board (e.g., "ESP32 Dev Module") and correct COM Port.
7. Click "Verify", then "Upload" (Do NOT use Debug).

--------------------------------------------------------------------------------
STEP 4: SERIAL MONITOR & LIVE TESTING
--------------------------------------------------------------------------------
1. In Arduino IDE, open Tools -> Serial Monitor.
2. Set baud rate to: 115200.
3. When ESP32 connects to 'Deena' hotspot, it will display:
   [SUCCESS] Wi-Fi Connected!
   ESP32 IP Address : ...
   Target Backend   : http://172.30.20.12:3000/api/telemetry
4. Send single-letter test commands in the Serial Monitor:
   - 'f' : Toggle Flame Alert
   - 's' : Toggle Smoke Alert
   - 'a' : Toggle Alcohol Alert (MQ-3)
   - 'c' : Toggle Accident / Crash Alert
   - 'n' : Clear all alerts (back to normal)
   - 'h' : Show help menu

5. Watch the dashboard at http://localhost:3000 update in real-time!
   - When ESP32 is connected: Live sensor readings display in green/red badges.
   - When ESP32 is powered off or disconnected: All readings show 0 (no fake data).

--------------------------------------------------------------------------------
TROUBLESHOOTING & FIREWALL
--------------------------------------------------------------------------------
1. If Test-NetConnection fails or ESP32 reports HTTP Connection Error:
   Run PowerShell as Administrator and add an inbound firewall rule:
   New-NetFirewallRule -DisplayName "DriveGuard Node API 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private

2. Ensure your phone hotspot has "Client isolation" disabled so devices can communicate.
3. If your PC IP changes from 172.30.20.12, update SERVER_URL in esp32/DriveGuard_ESP32.ino.
================================================================================
