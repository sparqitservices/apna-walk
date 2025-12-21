
import React, { useMemo } from 'react';
import { RoutePoint } from '../types';

interface PathSnailTrailProps {
  route: RoutePoint[];
  className?: string;
  color?: string;
}

export const PathSnailTrail: React.FC<PathSnailTrailProps> = ({ route, className = "", color = "#10b981" }) => {
  const pathData = useMemo(() => {
    if (route.length < 2) return "";

    // Find bounds to scale SVG
    const lats = route.map(p => p.lat);
    const lngs = route.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 0.1;
    const width = 100;
    const height = 100;

    const scaleX = (val: number) => ((val - minLng) / (maxLng - minLng || 1)) * (width * (1 - padding)) + (width * padding / 2);
    const scaleY = (val: number) => height - (((val - minLat) / (maxLat - minLat || 1)) * (height * (1 - padding)) + (height * padding / 2));

    return route.reduce((acc, p, i) => {
      const x = scaleX(p.lng);
      const y = scaleY(p.lat);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [route]);

  if (route.length < 2) return null;

  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}>
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1, 5"
        className="animate-[dash_20s_linear_infinite]"
      />
      <circle cx={pathData.split(' ').slice(-2)[0]} cy={pathData.split(' ').slice(-1)[0]} r="4" fill={color} className="animate-pulse" />
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
      `}</style>
    </svg>
  );
};
