import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';

interface LiveMapProps {
  lat: number;
  lng: number;
  speedKmph: number;
  gpsStatus: string;
  trail: [number, number][];
}

// Subcomponent to automatically pan map as vehicle moves
const MapCenterController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 || center[1] !== 0) {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  lat,
  lng,
  speedKmph,
  gpsStatus,
  trail
}) => {
  const hasValidGps = (lat !== 0 || lng !== 0) && gpsStatus === 'FIXED';
  const defaultCenter: [number, number] = hasValidGps ? [lat, lng] : [12.9716, 77.5946];

  // Custom futuristic automotive vehicle icon
  const vehicleIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #0ea5e9;
          border: 3px solid #ffffff;
          box-shadow: 0 0 15px #0ea5e9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }, []);

  return (
    <div className="relative rounded-2xl bg-[#131b2c] border border-slate-800/80 overflow-hidden shadow-lg h-[360px] flex flex-col">
      {/* Header bar */}
      <div className="bg-[#131b2c]/95 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Vehicle Position</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-400">
            Speed: <strong className="text-sky-300">{speedKmph?.toFixed(1) || 0.0} km/h</strong>
          </span>
          <span className="text-slate-400">
            Trail: <strong className="text-slate-200">{trail.length} pts</strong>
          </span>
        </div>
      </div>

      {/* Map body */}
      <div className="relative flex-1 w-full h-full">
        {!hasValidGps && (
          <div className="absolute inset-0 z-[1000] bg-[#0a0e18]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-slate-100">Waiting for GPS Fix</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
              Vehicle NEO-6M module is acquiring satellite lock. Status: {gpsStatus || 'SEARCHING'}
            </p>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={false}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {hasValidGps && (
            <>
              <MapCenterController center={[lat, lng]} />
              <Marker position={[lat, lng]} icon={vehicleIcon}>
                <Popup>
                  <div className="text-xs text-slate-900 font-sans p-1">
                    <p className="font-bold">DriveGuard Vehicle</p>
                    <p>Speed: {speedKmph} km/h</p>
                    <p>Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
              {trail.length > 1 && (
                <Polyline
                  positions={trail}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 4,
                    opacity: 0.85,
                    dashArray: '6, 6'
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
