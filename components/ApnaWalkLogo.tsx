
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
  const textSize = Math.max(20, size * 0.8);
  const iconSize = textSize * 0.9;

  return (
    <div
      className={`logo-root-container flex flex-col items-center justify-center ${className}`}
      role="banner"
      aria-label="Apna Walk logo"
    >
      <div className="flex items-center leading-none justify-center gap-2 group cursor-pointer">
          {/* Walking Icon with hover pulse */}
          <div className="walk-icon-wrapper" style={{ fontSize: `${iconSize}px` }}>
              <i className="fa-solid fa-person-walking walk-icon text-brand-500"></i>
          </div>

          {/* Brand Text */}
          <div className="flex flex-col items-start leading-none">
              <span className="font-black tracking-tight text-dark-text leading-none flex items-baseline gap-1 drop-shadow-lg" style={{ fontSize: `${textSize}px` }}>
                Apna 
                <span className={useGradient ? "walk-text-shimmer" : "text-apna-orange"}>
                    Walk
                </span>
              </span>
          </div>
      </div>
    </div>
  );
};
