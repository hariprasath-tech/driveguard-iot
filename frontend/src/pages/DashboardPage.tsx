import React from 'react';
import { Navbar } from '../components/Navbar';
import { StatusBanner } from '../components/StatusBanner';
import { SensorTile } from '../components/SensorTile';
import { SensorMeterCard } from '../components/SensorMeterCard';
import { LiveMap } from '../components/LiveMap';
import { ConnectionChips } from '../components/ConnectionChips';
import { CriticalAlertOverlay } from '../components/CriticalAlertOverlay';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';

export const DashboardPage: React.FC = () => {
  const {
    data,
    history,
    trail,
    wsConnected,
    isOffline,
    activeCriticalAlert,
    acknowledgeAlert,
    lastPacketAgeS
  } = useLiveTelemetry();

  return (
    <div className="min-h-screen bg-[#0a0e18] flex flex-col">
      <Navbar wsConnected={wsConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status Banner */}
        <StatusBanner data={data} isOffline={isOffline} activeAlert={activeCriticalAlert} />

        {/* Hardware & Link Connectivity Chips */}
        <ConnectionChips
          wsConnected={wsConnected}
          btConnected={data?.btConnected ?? false}
          lastPacketAgeS={lastPacketAgeS}
          uptimeS={data?.uptimeS ?? 0}
          deviceId={data?.deviceId ?? 'CAR-001'}
        />

        {/* Six Core Automotive Sensors Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Active Vehicle Safety Shield
            </h2>
            <span className="text-xs text-emerald-400 font-medium">Continuous real-time protection</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <SensorTile
              id="flame"
              status={data?.flame || 'WAITING'}
            />
            <SensorTile
              id="smoke"
              status={data?.smoke || 'WAITING'}
            />
            <SensorTile
              id="accident"
              status={data?.accident || 'WAITING'}
            />
            <SensorTile
              id="motion"
              status={data?.motion || 'WAITING'}
            />
            <SensorTile
              id="frequency"
              status={data?.frequency || 'WAITING'}
            />
            <SensorTile
              id="gps"
              status={data?.gps || 'WAITING'}
            />
          </div>
        </div>

        {/* Analog Sensor Meters (Alcohol & Heart) + Live Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MQ-3 Alcohol Card */}
          <SensorMeterCard
            type="mq3"
            currentValue={data?.mq3Raw ?? 0}
            status={data?.mq3Status ?? 'WAITING'}
            history={history}
          />

          {/* Heart Pulse Card */}
          <SensorMeterCard
            type="heart"
            currentValue={data?.heartRaw ?? 0}
            status={data?.heartStatus ?? 'WAITING'}
            history={history}
          />

          {/* Live Vehicle Map */}
          <LiveMap
            lat={data?.lat ?? 0}
            lng={data?.lng ?? 0}
            speedKmph={data?.speedKmph ?? 0}
            gpsStatus={data?.gps ?? 'WAITING'}
            trail={trail}
          />
        </div>
      </main>

      {/* Critical Alert Flashing Overlay & Siren */}
      <CriticalAlertOverlay
        alert={activeCriticalAlert}
        onAcknowledge={acknowledgeAlert}
      />
    </div>
  );
};
