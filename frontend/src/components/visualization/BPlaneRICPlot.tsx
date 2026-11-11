import React from 'react';

interface BPlaneRICPlotProps {
  missDistanceM?: number;
  deltaVMps?: number;
  strategy?: string;
  isNoAction?: boolean;
}

export const BPlaneRICPlot: React.FC<BPlaneRICPlotProps> = ({
  missDistanceM = 43.1,
  deltaVMps = 0,
  strategy = 'NO_ACTION',
  isNoAction = false,
}) => {
  // SVG viewport dimensions
  const width = 160;
  const height = 90;
  const cx = width / 2;
  const cy = height / 2;

  // Scale: 1 unit ~ 100 meters
  // If no action: miss distance is close to center (e.g. 43m -> ~5px)
  // If evasive burn: displaced significantly outward (e.g. 2500m -> ~35px)
  let dx = 0;
  let dy = 0;

  if (isNoAction) {
    dx = (missDistanceM / 100.0) * 8.0;
    dy = (missDistanceM / 150.0) * 6.0;
  } else {
    const scale = Math.min(36, Math.max(16, (missDistanceM / 500.0) * 12.0));
    if (strategy?.includes('PROGRADE')) {
      dx = scale;
      dy = -scale * 0.4;
    } else if (strategy?.includes('RETROGRADE')) {
      dx = -scale;
      dy = scale * 0.4;
    } else {
      dx = scale * 0.3;
      dy = -scale;
    }
  }

  const pointX = Math.max(10, Math.min(width - 10, cx + dx));
  const pointY = Math.max(10, Math.min(height - 10, cy + dy));

  const isSafe = !isNoAction && missDistanceM > 1000;

  return (
    <div className="bg-[#050B16] rounded-lg border border-[#1A3450] p-1.5 flex flex-col items-center select-none">
      <div className="w-full flex items-center justify-between text-[8px] font-mono text-[#8295AC] px-1 pb-1">
        <span>B-PLANE (RIC ENCOUNTER)</span>
        <span className={isSafe ? 'text-[#00D69A] font-bold' : 'text-[#FF4D5E] font-bold'}>
          {isSafe ? '✓ SAFE MARGIN' : '⚠ COLLISION RISK'}
        </span>
      </div>

      <svg width={width} height={height} className="overflow-visible">
        {/* Background Grid */}
        <line x1={0} y1={cy} x2={width} y2={cy} stroke="#1A3450" strokeWidth="0.8" strokeDasharray="2,2" />
        <line x1={cx} y1={0} x2={cx} y2={height} stroke="#1A3450" strokeWidth="0.8" strokeDasharray="2,2" />

        {/* 3-Sigma Covariance Ellipse */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={48}
          ry={24}
          fill="none"
          stroke="#FFB547"
          strokeWidth="0.8"
          strokeDasharray="3,3"
          opacity="0.35"
        />

        {/* 1-Sigma Covariance Ellipse */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={24}
          ry={12}
          fill="#FF4D5E"
          fillOpacity="0.08"
          stroke="#FF4D5E"
          strokeWidth="1.0"
          opacity="0.6"
        />

        {/* Hard Body Circle (Center) */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="#FF4D5E"
          fillOpacity="0.6"
          stroke="#FF4D5E"
          strokeWidth="1.2"
        />

        {/* Trajectory Displacement Vector */}
        {!isNoAction && (
          <line
            x1={cx}
            y1={cy}
            x2={pointX}
            y2={pointY}
            stroke="#00D5FF"
            strokeWidth="1.2"
            strokeDasharray="2,2"
          />
        )}

        {/* Miss Distance Point */}
        <circle
          cx={pointX}
          cy={pointY}
          r={3.5}
          fill={isSafe ? '#00D69A' : '#FF4D5E'}
          stroke="#E8F0FA"
          strokeWidth="1"
          className="animate-pulse"
        />

        {/* Coordinate Labels */}
        <text x={width - 14} y={cy - 3} fill="#8295AC" fontSize="7" fontFamily="monospace">
          +I
        </text>
        <text x={cx + 3} y={10} fill="#8295AC" fontSize="7" fontFamily="monospace">
          +R
        </text>
      </svg>

      <div className="w-full flex items-center justify-between text-[8px] font-mono text-[#8295AC] pt-1 px-1 border-t border-[#10243B]">
        <span>ΔV: {deltaVMps.toFixed(1)} m/s</span>
        <span className={isSafe ? 'text-[#00D69A]' : 'text-[#FF4D5E]'}>
          d_tca: {missDistanceM < 1000 ? `${missDistanceM.toFixed(1)} m` : `${(missDistanceM / 1000).toFixed(2)} km`}
        </span>
      </div>
    </div>
  );
};
