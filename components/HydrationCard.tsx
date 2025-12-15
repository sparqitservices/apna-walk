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
    // Trigger animation immediately for responsiveness before prop update
    setShowBubbles(true);
    setTimeout(() => setShowBubbles(false), 1500);
    onQuickAdd();
  };

  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md bg-dark-card border border-blue-500/20 p-5 rounded-3xl mb-8 relative overflow-hidden group cursor-pointer shadow-lg shadow-blue-900/5"
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

        <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
                 <div className="relative">
                     <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 shadow-inner">
                        <i className={`fa-solid fa-glass-water text-xl ${showBubbles ? 'animate-bounce' : ''}`}></i>
                     </div>
                     {percent >= 100 && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-dark-card flex items-center justify-center text-white text-[10px] animate-bounce">
                             <i className="fa-solid fa-check"></i>
                         </div>
                     )}

                     {/* Suggestion Bubble */}
                     {recommendation && (
                        <div className="absolute -top-10 left-0 w-40 z-50 pointer-events-none animate-message-pop origin-bottom-left">
                            <div className="bg-slate-800 text-brand-400 text-[10px] font-bold p-2 rounded-xl rounded-bl-none shadow-xl border border-slate-700/50 leading-tight">
                                {recommendation}
                            </div>
                        </div>
                     )}
                 </div>
                 
                 <div>
                     <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">Hydration</div>
                     <div className="flex items-baseline gap-1">
                         <span className="text-2xl font-bold text-white tabular-nums drop-shadow-sm transition-all duration-300">{data.currentMl}</span>
                         <span className="text-xs text-slate-500 font-medium">/ {data.goalMl} ml</span>
                     </div>
                 </div>
            </div>

            <button 
                onClick={handleQuickAdd}
                className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95 flex items-center justify-center shadow-lg group-active:scale-90"
                title="Quick Add (250ml)"
            >
                <i className="fa-solid fa-plus"></i>
            </button>
        </div>
    </div>
  );
};