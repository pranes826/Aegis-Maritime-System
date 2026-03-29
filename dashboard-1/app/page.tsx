"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-[#0a2540] flex items-center justify-center" style={{ height: '100vh', minHeight: '1080px' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-cyan-400 text-sm">Loading Map...</span>
      </div>
    </div>
  ),
})

export default function MaritimeDashboard() {
  const [vesselId, setVesselId] = useState("")
  const [currentLocation, setCurrentLocation] = useState("Fetching...")
  const [proximityToBorder, setProximityToBorder] = useState("--")
  const [currentSpeed, setCurrentSpeed] = useState("--")
  const [serverStatus, setServerStatus] = useState("Connecting...")
  const [isNearBoundary, setIsNearBoundary] = useState(false)
  const [zone, setZone] = useState("UNKNOWN")
  const [nearestEEZ, setNearestEEZ] = useState("Calculating...")
  const [boatId, setBoatId] = useState("BOAT1")
  const [alerts, setAlerts] = useState<{ zone: string; lat: number; lon: number; timestamp: string }[]>([])
  const [history, setHistory] = useState<{ distance?: number; timestamp: string }[]>([])
  const [demoMode, setDemoMode] = useState(false)

  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    setCurrentLocation(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`)
  }, [])

  const handleProximityUpdate = useCallback((distance: number) => {
    setProximityToBorder(`${distance.toFixed(1)} km`)
    setIsNearBoundary(distance < 50) // Warning if within 50km of boundary
  }, [])

  const handleSpeedUpdate = useCallback((speed: number) => {
    setCurrentSpeed(`${speed.toFixed(1)} knots`)
  }, [])

  const handleZoneUpdate = useCallback((z: string) => setZone(z), [])
  const handleEEZUpdate = useCallback((name: string) => setNearestEEZ(name), [])

  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
    const load = async () => {
      try {
        const [histRes, alertRes, locRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/location/history`),
          fetch(`${BACKEND_URL}/api/alerts`),
          fetch(`${BACKEND_URL}/api/location`),
        ])
        if (histRes.ok) setHistory(await histRes.json())
        if (alertRes.ok) setAlerts(await alertRes.json())
        if (locRes.ok) {
          const loc = await locRes.json()
          if (loc.boatId) setBoatId(loc.boatId)
          if (loc.zone) setZone(loc.zone)
        }
      } catch { /* backend offline */ }
    }
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  const handleSearch = () => {
    if (vesselId.trim()) {
      setCurrentLocation("Searching...")
      setTimeout(() => {
        setCurrentLocation("8.9123° N, 78.4567° E")
        setProximityToBorder("8.3 km")
        setCurrentSpeed("10.1 knots")
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen text-white font-sans relative flex flex-col">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#020817] via-[#0a1628] to-[#071525]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(6,182,212,0.15)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(34,197,94,0.1)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,116,144,0.08)_0%,_transparent_70%)]"></div>
      </div>
      
      <div className="relative z-10 flex flex-col flex-1">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-8 sm:px-12 py-7 border-b border-[#1e3a5f]/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-7xl sm:text-8xl font-semibold tracking-wide">
            Smart Maritime Boundary Detection System
          </h1>
        </div>

        <div className="flex items-center gap-5 sm:gap-6 flex-wrap">
          <div className="flex items-center bg-[#0d2137] rounded-3xl overflow-hidden border-2 border-[#1e3a5f]">
            <span className="text-gray-400 text-4xl px-8 hidden sm:block">search:</span>
            <input
              type="text"
              placeholder="Vessel ID..."
              value={vesselId}
              onChange={(e) => setVesselId(e.target.value)}
              className="bg-[#142d4a] px-8 py-6 text-4xl text-cyan-300 placeholder-cyan-700 focus:outline-none w-64 sm:w-80"
            />
            <button
              onClick={handleSearch}
              className="bg-[#142d4a] px-8 py-6 hover:bg-[#1e3a5f] transition-colors"
            >
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <svg className="w-9 h-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">2</span>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                <svg className="w-11 h-11" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#020817] ${serverStatus === "Backend Connected" ? "bg-green-400" : "bg-red-500"}`} />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-4xl font-medium">{boatId}</p>
              <p className={`text-3xl ${serverStatus === "Backend Connected" ? "text-green-400" : "text-red-400"}`}>{serverStatus}</p>
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(m => !m)}
            className={`flex items-center gap-5 px-12 py-6 rounded-3xl text-4xl font-bold transition-all border-2 ${
              demoMode
                ? "bg-purple-700/80 border-purple-400 text-white shadow-[0_0_32px_rgba(147,51,234,0.7)]"
                : "bg-[#0d2137] border-[#1e3a5f] text-gray-300 hover:border-purple-500 hover:text-purple-300"
            }`}
          >
            <span className={`w-8 h-8 rounded-full ${demoMode ? "bg-purple-300 animate-pulse" : "bg-gray-600"}`} />
            {demoMode ? "Stop Demo" : "Demo Mode"}
          </button>
        </div>
      </header>

      {/* Hardware Indicators Panel */}
      <div className="flex flex-wrap items-center gap-10 px-8 sm:px-12 py-7 border-b border-[#1e3a5f]/40"
        style={{ background: 'linear-gradient(135deg, rgba(7,21,37,0.97) 0%, rgba(10,22,40,0.95) 100%)' }}
      >
        <span className="text-gray-500 text-3xl font-semibold uppercase tracking-widest">Hardware Indicators</span>

        {/* LED */}
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-16 h-16">
            {/* Glow ring for WARNING/DANGER */}
            {zone !== "SAFE" && zone !== "UNKNOWN" && (
              <span className={`absolute inset-0 rounded-full ${
                zone === "DANGER" ? "bg-red-500/30" : "bg-yellow-400/30 animate-ping"
              }`} />
            )}
            <div className={`w-14 h-14 rounded-full border-2 transition-all duration-300 ${
              zone === "DANGER"
                ? "bg-red-500 border-red-300 shadow-[0_0_24px_8px_rgba(239,68,68,0.8)]"
                : zone === "WARNING"
                  ? "bg-yellow-400 border-yellow-200 shadow-[0_0_24px_8px_rgba(250,204,21,0.7)] animate-pulse"
                  : "bg-gray-700 border-gray-600"
            }`} />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-400 uppercase tracking-wider leading-none">LED</p>
            <p className={`text-3xl font-bold leading-tight ${
              zone === "DANGER" ? "text-red-400" : zone === "WARNING" ? "text-yellow-400" : "text-gray-600"
            }`}>
              {zone === "DANGER" ? "SOLID ON" : zone === "WARNING" ? "BLINKING" : "OFF"}
            </p>
          </div>
        </div>

        {/* Buzzer */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {zone === "DANGER" && (
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            )}
            <svg
              className={`w-16 h-16 transition-all duration-300 ${
                zone === "DANGER" ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : "text-gray-600"
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
              {zone === "DANGER" && (
                <>
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  <path d="M19 12c0 3.17-2.11 5.84-5 6.71v2.06C17.97 19.88 21 16.3 21 12s-3.03-7.88-7-8.77v2.06C16.89 6.16 19 8.83 19 12z" />
                </>
              )}
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-400 uppercase tracking-wider leading-none">BUZZER</p>
            <p className={`text-3xl font-bold leading-tight ${
              zone === "DANGER" ? "text-red-400" : "text-gray-600"
            }`}>
              {zone === "DANGER" ? "ACTIVE" : "OFF"}
            </p>
          </div>
        </div>

        {demoMode && (
          <div className="ml-auto flex items-center gap-3 px-6 py-3 rounded-full border border-purple-500/50 bg-purple-900/30">
            <span className="w-4 h-4 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-300 text-2xl font-bold uppercase tracking-wider">Demo Mode Active</span>
          </div>
        )}
      </div>

      {/* Zone Alert Banner */}
      {(zone === "DANGER" || zone === "WARNING") && (
        <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${zone === "DANGER" ? "bg-red-950/90 border-red-500/50" : "bg-yellow-950/90 border-yellow-500/50"}`}>
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0 ${zone === "DANGER" ? "bg-red-400" : "bg-yellow-400"}`} />
          <span className={`font-bold text-lg ${zone === "DANGER" ? "text-red-300" : "text-yellow-300"}`}>
            {zone === "DANGER"
              ? "DANGER ZONE — Vessel has crossed into restricted waters!"
              : "WARNING — Vessel is approaching a boundary zone"}
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-400">
            <span>{boatId}</span>
            <span>{proximityToBorder} to border</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row p-6 sm:p-8 gap-6 sm:gap-8">
        {/* Sidebar Info Cards - 3D Effect with Green-Blue Shifting Hue */}
        <div className="flex lg:flex-col gap-6 lg:w-[700px] justify-center lg:justify-start">
          <div
            className="group flex flex-col items-center gap-9 p-16 rounded-2xl w-full transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div
              className="w-56 h-56 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #22c55e 50%, #0891b2 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-24 h-24 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <span className="text-5xl text-center font-bold leading-tight bg-gradient-to-r from-cyan-300 to-green-300 bg-clip-text text-transparent">Current Location</span>
            <span className="text-3xl text-center font-mono text-cyan-200 leading-snug">{currentLocation}</span>
          </div>

          <div
            className={`group flex flex-col items-center gap-9 p-16 rounded-2xl w-full transition-all duration-300 ${isNearBoundary ? 'animate-pulse' : ''}`}
            style={{
              background: isNearBoundary
                ? 'linear-gradient(145deg, #7f1d1d 0%, #450a0a 50%, #1c0505 100%)'
                : 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: isNearBoundary
                ? '0 8px 32px rgba(239, 68, 68, 0.4), 0 4px 16px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)'
                : '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: isNearBoundary 
                ? '1px solid rgba(239, 68, 68, 0.5)' 
                : '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div 
              className="w-56 h-56 rounded-2xl flex items-center justify-center"
              style={{
                background: isNearBoundary
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #10b981 100%)',
                boxShadow: isNearBoundary
                  ? '0 4px 15px rgba(239, 68, 68, 0.5), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)'
                  : '0 4px 15px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-24 h-24 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="6" strokeWidth={2} />
                <circle cx="12" cy="12" r="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span className={`text-5xl text-center font-bold leading-tight bg-clip-text text-transparent ${isNearBoundary ? 'bg-gradient-to-r from-red-300 to-orange-300' : 'bg-gradient-to-r from-green-300 to-cyan-300'}`}>Proximity to Border</span>
            <span className={`text-3xl text-center font-mono font-bold ${isNearBoundary ? 'text-red-300' : 'text-green-300'}`}>{proximityToBorder}</span>
          </div>

          <div
            className="group flex flex-col items-center gap-9 p-16 rounded-2xl w-full transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div 
              className="w-56 h-56 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #22c55e 50%, #06b6d4 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-24 h-24 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-5xl text-center font-bold leading-tight bg-gradient-to-r from-cyan-300 to-green-300 bg-clip-text text-transparent">Current Speed</span>
            <span className="text-3xl text-center font-mono text-cyan-200">{currentSpeed}</span>
          </div>

          {/* Nearest EEZ card */}
          <div
            className="group flex flex-col items-center gap-9 p-16 rounded-2xl w-full transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div
              className="w-56 h-56 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #06b6d4 50%, #10b981 100%)',
                boxShadow: '0 4px 15px rgba(245,158,11,0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-24 h-24 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span className="text-5xl text-center font-bold leading-tight bg-gradient-to-r from-yellow-300 to-cyan-300 bg-clip-text text-transparent">Nearest EEZ</span>
            <span className="text-3xl text-center text-yellow-200 leading-tight">{nearestEEZ.replace(" EEZ", "")}</span>
          </div>
        </div>

        {/* Leaflet Map Area */}
        <div className="flex-1 relative" style={{ height: '100vh', minHeight: '1080px' }}>
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{
              height: '100vh',
              minHeight: '1080px',
              boxShadow: '0 0 60px rgba(6, 182, 212, 0.1), inset 0 0 100px rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(30, 58, 95, 0.5)',
            }}
          >
            <LeafletMap
              onLocationUpdate={handleLocationUpdate}
              onProximityUpdate={handleProximityUpdate}
              onSpeedUpdate={handleSpeedUpdate}
              onStatusUpdate={setServerStatus}
              onZoneUpdate={handleZoneUpdate}
              onEEZUpdate={handleEEZUpdate}
              demoMode={demoMode}
            />

            {/* Status Display - Glass morphism overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-[1000]">
              <div 
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.95) 0%, rgba(13, 33, 55, 0.9) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  border: '1px solid rgba(30, 58, 95, 0.5)',
                }}
              >
                <div className="text-center">
                  <p className="text-3xl text-gray-300 mb-2 uppercase tracking-wider">Location</p>
                  <p className="text-4xl font-mono bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent font-medium">{currentLocation}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl text-gray-300 mb-2 uppercase tracking-wider">Distance to Border</p>
                  <p className={`text-4xl font-mono bg-clip-text text-transparent font-medium ${isNearBoundary ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-green-400 to-cyan-400'}`}>{proximityToBorder}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl text-gray-300 mb-2 uppercase tracking-wider">Speed</p>
                  <p className="text-4xl font-mono bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent font-medium">{currentSpeed}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl text-gray-300 mb-2 uppercase tracking-wider">Zone</p>
                  <p className={`text-4xl font-mono font-bold ${zone === "DANGER" ? "text-red-400" : zone === "WARNING" ? "text-yellow-400" : "text-green-400"}`}>{zone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panels: Zone Boat Counts + Alert Log */}
      <div className="flex flex-col lg:flex-row px-6 sm:px-10 gap-6 mb-8">
        <div className="flex-1 rounded-2xl p-10 border border-[#1e3a5f]/50" style={{ background: 'linear-gradient(135deg, rgba(13,33,55,0.95) 0%, rgba(10,22,40,0.9) 100%)' }}>
          <h2 className="text-4xl font-semibold text-cyan-400 mb-8 uppercase tracking-wider">Vessels by Zone</h2>
          <div className="grid grid-cols-3 gap-6 h-[420px]">
            {/* SAFE */}
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-green-500/40 bg-green-950/30"
              style={{ boxShadow: zone === 'SAFE' ? '0 0 40px rgba(34,197,94,0.35)' : 'none' }}>
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400 uppercase tracking-widest">Safe</p>
              <p className="text-9xl font-black text-green-300" style={{ lineHeight: 1 }}>
                {zone === 'SAFE' ? 1 : 0}
              </p>
              <p className="text-2xl text-gray-400">vessel{zone === 'SAFE' ? '' : 's'}</p>
            </div>
            {/* WARNING */}
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-yellow-500/40 bg-yellow-950/30"
              style={{ boxShadow: zone === 'WARNING' ? '0 0 40px rgba(250,204,21,0.35)' : 'none' }}>
              <div className={`w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center ${zone === 'WARNING' ? 'animate-pulse' : ''}`}>
                <span className="w-10 h-10 rounded-full bg-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400 uppercase tracking-widest">Warning</p>
              <p className="text-9xl font-black text-yellow-300" style={{ lineHeight: 1 }}>
                {zone === 'WARNING' ? 1 : 0}
              </p>
              <p className="text-2xl text-gray-400">vessel{zone === 'WARNING' ? '' : 's'}</p>
            </div>
            {/* DANGER */}
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-red-500/40 bg-red-950/30"
              style={{ boxShadow: zone === 'DANGER' ? '0 0 40px rgba(239,68,68,0.35)' : 'none' }}>
              <div className={`w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center ${zone === 'DANGER' ? 'animate-pulse' : ''}`}>
                <span className="w-10 h-10 rounded-full bg-red-400" />
              </div>
              <p className="text-3xl font-bold text-red-400 uppercase tracking-widest">Danger</p>
              <p className="text-9xl font-black text-red-300" style={{ lineHeight: 1 }}>
                {zone === 'DANGER' ? 1 : 0}
              </p>
              <p className="text-2xl text-gray-400">vessel{zone === 'DANGER' ? '' : 's'}</p>
            </div>
          </div>
        </div>

        <div className="lg:w-[600px] rounded-2xl p-10 border border-[#1e3a5f]/50" style={{ background: 'linear-gradient(135deg, rgba(13,33,55,0.95) 0%, rgba(10,22,40,0.9) 100%)' }}>
          <h2 className="text-4xl font-semibold text-cyan-400 mb-6 uppercase tracking-wider">Zone Change Log</h2>
          <div className="overflow-y-auto max-h-[480px] space-y-4 pr-2">
            {alerts.length === 0 ? (
              [
                { zone: "SAFE",    lat: 9.8012, lon: 79.3045, timestamp: new Date(Date.now() - 18*60000).toISOString() },
                { zone: "WARNING", lat: 9.5534, lon: 79.4412, timestamp: new Date(Date.now() - 12*60000).toISOString() },
                { zone: "DANGER",  lat: 9.3891, lon: 79.5023, timestamp: new Date(Date.now() -  7*60000).toISOString() },
                { zone: "WARNING", lat: 9.4203, lon: 79.4788, timestamp: new Date(Date.now() -  4*60000).toISOString() },
                { zone: "SAFE",    lat: 9.6011, lon: 79.3612, timestamp: new Date(Date.now() -  1*60000).toISOString() },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-[#1e3a5f]/30 last:border-0">
                  <span className={`w-4 h-4 rounded-full mt-2 flex-shrink-0 ${
                    a.zone === "DANGER" ? "bg-red-400" : a.zone === "WARNING" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-2xl font-bold ${ a.zone === "DANGER" ? "text-red-400" : a.zone === "WARNING" ? "text-yellow-400" : "text-green-400"}`}>{a.zone}</p>
                    <p className="text-lg text-gray-400">{new Date(a.timestamp).toLocaleString()}</p>
                    <p className="text-lg text-gray-500">{a.lat.toFixed(4)}°N, {a.lon.toFixed(4)}°E</p>
                  </div>
                </div>
              ))
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-[#1e3a5f]/30 last:border-0">
                  <span className={`w-4 h-4 rounded-full mt-2 flex-shrink-0 ${
                    a.zone === "DANGER" ? "bg-red-400" : a.zone === "WARNING" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-2xl font-bold ${ a.zone === "DANGER" ? "text-red-400" : a.zone === "WARNING" ? "text-yellow-400" : "text-green-400"}`}>{a.zone}</p>
                    <p className="text-lg text-gray-400">{new Date(a.timestamp).toLocaleString()}</p>
                    <p className="text-lg text-gray-500">{a.lat?.toFixed(4)}°N, {a.lon?.toFixed(4)}°E</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 sm:px-10 pb-6">
        <div className="bg-[#0d2137]/60 rounded-xl p-8 border border-[#1e3a5f]/50">
          <div className="flex flex-wrap items-center gap-6 justify-center sm:justify-start">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="font-semibold text-2xl">Legend</span>
              <span className="text-gray-400 text-xl">Explains the depth-to-depth-transitions</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-5 py-2 bg-teal-600/80 rounded text-xl">Shallow (0-200m)</span>
              <span className="px-5 py-2 bg-[#1e3a5f] rounded text-xl">1000-1000m</span>
              <span className="px-5 py-2 bg-[#142d4a] rounded text-xl">2000-6000m</span>
              <span className="px-5 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded text-xl">Very Deep (6,000m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-8 border-t border-[#1e3a5f]/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${serverStatus === "Backend Connected" ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400">{serverStatus}</span>
            {zone !== "UNKNOWN" && (
              <span className={`px-4 py-1 rounded text-xl font-bold ${
                zone === "DANGER" ? "bg-red-900/60 text-red-400" : zone === "WARNING" ? "bg-yellow-900/60 text-yellow-400" : "bg-green-900/60 text-green-400"
              }`}>{zone}</span>
            )}
          </div>
          <span className="text-gray-500">© 2026 Maritime Safety Authority</span>
        </div>
      </footer>


      </div>
    </div>
  )
}
