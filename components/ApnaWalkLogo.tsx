import React from "react";
import "./ApnaWalkLogo.css";

export interface ApnaWalkLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  useGradient?: boolean;
}

export const ApnaWalkLogo: React.FC<ApnaWalkLogoProps> = ({
  size = 48,
  className = "",
  showText = true,
  useGradient = true,
}) => {
  
  // Calculate font sizes proportional to the passed size prop
  // Base text size
  const textSize = Math.max(20, size * 0.8);
  const tagSize = Math.max(10, size * 0.35);

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="banner"
      aria-label="Apna Walk logo"
    >
      {/* Text Only Logo */}
      <div className="flex flex-col leading-none justify-center items-start">
          <span className="font-black tracking-tight text-dark-text leading-none flex items-baseline gap-1 drop-shadow-md" style={{ fontSize: `${textSize}px` }}>
            Apna 
            <span className={useGradient ? "walk-text-shimmer" : "text-apna-orange"}>
                Walk
            </span>
          </span>
      </div>
    </div>
  );
};