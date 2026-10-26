import React, { useEffect, useState } from 'react';
import { AlertOctagon, Volume2, VolumeX, CheckCircle, ExternalLink } from 'lucide-react';
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

  const mapsLink = `https://maps.google.com/?q=${alert.lat},${alert.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-rose-950/90 to-[#131b2c] border-2 border-rose-500 p-6 sm:p-8 shadow-2xl shadow-rose-600/50 animate-alert-pulse">
        {/* Siren Sound Wave Indicator */}
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-rose-500 text-white tracking-widest shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            CRITICAL VEHICLE EMERGENCY
          </span>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition flex items-center gap-2 text-xs font-mono"
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
        <div className="flex items-center gap-4 my-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-10 h-10 text-rose-400 animate-bounce" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {alert.type} DETECTED
            </h2>
            <p className="text-xs font-mono text-rose-300">
              Vehicle: {alert.deviceId} • {new Date(alert.ts).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Details card */}
        <div className="rounded-2xl bg-slate-900/80 border border-rose-500/30 p-4 my-5 text-sm text-slate-200 font-sans leading-relaxed">
          <p className="font-semibold text-rose-200">{alert.message}</p>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-mono text-slate-400">
            <span>Location: {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</span>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAck}
          disabled={isAcknowledging}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-700/40 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert & Silence'}</span>
        </button>
      </div>
    </div>
  );
};
