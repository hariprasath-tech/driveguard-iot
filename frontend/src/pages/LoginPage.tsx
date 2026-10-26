import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../lib/api';
import type { User } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('admin@driveguard.local');
  const [password, setPassword] = useState('AdminSecurePass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setAuth(res.token, res.user);
      navigate('/');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col md:flex-row text-slate-100">
      {/* Brand Panel (Left) */}
      <div className="w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-[#131b2c] via-[#0a0e18] to-[#0a0e18] border-b md:border-b-0 md:border-r border-slate-800/80 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 p-0.5 shadow-xl shadow-sky-500/20">
            <div className="w-full h-full bg-[#0a0e18] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white m-0">DriveGuard</h1>
            <p className="text-xs text-slate-400 font-mono m-0">IoT Vehicle Cockpit Platform</p>
          </div>
        </div>

        {/* Center Copy */}
        <div className="relative z-10 my-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual ESP32 Telemetry Engine</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Every sensor.<br />Every second.<br />Every journey.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md">
            Continuous sub-second safety monitoring. Watch for engine flame, smoke, alcohol impairment, driver pulse, collision impact, and real-time GPS telemetry from anywhere.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Instant critical siren and rising-edge alerts',
              'Dual ESP32 Bluetooth mesh architecture',
              'Offline in-car Wi-Fi AP + Cloud synchronization',
              'Installable Progressive Web App (PWA) with push alerts'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 font-mono">
          DriveGuard IoT v1.0 • Node.js + React Vite + ESP32
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="w-full md:w-1/2 p-8 lg:p-16 flex items-center justify-center bg-[#0a0e18]">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Access Safety Cockpit</h2>
            <p className="text-sm text-slate-400 mt-1">
              Sign in with your credentials to view vehicle telematics.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@driveguard.local"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131b2c] border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#131b2c] border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-sky-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Authenticate & Launch Cockpit</span>
              )}
            </button>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-500 font-mono">
                Default credentials preloaded from <code className="text-sky-400">.env</code>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
