
import React from 'react';
import { ReliefLog } from '../types';

interface ReliefModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReliefLog;
  onUpdate: (newData: ReliefLog) => void;
}

const BENEFITS = [
    { title: "Kidney Efficiency", desc: "Regular relief prevents mineral buildup that leads to kidney stones.", icon: "fa-filter" },
    { title: "Bacterial Flush", desc: "Flushing the system regularly reduces the risk of Urinary Tract Infections (UTIs).", icon: "fa-shield-virus" },
    { title: "Bladder Integrity", desc: "Holding it too long weakens bladder muscles over time. Stay proactive!", icon: "fa-lungs" }
];

export const ReliefModal: React.FC<ReliefModalProps> = ({ isOpen, onClose, data, onUpdate }) => {
  if (!isOpen) return null;

  const handleLog = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onUpdate({
        ...data,
        count: data.count + 1,
        lastReliefTimestamp: Date.now()
    });
  };

  const handleReset = () => {
    if (confirm("Reset today's relief count?")) {
        onUpdate({ ...data, count: 0 });
    }
  };

  const getTimeSinceLast = () => {
    if (!data.lastReliefTimestamp) return "No logs today";
    const mins = Math.floor((Date.now() - data.lastReliefTimestamp) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0a0f14] w-full max-w-lg h-full sm:h-auto sm:rounded-[3rem] overflow-hidden border border-amber-500/20 shadow-2xl relative flex flex-col animate-message-pop">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                   <i className="fa-solid fa-droplet text-xl"></i>
                </div>
                <div>
                   <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic leading-none">Relief Log</h2>
                   <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Output Tracking</p>
                </div>
             </div>
             <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-90">
               <i className="fa-solid fa-xmark"></i>
             </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="text-center mb-10">
                <div className="text-6xl font-black text-white italic tabular-nums tracking-tighter">{data.count}</div>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-[4px] mt-2">Times Relieved Today</p>
                <div className="mt-4 bg-slate-800/40 px-4 py-2 rounded-xl inline-flex items-center gap-2 border border-white/5">
                    <i className="fa-solid fa-clock text-[10px] text-slate-600"></i>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last: {getTimeSinceLast()}</span>
                </div>
            </div>

            <button 
                onClick={handleLog}
                className="w-full py-8 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <i className="fa-solid fa-plus text-3xl text-white"></i>
                <span className="text-white font-black text-xs uppercase tracking-[5px]">Log Relief Session</span>
            </button>

            <div className="mt-12 space-y-6">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[5px] ml-2">Medical Intelligence</h3>
                <div className="grid grid-cols-1 gap-4">
                    {BENEFITS.map((b, i) => (
                        <div key={i} className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 flex gap-5 items-start">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-500 shrink-0">
                                <i className={`fa-solid ${b.icon}`}></i>
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">{b.title}</h4>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{b.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleReset}
                className="w-full mt-10 text-[9px] text-slate-700 hover:text-red-400 font-black uppercase tracking-[4px] transition-colors"
            >
                Reset Daily Count
            </button>
        </div>

        <div className="p-8 bg-slate-900/50 border-t border-white/5 shrink-0">
            <button onClick={onClose} className="w-full py-6 rounded-[2rem] bg-white text-slate-900 font-black uppercase tracking-[5px] text-xs shadow-2xl active:scale-95 transition-all">Understood</button>
        </div>
      </div>
    </div>
  );
};
