import React from 'react';
import {
  Flame,
  CloudFog,
  Users,
  Radio,
  Car,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface SensorTileProps {
  id: 'flame' | 'smoke' | 'motion' | 'frequency' | 'accident' | 'gps';
  title?: string;
  subtitle?: string;
  status: string;
}

export const SensorTile: React.FC<SensorTileProps> = ({ id, status }) => {
  // Humanized titles and human-friendly explanations for drivers/families
  const sensorConfigs = {
    flame: {
      title: 'Engine Fire Guard',
      humanStatusOk: 'No fire • Cool',
      humanStatusBad: 'Flame Detected!',
      waitingText: 'Checking...',
      icon: Flame
    },
    smoke: {
      title: 'Cabin Air & Smoke',
      humanStatusOk: 'Clean Air',
      humanStatusBad: 'Smoke Detected!',
      waitingText: 'Monitoring...',
      icon: CloudFog
    },
    motion: {
      title: 'Cabin Activity',
      humanStatusOk: 'Quiet Cabin',
      humanStatusBad: 'Motion Detected',
      waitingText: 'Sensing...',
      icon: Users
    },
    frequency: {
      title: 'Proximity Radar',
      humanStatusOk: 'Active Waves',
      humanStatusBad: 'Active Waves',
      waitingText: 'Calibrating...',
      icon: Radio
    },
    accident: {
      title: 'Collision Guard',
      humanStatusOk: 'Smooth Ride',
      humanStatusBad: 'Impact Detected!',
      waitingText: 'Stabilizing...',
      icon: Car
    },
    gps: {
      title: 'Satellite Position',
      humanStatusOk: 'Locked & Tracked',
      humanStatusBad: 'Searching Sky...',
      waitingText: 'Acquiring...',
      icon: Navigation
    }
  };

  const config = sensorConfigs[id];
  const Icon = config.icon;

  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
  let cardBorder = 'border-slate-800/80';
  let iconColor = 'text-slate-400';
  let StatusIcon = HelpCircle;
  let displayStatus = config.waitingText;

  if (status === 'WAITING' || !status) {
    displayStatus = config.waitingText;
  } else if (id === 'flame' || id === 'smoke' || id === 'accident') {
    if (status === 'DETECTED') {
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      cardBorder = 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30';
      iconColor = 'text-rose-400';
      StatusIcon = AlertTriangle;
      displayStatus = config.humanStatusBad;
    } else {
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      iconColor = 'text-emerald-400';
      StatusIcon = CheckCircle2;
      displayStatus = config.humanStatusOk;
    }
  } else if (id === 'motion') {
    if (status === 'DETECTED') {
      badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      cardBorder = 'border-sky-500/40 bg-sky-950/20';
      iconColor = 'text-sky-400';
      StatusIcon = CheckCircle2;
      displayStatus = 'Occupant inside';
    } else {
      badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700';
      iconColor = 'text-slate-400';
      StatusIcon = CheckCircle2;
      displayStatus = config.humanStatusOk;
    }
  } else if (id === 'frequency') {
    badgeColor = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    iconColor = 'text-sky-400';
    StatusIcon = CheckCircle2;
    displayStatus = 'Active Waves';
  } else if (id === 'gps') {
    if (status === 'FIXED') {
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      iconColor = 'text-emerald-400';
      StatusIcon = CheckCircle2;
      displayStatus = config.humanStatusOk;
    } else {
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      cardBorder = 'border-amber-500/30';
      iconColor = 'text-amber-400';
      StatusIcon = AlertTriangle;
      displayStatus = config.humanStatusBad;
    }
  }

  return (
    <div
      className={`rounded-2xl bg-[#131b2c] p-4 sm:p-5 border ${cardBorder} transition-all duration-200 hover:border-slate-700 hover:shadow-lg flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border ${badgeColor}`}
        >
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[95px]">{displayStatus}</span>
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-100">{config.title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
          {displayStatus}
        </p>
      </div>
    </div>
  );
};
