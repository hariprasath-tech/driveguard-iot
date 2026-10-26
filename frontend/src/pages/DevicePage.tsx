import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import {
  Cpu,
  Bluetooth,
  Wifi,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertCircle,
  Radio,
  Server
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { SystemHealth } from '../types';

export const DevicePage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<SystemHealth>('/api/health')
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 m-0">
            <Cpu className="w-6 h-6 text-sky-400" />
            Device Hardware & Topology
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Hardware architecture, dual ESP32 communication bus, and server runtime diagnostics
          </p>
        </div>

        {/* Backend Node.js Server Diagnostics */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Backend System Health
              </h2>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Checking...' : health?.status?.toUpperCase() || 'OK'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500">SERVER UPTIME</span>
              <p className="text-base font-bold text-slate-200 mt-1">
                {health?.uptime ? `${Math.floor(health.uptime / 60)}m ${health.uptime % 60}s` : '--'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500">DATABASE STATUS</span>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {health?.db ? 'SQLite WAL OK' : 'Degraded'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500">LAST TELEMETRY PACKET</span>
              <p className="text-base font-bold text-sky-400 mt-1">
                {health?.lastPacketAgeMs !== null && health?.lastPacketAgeMs !== undefined
                  ? `${Math.floor(health.lastPacketAgeMs / 1000)}s ago`
                  : 'Awaiting sync'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500">INGESTION API</span>
              <p className="text-base font-bold text-slate-200 mt-1">POST /api/telemetry</p>
            </div>
          </div>
        </div>

        {/* Dual ESP32 Topology cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Node 1: Gateway */}
          <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  ESP32 #1: IN-CAR GATEWAY
                </span>
                <span className="text-xs font-mono text-slate-400">SAFETY_ESP32_1</span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Display, Wi-Fi & Primary Ingestion</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Receives Bluetooth sensor packet from Node 2, samples MQ-3 and Pulse, powers ILI9488 TFT display, and POSTs to cloud backend every 1 second.
              </p>

              <div className="mt-5 space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">MQ-3 Alcohol Sensor:</span>
                  <span className="text-slate-200 font-bold">ADC GPIO35</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Heart Pulse Sensor:</span>
                  <span className="text-slate-200 font-bold">ADC GPIO34</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">In-Car TFT & Touch:</span>
                  <span className="text-slate-200 font-bold">ILI9488 480x320</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Offline Wi-Fi Access Point:</span>
                  <span className="text-amber-400 font-bold">http://192.168.4.1</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Firmware target: firmware/esp32_gateway</span>
            </div>
          </div>

          {/* Node 2: Sensor Node */}
          <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  ESP32 #2: SENSOR NODE
                </span>
                <span className="text-xs font-mono text-slate-400">SAFETY_ESP32_2</span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Hazard Detection & GPS Node</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Continuous hardware sampling node. Reads flame, smoke, PIR motion, accelerometer, and NEO-6M satellite coordinates.
              </p>

              <div className="mt-5 space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Bluetooth Classic MAC:</span>
                  <span className="text-purple-300 font-bold">14:08:08:A6:3B:56</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Flame Sensor DO:</span>
                  <span className="text-slate-200 font-bold">GPIO26 (Boot auto-calibrated)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">MQ-2 Smoke AO:</span>
                  <span className="text-slate-200 font-bold">GPIO33</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">MPU Accelerometer (I2C):</span>
                  <span className="text-slate-200 font-bold">SDA 21 / SCL 22 (0x70)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">NEO-6M GPS Module:</span>
                  <span className="text-slate-200 font-bold">TX 16 / RX 17 (9600 baud)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Firmware target: firmware/esp32_node</span>
            </div>
          </div>
        </div>

        {/* Bluetooth Packet Wire Protocol Reference */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            Bluetooth Classic Wire Protocol (ESP32 #2 to #1)
          </h3>
          <p className="text-xs text-slate-400 font-mono mb-4">
            ESP32 #2 streams clean newline-delimited ASCII records. Only these keys are transmitted to prevent buffer saturation:
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
{`FLAME: NOT DETECTED
SMOKE: NOT DETECTED
MOTION: DETECTED
FREQUENCY: EMITTED
ACCIDENT: NOT DETECTED
GPS: FIXED
END`}
          </pre>
        </div>
      </main>
    </div>
  );
};
