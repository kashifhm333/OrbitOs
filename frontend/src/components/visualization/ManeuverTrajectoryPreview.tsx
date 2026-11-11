import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useOrbitStore } from '../../store/useOrbitStore';

export const ManeuverTrajectoryPreview: React.FC = () => {
  const { previewManeuver, selectedSatelliteId, satellites } = useOrbitStore();

  const splinePoints = useMemo(() => {
    if (!previewManeuver) return null;

    const sat = (selectedSatelliteId && satellites[selectedSatelliteId]) || Object.values(satellites)[0];
    const baseR = sat ? Math.sqrt(
      sat.position_eci_m[0] ** 2 + sat.position_eci_m[1] ** 2 + sat.position_eci_m[2] ** 2
    ) / 1000000.0 : 6.878;

    const strategy = previewManeuver.strategy || previewManeuver.maneuver_type || '';
    let dr = 0;
    let dInc = 0;

    if (strategy.includes('PROGRADE')) {
      dr = 0.35; // Raises apoapsis
    } else if (strategy.includes('RETROGRADE')) {
      dr = -0.35; // Lowers periapsis
    } else if (strategy.includes('NORMAL')) {
      dInc = 0.18; // Plane change
    }

    const pts: THREE.Vector3[] = [];
    const segments = 96;
    for (let k = 0; k <= segments; k++) {
      const theta = (k / segments) * Math.PI * 2.0;
      const r = baseR + dr * Math.sin(theta);
      const inc = 1.7 + dInc * Math.cos(theta);
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta) * Math.cos(inc);
      const z = r * Math.sin(theta) * Math.sin(inc);
      pts.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(pts, true).getPoints(120);
  }, [previewManeuver, selectedSatelliteId, satellites]);

  const lineObj = useMemo(() => {
    if (!splinePoints) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(splinePoints);
    const material = new THREE.LineDashedMaterial({
      color: '#00D5FF',
      dashSize: 0.4,
      gapSize: 0.2,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [splinePoints]);

  if (!lineObj) return null;

  return (
    <group>
      {/* Dashed Cyan Maneuver Trajectory Spline */}
      <primitive object={lineObj} />
    </group>
  );
};
