import React, { useState, useEffect, useRef } from 'react';
import { HydrationLog } from '../types';

interface HydrationCardProps {
  data: HydrationLog;
  onClick: () => void;
  onQuickAdd: () => void;
  recommendation?: string;
}

export const HydrationCard: React.FC<HydrationCardProps> = ({ data, onClick, onQuickAdd, recommendation }) => {
  const percent = Math.min((data.currentMl / data.goalMl) * 100, 100);
  const [showBubbles, setShowBubbles] = useState(false);
  const prevMlRef = useRef(data.currentMl);

  // Trigger bubble animation ONLY when hydration increases
  useEffect(() => {
    if (data.currentMl > prevMlRef.current) {
      setShowBubbles(true);
      const timer = setTimeout(() => setShowBubbles(false), 1500);
      return () => clearTimeout(timer);
    }
    prevMlRef.current = data.currentMl;
  }, [data.currentMl]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger animation immediately for responsiveness
    setShowBubbles(true);
    setTimeout(() => setShowBubbles(false), 1500);
    onQuickAdd();
  };

  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md bg-dark-card border border-blue-500/20 rounded-3xl mb-8 relative overflow-hidden group cursor-pointer shadow-lg shadow-blue-900/5 hover:border-blue-500/40 transition-all active:scale-[0.99]"
    >
        {/* Background Water Fill - Rising Animation */}
        <div 
            className="absolute bottom-0 left-0 w-full bg-blue-500/10 transition-all duration-1000 ease-out z-0"
            style={{ height: `${percent}%` }}
        >
            {/* Wave effect at the top of the water level */}
            <div className="absolute top-0 left-0 w-[200%] h-2 bg-blue-400/20 animate-wave rounded-full blur-sm -translate-y-1/2"></div>
            <div className="absolute top-0 left-0 w-full h-px bg-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </div>

        {/* Floating Bubbles Animation */}
        {showBubbles && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-0 left-[20%] w-2 h-2 bg-blue-400/40 rounded-full animate-[messagePop_1s_ease-out_forwards]"></div>
                <div className="absolute bottom-0 left-[50%] w-3 h-3 bg-blue-400/30 rounded-full animate-[messagePop_1.2s_ease-out_forwards] delay-100"></div>
                <div className="absolute bottom-0 left-[80%] w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-[messagePop_0.8s_ease-out_forwards] delay-75"></div>
                 <div className="absolute bottom-0 left-[35%] w-1 h-1 bg-blue-300/50 rounded-full animate-[messagePop_0.9s_ease-out_forwards] delay-200"></div>
            </div>
        )}

        {/* Bottom Progress Bar (Solid) */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-800/50 z-0">
            <div 
                className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-1000 ease-out"
                style={{ width: `${percent}%` }}
            ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-5">
            <div className="flex justify-between items-start">
                
                {/* Left Side: Icon & Stats */}
                <div className="flex items-center gap-4">
                     <div className="relative">
                         <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300 border border-blue-500/20 shadow-inner">
                            <i className={`fa-solid fa-glass-water text-2xl ${showBubbles ? 'animate-bounce' : ''}`}></i>
                         </div>
                         {percent >= 100 && (
                             <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-dark-card flex items-center justify-center text-white text-[10px] animate-bounce">
                                 <i className="fa-solid fa-check"></i>
                             </div>
                         )}
                     </div>
                     
                     <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Hydration</span>
                            {/* Edit Badge to signal modal interactivity */}
                            <span className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors duration-300">
                                <i className="fa-solid fa-sliders mr-1"></i>Goal
                            </span>
                         </div>
                         <div className="flex items-baseline gap-1.5">
                             <span className="text-3xl font-bold text-white tabular-nums drop-shadow-sm transition-all duration-300">{data.currentMl}</span>
                             <span className="text-sm text-slate-500 font-medium">/ {data.goalMl} ml</span>
                         </div>
                     </div>
                </div>

                {/* Right Side: Quick Add Button */}
                <button 
                    onClick={handleQuickAdd}
                    className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95 flex items-center justify-center shadow-lg group-active:scale-90"
                    title="Quick Add (250ml)"
                >
                    <i className="fa-solid fa-plus text-lg"></i>
                </button>
            </div>

            {/* Recommendation Section - Embedded to avoid clipping */}
            {recommendation && (
                <div className="mt-4 bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 flex items-start gap-3 animate-fade-in hover:bg-slate-900/80 transition-colors">
                    <div className="mt-0.5 shrink-0">
                        <i className="fa-solid fa-comment-dots text-brand-400 text-sm"></i>
                    </div>
                    <div>
                        <p className="text-xs text-slate-300 font-medium italic leading-relaxed">"{recommendation}"</p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};