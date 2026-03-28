// src/components/MapView.jsx
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default Leaflet icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to smoothly pan the map to the boat's location
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center);
  }, [center, map]);
  return null;
}

export default function MapView({ boatPosition, boundaryPoints, boatPath }) {
  return (
    <MapContainer 
      center={boatPosition} 
      zoom={10} 
      style={{ flex: 1, height: '100vh', width: '100%', zIndex: 0 }} 
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CartoDB'
      />
      <Polyline positions={boundaryPoints} pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 10' }} />
      <Polyline positions={boatPath} pathOptions={{ color: '#38bdf8', weight: 2 }} />
      <Marker position={boatPosition} />
      <MapController center={boatPosition} />
    </MapContainer>
  );
} 