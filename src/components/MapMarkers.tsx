import { MapPin, AlertTriangle } from 'lucide-react';
import type { LatLngExpression } from 'leaflet';

export interface MarkerData {
  id: string;
  position: LatLngExpression;
  label: string;
  type: 'pickup' | 'dropoff' | 'mosque' | 'radar' | 'driver';
}

export function MapMarkers({ markers }: { markers: MarkerData[] }) {
  return (
    <>
      {markers.map(marker => (
        <div key={marker.id} style={{ position: 'absolute', left: '50%', top: '50%' }}>
          {marker.type === 'mosque' && <MapPin size={16} />}
          {marker.type === 'radar' && <AlertTriangle size={16} />}
          {marker.type === 'pickup' && <MapPin size={16} />}
          {marker.type === 'dropoff' && <MapPin size={16} />}
          {marker.type === 'driver' && <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'blue' }} />}
        </div>
      ))}
    </>
  );
}
