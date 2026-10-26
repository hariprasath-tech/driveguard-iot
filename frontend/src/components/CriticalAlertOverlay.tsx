import React, { useEffect, useState } from 'react';
import { AlertOctagon, Volume2, VolumeX, CheckCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import type { Alert } from '../types';
import { sirenSynthesizer } from '../lib/audio';

interface CriticalAlertOverlayProps {
  alert: Alert | null;
  onAcknowledge: (alertId: string) => Promise<void>;
}

export const CriticalAlertOverlay: React.FC<CriticalAlertOverlayProps> = ({
  alert,
  onAcknowledge
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  useEffect(() => {
    if (alert) {
      if (!isMuted) {
        sirenSynthesizer.start();
      }
    } else {
      sirenSynthesizer.stop();
    }

    return () => {
      sirenSynthesizer.stop();
    };
  }, [alert, isMuted]);

  if (!alert) return null;

  const toggleMute = () => {
    if (isMuted) {
      sirenSynthesizer.start();
      setIsMuted(false);
    } else {
      sirenSynthesizer.stop();
      setIsMuted(true);
    }
  };

  const handleAck = async () => {
    setIsAcknowledging(true);
    try {
      sirenSynthesizer.stop();
      await onAcknowledge(alert.id);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const getHumanGuidance = (type: string) => {
    switch (type) {
      case 'FLAME':
        return {
          headline: 'Fire or high heat detected near the engine bay',
          action: 'Stay calm. Carefully pull over to the shoulder or safe parking spot, turn off the engine immediately, and step out of the car.'
        };
      case 'SMOKE':
        return {
          headline: 'High smoke or fumes detected inside the cabin',
          action: 'Open windows immediately for clean airflow and inspect the dashboard or vents for overheating.'
        };
      case 'ALCOHOL':
        return {
          headline: 'Driver sobriety check alert',
          action: 'Alcohol vapor was detected inside the cabin. For your safety and others, do not continue driving.'
        };
      case 'ACCIDENT':
        return {
          headline: 'Sudden collision or vehicle impact registered',
          action: 'Check on all occupants immediately. Location coordinates are pinned below if emergency assistance is needed.'
        };
      default:
        return {
          headline: `Safety event: ${type}`,
          action: alert.message || 'Please inspect your vehicle and verify safety.'
        };
    }
  };

  const guidance = getHumanGuidance(alert.type);
  const mapsLink = `https://maps.google.com/?q=${alert.lat},${alert.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-rose-950/95 via-[#131b2c] to-[#0a0e18] border-2 border-rose-500 p-6 sm:p-8 shadow-2xl shadow-rose-600/50 animate-alert-pulse">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 text-white shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            Safety Alert
          </span>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition flex items-center gap-2 text-xs font-sans"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Unmute Siren</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Mute Siren</span>
              </>
            )}
          </button>
        </div>

        {/* Alert Icon & Heading */}
        <div className="flex items-start gap-4 my-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldAlert className="w-8 h-8 text-rose-300 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {guidance.headline}
            </h2>
            <p className="text-xs text-rose-300 font-sans mt-1">
              Vehicle: {alert.deviceId} • Detected at {new Date(alert.ts).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Guidance card */}
        <div className="rounded-2xl bg-slate-900/90 border border-rose-500/30 p-4 sm:p-5 my-5 text-sm text-slate-200 leading-relaxed space-y-3">
          <p className="font-semibold text-rose-100">{guidance.action}</p>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span>Location: {alert.lat ? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}` : 'GPS acquiring'}</span>
            {alert.lat !== 0 && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium"
              >
                <span>View on Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Reassuring Action Button */}
        <button
          onClick={handleAck}
          disabled={isAcknowledging}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-700/40 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{isAcknowledging ? 'Confirming...' : "I've checked the car — Silence Alert"}</span>
        </button>
      </div>
    </div>
  );
};
