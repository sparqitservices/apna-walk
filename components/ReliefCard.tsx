
import React from 'react';
import { ReliefLog } from '../types';

interface ReliefCardProps {
  data: ReliefLog;
  currentHydrationMl: number;
  onClick: () => void;
  onQuickAdd: () => void;
}

export const ReliefCard: React.FC<ReliefCardProps> = ({ data, currentHydrationMl, onClick, onQuickAdd }) => {
  // Logic: 1 relief is approx 350ml. 
  // We expect reliefs based on current hydration.
  const expectedReliefs = Math.max(1, Math.ceil(currentHydrationMl / 350));
  const progress = (data.count / expectedReliefs) * 100;
  
  // Retention Estimate: Intake - (Reliefs * 300ml average)
  const retainedEstimated = Math.max(0, currentHydrationMl - (data.count * 300));
  
  const getLoadStatus = () => {
      if (retainedEstimated < 400) return { label: 'Low Load', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      if (retainedEstimated < 800) return { label: 'Optimal', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      if (retainedEstimated < 1200) return { label: 'High Load', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/20' };
  };

  const status = getLoadStatus();

  return (
    <div 
        onClick={onClick}
        className="w-full h-full min-h-[180px] bg-[#1a1c1e] border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group cursor-pointer shadow-xl hover:border-amber-500/40 transition-all active:scale-[0.99] flex flex-col justify-between"
    >
        <div className="p-5 relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/10">
                    <i className="fa-solid fa-faucet-drip text-xl"></i>
                </div>
                <div className={`px-3 py-1 rounded-full border border-white/5 ${status.bg} ${status.color} text-[8px] font-black uppercase tracking-widest`}>
                    {status.label}
                </div>
            </div>

            <div>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[3px] mb-1">System Balance</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white italic tabular-nums">{data.count}</span>
                    <span className="text-slate-600 text-xs font-bold uppercase">/ {expectedReliefs} Sessions</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">~{retainedEstimated}ml fluid retained</p>
            </div>
        </div>

        <div className="px-5 pb-5">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${retainedEstimated > 1200 ? 'bg-red-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-2">
                 <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Metabolic Loop</span>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
                    className="text-[8px] text-amber-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                 >
                    + Log Relief
                 </button>
            </div>
        </div>
    </div>
  );
};
