import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const EarthGlobe: React.FC = () => {
  const earthRef = useRef<THREE.Mesh>(null);

  // Subtle axial rotation for presentation realism
  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <group>
      {/* Earth Sphere: Radius 6.378 scene units (6378 km) */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[6.378, 64, 64]} />
        <meshStandardMaterial
          color="#1e3a8a"
          roughness={0.7}
          metalness={0.1}
          emissive="#0a192f"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Atmospheric Glow Rim */}
      <mesh scale={[1.025, 1.025, 1.025]}>
        <sphereGeometry args={[6.378, 48, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Equator & Meridian Reference Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.385, 6.395, 64]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

