import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';

interface OrbitTrackProps {
  semiMajorAxisKm: number;
  inclinationRad: number;
  color?: string;
  isSelected?: boolean;
}

export const OrbitTrack: React.FC<OrbitTrackProps> = ({
  semiMajorAxisKm,
  inclinationRad,
  color = '#0284c7',
  isSelected = false
}) => {
  // Generate orbital ellipse vertices
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const radius = semiMajorAxisKm / 1000.0; // Convert km to scene units
    const segments = 128;

    for (let k = 0; k <= segments; k++) {
      const angle = (k / segments) * Math.PI * 2;
      // Perifocal circular approximation for visualization
      const x0 = radius * Math.cos(angle);
      const y0 = radius * Math.sin(angle);
      
      // Rotate by inclination around X-axis
      const x = x0;
      const y = y0 * Math.cos(inclinationRad);
      const z = y0 * Math.sin(inclinationRad);

      pts.push([x, y, z]);
    }
    return pts;
  }, [semiMajorAxisKm, inclinationRad]);

  return (
    <Line
      points={points}
      color={isSelected ? '#38bdf8' : color}
      lineWidth={isSelected ? 1.8 : 0.8}
      transparent
      opacity={isSelected ? 0.8 : 0.35}
    />
  );
};
