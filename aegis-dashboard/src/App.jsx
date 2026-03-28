import { useState, useEffect } from "react";
import MapView from "./components/MapView";

const BOUNDARY_POINTS = [
  [9.50, 80.30], [9.70, 80.20], [9.95, 80.10], [10.15, 79.95], [10.35, 79.80]
];

export default function App() {
  const [boatPosition, setBoatPosition] = useState([9.30, 80.30]);
  const [distance, setDistance] = useState(25.00);
  const [zone, setZone] = useState("SAFE");

  // Fetch data from backend every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/location');
        if (response.ok) {
          const data = await response.json();
          setBoatPosition([data.lat, data.lon]);
          setDistance(data.distance);
          setZone(data.zone);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Dynamic color selection based on the zone
  const getZoneColor = () => {
    if (zone === 'DANGER') return '#ef4444'; // Red
    if (zone === 'WARNING') return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  return (
    <div style={{ 
      display: 'flex', width: '100vw', height: '100vh', 
      backgroundColor: '#0a0a0a', color: 'white', margin: 0, padding: 0, overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* LEFT SIDEBAR: Status Display */}
      <div style={{ 
        width: '380px', minWidth: '380px', padding: '25px', backgroundColor: '#171717', 
        borderRight: `4px solid ${getZoneColor()}`, 
        boxShadow: zone === 'DANGER' ? '0 0 30px rgba(239, 68, 68, 0.4)' : 'none', 
        zIndex: 10, display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease'
      }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', letterSpacing: '1px' }}>🛡️ AEGIS</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Maritime Boundary Monitor</p>
        </div>

        {/* Status Display */}
        <div style={{ 
          backgroundColor: '#262626', padding: '20px', borderRadius: '10px', 
          border: `1px solid ${getZoneColor()}`, textAlign: 'center', marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#a3a3a3', fontSize: '14px', textTransform: 'uppercase' }}>Current Status</h2>
          <h1 style={{ margin: 0, color: getZoneColor(), fontSize: '36px', fontWeight: '900', letterSpacing: '2px' }}>
            {zone}
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
            Distance to Border: {distance} km
          </p>
        </div>

      </div>

      {/* RIGHT SIDE: The Map */}
      <div style={{ flex: 1, height: '100vh', position: 'relative' }}>
        <MapView 
          boatPosition={boatPosition} 
          boundaryPoints={BOUNDARY_POINTS} 
          boatPath={[boatPosition]} 
        />
      </div>

    </div>
  );
}