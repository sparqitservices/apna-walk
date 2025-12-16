import React from "react";
import "./ApnaWalkLogo.css";

export interface ApnaWalkLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const ApnaWalkLogo: React.FC<ApnaWalkLogoProps> = ({
  size = 48,
  className = "",
  showText = true,
}) => {
  const svgSize = size;
  
  // Calculate font sizes proportional to the logo size
  // Title roughly 45% of icon size, tagline roughly 25%
  const titleSize = Math.max(16, size * 0.45);
  const tagSize = Math.max(10, size * 0.25);

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="img"
      aria-label="Apna Walk logo"
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Sun */}
        <circle cx="48" cy="16" r="8" fill="#FF9800" />

        {/* Hills */}
        <path
          d="M0 44C8 36 16 32 24 36C32 40 40 44 48 40C56 36 64 32 64 32V64H0V44Z"
          fill="#4CAF50"
        />
        <path
          d="M0 48C10 40 20 38 28 42C36 46 44 48 52 44C58 42 64 40 64 40V64H0V48Z"
          fill="#1B5E20"
        />

        {/* City skyline - white with low opacity for dark theme visibility */}
        <g fill="white" opacity="0.2">
          <rect x="6" y="30" width="4" height="10" />
          <rect x="12" y="26" width="5" height="14" />
          <rect x="20" y="28" width="4" height="12" />
          <rect x="26" y="24" width="6" height="16" />
          <rect x="34" y="27" width="5" height="13" />
        </g>

        {/* Walking person - white stroke for dark theme visibility */}
        <g
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Head */}
          <circle cx="20" cy="18" r="3" fill="white" stroke="none" />
          {/* Body */}
          <line x1="20" y1="21" x2="20" y2="30" />
          {/* Arms */}
          <line x1="20" y1="24" x2="15" y2="28" />
          <line x1="20" y1="24" x2="25" y2="26" />
          {/* Legs */}
          <line x1="20" y1="30" x2="16" y2="38" />
          <line x1="20" y1="30" x2="24" y2="36" />
        </g>
      </svg>

      {showText && (
        <div
          className="flex flex-col leading-none justify-center"
        >
          <span className="font-bold tracking-tight text-white leading-tight" style={{ fontSize: `${titleSize}px` }}>
            Apna <span className="walk-text-shimmer">Walk</span>
          </span>
          <span className="text-slate-400 leading-tight mt-0.5" style={{ fontSize: `${tagSize}px` }}>
            Walk Towards Fitness
          </span>
        </div>
      )}
    </div>
  );
};