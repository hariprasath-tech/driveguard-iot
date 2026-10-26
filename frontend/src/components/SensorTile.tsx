import React from 'react';
import {
  Flame,
  CloudFog,
  Activity,
  Waves,
  AlertOctagon,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface SensorTileProps {
  id: 'flame' | 'smoke' | 'motion' | 'frequency' | 'accident' | 'gps';
  title: string;
  subtitle: string;
  status: string; // 'DETECTED' | 'NOT DETECTED' | 'EMITTED' | 'NOT EMITTED' | 'FIXED' | 'NO FIX' | 'WAITING'
}

export const SensorTile: React.FC<SensorTileProps> = ({ id, title, subtitle, status }) => {
  const getIcon = () => {
    switch (id) {
      case 'flame':
        return Flame;
      case 'smoke':
        return CloudFog;
      case 'motion':
        return Activity;
      case 'frequency':
        return Waves;
      case 'accident':
        return AlertOctagon;
      case 'gps':
        return Navigation;
    }
  };

  const Icon = getIcon();

  // Determine appearance based on sensor logic
  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
  let cardBorder = 'border-slate-800/80';
  let iconColor = 'text-slate-400';
  let StatusIcon = HelpCircle;

  if (status === 'WAITING' || !status) {
    badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700';
    iconColor = 'text-slate-500';
    StatusIcon = HelpCircle;
  } else if (id === 'flame' || id === 'smoke' || id === 'accident') {
    if (status === 'DETECTED') {
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      cardBorder = 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30';
      iconColor = 'text-rose-400';
      StatusIcon = AlertTriangle;
    } else {
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      iconColor = 'text-emerald-400';
      StatusIcon = CheckCircle2;
    }
  } else if (id === 'motion' || id === 'frequency') {
    if (status === 'DETECTED' || status === 'EMITTED') {
      badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      cardBorder = 'border-sky-500/40 bg-sky-950/20';
      iconColor = 'text-sky-400';
      StatusIcon = CheckCircle2;
    } else {
      badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
      iconColor = 'text-slate-400';
      StatusIcon = CheckCircle2;
    }
  } else if (id === 'gps') {
    if (status === 'FIXED') {
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      iconColor = 'text-emerald-400';
      StatusIcon = CheckCircle2;
    } else {
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      cardBorder = 'border-amber-500/30';
      iconColor = 'text-amber-400';
      StatusIcon = AlertTriangle;
    }
  }

  return (
    <div
      className={`rounded-2xl bg-[#131b2c] p-4 border ${cardBorder} transition-all duration-200 hover:border-slate-700 hover:shadow-md flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${badgeColor}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{status || 'WAITING'}</span>
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
};
