
import React, { useEffect, useState } from 'react';

interface RadialProgressProps {
  current: number;
  total: number;
  label: string;
  subLabel: string;
  color?: string;
  isActive?: boolean;
  lastStepTime?: number;
  onClick?: () => void;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ 
  current, 
  total, 
  label, 
  subLabel,
  color = "text-brand-500",
  isActive = false,
  lastStepTime = 0,
  onClick
}) => {
  const [ripple, setRipple] = useState(false);
  const percentage = Math.min((current / total) * 100, 100);
  const strokeDasharray = 2 * Math.PI * 90; 
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const isGoalMet = total > 0 && current >= total;
  const displayColor = isGoalMet ? "text-emerald-400" : color;

  // Trigger ripple effect on every actual step
  useEffect(() => {
    if (lastStepTime > 0) {
      setRipple(true);
      const timer = setTimeout(() => setRipple(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastStepTime]);

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center w-80 h-80 mx-auto my-6 ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      {/* Background Pulse/Ripple */}
      {ripple && (
          <div className="absolute inset-0 rounded-full border-8 border-brand-500/20 animate-ping pointer-events-none"></div>
      )}

      {/* Main Track */}
      <div className={`absolute inset-0 rounded-full border-[12px] border-slate-800/40 shadow-inner ${isActive ? 'animate-pulse' : ''}`}></div>
      
      {/* Dynamic SVG Progress */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(76,175,80,0.2)]" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={`${displayColor} transition-all duration-1000 ease-out`}
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      
      {/* Inner Information Panel */}
      <div className={`flex flex-col items-center justify-center z-10 text-center pointer-events-none ${isActive ? 'scale-105 transition-transform' : 'animate-breathing'}`}>
        
        {isGoalMet && (
             <div className="absolute -top-10 animate-bounce z-20">
                 <div className="w-16 h-16 bg-yellow-500 rounded-[1.5rem] border-4 border-white flex items-center justify-center shadow-[0_10px_30px_rgba(234,179,8,0.5)]">
                     <i className="fa-solid fa-trophy text-white text-3xl"></i>
                 </div>
             </div>
        )}

        <div className="flex flex-col">
            <span className={`text-7xl font-black tabular-nums tracking-tighter transition-colors drop-shadow-xl ${isGoalMet ? 'text-emerald-400' : 'text-white'}`}>
                {current.toLocaleString()}
            </span>
            <span className={`${isGoalMet ? 'text-emerald-400' : 'text-brand-400'} text-[11px] font-black uppercase tracking-[5px] mt-2`}>
                {isGoalMet ? 'Goal Smashed!' : label}
            </span>
            <div className="mt-3 py-1 px-4 bg-slate-800/60 rounded-full border border-slate-700/50">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                    Target: {total.toLocaleString()}
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};
