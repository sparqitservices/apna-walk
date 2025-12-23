
import React from 'react';

interface BreathExerciseCardProps {
  onClick: () => void;
}

export const BreathExerciseCard: React.FC<BreathExerciseCardProps> = ({ onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="w-full h-full min-h-[280px] bg-[#0f172a] border border-cyan-500/20 rounded-[2.5rem] relative overflow-hidden group cursor-pointer shadow-2xl hover:border-cyan-400/40 transition-all active:scale-[0.98] flex flex-col"
    >
        {/* Breathing Nebula Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] animate-breathing group-hover:bg-cyan-500/20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] animate-breathing delay-1000"></div>
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="relative z-10 p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-500 border border-cyan-500/20 shadow-inner group-hover:shadow-cyan-500/20">
                    <i className="fa-solid fa-lungs text-2xl group-hover:animate-pulse"></i>
                </div>
                <div className="flex flex-col items-end">
                    <span className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-[8px] font-black text-cyan-400 uppercase tracking-widest">
                        Recovery Mode
                    </span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Post-Walk Vitals</span>
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-white font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none">Breath Work</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed font-medium mb-4 max-w-[90%]">
                    Optimize recovery by calming your nervous system after a session.
                </p>
                
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vagus Nerve Stimulation</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cortisol Reduction</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                    <span>Start Flow</span>
                    <i className="fa-solid fa-chevron-right text-[8px] group-hover:translate-x-1 transition-transform"></i>
                </div>
                <div className="flex gap-1">
                    <div className="w-1 h-3 bg-cyan-500/20 rounded-full"></div>
                    <div className="w-1 h-5 bg-cyan-500/40 rounded-full"></div>
                    <div className="w-1 h-3 bg-cyan-500/20 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};
