import React from 'react';
import { ShieldCheck, AlertOctagon, WifiOff, Loader2, HeartHandshake } from 'lucide-react';
import type { Alert, TelemetryData } from '../types';

interface StatusBannerProps {
  data: TelemetryData | null;
  isOffline: boolean;
  activeAlert: Alert | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ data, isOffline, activeAlert }) => {
  if (activeAlert) {
    const alertTitles: Record<string, { title: string; advice: string }> = {
      FLAME: {
        title: 'Fire or high heat detected near engine',
        advice: 'Please pull over safely, turn off the engine, and exit the vehicle immediately.'
      },
      SMOKE: {
        title: 'Smoke or gas detected in cabin',
        advice: 'Roll down windows for fresh air and check for overheating or exhaust leaks.'
      },
      ALCOHOL: {
        title: 'Driver alcohol alert',
        advice: 'Alcohol vapor detected. For everyone’s safety, please do not operate this vehicle.'
      },
      ACCIDENT: {
        title: 'Sudden impact or collision detected',
        advice: 'An emergency impact was registered. Checking on passengers and sharing location.'
      },
      HEART: {
        title: 'Driver pulse irregularity',
        advice: 'The driver’s heart reading is outside normal range. Consider taking a rest break.'
      }
    };

    const info = alertTitles[activeAlert.type] || {
      title: `${activeAlert.type} alert triggered`,
      advice: activeAlert.message || 'Please inspect vehicle systems.'
    };

    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/80 to-rose-900/60 border-2 border-rose-500 p-5 sm:p-6 shadow-2xl shadow-rose-950/60 animate-alert-pulse">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-600/30 border border-rose-500/60 flex items-center justify-center shrink-0 shadow-lg">
            <AlertOctagon className="w-7 h-7 sm:w-8 sm:h-8 text-rose-300 animate-bounce" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500 text-white tracking-widest shadow">
                Immediate Attention
              </span>
              <span className="text-xs text-rose-300 font-mono">
                {new Date(activeAlert.ts).toLocaleTimeString()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1">
              {info.title}
            </h2>
            <p className="text-xs sm:text-sm text-rose-200/90 mt-1.5 font-medium leading-relaxed">
              {info.advice}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#131b2c] to-slate-900 border border-slate-700/60 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Vehicle Resting
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-200">
                Car is currently taking a rest
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              We haven't received a heartbeat signal in the last 10 seconds. If the ignition is switched off or parked, this is completely normal.
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
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Connecting
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-200">
                Listening for your car's signal
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Establishing a secure connection with the in-car gateway. Telemetry will show up in a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#131b2c] to-[#131b2c] border border-emerald-500/30 p-4 sm:p-5 shadow-lg shadow-emerald-950/20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              All Clear
            </span>
            <h2 className="text-sm sm:text-base font-bold text-emerald-100 flex items-center gap-1.5">
              <span>All systems safe & healthy</span>
              <HeartHandshake className="w-4 h-4 text-emerald-400 hidden sm:inline" />
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300/90 mt-1">
            Every safety sensor is watching over your vehicle. No hazards or alarms detected right now.
          </p>
        </div>
      </div>
    </div>
  );
};
