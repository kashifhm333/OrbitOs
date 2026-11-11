import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

interface BreakupDebrisCloudProps {
  fragments?: Array<{
    id: string;
    pos: [number, number, number];
    vel?: [number, number, number];
    size_m?: number;
  }>;
}

export const BreakupDebrisCloud: React.FC<BreakupDebrisCloudProps> = ({ fragments }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());

  useLayoutEffect(() => {
    if (!meshRef.current || !fragments || fragments.length === 0) return;

    const count = fragments.length;
    for (let i = 0; i < count; i++) {
      const frag = fragments[i];
      // Convert SI meters to 3D coordinate space (scale: 1 unit = 1000 km = 1,000,000 m)
      const x = frag.pos[0] / 1000000.0;
      const y = frag.pos[1] / 1000000.0;
      const z = frag.pos[2] / 1000000.0;

      dummy.current.position.set(x, y, z);
      const s = 0.05 + ((i % 5) * 0.015);
      dummy.current.scale.set(s, s, s);
      dummy.current.rotation.set((i * 0.17) % Math.PI, (i * 0.31) % Math.PI, (i * 0.43) % Math.PI);
      dummy.current.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [fragments]);

  if (!fragments || fragments.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, fragments.length]}
    >
      <dodecahedronGeometry args={[0.07, 0]} />
      <meshStandardMaterial
        color="#FFB547"
        emissive="#FF4D5E"
        emissiveIntensity={2.5}
        metalness={0.8}
        roughness={0.2}
      />
    </instancedMesh>
  );
};
