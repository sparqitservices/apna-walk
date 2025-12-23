
import React from 'react';
import { ReliefLog } from '../types';

interface ReliefCardProps {
  data: ReliefLog;
  onClick: () => void;
  onQuickAdd: () => void;
}

export const ReliefCard: React.FC<ReliefCardProps> = ({ data, onClick, onQuickAdd }) => {
  const percent = Math.min((data.count / data.goal) * 100, 100);
  
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd();
  };

  return (
    <div 
        onClick={onClick}
        className="w-full h-full min-h-[160px] bg-[#1a1c1e] border border-amber-500/20 rounded-[2rem] relative overflow-hidden group cursor-pointer shadow-xl hover:border-amber-500/40 transition-all active:scale-[0.99] flex flex-col justify-between"
    >
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors"></div>

        <div className="p-5 relative z-10 flex-1">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform border border-amber-500/10">
                    <i className="fa-solid fa-droplet text-xl"></i>
                </div>
                <button 
                    onClick={handleQuickAdd}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 hover:bg-amber-500 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-lg"
                >
                    <i className="fa-solid fa-plus"></i>
                </button>
            </div>

            <div>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[3px] mb-1">Relief Log</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white italic tabular-nums leading-none">{data.count}</span>
                    <span className="text-slate-600 text-xs font-bold uppercase">/ {data.goal} times</span>
                </div>
            </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="px-5 pb-5">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-2">
                 <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Fluid Balance</span>
                 <span className="text-[8px] text-amber-500/60 font-black uppercase tracking-widest">Detox Mode</span>
            </div>
        </div>
    </div>
  );
};
