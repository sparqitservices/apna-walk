import React from 'react';

interface BreathExerciseCardProps {
  onClick: () => void;
}

export const BreathExerciseCard: React.FC<BreathExerciseCardProps> = ({ onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md h-full min-h-[260px] bg-dark-card border border-cyan-500/20 rounded-3xl relative overflow-hidden group cursor-pointer shadow-lg shadow-cyan-900/5 hover:border-cyan-500/40 transition-all active:scale-[0.99] flex flex-col justify-between"
    >
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-colors"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/20 shadow-inner">
                    <i className="fa-solid fa-lungs text-2xl"></i>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Relax
                </div>
            </div>

            <div>
                <h3 className="text-white font-bold text-2xl mb-1">Breathing Exercises</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    Reduce stress and improve focus with guided breathwork patterns.
                </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors bg-cyan-500/5 p-2 rounded-lg w-fit border border-cyan-500/10">
                <span>Start Session</span>
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </div>
        </div>
    </div>
  );
};