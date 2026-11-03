import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EarthGlobe } from './EarthGlobe';
import { SatelliteMesh } from './SatelliteMesh';
import { OrbitTrack } from './OrbitTrack';
import { useOrbitStore } from '../../store/useOrbitStore';

export const OrbitalCanvas: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();

  const satelliteList = Object.values(satellites);

  return (
    <div className="w-full h-full relative bg-space-900">
      {/* 3D WebGL Canvas */}
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 12, 18]} fov={45} />
        
        {/* Camera Orbit Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={7.5}
          maxDistance={45.0}
          dampingFactor={0.05}
        />

        {/* Ambient & Sun Directional Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[15, 5, 10]} intensity={1.8} castShadow />
        <pointLight position={[-15, -5, -10]} intensity={0.2} color="#0284c7" />

        {/* Background Space Environment */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        <Suspense fallback={null}>
          {/* Central Earth Globe */}
          <EarthGlobe />

          {/* Satellite Orbit Curves */}
          {satelliteList.map((sat) => {
            // Rough approximation of semi-major axis from position magnitude
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

      {/* Floating Canvas Overlay Legend */}
      <div className="absolute bottom-4 left-4 bg-space-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-space-700 text-xs font-mono text-slate-300 pointer-events-none">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
          <span>ACTIVE SATELLITE</span>
        </div>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <span>IN ECLIPSE (SHADOW)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
          <span>MANEUVERING</span>
        </div>
      </div>
    </div>
  );
};

