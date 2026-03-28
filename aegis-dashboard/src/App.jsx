import { useState, useEffect } from "react";
import MapView from "./components/MapView";

const BOUNDARY_POINTS = [
  [9.50, 80.30], [9.70, 80.20], [9.95, 80.10], [10.15, 79.95], [10.35, 79.80]
];

export default function App() {
  const [boatPosition, setBoatPosition] = useState([0, 0]);
  const [distance, setDistance] = useState(0);
  const [zone, setZone] = useState("UNKNOWN");
  const [status, setStatus] = useState("Waiting for data...");

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/location");
        if (!res.ok) throw new Error("API error " + res.status);
        const data = await res.json();
        if (data?.lat !== undefined && data?.lon !== undefined) {
          setBoatPosition([Number(data.lat), Number(data.lon)]);
          setDistance(Number(data.distance ?? 0));
          setZone(String(data.zone ?? "UNKNOWN"));
          setStatus("Live");
        } else {
          setStatus("Bad payload");
        }
      } catch (err) {
        console.error(err);
        setStatus("Disconnected");
      }
    };

    fetchTelemetry();
    const t = setInterval(fetchTelemetry, 1500);
    return () => clearInterval(t);
  }, []);

  const getZoneColor = () => {
    if (zone === "DANGER") return "#ef4444";
    if (zone === "WARNING") return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: "#0b1226", color: "#fff"
    }}>
      <aside style={{
        width: "360px", padding: 20, background: "#111827", borderRight: `4px solid ${getZoneColor()}`
      }}>
        <h1>AEGIS Dashboard</h1>
        <p>Status: <strong>{status}</strong></p>
        <p style={{ color: getZoneColor(), fontWeight: "bold" }}>Zone: {zone}</p>
        <p>Distance: {distance.toFixed(2)} km</p>
        <p>Location: {status === "Live" ? `${boatPosition[0].toFixed(4)}, ${boatPosition[1].toFixed(4)}` : "No data received"}</p>
        <pre style={{
          marginTop: 12, background: "#0f172a", padding: 10, borderRadius: 8, fontSize: 12
        }}>
          {status === "Live" ? JSON.stringify({ lat: boatPosition[0], lon: boatPosition[1], distance, zone }, null, 2) : "No data received"}
        </pre>
      </aside>

      <main style={{ flex: 1, height: "100vh" }}>
        <MapView
          boatPosition={boatPosition}
          boundaryPoints={BOUNDARY_POINTS}
          boatPath={[boatPosition]}
        />
      </main>
    </div>
  );
}