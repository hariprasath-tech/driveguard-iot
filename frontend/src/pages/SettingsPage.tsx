import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import {
  Settings,
  Bell,
  Sliders,
  Users,
  Shield,
  Save,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { User } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    notify_telegram: 'true',
    notify_webpush: 'true',
    threshold_mq3: '2500',
    threshold_heart_low: '1000',
    threshold_heart_high: '3000',
    cooldown_seconds: '30',
    retention_days: '30'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    // Load current settings
    apiFetch<Record<string, string>>('/api/settings')
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch((err) => console.error('Failed to load settings:', err));

    // Load users
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/api/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSuccessMsg('Settings updated and active across all alert engines.');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubscribePush = async () => {
    try {
      setPushStatus('Requesting permissions...');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('Web Push not supported in this browser.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('Notification permission was denied.');
        return;
      }

      const keyRes = await apiFetch<{ publicKey: string }>('/api/push/key');
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to Web Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyRes.publicKey
      });

      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });

      setPushStatus('Web Push subscribed! Critical alerts will push directly to this device.');
    } catch (err) {
      setPushStatus(`Push setup error: ${(err as Error).message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });
      setNewEmail('');
      setNewPassword('');
      loadUsers();
      setSuccessMsg(`User ${newEmail} created successfully.`);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccessMsg('User removed successfully.');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 m-0">
            <Settings className="w-6 h-6 text-sky-400" />
            Cockpit Settings & User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Adjust safety thresholds, manage notification dispatches, and provision access accounts
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form: Thresholds and Notifications */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Thresholds Card */}
          <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Sliders className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Sensor Thresholds & Cooldown Rules
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                  MQ-3 Alcohol Alert Threshold (ADC)
                </label>
                <input
                  type="number"
                  value={settings.threshold_mq3 || '2500'}
                  onChange={(e) => setSettings({ ...settings, threshold_mq3: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">Default: 2500 (0-4095 scale)</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                  Heart Pulse Low Threshold
                </label>
                <input
                  type="number"
                  value={settings.threshold_heart_low || '1000'}
                  onChange={(e) => setSettings({ ...settings, threshold_heart_low: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">Triggers abnormal warning if below</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                  Heart Pulse High Threshold
                </label>
                <input
                  type="number"
                  value={settings.threshold_heart_high || '3000'}
                  onChange={(e) => setSettings({ ...settings, threshold_heart_high: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">Triggers abnormal warning if above</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                  Alert Cooldown Window (Seconds)
                </label>
                <input
                  type="number"
                  value={settings.cooldown_seconds || '30'}
                  onChange={(e) => setSettings({ ...settings, cooldown_seconds: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">Mutes repeated alarms for 30s</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                  Telemetry Retention (Days)
                </label>
                <input
                  type="number"
                  value={settings.retention_days || '30'}
                  onChange={(e) => setSettings({ ...settings, retention_days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">Auto-prunes telemetry older than days</span>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Bell className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Multi-Channel Dispatch Channels
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Telegram Instant Bot Alerts</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Sends live alert text and Google Maps GPS location to specified Telegram Chat
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify_telegram !== 'false'}
                  onChange={(e) => setSettings({ ...settings, notify_telegram: e.target.checked ? 'true' : 'false' })}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Web Push Notifications</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    VAPID-authenticated background push notifications directly to phones and browsers
                  </p>
                  {pushStatus && (
                    <p className="text-xs text-sky-400 font-mono mt-1">{pushStatus}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSubscribePush}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition self-start sm:self-auto"
                >
                  Enable Push on This Device
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold font-mono flex items-center gap-2 transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* User Management Section */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Access Control & User Provisioning
            </h2>
          </div>

          {/* New User Form */}
          <form onSubmit={handleCreateUser} className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Provision New Account
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="email"
                required
                placeholder="User email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />

              <input
                type="password"
                required
                placeholder="Password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'viewer')}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              >
                <option value="viewer">Role: Viewer (Read-only)</option>
                <option value="admin">Role: Admin (Full Access)</option>
              </select>

              <button
                type="submit"
                disabled={creatingUser}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{creatingUser ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          u.role === 'admin'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date().toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
