import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { Wine, Heart, AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
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

  // Human-friendly titles and explanations
  const title = isAlcohol ? 'Driver Sobriety & Alertness' : 'Driver Heart & Wellness';
  const rawSubtext = isAlcohol
    ? 'Raw sensor level (under 2,500 is sober & safe)'
    : 'Raw pulse signal (1,000 to 3,000 is steady)';
  const maxScale = 4095;
  const Icon = isAlcohol ? Wine : Heart;

  const alcoholThreshold = 2500;
  const heartLow = 1000;
  const heartHigh = 3000;

  const meterPercent = Math.min(Math.max((currentValue / maxScale) * 100, 0), 100);

  // Humanized status text
  let humanStatus = 'Connecting...';
  let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
  let StatusIcon = CheckCircle2;
  let chartStroke = '#38bdf8';

  if (isAlcohol) {
    if (status === 'ALERT') {
      humanStatus = 'Alcohol Alert!';
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      StatusIcon = AlertTriangle;
      chartStroke = '#ef4444';
    } else if (status === 'WARMING UP') {
      humanStatus = 'Warming Up';
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      StatusIcon = Clock;
      chartStroke = '#f59e0b';
    } else {
      humanStatus = 'Sober & Safe';
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      StatusIcon = CheckCircle2;
      chartStroke = '#22c55e';
    }
  } else {
    if (status === 'HIGH') {
      humanStatus = 'Elevated Pulse';
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      StatusIcon = AlertTriangle;
      chartStroke = '#ef4444';
    } else if (status === 'LOW') {
      humanStatus = 'Low Pulse';
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      StatusIcon = AlertTriangle;
      chartStroke = '#f59e0b';
    } else {
      humanStatus = 'Calm & Steady';
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      StatusIcon = CheckCircle2;
      chartStroke = '#22c55e';
    }
  }

  const sparklineData = history.map((item, idx) => ({
    idx,
    val: isAlcohol ? item.mq3Raw : item.heartRaw
  }));

  return (
    <div className="rounded-2xl bg-[#131b2c] p-5 sm:p-6 border border-slate-800/80 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              <Icon className={`w-5 h-5 ${isAlcohol ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{rawSubtext}</p>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${badgeClass}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{humanStatus}</span>
          </span>
        </div>

        {/* Big Value Display with contextual indicator */}
        <div className="mt-5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono tracking-tight text-white">
              {currentValue ?? '--'}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              {isAlcohol ? 'sensor score' : 'signal strength'}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-sans flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            {isAlcohol ? 'Target: < 2,500' : 'Target: 1,000–3,000'}
          </span>
        </div>

        {/* Progress Gauge */}
        <div className="mt-4">
          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                status === 'ALERT' || status === 'HIGH' || status === 'LOW'
                  ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                  : 'bg-gradient-to-r from-sky-500 to-emerald-400'
              }`}
              style={{ width: `${meterPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Low (0)</span>
            {isAlcohol ? (
              <span className="text-amber-400/90 font-medium">Safe Limit: {alcoholThreshold}</span>
            ) : (
              <span className="text-emerald-400/90 font-medium">Comfort Zone: {heartLow}–{heartHigh}</span>
            )}
            <span>Max (4,095)</span>
          </div>
        </div>
      </div>

      {/* Rolling Trend Sparkline */}
      <div className="mt-6 pt-4 border-t border-slate-800/60">
        <div className="flex justify-between items-center mb-1.5 text-xs text-slate-400 font-sans">
          <span>90-second live trend</span>
          <span className="text-slate-500 text-[11px]">{sparklineData.length} readings</span>
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
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">
              Collecting continuous readings...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
