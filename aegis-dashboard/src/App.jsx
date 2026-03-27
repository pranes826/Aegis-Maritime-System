// src/App.jsx
import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import './index.css';

const BOUNDARY_POINTS = [
  [9.50, 80.30], [9.70, 80.20], [9.95, 80.10], [10.15, 79.95], [10.35, 79.80]
];

export default function App() {
  const [boatPosition, setBoatPosition] = useState([9.30, 80.50]);
  const [boatPath, setBoatPath] = useState([[9.30, 80.50]]);
  const [zone, setZone] = useState('SAFE');
  const [distance, setDistance] = useState(25.0);
  const [logs, setLogs] = useState([]);

  // Fetch real data from your Node.js backend
  useEffect(() => {
    const fetchBoatData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/location');
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Update dashboard state with the live backend data
        setBoatPosition([data.lat, data.lon]);
        setBoatPath(prev => {
          // Prevent adding duplicate points if the boat hasn't moved
          const lastPoint = prev[prev.length - 1];
          if (lastPoint && lastPoint[0] === data.lat && lastPoint[1] === data.lon) return prev;
          return [...prev, [data.lat, data.lon]];
        });
        setZone(data.zone);
        setDistance(data.distance);

        // Add a new log entry
        const newLog = {
          id: Date.now(),
          time: data.timestamp,
          lat: data.lat,
          lon: data.lon,
          zone: data.zone
        };
        // Keep only the 50 most recent logs so the browser doesn't lag
        setLogs(prev => [newLog, ...prev].slice(0, 50)); 
        
      } catch (error) {
        console.error("Backend offline or unreachable:", error);
      }
    };

    // Poll the backend every 2 seconds
    fetchBoatData(); 
    const interval = setInterval(fetchBoatData, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <header>
        <div className="logo">🛡️ AEGIS Dashboard</div>
        <div className={`status-banner zone-${zone}`}>
          ZONE: {zone} ({distance}km)
        </div>
      </header>
      
      <div className="main-content">
        <div className="sidebar">
          <h3>Live Boat Logs</h3>
          {logs.map(log => (
            <div key={log.id} className="log-entry" style={{ 
              borderColor: log.zone === 'DANGER' ? '#ef4444' : log.zone === 'WARNING' ? '#f59e0b' : '#22c55e' 
            }}>
              <span>{log.time}</span>
              Lat: {log.lat.toFixed(4)} <br/>
              Lon: {log.lon.toFixed(4)} <br/>
              Status: {log.zone}
            </div>
          ))}
        </div>
        
        <MapView boatPosition={boatPosition} boundaryPoints={BOUNDARY_POINTS} boatPath={boatPath} />
        
      </div>
    </div>
  );
}