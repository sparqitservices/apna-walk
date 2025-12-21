
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
  const strokeDasharray = 2 * Math.PI * 90; 
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const isGoalMet = total > 0 && current >= total;
  const displayColor = isGoalMet ? "text-green-400" : color;

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center w-72 h-72 mx-auto my-8 ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      {/* Dynamic Ripple Effect when active */}
      {isActive && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-4 rounded-full border-2 border-brand-500/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
          </>
      )}

      {/* Background Circle */}
      <div className={`absolute inset-0 rounded-full border-[14px] border-slate-800/50 shadow-inner ${isActive ? 'animate-pulse-slow' : ''}`}></div>
      
      {/* SVG Ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-lg" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className={`${displayColor} transition-all duration-700 ease-out`}
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      
      {/* Inner Content */}
      <div className={`flex flex-col items-center justify-center z-10 text-center pointer-events-none ${isActive ? 'scale-110 transition-transform' : 'animate-breathing'}`}>
        
        {isGoalMet && (
             <div className="absolute -top-12 animate-bounce z-20">
                 <div className="w-14 h-14 bg-yellow-500 rounded-full border-4 border-white flex items-center justify-center shadow-xl">
                     <i className="fa-solid fa-trophy text-white text-2xl"></i>
                 </div>
             </div>
        )}

        <span className={`text-6xl font-black tabular-nums tracking-tighter transition-colors ${isGoalMet ? 'text-green-400' : 'text-white'}`}>
          {current.toLocaleString()}
        </span>
        <span className={`${isGoalMet ? 'text-green-400' : 'text-brand-400'} text-[10px] font-black uppercase tracking-[4px] mt-2`}>
            {isGoalMet ? 'Goal Smashed!' : label}
        </span>
        <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Target: {total.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
