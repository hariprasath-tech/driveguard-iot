import React from 'react';
import { Server, Bluetooth, Clock, Timer } from 'lucide-react';

interface ConnectionChipsProps {
  wsConnected: boolean;
  btConnected: boolean;
  lastPacketAgeS: number | null;
  uptimeS: number;
  deviceId: string;
}

export const ConnectionChips: React.FC<ConnectionChipsProps> = ({
  wsConnected,
  btConnected,
  lastPacketAgeS,
  uptimeS,
  deviceId
}) => {
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0 min';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m driving`;
    return `${mins} min driving`;
  };

  const formatAge = (s: number | null) => {
    if (s === null) return 'Waiting for first signal';
    if (s <= 1) return 'Live right now';
    if (s < 10) return `${s}s ago`;
    return 'Resting';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Cloud Live Sync */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            wsConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          <Server className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Cloud Sync</p>
          <p className={`text-xs font-semibold truncate ${wsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {wsConnected ? 'Connected Live' : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* In-Car Wireless Link */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            btConnected ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          <Bluetooth className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">In-Car Sensors</p>
          <p className={`text-xs font-semibold truncate ${btConnected ? 'Sensors Paired' : 'Looking for sensors'}`}>
            {btConnected ? 'All Sensors Paired' : 'Searching in car'}
          </p>
        </div>
      </div>

      {/* Last Update */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400">
          <Clock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Car Status</p>
          <p className="text-xs font-semibold text-slate-200 truncate">
            {formatAge(lastPacketAgeS)}
          </p>
        </div>
      </div>

      {/* Trip Duration */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400">
          <Timer className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            {deviceId || 'Vehicle'} Trip
          </p>
          <p className="text-xs font-semibold text-slate-200 truncate">
            {formatUptime(uptimeS)}
          </p>
        </div>
      </div>
    </div>
  );
};
