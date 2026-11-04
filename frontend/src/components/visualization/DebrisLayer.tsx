import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useOrbitStore } from '../../store/useOrbitStore';

export const DebrisLayer: React.FC = () => {
  const { debrisList, activeAlerts } = useOrbitStore();

  const points = useMemo(() => {
    const coords: number[] = [];
    // Generate 150 deterministic pseudo-random debris positions around LEO
    for (let i = 0; i < 150; i++) {
      const u = Math.sin(i * 12.9898) * 0.5 + 0.5;
      const v = Math.cos(i * 78.233) * 0.5 + 0.5;
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 6.8 + ((i * 37) % 100) / 100 * 1.2; // 6.8 to 8.0 units (400-1600 km altitude)
      
      coords.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    return new Float32Array(coords);
  }, []);

  const hasCriticalConjunction = activeAlerts.some(
    (a) => a.risk_level === 'CRITICAL' || a.title?.includes('COLLISION') || a.title?.includes('Critical')
  );

  return (
    <group>
      {/* Background Debris Cloud */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length / 3}
            array={points}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#FFB547"
          transparent
          opacity={0.65}
          sizeAttenuation
        />
      </points>

      {/* Tracked Active Debris Fragment (e.g. Cosmos 2251) */}
      {debrisList && debrisList.map((deb: any) => {
        if (!deb.pos_eci) return null;
        const [dx, dy, dz] = deb.pos_eci.map((v: number) => v / 1000000.0);
        return (
          <group key={deb.id} position={[dx, dy, dz]}>
            {/* Debris Jagged Fragment */}
            <mesh>
              <dodecahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color={hasCriticalConjunction ? "#FF4D5E" : "#FFB547"}
                emissive={hasCriticalConjunction ? "#FF4D5E" : "#FFB547"}
                emissiveIntensity={0.8}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>

            {/* Warning Proximity Halo */}
            <mesh>
              <sphereGeometry args={[0.26, 16, 16]} />
              <meshBasicMaterial
                color={hasCriticalConjunction ? "#FF4D5E" : "#FFB547"}
                wireframe
                transparent
                opacity={hasCriticalConjunction ? 0.75 : 0.3}
              />
            </mesh>

            {/* Debris Tracking Tag */}
            <Html distanceFactor={16} position={[0, 0.28, 0]} center>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap border shadow-lg ${
                hasCriticalConjunction
                  ? 'bg-[#FF4D5E]/20 text-[#FF4D5E] border-[#FF4D5E] font-bold animate-pulse'
                  : 'bg-[#0B1B2E]/90 text-[#FFB547] border-[#FFB547]/40'
              }`}>
                ⚠ {deb.name || 'DEBRIS'}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

