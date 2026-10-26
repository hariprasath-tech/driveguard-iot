import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { History, Calendar, RefreshCw, BarChart2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { TelemetryData } from '../types';

export const HistoryPage: React.FC = () => {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangeHours, setRangeHours] = useState<number>(1);
  const [downsampleBucket, setDownsampleBucket] = useState<number>(0); // 0 = raw

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const to = Date.now();
      const from = to - rangeHours * 60 * 60 * 1000;
      let url = `/api/history?from=${from}&to=${to}&limit=1000`;
      if (downsampleBucket > 0) {
        url += `&bucket=${downsampleBucket}`;
      }

      const res = await apiFetch<TelemetryData[]>(url);
      setData(res);
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  }, [rangeHours, downsampleBucket]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formattedChartData = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    mq3Raw: d.mq3Raw,
    heartRaw: d.heartRaw,
    speedKmph: d.speedKmph || 0
  }));

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 m-0">
              <History className="w-6 h-6 text-sky-400" />
              Telemetry Analytics & History
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Historical trends, analog waveform analysis, and vehicle speed records
            </p>
          </div>

          <button
            onClick={loadHistory}
            className="px-4 py-2 rounded-xl bg-[#131b2c] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono flex items-center gap-2 self-start sm:self-auto transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Timeline</span>
          </button>
        </div>

        {/* Range & Downsample Controls */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              Time Range:
            </span>

            {[
              { label: 'Past 1h', hours: 1 },
              { label: 'Past 6h', hours: 6 },
              { label: 'Past 24h', hours: 24 },
              { label: 'Past 7d', hours: 168 }
            ].map((p) => (
              <button
                key={p.hours}
                onClick={() => setRangeHours(p.hours)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                  rangeHours === p.hours
                    ? 'bg-sky-500 text-white font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Downsampling:</span>
            <select
              value={downsampleBucket}
              onChange={(e) => setDownsampleBucket(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="0">Raw Ingestion (1s)</option>
              <option value="10">10-Second Buckets</option>
              <option value="60">1-Minute Buckets</option>
            </select>
          </div>
        </div>

        {/* Chart 1: MQ-3 Alcohol and Heart Raw ADC signals */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Driver Health & Sobriety Signals</h3>
              <p className="text-xs text-slate-400 font-mono">
                Analog ADC curves (MQ-3 Alcohol Sensor vs Heart Pulse Monitor)
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{formattedChartData.length} samples</span>
          </div>

          <div className="h-72 w-full">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 4095]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0e18',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mq3Raw"
                    name="MQ-3 Alcohol (Raw ADC)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="heartRaw"
                    name="Heart Pulse (Raw Signal)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
                {loading ? 'Fetching historical samples...' : 'No telemetry points available for chosen period.'}
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Vehicle Speed Profile */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Vehicle Speed Telemetry (GPS)</h3>
              <p className="text-xs text-slate-400 font-mono">
                Computed velocity in km/h from NEO-6M satellite fix
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 'auto']} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0e18',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="speedKmph"
                    name="Speed (km/h)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
                {loading ? 'Fetching historical speed...' : 'No speed data available.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
