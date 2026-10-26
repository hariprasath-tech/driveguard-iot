import React from 'react';
import { ShieldCheck, AlertOctagon, WifiOff, Loader2 } from 'lucide-react';
import type { Alert, TelemetryData } from '../types';

interface StatusBannerProps {
  data: TelemetryData | null;
  isOffline: boolean;
  activeAlert: Alert | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ data, isOffline, activeAlert }) => {
  if (activeAlert) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-rose-950/60 border-2 border-rose-500 p-4 sm:p-5 shadow-2xl shadow-rose-900/50 animate-alert-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-7 h-7 text-rose-400 animate-bounce" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500 text-white tracking-widest">
                CRITICAL
              </span>
              <h2 className="text-lg sm:text-xl font-black text-rose-200 tracking-tight">
                ALERT: {activeAlert.type} DETECTED
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-rose-300 mt-1 font-medium">
              {activeAlert.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-4 sm:p-5 shadow-lg shadow-amber-950/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                OFFLINE
              </span>
              <h2 className="text-base sm:text-lg font-bold text-amber-200">
                DEVICE OFFLINE
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-amber-300/80 mt-0.5">
              No telemetry packet received for 10 seconds. Check car gateway power and Wi-Fi connection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-[#131b2c] border border-slate-800 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                STANDBY
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-200">
                WAITING FOR DEVICE
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Listening for incoming sensor telemetry from ESP32 gateway...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#131b2c] border border-emerald-500/30 p-4 sm:p-5 shadow-lg shadow-emerald-950/20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NOMINAL
            </span>
            <h2 className="text-base sm:text-lg font-bold text-emerald-200">
              ALL SYSTEMS SAFE
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            All clear. No alarms right now. All 7 sensors operational.
          </p>
        </div>
      </div>
    </div>
  );
};
