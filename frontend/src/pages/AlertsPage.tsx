import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import {
  AlertTriangle,
  Download,
  Filter,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert
} from 'lucide-react';
import type { Alert } from '../types';
import { apiFetch, API_BASE } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export const AlertsPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/api/alerts?';
      if (statusFilter !== 'all') endpoint += `status=${statusFilter}&`;
      if (severityFilter !== 'all') endpoint += `severity=${severityFilter}&`;

      const data = await apiFetch<Alert[]>(endpoint);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Connect WebSocket to receive live alerts on this page too
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${host}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'alert' && msg.data) {
          const incoming: Alert = msg.data;
          setAlerts((prev) => {
            const exists = prev.findIndex((a) => a.id === incoming.id);
            if (exists >= 0) {
              const copy = [...prev];
              copy[exists] = incoming;
              return copy;
            }
            return [incoming, ...prev];
          });
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, [token]);

  const handleAcknowledge = async (id: string) => {
    try {
      const updated = await apiFetch<Alert>(`/api/alerts/${id}/ack`, { method: 'POST' });
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleExportCsv = () => {
    window.open(`${API_BASE}/api/alerts/export.csv`, '_blank');
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.type.toLowerCase().includes(query) ||
      a.message.toLowerCase().includes(query) ||
      a.deviceId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 m-0">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              Safety Incident Log
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Real-time audit log of hardware alarm events and driver warnings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="px-3.5 py-2 rounded-xl bg-[#131b2c] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold font-mono flex items-center gap-2 transition shadow-lg shadow-sky-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Filter className="w-4 h-4 text-sky-400" />
              <span>Filter:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'acknowledged')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Unacknowledged</option>
              <option value="acknowledged">Acknowledged</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search alarm text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        {/* Alerts Table */}
        <div className="rounded-2xl bg-[#131b2c] border border-slate-800/80 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      No security incidents matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isCritical = alert.severity === 'critical';
                    const isWarning = alert.severity === 'warning';

                    return (
                      <tr
                        key={alert.id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          !alert.acknowledged && isCritical ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                          {alert.type}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-sm truncate">
                          {alert.message}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(alert.ts).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {alert.lat !== 0 || alert.lng !== 0 ? (
                            <a
                              href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                            >
                              <span>{alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">No GPS Fix</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {alert.acknowledged ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ack by {alert.acknowledgedBy || 'admin'}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 text-[11px] font-mono font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>UNRESOLVED</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {!alert.acknowledged ? (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-semibold transition"
                            >
                              Acknowledge
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">Cleared</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
