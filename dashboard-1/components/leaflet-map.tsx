"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { io, Socket } from "socket.io-client"

interface LeafletMapProps {
  onLocationUpdate: (lat: number, lng: number) => void
  onProximityUpdate: (distance: number) => void
  onSpeedUpdate: (speed: number) => void
  onStatusUpdate?: (status: string) => void
  onEEZUpdate?: (name: string) => void
  onZoneUpdate?: (zone: string) => void
  demoMode?: boolean
}

// ─── Tamil Nadu Maritime Boundaries ─────────────────────────────────────────
// Coordinates are [lat, lng]

// Base IMBL coordinates — actual India–Sri Lanka maritime boundary
const IMBL_PALK_COORDS: [number, number][] = [
  [10.80, 80.30], [10.60, 80.20], [10.47, 80.12], [10.22, 79.97],
  [9.95,  79.82], [9.72, 79.67], [9.52, 79.57], [9.35, 79.49],
  [9.17,  79.43], [9.00, 79.35],
]
const IMBL_GULF_COORDS: [number, number][] = [
  [9.17, 79.43], [9.00, 79.20], [8.83, 78.92], [8.68, 78.62],
  [8.53, 78.32], [8.38, 78.02], [8.23, 77.72], [8.10, 77.46],
  [7.95, 77.20], [7.80, 76.95],
]

// offsetLine is a hoisted function declaration defined below — safe to call here
const TN_MARITIME_BOUNDARIES = [
  {
    name: "Tamil Nadu Coastline",
    color: "#06b6d4",
    weight: 2,
    opacity: 0.8,
    dashArray: null as string | null,
    description: "Shoreline (Baseline)",
    usedForDistance: false,
    showInLegend: true,
    coordinates: [
      [13.47, 80.30], [13.08, 80.29], [12.62, 80.19], [12.27, 80.08],
      [11.93, 79.83], [11.75, 79.77], [11.50, 79.77], [11.20, 79.80],
      [10.92, 79.83], [10.76, 79.84], [10.30, 79.85], [10.03, 79.78],
      [9.77,  79.50], [9.50,  79.22], [9.28,  79.31], [9.14,  79.06],
      [8.88,  78.53], [8.78,  78.13], [8.55,  77.90], [8.30,  77.68],
      [8.08,  77.55],
    ] as [number, number][],
  },
  {
    name: "Warning Zone (25 km)",
    color: "#f59e0b",
    weight: 2.5,
    opacity: 0.9,
    dashArray: "10, 6" as string | null,
    description: "25 km buffer — approach with caution",
    usedForDistance: false,
    showInLegend: true,
    coordinates: offsetLine(IMBL_PALK_COORDS, 25 / 111),
  },
  {
    name: "Warning Zone (25 km)",
    color: "#f59e0b",
    weight: 2.5,
    opacity: 0.9,
    dashArray: "10, 6" as string | null,
    description: "25 km buffer — approach with caution",
    usedForDistance: false,
    showInLegend: false,
    coordinates: offsetLine(IMBL_GULF_COORDS, 25 / 111),
  },
  {
    name: "Danger Zone (12 km)",
    color: "#f97316",
    weight: 2.5,
    opacity: 0.95,
    dashArray: "6, 4" as string | null,
    description: "12 km buffer — turn back immediately",
    usedForDistance: false,
    showInLegend: true,
    coordinates: offsetLine(IMBL_PALK_COORDS, 12 / 111),
  },
  {
    name: "Danger Zone (12 km)",
    color: "#f97316",
    weight: 2.5,
    opacity: 0.95,
    dashArray: "6, 4" as string | null,
    description: "12 km buffer — turn back immediately",
    usedForDistance: false,
    showInLegend: false,
    coordinates: offsetLine(IMBL_GULF_COORDS, 12 / 111),
  },
  {
    name: "IMBL — Palk Strait",
    color: "#ef4444",
    weight: 3,
    opacity: 1.0,
    dashArray: "14, 6" as string | null,
    description: "India–Sri Lanka International Maritime Boundary (1974)",
    usedForDistance: true,
    showInLegend: true,
    coordinates: IMBL_PALK_COORDS,
  },
  {
    name: "IMBL — Gulf of Mannar",
    color: "#ef4444",
    weight: 3,
    opacity: 1.0,
    dashArray: "14, 6" as string | null,
    description: "India–Sri Lanka International Maritime Boundary (1976)",
    usedForDistance: true,
    showInLegend: true,
    coordinates: IMBL_GULF_COORDS,
  },
]

// Store boundary segments for distance calculation (IMBL lines only)
let allBoundarySegments: { start: [number, number]; end: [number, number] }[] = []

function initBoundarySegments() {
  allBoundarySegments = []
  for (const boundary of TN_MARITIME_BOUNDARIES) {
    if (!boundary.usedForDistance) continue
    const coords = boundary.coordinates
    for (let i = 0; i < coords.length - 1; i++) {
      allBoundarySegments.push({
        start: coords[i],
        end: coords[i + 1],
      })
    }
  }
}

// Haversine formula for accurate distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate distance from point to line segment
function pointToSegmentDistance(
  pLat: number,
  pLng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const d1 = haversineDistance(pLat, pLng, lat1, lng1)
  const d2 = haversineDistance(pLat, pLng, lat2, lng2)
  const segmentLength = haversineDistance(lat1, lng1, lat2, lng2)

  if (segmentLength < 0.001) return Math.min(d1, d2)

  const t = Math.max(0, Math.min(1,
    ((pLat - lat1) * (lat2 - lat1) + (pLng - lng1) * (lng2 - lng1)) /
    ((lat2 - lat1) * (lat2 - lat1) + (lng2 - lng1) * (lng2 - lng1))
  ))

  const projLat = lat1 + t * (lat2 - lat1)
  const projLng = lng1 + t * (lng2 - lng1)

  return haversineDistance(pLat, pLng, projLat, projLng)
}

// Calculate minimum distance to nearest IMBL boundary
function calculateDistanceToBoundary(lat: number, lng: number): number {
  if (allBoundarySegments.length === 0) initBoundarySegments()

  let minDistance = Infinity
  for (const segment of allBoundarySegments) {
    const distance = pointToSegmentDistance(lat, lng, segment.start[0], segment.start[1], segment.end[0], segment.end[1])
    if (distance < minDistance) minDistance = distance
  }
  return minDistance === Infinity ? 999 : minDistance
}

// Find the name of the nearest boundary line
function findNearestBoundary(lat: number, lng: number): string {
  if (allBoundarySegments.length === 0) initBoundarySegments()

  let minDistance = Infinity
  let nearestName = "Tamil Nadu Waters"

  for (const boundary of TN_MARITIME_BOUNDARIES) {
    const coords = boundary.coordinates
    let featureMin = Infinity
    for (let i = 0; i < coords.length - 1; i++) {
      const d = pointToSegmentDistance(lat, lng, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
      if (d < featureMin) featureMin = d
    }
    if (featureMin < minDistance) {
      minDistance = featureMin
      nearestName = boundary.name
    }
  }
  return nearestName
}

// ─── Demo Mode Route (SAFE → WARNING → DANGER → back) ─────────────────────
const DEMO_WAYPOINTS: { lat: number; lon: number }[] = [
  { lat: 9.80,  lon: 79.10 }, // Start far west — clearly SAFE (>40 km from IMBL)
  { lat: 9.70,  lon: 79.15 }, // Still SAFE
  { lat: 9.60,  lon: 79.22 }, // Still SAFE
  { lat: 9.50,  lon: 79.32 }, // Entering WARNING (~22 km)
  { lat: 9.40,  lon: 79.40 }, // Deep WARNING (~15 km)
  { lat: 9.30,  lon: 79.48 }, // Entering DANGER (~10 km)
  { lat: 9.22,  lon: 79.53 }, // Deep DANGER (~5 km)
  { lat: 9.30,  lon: 79.48 }, // Turning back
  { lat: 9.40,  lon: 79.40 }, // WARNING again
  { lat: 9.50,  lon: 79.32 },
  { lat: 9.60,  lon: 79.22 }, // Back to SAFE
  { lat: 9.70,  lon: 79.15 },
]

// Interpolate many small steps between each waypoint for smooth movement
function buildDemoRoute(waypoints: { lat: number; lon: number }[], stepsPerSegment: number) {
  const result: { lat: number; lon: number }[] = []
  for (let i = 0; i < waypoints.length; i++) {
    const from = waypoints[i]
    const to = waypoints[(i + 1) % waypoints.length]
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment
      result.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lon: from.lon + (to.lon - from.lon) * t,
      })
    }
  }
  return result
}

const DEMO_ROUTE = buildDemoRoute(DEMO_WAYPOINTS, 40)

export default function LeafletMap({
  onLocationUpdate,
  onProximityUpdate,
  onSpeedUpdate,
  onStatusUpdate,
  onEEZUpdate,
  onZoneUpdate,
  demoMode = false,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const pathPolylineRef = useRef<L.Polyline | null>(null)
  const pathRef = useRef<[number, number][]>([])
  const socketRef = useRef<Socket | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [boundaryCount, setBoundaryCount] = useState(0)
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const demoIndexRef = useRef(0)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize boundary segments
    initBoundarySegments()

    // Initialize map — centred on Tamil Nadu coast
    const map = L.map(mapRef.current, {
      center: [10.5, 79.5],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      scrollWheelZoom: true,
      wheelDebounceTime: 80,
      wheelPxPerZoomLevel: 120,
    })

    // Add satellite/ocean tile layer (free, no API key)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri | EEZ Data &copy; Marine Regions',
      maxZoom: 19,
    }).addTo(map)

    // Add a secondary labels layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      attribution: '',
      maxZoom: 19,
      pane: 'overlayPane'
    }).addTo(map)

    // Draw all Tamil Nadu maritime boundaries
    TN_MARITIME_BOUNDARIES.forEach((boundary) => {
      const latLngs = boundary.coordinates

      // Glow/halo under the line
      L.polyline(latLngs, {
        color: boundary.color,
        weight: boundary.weight + 7,
        opacity: 0.18,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map)

      // Main boundary line
      const line = L.polyline(latLngs, {
        color: boundary.color,
        weight: boundary.weight,
        opacity: boundary.opacity,
        dashArray: boundary.dashArray ?? undefined,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map)

      line.bindTooltip(`<b>${boundary.name}</b><br><small>${boundary.description}</small>`, {
        permanent: false,
        direction: "center",
        className: "eez-tooltip",
      })

      // Mid-point label (only for legend-visible entries)
      if (boundary.showInLegend) {
        const mid = latLngs[Math.floor(latLngs.length / 2)]
        L.marker(mid, {
          icon: L.divIcon({
            className: "eez-label",
            html: `<div style="background:${boundary.color};color:#fff;padding:3px 9px;border-radius:5px;font-size:10px;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.5);font-weight:600;border:1px solid rgba(255,255,255,0.3);">${boundary.name}</div>`,
            iconSize: [190, 22],
            iconAnchor: [95, 11],
          }),
        }).addTo(map)
      }
    })

    setBoundaryCount(TN_MARITIME_BOUNDARIES.length)

    // Add legend
    const legend = L.control({ position: "bottomleft" })
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend")
      div.innerHTML = `
        <div style="background:rgba(10,22,40,0.95);padding:14px;border-radius:10px;border:1px solid rgba(6,182,212,0.4);box-shadow:0 4px 25px rgba(0,0,0,0.4);backdrop-filter:blur(10px);">
          <div style="color:#06b6d4;font-weight:700;margin-bottom:10px;font-size:12px;letter-spacing:0.5px;">TAMIL NADU MARITIME LIMITS</div>
          ${TN_MARITIME_BOUNDARIES.filter(b => b.showInLegend).map(b => `
            <div style="display:flex;align-items:center;gap:8px;margin:5px 0;">
              <div style="width:22px;height:3px;background:${b.color};border-radius:2px;${b.dashArray ? `background:repeating-linear-gradient(90deg,${b.color} 0,${b.color} 6px,transparent 6px,transparent 10px)` : ''};box-shadow:0 0 6px ${b.color};"></div>
              <div>
                <div style="color:#e2e8f0;font-size:10px;font-weight:600;">${b.name}</div>
                <div style="color:#64748b;font-size:9px;">${b.description}</div>
              </div>
            </div>`).join("")}
        </div>
      `
      return div
    }
    legend.addTo(map)

    // Custom vessel marker
    const vesselIcon = L.divIcon({
      className: "vessel-marker",
      html: `
        <div style="position: relative;">
          <div style="position: absolute; width: 44px; height: 44px; left: -2px; top: -2px; background: rgba(6, 182, 212, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 30px; height: 30px; left: 5px; top: 5px; background: rgba(34, 197, 94, 0.2); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s;"></div>
          <svg width="40" height="40" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
            <defs>
              <linearGradient id="vesselGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#06b6d4" />
                <stop offset="50%" stop-color="#22c55e" />
                <stop offset="100%" stop-color="#0891b2" />
              </linearGradient>
            </defs>
            <path fill="url(#vesselGrad)" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    })

    // Initial position
    const initialLat = 9.80
    const initialLng = 79.10
    const marker = L.marker([initialLat, initialLng], { icon: vesselIcon }).addTo(map)
    marker.bindPopup("<b>Your Vessel</b><br>Live ESP32 Tracking").openPopup()
    markerRef.current = marker

    // Path trail polyline
    const pathPolyline = L.polyline([], {
      color: "#38bdf8",
      weight: 3,
      opacity: 0.7,
    }).addTo(map)
    pathPolylineRef.current = pathPolyline

    // Initial updates
    onLocationUpdate(initialLat, initialLng)
    const initialDistance = calculateDistanceToBoundary(initialLat, initialLng)
    onProximityUpdate(initialDistance)
    onSpeedUpdate(0)

    mapInstanceRef.current = map

    // Leaflet needs invalidateSize after flex layout settles
    setTimeout(() => map.invalidateSize(), 50)
    setTimeout(() => map.invalidateSize(), 300)

    // Also revalidate whenever the container is resized
    const ro = new ResizeObserver(() => map.invalidateSize())
    if (mapRef.current) ro.observe(mapRef.current)

    // Add styles
    const style = document.createElement("style")
    style.textContent = `
      @keyframes ping {
        75%, 100% { transform: scale(2.5); opacity: 0; }
      }
      .leaflet-container {
        background: linear-gradient(180deg, #0a2540 0%, #0d3058 50%, #071e30 100%);
        font-family: inherit;
      }
      .leaflet-control-zoom a {
        background: rgba(13, 33, 55, 0.95) !important;
        color: #06b6d4 !important;
        border-color: rgba(30, 58, 95, 0.5) !important;
      }
      .leaflet-control-zoom a:hover {
        background: rgba(20, 45, 74, 0.98) !important;
      }
      .leaflet-control-attribution {
        background: rgba(10, 22, 40, 0.85) !important;
        color: #64748b !important;
        font-size: 10px !important;
      }
      .leaflet-control-attribution a {
        color: #06b6d4 !important;
      }
      .eez-tooltip {
        background: rgba(13, 33, 55, 0.98) !important;
        color: white !important;
        border: 1px solid rgba(6, 182, 212, 0.5) !important;
        border-radius: 8px !important;
        padding: 6px 10px !important;
        font-size: 12px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
      }
      .leaflet-popup-content-wrapper {
        background: rgba(13, 33, 55, 0.98) !important;
        color: white !important;
        border: 1px solid rgba(6, 182, 212, 0.4) !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5) !important;
      }
      .leaflet-popup-tip {
        background: rgba(13, 33, 55, 0.98) !important;
      }
      .leaflet-popup-close-button {
        color: #06b6d4 !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      ro.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [onLocationUpdate, onProximityUpdate, onSpeedUpdate])

  // Socket.io real-time connection + initial REST fetch
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

    // Initial REST fetch — show latest position immediately on load
    fetch(`${BACKEND_URL}/api/location`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.lat) return
        const lat = Number(data.lat)
        const lng = Number(data.lon)
        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([lat, lng])
          mapInstanceRef.current.panTo([lat, lng])
        }
        pathRef.current.push([lat, lng])
        pathPolylineRef.current?.setLatLngs(pathRef.current)
        onLocationUpdate(lat, lng)
        const distance = data.distance != null ? Number(data.distance) : calculateDistanceToBoundary(lat, lng)
        onProximityUpdate(distance)
        if (data.zone) onZoneUpdate?.(data.zone)
        onEEZUpdate?.(findNearestBoundary(lat, lng))
        lastPositionRef.current = { lat, lng, time: Date.now() }
        setIsTracking(true)
        onStatusUpdate?.("Backend Connected")
      })
      .catch(() => onStatusUpdate?.("Backend Offline"))

    // Socket.io for real-time push from ESP32
    const socket = io(BACKEND_URL)

    socket.on("connect", () => {
      setIsTracking(true)
      onStatusUpdate?.("Backend Connected")
    })

    socket.on("disconnect", () => {
      setIsTracking(false)
      onStatusUpdate?.("Backend Offline")
    })

    socket.on("locationUpdate", (data: { lat: number; lon: number; distance?: number; zone?: string }) => {
      const lat = Number(data.lat)
      const lng = Number(data.lon)
      const currentTime = Date.now()

      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([lat, lng])
        mapInstanceRef.current.panTo([lat, lng])
      }

      pathRef.current.push([lat, lng])
      if (pathRef.current.length > 200) pathRef.current.shift()
      pathPolylineRef.current?.setLatLngs(pathRef.current)

      onLocationUpdate(lat, lng)
      const distance = data.distance != null ? Number(data.distance) : calculateDistanceToBoundary(lat, lng)
      onProximityUpdate(distance)
      if (data.zone) onZoneUpdate?.(data.zone)
      onEEZUpdate?.(findNearestBoundary(lat, lng))

      if (lastPositionRef.current) {
        const timeDiff = (currentTime - lastPositionRef.current.time) / 1000 / 3600
        if (timeDiff > 0) {
          const distKm = haversineDistance(lat, lng, lastPositionRef.current.lat, lastPositionRef.current.lng)
          const speedKnots = (distKm / timeDiff) * 0.539957
          if (speedKnots < 100) onSpeedUpdate(speedKnots)
        }
      }
      lastPositionRef.current = { lat, lng, time: currentTime }
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [onLocationUpdate, onProximityUpdate, onSpeedUpdate, onStatusUpdate, onEEZUpdate, onZoneUpdate])

  // ─── Demo Mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demoMode) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
      return
    }
    // Reset path for fresh demo run
    pathRef.current = []
    pathPolylineRef.current?.setLatLngs([])
    demoIndexRef.current = 0
    setIsTracking(true)
    onStatusUpdate?.("Demo Mode Active")

    demoIntervalRef.current = setInterval(() => {
      if (!mapInstanceRef.current) return
      const point = DEMO_ROUTE[demoIndexRef.current]
      const lat = point.lat
      const lng = point.lon
      const currentTime = Date.now()

      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      mapInstanceRef.current.panTo([lat, lng])

      pathRef.current.push([lat, lng])
      if (pathRef.current.length > 200) pathRef.current.shift()
      pathPolylineRef.current?.setLatLngs(pathRef.current)

      onLocationUpdate(lat, lng)
      const distance = calculateDistanceToBoundary(lat, lng)
      onProximityUpdate(distance)
      onEEZUpdate?.(findNearestBoundary(lat, lng))

      // Determine zone
      if (distance < 12) {
        onZoneUpdate?.("DANGER")
      } else if (distance < 25) {
        onZoneUpdate?.("WARNING")
      } else {
        onZoneUpdate?.("SAFE")
      }

      if (lastPositionRef.current) {
        const timeDiff = (currentTime - lastPositionRef.current.time) / 1000 / 3600
        if (timeDiff > 0) {
          const distKm = haversineDistance(lat, lng, lastPositionRef.current.lat, lastPositionRef.current.lng)
          const speedKnots = (distKm / timeDiff) * 0.539957
          if (speedKnots < 100) onSpeedUpdate(speedKnots)
        }
      }
      lastPositionRef.current = { lat, lng, time: currentTime }
      demoIndexRef.current = (demoIndexRef.current + 1) % DEMO_ROUTE.length
    }, 250)

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
    }
  }, [demoMode, onLocationUpdate, onProximityUpdate, onSpeedUpdate, onStatusUpdate, onEEZUpdate, onZoneUpdate])

  return (
    <div className="relative w-full h-full" style={{ minHeight: '520px' }}>
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '520px', borderRadius: '1rem' }} />

      <div className="absolute top-4 left-4 z-[1000]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl text-base font-semibold" style={{
          background: "linear-gradient(135deg, rgba(10, 22, 40, 0.95) 0%, rgba(13, 33, 55, 0.9) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.4)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}>
          <div className={`w-3.5 h-3.5 rounded-full ${isTracking ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
          <span className="text-gray-200">{isTracking ? "Live Backend Data" : "Backend Offline"}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[1000]">
        <div className="px-5 py-3 rounded-xl text-base" style={{
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(34, 197, 94, 0.2) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.5)",
          boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
        }}>
          <span className="text-cyan-300 font-bold">{boundaryCount} TN Maritime Limits</span>
        </div>
      </div>
    </div>
  )
}

// Offset a line by a given distance (in degrees, roughly ~111km per degree)
// Positive offset moves the line towards the "inside" (shore side)
function offsetLine(points: [number, number][], offsetDegrees: number): [number, number][] {
  if (points.length < 2) return points

  const result: [number, number][] = []

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const curr = points[i]
    const next = points[Math.min(points.length - 1, i + 1)]

    // Calculate direction vectors
    const dx1 = curr[0] - prev[0]
    const dy1 = curr[1] - prev[1]
    const dx2 = next[0] - curr[0]
    const dy2 = next[1] - curr[1]

    // Average direction
    const dx = (dx1 + dx2) / 2
    const dy = (dy1 + dy2) / 2

    // Perpendicular direction (normalized)
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny = dx / len

    // Apply offset (inward toward shore)
    result.push([
      curr[0] + nx * offsetDegrees,
      curr[1] + ny * offsetDegrees
    ])
  }

  return result
}

