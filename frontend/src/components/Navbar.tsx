import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  Cpu,
  Settings,
  LogOut,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NavbarProps {
  wsConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected = false }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'History', path: '/history', icon: History },
    { name: 'Device & System', path: '/device', icon: Cpu },
    ...(user?.role === 'admin' ? [{ name: 'Settings', path: '/settings', icon: Settings }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0a0e18]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 p-0.5 shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition">
            <div className="w-full h-full bg-[#0a0e18] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                DriveGuard
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                IoT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">Vehicle Safety Cockpit</p>
          </div>
        </NavLink>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#131b2c]/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right side status and user */}
        <div className="flex items-center gap-3">
          {/* Live WS stream pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${wsConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">{wsConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
          </div>

          {/* User info */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[140px]">
                {user?.email || 'User'}
              </p>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                {user?.role || 'viewer'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div className="md:hidden flex items-center justify-around mt-2 pt-2 border-t border-slate-800/60 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded text-[11px] font-medium transition ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
    </header>
  );
};
