import React, { useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { SatelliteTelemetry } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';

interface SatelliteMeshProps {
  satellite: SatelliteTelemetry;
}

export const SatelliteMesh: React.FC<SatelliteMeshProps> = ({ satellite }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { selectedSatelliteId, setSelectedSatellite } = useOrbitStore();

  const isSelected = selectedSatelliteId === satellite.satellite_id;

  // Convert ECI position in meters to Scene units (1 unit = 1000 km = 1e6 meters)
  const [x, y, z] = satellite.position_eci_m.map((val) => val / 1000000.0);

  // Status color mapping
  const statusColor = 
    satellite.operational_state === 'MANEUVERING' ? '#c084fc' :
    satellite.operational_state === 'SAFE_HOLD' ? '#fbbf24' :
    satellite.in_eclipse ? '#38bdf8' : '#22d3ee';

  return (
    <group 
      ref={meshRef} 
      position={[x, y, z]} 
      onClick={(e) => {
        e.stopPropagation();
        setSelectedSatellite(satellite.satellite_id);
      }}
    >
      {/* Central Satellite Body (CubeSat Bus) */}
      <mesh>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial 
          color={statusColor} 
          metalness={0.8} 
          roughness={0.2}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 0.6 : 0.2}
        />
      </mesh>

      {/* Solar Array Panels (Left & Right Wings) */}
      <mesh position={[0.22, 0, 0]}>
        <boxGeometry args={[0.2, 0.08, 0.01]} />
        <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.22, 0, 0]}>
        <boxGeometry args={[0.2, 0.08, 0.01]} />
        <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Selection Halo Indicator */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Tooltip Label */}
      <Html distanceFactor={15} position={[0, 0.35, 0]} center>
        <div 
          className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap cursor-pointer transition-all ${
            isSelected 
              ? 'bg-cyan-500 text-space-900 font-bold shadow-md shadow-cyan-500/30' 
              : 'bg-space-900/80 text-cyan-300 border border-space-700 hover:border-cyan-500/50'
          }`}
        >
          {satellite.name}
        </div>
      </Html>
    </group>
  );
};

