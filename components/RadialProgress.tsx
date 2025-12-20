
import React from 'react';

interface RadialProgressProps {
  current: number;
  total: number;
  label: string;
  subLabel: string;
  color?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ 
  current, 
  total, 
  label, 
  subLabel,
  color = "text-brand-500",
  isActive = false,
  onClick
}) => {
  const percentage = Math.min((current / total) * 100, 100);
  const strokeDasharray = 2 * Math.PI * 90; // radius 90
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const isGoalMet = total > 0 && current >= total;
  const displayColor = isGoalMet ? "text-green-400" : color;

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center w-64 h-64 mx-auto my-6 ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      {/* Background Circle */}
      <div className={`absolute inset-0 rounded-full border-[12px] border-dark-card ${isActive ? 'animate-pulse-slow' : ''}`}></div>
      
      {/* SVG Ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={`${displayColor} transition-all duration-500 ease-out`}
          style={{
            strokeDasharray,
            strokeDashoffset,
            filter: isGoalMet ? 'url(#glow)' : 'none'
          }}
        />
      </svg>
      
      {/* Inner Content */}
      <div className={`flex flex-col items-center justify-center z-10 text-center pointer-events-none ${!isActive ? 'animate-breathing' : ''}`}>
        
        {/* Trophy Icon on Goal Met */}
        {isGoalMet && (
             <div className="absolute -top-10 animate-bounce z-20">
                 <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-green-400 flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                     <i className="fa-solid fa-trophy text-yellow-400 text-xl drop-shadow-sm"></i>
                 </div>
             </div>
        )}

        <span className={`text-5xl font-bold tabular-nums tracking-tight transition-colors ${isGoalMet ? 'text-green-400 drop-shadow-sm' : 'text-dark-text'}`}>
          {current.toLocaleString()}
        </span>
        <span className={`${isGoalMet ? 'text-green-400 font-bold' : 'text-brand-400 font-medium'} text-sm uppercase tracking-wider mt-2 transition-colors`}>
            {isGoalMet ? 'Goal Met!' : label}
        </span>
        <span className="text-dark-muted text-xs mt-1">Goal: {total.toLocaleString()}</span>
        <div className={`mt-2 text-xs transition-all ${!isActive ? 'text-brand-400 font-bold' : 'text-dark-muted'}`}>
            {subLabel}
        </div>
      </div>
    </div>
  );
};
