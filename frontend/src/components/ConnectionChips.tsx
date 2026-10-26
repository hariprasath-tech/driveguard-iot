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
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatAge = (s: number | null) => {
    if (s === null) return 'No data';
    if (s <= 1) return 'Just now';
    return `${s}s ago`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Backend Live Link */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            wsConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          <Server className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Backend API</p>
          <p className={`text-xs font-bold truncate ${wsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {wsConnected ? 'Connected (WS)' : 'Disconnected'}
          </p>
        </div>
      </div>

      {/* Bluetooth Mesh Node 2 */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            btConnected ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          <Bluetooth className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">ESP2 Sensor Node</p>
          <p className={`text-xs font-bold truncate ${btConnected ? 'text-sky-400' : 'text-amber-400'}`}>
            {btConnected ? 'BT Paired (14:08)' : 'Searching...'}
          </p>
        </div>
      </div>

      {/* Last Packet Age */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400">
          <Clock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Packet Age</p>
          <p className="text-xs font-mono font-bold text-slate-200 truncate">
            {formatAge(lastPacketAgeS)}
          </p>
        </div>
      </div>

      {/* Uptime */}
      <div className="rounded-xl bg-[#131b2c] border border-slate-800/80 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-center shrink-0 text-slate-400">
          <Timer className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            {deviceId || 'Gateway'} Uptime
          </p>
          <p className="text-xs font-mono font-bold text-slate-200 truncate">
            {formatUptime(uptimeS)}
          </p>
        </div>
      </div>
    </div>
  );
};
