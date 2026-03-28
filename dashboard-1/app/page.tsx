"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] rounded-2xl bg-[#0a2540] flex items-center justify-center">
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
  const [serverStatus, setServerStatus] = useState("All systems operational")
  const [isNearBoundary, setIsNearBoundary] = useState(false)

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
    <div className="min-h-screen text-white font-sans relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#020817] via-[#0a1628] to-[#071525]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(6,182,212,0.15)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(34,197,94,0.1)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,116,144,0.08)_0%,_transparent_70%)]"></div>
      </div>
      
      <div className="relative z-10">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1e3a5f]/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-wide">
            Smart Maritime Boundary Detection System
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center bg-[#0d2137] rounded-lg overflow-hidden border border-[#1e3a5f]">
            <span className="text-gray-400 text-sm px-3 hidden sm:block">search:</span>
            <input
              type="text"
              placeholder="Vessel ID..."
              value={vesselId}
              onChange={(e) => setVesselId(e.target.value)}
              className="bg-[#142d4a] px-3 py-2 text-sm text-cyan-300 placeholder-cyan-700 focus:outline-none w-32 sm:w-40"
            />
            <button
              onClick={handleSearch}
              className="bg-[#142d4a] px-3 py-2 hover:bg-[#1e3a5f] transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">2</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Admin TH</p>
              <p className="text-xs text-gray-500">TH Authority</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Sidebar Info Cards - 3D Effect with Green-Blue Shifting Hue */}
        <div className="flex lg:flex-col gap-5 lg:w-28 justify-center lg:justify-start">
          <div
            className="group flex flex-col items-center gap-3 p-5 rounded-2xl min-w-[100px] transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #22c55e 50%, #0891b2 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <span className="text-xs text-center font-medium leading-tight bg-gradient-to-r from-cyan-300 to-green-300 bg-clip-text text-transparent">Current<br />Location</span>
          </div>

          <div
            className={`group flex flex-col items-center gap-3 p-5 rounded-2xl min-w-[100px] transition-all duration-300 ${isNearBoundary ? 'animate-pulse' : ''}`}
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
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: isNearBoundary
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #10b981 100%)',
                boxShadow: isNearBoundary
                  ? '0 4px 15px rgba(239, 68, 68, 0.5), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)'
                  : '0 4px 15px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-7 h-7 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="6" strokeWidth={2} />
                <circle cx="12" cy="12" r="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span className={`text-xs text-center font-medium leading-tight bg-clip-text text-transparent ${
              isNearBoundary 
                ? 'bg-gradient-to-r from-red-300 to-orange-300' 
                : 'bg-gradient-to-r from-green-300 to-cyan-300'
            }`}>Proximity<br />to Border</span>
          </div>

          <div
            className="group flex flex-col items-center gap-3 p-5 rounded-2xl min-w-[100px] transition-all duration-300"
            style={{
              background: 'linear-gradient(145deg, #0f3460 0%, #0d2847 50%, #071e36 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #22c55e 50%, #06b6d4 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <svg className="w-7 h-7 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs text-center font-medium leading-tight bg-gradient-to-r from-cyan-300 to-green-300 bg-clip-text text-transparent">Current<br />Speed</span>
          </div>
        </div>

        {/* Leaflet Map Area */}
        <div className="flex-1 relative">
          <div 
            className="relative rounded-2xl overflow-hidden min-h-[400px] sm:min-h-[500px]"
            style={{
              boxShadow: '0 0 60px rgba(6, 182, 212, 0.1), inset 0 0 100px rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(30, 58, 95, 0.5)',
            }}
          >
            <LeafletMap
              onLocationUpdate={handleLocationUpdate}
              onProximityUpdate={handleProximityUpdate}
              onSpeedUpdate={handleSpeedUpdate}
            />

            {/* Status Display - Glass morphism overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-[1000]">
              <div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.95) 0%, rgba(13, 33, 55, 0.9) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  border: '1px solid rgba(30, 58, 95, 0.5)',
                }}
              >
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-mono bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent font-medium">{currentLocation}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Distance to Border</p>
                  <p className={`text-sm font-mono bg-clip-text text-transparent font-medium ${
                    isNearBoundary 
                      ? 'bg-gradient-to-r from-red-400 to-orange-400' 
                      : 'bg-gradient-to-r from-green-400 to-cyan-400'
                  }`}>{proximityToBorder}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Speed</p>
                  <p className="text-sm font-mono bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent font-medium">{currentSpeed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="bg-[#0d2137]/60 rounded-xl p-4 border border-[#1e3a5f]/50">
          <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="font-semibold text-sm">Legend</span>
              <span className="text-gray-400 text-sm">Explains the depth-to-depth-transitions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-teal-600/80 rounded text-xs">Shallow (0-200m)</span>
              <span className="px-3 py-1 bg-[#1e3a5f] rounded text-xs">1000-1000m</span>
              <span className="px-3 py-1 bg-[#142d4a] rounded text-xs">2000-6000m</span>
              <span className="px-3 py-1 bg-[#0d2137] border border-[#1e3a5f] rounded text-xs">Very Deep (6,000m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-4 border-t border-[#1e3a5f]/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <span className="text-gray-500">Server Status: <span className="text-green-400">{serverStatus}</span></span>
          <span className="text-gray-600">© 2026 Maritime Safety Authority</span>
        </div>
      </footer>


      </div>
    </div>
  )
}
