
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
  const isGoalExceeded = total > 0 && current > total;

  // Trigger ripple effect on every step
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
      className={`relative flex items-center justify-center w-80 h-80 mx-auto my-6 group ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      {/* Background Pulse/Ripple */}
      {(ripple || isActive || isGoalMet) && (
          <div className={`absolute inset-0 rounded-full border-8 ${isGoalMet ? 'border-yellow-500/20' : 'border-brand-500/20'} ${isActive || isGoalMet ? 'animate-pulse' : 'animate-ping'} pointer-events-none`}></div>
      )}

      {/* Main Track */}
      <div className={`absolute inset-0 rounded-full border-[12px] border-slate-800/40 shadow-inner ${isGoalMet ? 'border-yellow-500/10' : isActive ? 'border-brand-500/10' : ''}`}></div>
      
      {/* Dynamic SVG Progress */}
      <svg className={`absolute inset-0 w-full h-full -rotate-90 filter ${isGoalMet ? 'drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'drop-shadow-[0_0_15px_rgba(76,175,80,0.2)]'}`} viewBox="0 0 200 200">
        {/* Define Gradients for Success states */}
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke={isGoalExceeded ? "url(#goldGradient)" : isGoalMet ? "url(#successGradient)" : "currentColor"}
          strokeWidth="12"
          strokeLinecap="round"
          className={`${!isGoalMet ? color : ''} transition-all duration-1000 ease-out`}
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      
      {/* Tap Instruction Overlay */}
      {!isGoalMet && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <div className="bg-brand-600/80 backdrop-blur px-4 py-2 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <i className={`fa-solid ${isActive ? 'fa-square' : 'fa-play'}`}></i>
                {isActive ? 'Stop Session' : 'Start Session'}
            </div>
        </div>
      )}

      {/* Inner Information Panel */}
      <div className={`flex flex-col items-center justify-center z-10 text-center pointer-events-none transition-transform duration-500 ${isGoalMet ? 'scale-110' : isActive ? 'scale-105' : 'animate-breathing'}`}>
        
        {isGoalMet && (
             <div className="absolute -top-12 animate-bounce z-20">
                 <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-40 animate-pulse"></div>
                    <div className="w-16 h-16 bg-gradient-to-tr from-yellow-600 to-yellow-400 rounded-[1.5rem] border-4 border-slate-900 flex items-center justify-center shadow-[0_10px_30px_rgba(234,179,8,0.5)] relative z-10">
                        <i className="fa-solid fa-medal text-white text-3xl"></i>
                    </div>
                 </div>
             </div>
        )}

        <div className="flex flex-col">
            <span className={`text-7xl font-black tabular-nums tracking-tighter transition-colors drop-shadow-xl ${isGoalExceeded ? 'text-yellow-400' : isGoalMet ? 'text-emerald-400' : 'text-white'}`}>
                {current.toLocaleString()}
            </span>
            <span className={`${isGoalExceeded ? 'text-yellow-500' : isGoalMet ? 'text-emerald-400' : 'text-brand-400'} text-[11px] font-black uppercase tracking-[5px] mt-2`}>
                {isGoalExceeded ? 'Shaandaar Guru!' : isGoalMet ? 'Target Done!' : label}
            </span>
            
            <div className={`mt-3 py-1 px-4 rounded-full border flex flex-col items-center transition-colors ${isGoalMet ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700/50'}`}>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isGoalMet ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isGoalExceeded ? `Bonus: ${ (current - total).toLocaleString() }` : `Goal: ${total.toLocaleString()}`}
                </span>
                {isGoalExceeded ? (
                    <span className="text-[7px] text-yellow-500 font-black uppercase tracking-widest mt-0.5 animate-pulse">
                        Legendary Mode
                    </span>
                ) : isActive && (
                    <span className="text-[7px] text-brand-400 font-black uppercase tracking-widest mt-0.5 animate-pulse">
                        Tracking Live
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Celebrate Button if Met */}
      {isGoalMet && (
          <div className="absolute bottom-4 animate-fade-in">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">"Aaj toh jhandey gaad diye!"</p>
              </div>
          </div>
      )}
    </div>
  );
};
