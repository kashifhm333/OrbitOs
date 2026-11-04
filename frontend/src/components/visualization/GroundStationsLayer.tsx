import React from 'react';
import * as THREE from 'three';

interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const DEFAULT_STATIONS: Station[] = [
  { id: 'gs-svalbard', name: 'Svalbard (SG-1)', lat: 78.22, lon: 15.65 },
  { id: 'gs-santiago', name: 'Santiago (ST-2)', lat: -33.45, lon: -70.67 },
  { id: 'gs-singapore', name: 'Singapore (SN-3)', lat: 1.35, lon: 103.82 },
  { id: 'gs-kourou', name: 'Kourou (KR-4)', lat: 5.16, lon: -52.65 },
];

function latLonToVector3(latDeg: number, lonDeg: number, radius = 6.39): [number, number, number] {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

export const GroundStationsLayer: React.FC = () => {
  return (
    <group>
      {DEFAULT_STATIONS.map((gs) => {
        const [x, y, z] = latLonToVector3(gs.lat, gs.lon);
        return (
          <group key={gs.id} position={[x, y, z]}>
            {/* Ground pin sphere */}
            <mesh>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color="#00D69A" />
            </mesh>
            {/* Elevation coverage ring / footprint */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.12, 0.18, 16]} />
              <meshBasicMaterial color="#00D69A" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

