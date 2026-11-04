import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EarthGlobe } from './EarthGlobe';
import { SatelliteMesh } from './SatelliteMesh';
import { OrbitTrack } from './OrbitTrack';
import { GroundStationsLayer } from './GroundStationsLayer';
import { DebrisLayer } from './DebrisLayer';
import { useOrbitStore } from '../../store/useOrbitStore';
import { RotateCcw, Eye, Radio, ShieldAlert } from 'lucide-react';

export const OrbitalCanvas: React.FC = () => {
  const { 
    satellites, 
    selectedSatelliteId, 
    showDebris, 
    setShowDebris, 
    showTracks, 
    setShowTracks, 
    showGroundStations, 
    setShowGroundStations 
  } = useOrbitStore();

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const satelliteList = Object.values(satellites);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="w-full h-full relative bg-[#050B16] select-none">
      {/* 3D WebGL Canvas */}
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 12, 18]} fov={45} />
        
        {/* Camera Orbit Controls */}
        <OrbitControls 
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={7.2}
          maxDistance={50.0}
          dampingFactor={0.05}
        />

        {/* Ambient & Sun Directional Lighting */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[15, 6, 12]} intensity={1.9} castShadow />
        <pointLight position={[-15, -6, -12]} intensity={0.25} color="#00D5FF" />

        {/* Background Space Environment */}
        <Stars radius={120} depth={60} count={3500} factor={4} saturation={0} fade speed={1} />

        <Suspense fallback={null}>
          {/* Central Earth Globe */}
          <EarthGlobe />

          {/* Ground Station Pins */}
          {showGroundStations && <GroundStationsLayer />}

          {/* Orbital Debris Field */}
          {showDebris && <DebrisLayer />}

          {/* Satellite Orbit Curves */}
          {showTracks && satelliteList.map((sat) => {
            const posMagKm = Math.sqrt(
              sat.position_eci_m[0] ** 2 + sat.position_eci_m[1] ** 2 + sat.position_eci_m[2] ** 2
            ) / 1000.0;

            return (
              <OrbitTrack
                key={`track-${sat.satellite_id}`}
                semiMajorAxisKm={posMagKm > 6400 ? posMagKm : 6878}
                inclinationRad={sat.satellite_id === 'sat-001' ? 1.7 : sat.satellite_id === 'sat-002' ? 1.57 : 0.78}
                isSelected={selectedSatelliteId === sat.satellite_id}
              />
            );
          })}

          {/* Satellite 3D Objects */}
          {satelliteList.map((sat) => (
            <SatelliteMesh key={sat.satellite_id} satellite={sat} />
          ))}
        </Suspense>
      </Canvas>

      {/* Floating Viewport Layer Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-[#071426]/90 backdrop-blur-md border border-[#1A3450] p-1.5 rounded-xl shadow-lg">
        <button
          onClick={() => setShowTracks(!showTracks)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            showTracks 
              ? 'bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30' 
              : 'text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B]'
          }`}
          title="Toggle Trajectory Tracks"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>TRACKS</span>
        </button>

        <button
          onClick={() => setShowGroundStations(!showGroundStations)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            showGroundStations 
              ? 'bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30' 
              : 'text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B]'
          }`}
          title="Toggle Ground Stations"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>STATIONS</span>
        </button>

        <button
          onClick={() => setShowDebris(!showDebris)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            showDebris 
              ? 'bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30' 
              : 'text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B]'
          }`}
          title="Toggle Orbital Debris Field"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>DEBRIS</span>
        </button>

        <div className="w-px h-5 bg-[#1A3450] mx-0.5" />

        <button
          onClick={resetCamera}
          className="p-1.5 rounded-lg text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B] transition-all"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Canvas Overlay Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-[#071426]/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#1A3450] text-xs font-mono text-[#8295AC] pointer-events-none space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D5FF] shadow-[0_0_8px_rgba(0,213,255,0.6)]" />
          <span className="text-[#E8F0FA]">Active Spacecraft</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFB547]" />
          <span>In Eclipse (Umbra)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D69A]" />
          <span>Ground Station Pass Contact</span>
        </div>
      </div>
    </div>
  );
};
