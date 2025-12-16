import React from 'react';
import './ApnaWalkLogo.css';

interface ApnaWalkLogoProps {
  size?: 'small' | 'medium' | 'large';
  tagline?: string;
  className?: string;
  minimal?: boolean; // New prop to toggle background effects
}

export const ApnaWalkLogo: React.FC<ApnaWalkLogoProps> = ({ 
    size = 'medium', 
    tagline = "Step Towards a Healthier India",
    className = "",
    minimal = false
}) => {
  const sizes = {
    small: { fontSize: '1.5rem', iconSize: '24px' },
    medium: { fontSize: '3rem', iconSize: '50px' },
    large: { fontSize: '4rem', iconSize: '80px' }
  };

  // Adjust for mobile screens automatically
  const currentSize = sizes[size] || sizes.medium;

  return (
    <div className={`logo-container ${className} ${minimal ? 'p-0' : ''}`}>
      {/* Background Pulse Rings - Hidden in minimal mode */}
      {!minimal && (
        <div className="bg-pulse">
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
        </div>
      )}
      
      {/* Heartbeat Line Background - Hidden in minimal mode */}
      {!minimal && (
        <div className="heartbeat-line">
            <svg className="heartbeat-svg" viewBox="0 0 2000 100" preserveAspectRatio="none">
            <g className="heartbeat-path">
                <path d="M0,50 L200,50 L220,30 L240,70 L260,50 L400,50 L420,30 L440,70 L460,50 L600,50 L620,30 L640,70 L660,50 L800,50 L820,30 L840,70 L860,50 L1000,50 L1020,30 L1040,70 L1060,50 L1200,50 L1220,30 L1240,70 L1260,50 L1400,50 L1420,30 L1440,70 L1460,50 L1600,50 L1620,30 L1640,70 L1660,50 L1800,50 L1820,30 L1840,70 L1860,50 L2000,50" 
                    fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3"/>
            </g>
            </svg>
        </div>
      )}
      
      {/* Floating Footsteps - Hidden in minimal mode */}
      {!minimal && (
        <div className="footsteps">
            {[...Array(5)].map((_, i) => (
            <svg key={i} className="footstep" viewBox="0 0 30 40" fill="rgba(255,255,255,0.4)">
                <ellipse cx="15" cy="25" rx="10" ry="15"/>
                <circle cx="10" cy="10" r="4"/>
                <circle cx="15" cy="8" r="4"/>
                <circle cx="20" cy="10" r="4"/>
            </svg>
            ))}
        </div>
      )}
      
      {/* Main Logo Text */}
      <div className="logo-text">
        <h1 className="brand-name" style={{ fontSize: currentSize.fontSize }}>
          APNA
          <svg className="walk-icon" style={{ width: currentSize.iconSize, height: currentSize.iconSize }} viewBox="0 0 50 50">
            <defs>
              <linearGradient id="walkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'rgb(var(--brand-400))', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgb(var(--brand-600))', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="25" cy="12" r="6" fill="url(#walkGrad)"/>
            <line x1="25" y1="18" x2="25" y2="32" stroke="url(#walkGrad)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="25" y1="24" x2="18" y2="30" stroke="url(#walkGrad)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="25" y1="24" x2="32" y2="22" stroke="url(#walkGrad)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="25" y1="32" x2="20" y2="42" stroke="url(#walkGrad)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="25" y1="32" x2="30" y2="40" stroke="url(#walkGrad)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="gradient-text">WALK</span>
        </h1>
        {tagline && (
            <p className="tagline" style={{ fontSize: `calc(${currentSize.fontSize} * 0.3)` }}>
                {tagline}
            </p>
        )}
      </div>
    </div>
  );
};