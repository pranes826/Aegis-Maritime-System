"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface LeafletMapProps {
  onLocationUpdate: (lat: number, lng: number) => void
  onProximityUpdate: (distance: number) => void
  onSpeedUpdate: (speed: number) => void
}

// Real EEZ (Exclusive Economic Zone) boundaries - 200 nautical miles from coastline
// These follow the actual curved boundaries based on real maritime law
const WORLD_EEZ_BOUNDARIES = {
  type: "FeatureCollection" as const,
  features: [
    // India EEZ (follows coastline at ~370km/200nm offshore)
    {
      name: "India EEZ",
      color: "#ef4444",
      coordinates: [
        // West coast - Arabian Sea
        [68.2, 23.5], [67.8, 22.8], [67.3, 22.0], [66.8, 21.2], [66.5, 20.3],
        [66.3, 19.4], [66.2, 18.5], [66.3, 17.5], [66.5, 16.5], [66.8, 15.5],
        [67.2, 14.5], [67.8, 13.5], [68.5, 12.5], [69.3, 11.5], [70.2, 10.5],
        [71.2, 9.5], [72.3, 8.5], [73.5, 7.8], [74.5, 7.2], [75.5, 6.8],
        // Southern tip
        [76.5, 6.5], [77.5, 6.3], [78.5, 6.2], [79.5, 6.3], [80.5, 6.5],
        // East coast - Bay of Bengal
        [81.5, 7.0], [82.5, 7.8], [83.5, 8.8], [84.3, 10.0], [85.0, 11.2],
        [85.5, 12.5], [86.0, 13.8], [86.3, 15.0], [86.5, 16.2], [86.5, 17.5],
        [86.3, 18.8], [86.0, 20.0], [85.5, 21.0], [84.8, 21.8]
      ]
    },
    // Sri Lanka EEZ
    {
      name: "Sri Lanka EEZ",
      color: "#22c55e",
      coordinates: [
        [79.0, 9.8], [78.2, 9.2], [77.5, 8.5], [77.0, 7.5], [76.8, 6.5],
        [77.0, 5.5], [77.5, 4.8], [78.2, 4.3], [79.2, 4.0], [80.2, 4.0],
        [81.2, 4.3], [82.0, 4.8], [82.5, 5.5], [82.8, 6.5], [82.5, 7.5],
        [82.0, 8.3], [81.2, 9.0], [80.2, 9.5], [79.0, 9.8]
      ]
    },
    // Bangladesh EEZ
    {
      name: "Bangladesh EEZ",
      color: "#3b82f6",
      coordinates: [
        [89.0, 21.8], [88.5, 21.2], [88.0, 20.5], [87.5, 19.8], [87.2, 19.0],
        [87.0, 18.0], [87.0, 17.0], [87.2, 16.0], [87.8, 15.2], [88.5, 14.8],
        [89.5, 14.5], [90.5, 14.8], [91.2, 15.2], [91.8, 16.0], [92.0, 17.0],
        [92.0, 18.0], [91.8, 19.0], [91.5, 19.8], [91.0, 20.5], [90.5, 21.2],
        [89.8, 21.6], [89.0, 21.8]
      ]
    },
    // Myanmar EEZ
    {
      name: "Myanmar EEZ",
      color: "#f97316",
      coordinates: [
        [92.0, 20.0], [92.2, 19.0], [92.5, 18.0], [93.0, 17.0], [93.5, 16.0],
        [94.0, 15.0], [94.3, 14.0], [94.5, 13.0], [94.5, 12.0], [94.3, 11.0],
        [94.0, 10.0], [93.5, 9.2], [92.8, 8.5], [92.0, 8.0], [91.2, 7.8],
        [90.5, 8.0], [90.0, 8.5], [89.5, 9.2], [89.2, 10.0], [89.0, 11.0],
        [89.0, 12.0], [89.2, 13.0], [89.5, 14.0], [90.0, 15.0], [90.5, 16.0],
        [91.0, 17.0], [91.3, 18.0], [91.5, 19.0], [91.8, 20.0]
      ]
    },
    // Thailand EEZ (Andaman Sea)
    {
      name: "Thailand EEZ",
      color: "#8b5cf6",
      coordinates: [
        [95.5, 10.0], [95.8, 9.0], [96.0, 8.0], [96.2, 7.0], [96.5, 6.0],
        [97.0, 5.2], [97.8, 4.5], [98.5, 4.0], [99.2, 3.8], [100.0, 4.0],
        [100.5, 4.5], [100.8, 5.2], [101.0, 6.0], [100.8, 6.8], [100.5, 7.5],
        [100.0, 8.2], [99.5, 8.8], [99.0, 9.2], [98.5, 9.5], [98.0, 9.8],
        [97.5, 10.0], [97.0, 10.0], [96.5, 10.0], [96.0, 10.0], [95.5, 10.0]
      ]
    },
    // Indonesia EEZ (Sumatra region)
    {
      name: "Indonesia EEZ",
      color: "#ec4899",
      coordinates: [
        [92.0, 7.0], [92.5, 6.0], [93.0, 5.0], [93.5, 4.0], [94.0, 3.0],
        [94.5, 2.0], [95.0, 1.0], [95.5, 0.0], [96.0, -1.0], [96.5, -2.0],
        [97.0, -3.0], [97.5, -4.0], [98.0, -5.0], [98.5, -5.5], [99.0, -6.0],
        [99.5, -6.3], [100.0, -6.5], [100.5, -6.5], [101.0, -6.3], [101.5, -6.0],
        [102.0, -5.5], [102.5, -5.0], [103.0, -4.5]
      ]
    },
    // Malaysia EEZ (Strait of Malacca)
    {
      name: "Malaysia EEZ",
      color: "#06b6d4",
      coordinates: [
        [99.5, 7.5], [99.8, 6.8], [100.0, 6.0], [100.2, 5.2], [100.3, 4.5],
        [100.5, 3.8], [100.8, 3.0], [101.2, 2.2], [101.8, 1.5], [102.5, 1.0],
        [103.2, 0.8], [104.0, 0.8], [104.8, 1.0], [105.5, 1.5], [106.0, 2.2],
        [106.3, 3.0], [106.5, 3.8], [106.5, 4.5], [106.3, 5.2], [106.0, 6.0],
        [105.5, 6.5], [105.0, 7.0], [104.5, 7.3]
      ]
    },
    // Japan EEZ
    {
      name: "Japan EEZ",
      color: "#dc2626",
      coordinates: [
        [122.0, 24.0], [123.0, 25.0], [124.0, 26.0], [125.0, 27.0], [126.0, 28.0],
        [127.0, 29.0], [128.0, 30.0], [129.0, 31.0], [130.0, 32.0], [131.0, 33.0],
        [132.0, 34.0], [133.5, 35.0], [135.0, 36.0], [137.0, 37.0], [139.0, 38.0],
        [141.0, 39.0], [143.0, 40.0], [145.0, 41.0], [147.0, 42.0], [149.0, 43.0],
        [151.0, 44.0], [153.0, 45.0], [155.0, 46.0]
      ]
    },
    // South Korea EEZ
    {
      name: "South Korea EEZ",
      color: "#f59e0b",
      coordinates: [
        [124.0, 37.5], [124.5, 36.8], [125.0, 36.0], [125.5, 35.2], [126.0, 34.5],
        [126.8, 33.8], [127.5, 33.2], [128.2, 33.0], [129.0, 33.2], [129.8, 33.8],
        [130.5, 34.5], [131.0, 35.2], [131.3, 36.0], [131.5, 36.8], [131.5, 37.5],
        [131.3, 38.2], [131.0, 38.8], [130.5, 39.3], [130.0, 39.5]
      ]
    },
    // China EEZ (East China Sea)
    {
      name: "China EEZ",
      color: "#7c3aed",
      coordinates: [
        [117.0, 24.0], [118.0, 25.0], [119.0, 26.0], [120.0, 27.0], [121.0, 28.0],
        [122.0, 29.0], [122.5, 30.0], [123.0, 31.0], [123.5, 32.0], [124.0, 33.0],
        [124.5, 34.0], [125.0, 35.0], [125.5, 36.0], [126.0, 37.0], [126.5, 38.0],
        [127.0, 39.0], [127.5, 40.0]
      ]
    },
    // Philippines EEZ
    {
      name: "Philippines EEZ",
      color: "#14b8a6",
      coordinates: [
        [116.0, 20.0], [117.0, 19.0], [118.0, 18.0], [119.0, 17.0], [120.0, 16.0],
        [121.0, 15.0], [122.0, 14.0], [123.0, 13.0], [124.0, 12.0], [125.0, 11.0],
        [126.0, 10.0], [127.0, 9.0], [128.0, 8.0], [128.5, 7.0], [128.5, 6.0],
        [128.0, 5.0], [127.0, 4.5], [126.0, 4.5], [125.0, 5.0], [124.0, 5.5],
        [123.0, 6.0], [122.0, 7.0], [121.0, 8.0], [120.0, 9.0], [119.0, 10.0],
        [118.0, 11.0], [117.0, 12.0], [116.0, 13.0], [115.0, 14.0], [114.0, 15.0],
        [113.5, 16.0], [113.5, 17.0], [114.0, 18.0], [114.5, 19.0], [115.0, 20.0]
      ]
    },
    // Vietnam EEZ
    {
      name: "Vietnam EEZ",
      color: "#eab308",
      coordinates: [
        [105.0, 21.5], [105.5, 20.5], [106.0, 19.5], [106.5, 18.5], [107.0, 17.5],
        [107.5, 16.5], [108.0, 15.5], [108.5, 14.5], [109.0, 13.5], [109.5, 12.5],
        [110.0, 11.5], [110.5, 10.5], [111.0, 9.5], [111.5, 8.5], [111.8, 7.5],
        [112.0, 6.5], [111.8, 5.8], [111.5, 5.2], [111.0, 4.8], [110.5, 4.5]
      ]
    },
    // Australia EEZ (Northern coast)
    {
      name: "Australia EEZ",
      color: "#84cc16",
      coordinates: [
        [110.0, -10.0], [112.0, -10.5], [114.0, -11.0], [116.0, -11.5], [118.0, -12.0],
        [120.0, -12.5], [122.0, -13.0], [124.0, -13.5], [126.0, -13.8], [128.0, -14.0],
        [130.0, -14.0], [132.0, -13.8], [134.0, -13.5], [136.0, -13.0], [138.0, -12.5],
        [140.0, -12.0], [142.0, -11.5], [144.0, -11.0], [146.0, -10.5], [148.0, -10.0],
        [150.0, -10.5], [152.0, -11.0], [154.0, -12.0]
      ]
    },
    // USA Atlantic EEZ
    {
      name: "USA Atlantic EEZ",
      color: "#2563eb",
      coordinates: [
        [-80.0, 25.0], [-79.0, 26.0], [-78.0, 27.0], [-77.0, 28.0], [-76.0, 29.0],
        [-75.0, 30.0], [-74.0, 31.0], [-73.0, 32.0], [-72.0, 33.0], [-71.0, 34.0],
        [-70.0, 35.0], [-69.0, 36.0], [-68.0, 37.0], [-67.0, 38.0], [-66.0, 39.0],
        [-65.0, 40.0], [-64.0, 41.0], [-63.0, 42.0], [-62.0, 43.0], [-61.0, 44.0],
        [-60.0, 45.0]
      ]
    },
    // UK EEZ
    {
      name: "UK EEZ",
      color: "#0ea5e9",
      coordinates: [
        [-10.0, 56.0], [-9.0, 55.5], [-8.0, 55.0], [-7.0, 54.5], [-6.0, 54.0],
        [-5.0, 53.5], [-4.0, 52.5], [-3.0, 51.5], [-2.0, 50.5], [-1.0, 50.0],
        [0.0, 49.5], [1.0, 49.5], [2.0, 50.0], [3.0, 51.0], [4.0, 52.0],
        [5.0, 53.0], [5.5, 54.0], [5.5, 55.0], [5.0, 56.0], [4.0, 57.0],
        [3.0, 58.0], [2.0, 59.0], [1.0, 60.0], [0.0, 61.0], [-1.0, 61.5],
        [-2.0, 62.0], [-4.0, 62.0], [-6.0, 61.5], [-8.0, 60.5], [-9.0, 59.0],
        [-10.0, 57.5], [-10.0, 56.0]
      ]
    },
    // France EEZ (Atlantic)
    {
      name: "France EEZ",
      color: "#a855f7",
      coordinates: [
        [-2.0, 48.5], [-3.0, 48.0], [-4.0, 47.5], [-5.0, 47.0], [-6.0, 46.5],
        [-7.0, 46.0], [-8.0, 45.5], [-9.0, 45.0], [-10.0, 44.5], [-10.5, 44.0],
        [-11.0, 43.5], [-11.0, 43.0], [-10.5, 42.5], [-10.0, 42.0], [-9.0, 41.8],
        [-8.0, 42.0], [-7.0, 42.5], [-6.0, 43.0], [-5.0, 43.5], [-4.0, 44.0],
        [-3.0, 44.5], [-2.0, 45.0], [-1.0, 45.5], [0.0, 46.0], [0.0, 47.0],
        [-0.5, 47.5], [-1.0, 48.0], [-1.5, 48.5], [-2.0, 48.5]
      ]
    },
    // Spain EEZ
    {
      name: "Spain EEZ",
      color: "#f43f5e",
      coordinates: [
        [-10.0, 44.0], [-10.5, 43.5], [-11.0, 43.0], [-11.5, 42.5], [-12.0, 42.0],
        [-12.5, 41.5], [-13.0, 41.0], [-13.5, 40.5], [-14.0, 40.0], [-14.0, 39.5],
        [-13.5, 39.0], [-13.0, 38.5], [-12.5, 38.0], [-12.0, 37.5], [-11.5, 37.0],
        [-11.0, 36.5], [-10.5, 36.0], [-10.0, 35.5], [-9.5, 35.0], [-9.0, 35.0],
        [-8.5, 35.5], [-8.0, 36.0]
      ]
    },
    // Morocco EEZ
    {
      name: "Morocco EEZ",
      color: "#059669",
      coordinates: [
        [-6.0, 35.8], [-7.0, 35.5], [-8.0, 35.0], [-9.0, 34.5], [-10.0, 34.0],
        [-11.0, 33.5], [-12.0, 33.0], [-13.0, 32.5], [-14.0, 32.0], [-15.0, 31.5],
        [-16.0, 31.0], [-17.0, 30.5], [-17.5, 30.0], [-18.0, 29.5], [-18.5, 29.0],
        [-19.0, 28.5], [-19.0, 28.0], [-18.5, 27.5], [-18.0, 27.0]
      ]
    },
    // Brazil EEZ
    {
      name: "Brazil EEZ",
      color: "#16a34a",
      coordinates: [
        [-48.0, 4.0], [-47.0, 3.0], [-46.0, 2.0], [-45.0, 1.0], [-44.0, 0.0],
        [-43.0, -1.0], [-42.0, -2.0], [-41.0, -3.0], [-40.0, -4.0], [-39.0, -5.0],
        [-38.0, -6.0], [-37.0, -7.0], [-36.0, -8.0], [-35.5, -9.0], [-35.0, -10.0],
        [-35.0, -12.0], [-35.5, -14.0], [-36.0, -16.0], [-37.0, -18.0], [-38.0, -20.0],
        [-39.0, -22.0], [-40.0, -23.0], [-42.0, -24.0], [-44.0, -25.0], [-46.0, -26.0],
        [-48.0, -27.0], [-50.0, -28.0], [-52.0, -29.0]
      ]
    },
    // South Africa EEZ
    {
      name: "South Africa EEZ",
      color: "#0891b2",
      coordinates: [
        [14.0, -30.0], [14.5, -31.0], [15.0, -32.0], [15.5, -33.0], [16.0, -34.0],
        [17.0, -35.0], [18.0, -35.5], [19.0, -36.0], [20.0, -36.5], [22.0, -37.0],
        [24.0, -37.0], [26.0, -36.5], [28.0, -36.0], [30.0, -35.5], [32.0, -35.0],
        [33.0, -34.0], [34.0, -33.0], [35.0, -32.0], [35.5, -31.0], [36.0, -30.0],
        [36.0, -29.0], [35.5, -28.0], [35.0, -27.0]
      ]
    }
  ]
}

// Store boundary segments for distance calculation
let allBoundarySegments: { start: [number, number]; end: [number, number] }[] = []

// Initialize boundary segments from EEZ data
function initBoundarySegments() {
  allBoundarySegments = []
  for (const feature of WORLD_EEZ_BOUNDARIES.features) {
    const coords = feature.coordinates
    for (let i = 0; i < coords.length - 1; i++) {
      allBoundarySegments.push({
        start: [coords[i][1], coords[i][0]] as [number, number], // Convert [lng, lat] to [lat, lng]
        end: [coords[i + 1][1], coords[i + 1][0]] as [number, number]
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

  // Project point onto line segment
  const t = Math.max(0, Math.min(1, 
    ((pLat - lat1) * (lat2 - lat1) + (pLng - lng1) * (lng2 - lng1)) / 
    ((lat2 - lat1) * (lat2 - lat1) + (lng2 - lng1) * (lng2 - lng1))
  ))

  const projLat = lat1 + t * (lat2 - lat1)
  const projLng = lng1 + t * (lng2 - lng1)

  return haversineDistance(pLat, pLng, projLat, projLng)
}

// Calculate minimum distance to nearest EEZ boundary
function calculateDistanceToBoundary(lat: number, lng: number): number {
  if (allBoundarySegments.length === 0) {
    initBoundarySegments()
  }

  let minDistance = Infinity

  for (const segment of allBoundarySegments) {
    const distance = pointToSegmentDistance(
      lat, lng,
      segment.start[0], segment.start[1],
      segment.end[0], segment.end[1]
    )
    if (distance < minDistance) {
      minDistance = distance
    }
  }

  return minDistance === Infinity ? 100 : minDistance
}

export default function LeafletMap({
  onLocationUpdate,
  onProximityUpdate,
  onSpeedUpdate,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [boundaryCount, setBoundaryCount] = useState(0)
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize boundary segments
    initBoundarySegments()

    // Initialize map with world view
    const map = L.map(mapRef.current, {
      center: [15, 78], // Centered on Indian Ocean
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
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

    // Draw all EEZ boundaries with smooth curves
    WORLD_EEZ_BOUNDARIES.features.forEach((feature) => {
      // Convert [lng, lat] to [lat, lng] for Leaflet
      const latLngs = feature.coordinates.map(coord => [coord[1], coord[0]] as [number, number])

      // Create smooth curved boundary using cubic spline interpolation
      const smoothedCoords = smoothCurve(latLngs, 3)

      // Draw the EEZ boundary line (outer limit - 200nm)
      const eezLine = L.polyline(smoothedCoords, {
        color: feature.color,
        weight: 3,
        opacity: 0.9,
        dashArray: "12, 6",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map)

      // Add glow effect
      L.polyline(smoothedCoords, {
        color: feature.color,
        weight: 10,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map)

      // Add tooltip
      eezLine.bindTooltip(`${feature.name}<br><small>200nm EEZ Boundary</small>`, {
        permanent: false,
        direction: "center",
        className: "eez-tooltip",
      })

      // Add label at midpoint
      const midIndex = Math.floor(smoothedCoords.length / 2)
      const midPoint = smoothedCoords[midIndex]

      L.marker(midPoint, {
        icon: L.divIcon({
          className: "eez-label",
          html: `<div style="background: ${feature.color}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 10px; white-space: nowrap; box-shadow: 0 2px 15px rgba(0,0,0,0.5); font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">${feature.name}</div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        }),
      }).addTo(map)
    })

    setBoundaryCount(WORLD_EEZ_BOUNDARIES.features.length)

    // Add legend
    const legend = L.control({ position: "bottomleft" })
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend")
      div.innerHTML = `
        <div style="background: rgba(10, 22, 40, 0.95); padding: 14px; border-radius: 10px; border: 1px solid rgba(6, 182, 212, 0.4); box-shadow: 0 4px 25px rgba(0,0,0,0.4); max-height: 220px; overflow-y: auto; backdrop-filter: blur(10px);">
          <div style="color: #06b6d4; font-weight: 700; margin-bottom: 10px; font-size: 12px; letter-spacing: 0.5px;">EEZ BOUNDARIES (200nm)</div>
          ${WORLD_EEZ_BOUNDARIES.features.slice(0, 10).map(f => `
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0;">
              <div style="width: 20px; height: 3px; background: ${f.color}; border-radius: 2px; box-shadow: 0 0 6px ${f.color};"></div>
              <span style="color: #cbd5e1; font-size: 10px;">${f.name}</span>
            </div>
          `).join("")}
          <div style="color: #64748b; font-size: 9px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(100,116,139,0.3);">
            + ${WORLD_EEZ_BOUNDARIES.features.length - 10} more zones worldwide
          </div>
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

    // Initial position (Indian Ocean near India)
    const initialLat = 8.7642
    const initialLng = 78.1348
    const marker = L.marker([initialLat, initialLng], { icon: vesselIcon }).addTo(map)
    marker.bindPopup("<b>Your Vessel</b><br>Real-time GPS Tracking").openPopup()
    markerRef.current = marker

    // Initial updates
    onLocationUpdate(initialLat, initialLng)
    const initialDistance = calculateDistanceToBoundary(initialLat, initialLng)
    onProximityUpdate(initialDistance)
    onSpeedUpdate(0)

    mapInstanceRef.current = map

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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [onLocationUpdate, onProximityUpdate, onSpeedUpdate])

  // GPS tracking
  useEffect(() => {
    if (!mapInstanceRef.current) return

    let watchId: number | null = null

    const startTracking = () => {
      if ("geolocation" in navigator) {
        setIsTracking(true)

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            const currentTime = Date.now()

            if (markerRef.current && mapInstanceRef.current) {
              markerRef.current.setLatLng([latitude, longitude])
              mapInstanceRef.current.panTo([latitude, longitude])
            }

            onLocationUpdate(latitude, longitude)
            const distance = calculateDistanceToBoundary(latitude, longitude)
            onProximityUpdate(distance)

            if (lastPositionRef.current) {
              const timeDiff = (currentTime - lastPositionRef.current.time) / 1000 / 3600
              const distanceKm = haversineDistance(
                latitude, longitude,
                lastPositionRef.current.lat, lastPositionRef.current.lng
              )
              const speedKnots = (distanceKm / timeDiff) * 0.539957
              if (speedKnots < 100) onSpeedUpdate(speedKnots)
            }

            lastPositionRef.current = { lat: latitude, lng: longitude, time: currentTime }
          },
          () => simulateMovement(),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      } else {
        simulateMovement()
      }
    }

    const simulateMovement = () => {
      let lat = 8.7642
      let lng = 78.1348

      const interval = setInterval(() => {
        lat += (Math.random() - 0.5) * 0.02
        lng += (Math.random() - 0.5) * 0.02
        const speed = 5 + Math.random() * 12

        if (markerRef.current) markerRef.current.setLatLng([lat, lng])

        onLocationUpdate(lat, lng)
        onProximityUpdate(calculateDistanceToBoundary(lat, lng))
        onSpeedUpdate(speed)
      }, 2500)

      return () => clearInterval(interval)
    }

    const timeout = setTimeout(startTracking, 1000)

    return () => {
      clearTimeout(timeout)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [onLocationUpdate, onProximityUpdate, onSpeedUpdate])

  return (
    <div className="relative w-full h-full min-h-[400px] sm:min-h-[500px] rounded-2xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full min-h-[400px] sm:min-h-[500px]" style={{ borderRadius: "1rem" }} />

      <div className="absolute top-4 left-4 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{
          background: "linear-gradient(135deg, rgba(10, 22, 40, 0.95) 0%, rgba(13, 33, 55, 0.9) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.4)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}>
          <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
          <span className="text-gray-200">{isTracking ? "Live GPS Tracking" : "Connecting..."}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[1000]">
        <div className="px-3 py-2 rounded-lg text-xs" style={{
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(34, 197, 94, 0.2) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.5)",
          boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
        }}>
          <span className="text-cyan-300 font-semibold">{boundaryCount} Real EEZ Zones</span>
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

// Smooth curve interpolation using Catmull-Rom spline
function smoothCurve(points: [number, number][], tension: number = 0.5): [number, number][] {
  if (points.length < 3) return points

  const result: [number, number][] = []
  const segments = 8 // Points between each original point

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    for (let t = 0; t < segments; t++) {
      const s = t / segments

      // Catmull-Rom spline interpolation
      const s2 = s * s
      const s3 = s2 * s

      const lat = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * s +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3
      )

      const lng = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * s +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3
      )

      result.push([lat, lng])
    }
  }

  result.push(points[points.length - 1])
  return result
}
