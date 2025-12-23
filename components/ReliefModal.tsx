
import React from 'react';
import { ReliefLog } from '../types';

interface ReliefModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReliefLog;
  currentHydrationMl: number;
  onUpdate: (newData: ReliefLog) => void;
}

const RISKS = [
    { title: "Nurse's Bladder", desc: "Consistently holding it causes bladder muscles to overstretch and weaken.", icon: "fa-triangle-exclamation" },
    { title: "Kidney Stones", desc: "Concentrated urine allows minerals to crystallize. Frequent flushing is key.", icon: "fa-gem" },
    { title: "UTI Threat", desc: "The longer urine sits, the more time bacteria has to multiply in the tract.", icon: "fa-microbe" }
];

export const ReliefModal: React.FC<ReliefModalProps> = ({ isOpen, onClose, data, currentHydrationMl, onUpdate }) => {
  if (!isOpen) return null;

  const expectedReliefs = Math.max(1, Math.ceil(currentHydrationMl / 350));
  const retainedEstimated = Math.max(0, currentHydrationMl - (data.count * 300));

  const handleLog = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onUpdate({
        ...data,
        count: data.count + 1,
        lastReliefTimestamp: Date.now()
    });
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
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                   <i className="fa-solid fa-droplet text-xl"></i>
                </div>
                <div>
                   <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic leading-none">Fluid IQ</h2>
                   <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Balance Engine</p>
                </div>
             </div>
             <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-90">
               <i className="fa-solid fa-xmark"></i>
             </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-2">Input Load</p>
                    <p className="text-2xl font-black text-white italic">{currentHydrationMl}ml</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-2">Retention</p>
                    <p className={`text-2xl font-black italic ${retainedEstimated > 1000 ? 'text-red-400' : 'text-brand-400'}`}>~{retainedEstimated}ml</p>
                </div>
            </div>

            <div className="text-center mb-10">
                <div className="text-6xl font-black text-white italic tabular-nums tracking-tighter">{data.count}<span className="text-2xl text-slate-600 ml-2">/ {expectedReliefs}</span></div>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-[4px] mt-2">Relief Sessions Logged</p>
            </div>

            <button 
                onClick={handleLog}
                className="w-full py-8 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
            >
                <i className="fa-solid fa-plus text-3xl text-white"></i>
                <span className="text-white font-black text-xs uppercase tracking-[5px]">Expel Fluid</span>
            </button>

            <div className="mt-12 space-y-6">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[5px] ml-2">The Dangers of Holding</h3>
                <div className="grid grid-cols-1 gap-4">
                    {RISKS.map((b, i) => (
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
        </div>

        <div className="p-8 bg-slate-900/50 border-t border-white/5 shrink-0">
            <button onClick={onClose} className="w-full py-6 rounded-[2rem] bg-white text-slate-900 font-black uppercase tracking-[5px] text-xs shadow-2xl active:scale-95 transition-all">Understood</button>
        </div>
      </div>
    </div>
  );
};
