import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { Wine, Heart, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { TelemetryData } from '../types';

interface SensorMeterCardProps {
  type: 'mq3' | 'heart';
  currentValue: number;
  status: string;
  history: TelemetryData[];
}

export const SensorMeterCard: React.FC<SensorMeterCardProps> = ({
  type,
  currentValue,
  status,
  history
}) => {
  const isAlcohol = type === 'mq3';

  // Sensor specifications
  const title = isAlcohol ? 'MQ-3 Alcohol Sensor' : 'Driver Heart Pulse';
  const rawLabel = isAlcohol ? 'RAW ADC (NOT BAC)' : 'RAW SIGNAL (NOT BPM)';
  const maxScale = 4095; // ESP32 12-bit ADC max (0-4095)
  const Icon = isAlcohol ? Wine : Heart;

  // Thresholds
  const alcoholThreshold = 2500;
  const heartLow = 1000;
  const heartHigh = 3000;

  // Percentage for progress meter
  const meterPercent = Math.min(Math.max((currentValue / maxScale) * 100, 0), 100);

  // Status badge styling
  let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
  let StatusIcon = CheckCircle2;
  let chartStroke = '#38bdf8';

  if (status === 'ALERT' || status === 'HIGH' || status === 'LOW') {
    badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    StatusIcon = AlertTriangle;
    chartStroke = '#ef4444';
  } else if (status === 'WARMING UP') {
    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    StatusIcon = Clock;
    chartStroke = '#f59e0b';
  } else if (status === 'NORMAL') {
    badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    StatusIcon = CheckCircle2;
    chartStroke = '#22c55e';
  }

  // Prepare 90s sparkline data points
  const sparklineData = history.map((item, idx) => ({
    idx,
    val: isAlcohol ? item.mq3Raw : item.heartRaw
  }));

  return (
    <div className="rounded-2xl bg-[#131b2c] p-5 border border-slate-800/80 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${isAlcohol ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
              <span className="text-[10px] font-mono font-bold tracking-wider text-sky-400 uppercase">
                {rawLabel}
              </span>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${badgeClass}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status || 'WAITING'}</span>
          </span>
        </div>

        {/* Big Raw Value Display */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-black font-mono tracking-tight text-white">
            {currentValue ?? '--'}
          </span>
          <span className="text-xs font-mono text-slate-500">/ 4095 ADC</span>
        </div>

        {/* Meter Gauge with threshold markers */}
        <div className="mt-4">
          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                status === 'ALERT' || status === 'HIGH' || status === 'LOW'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-sky-500 to-emerald-400'
              }`}
              style={{ width: `${meterPercent}%` }}
            />
          </div>

          {/* Marker lines description */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
            <span>0</span>
            {isAlcohol ? (
              <span className="text-amber-400/80 font-bold">Alert Threshold: {alcoholThreshold}</span>
            ) : (
              <span>Safe Zone: {heartLow} - {heartHigh}</span>
            )}
            <span>4095</span>
          </div>
        </div>
      </div>

      {/* 90-second Sparkline Trend */}
      <div className="mt-5 pt-4 border-t border-slate-800/60">
        <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-slate-400">
          <span>90s Rolling Signal</span>
          <span>{sparklineData.length} pts</span>
        </div>
        <div className="h-16 w-full">
          {sparklineData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <YAxis domain={[0, 4095]} hide />
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke={chartStroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-600 bg-slate-900/30 rounded-lg">
              Collecting sparkline points...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
