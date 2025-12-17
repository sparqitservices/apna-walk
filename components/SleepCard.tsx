import React from 'react';

interface SleepCardProps {
  onClick: () => void;
}

export const SleepCard: React.FC<SleepCardProps> = ({ onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md h-full min-h-[260px] bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] border border-indigo-500/20 rounded-3xl relative overflow-hidden group cursor-pointer shadow-lg shadow-indigo-900/20 hover:border-indigo-500/40 transition-all active:scale-[0.99] flex flex-col justify-between"
    >
        {/* Starry Background */}
        <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-12 right-12 w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
            <div className="absolute bottom-8 left-1/3 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse delay-150"></div>
            <div className="absolute top-1/2 right-1/4 w-0.5 h-0.5 bg-white rounded-full"></div>
        </div>

        {/* Moon Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20 shadow-inner">
                    <i className="fa-solid fa-moon text-2xl"></i>
                </div>
                <div className="bg-indigo-900/50 border border-indigo-500/30 px-2 py-1 rounded text-[10px] font-bold text-indigo-300 uppercase tracking-wider backdrop-blur-sm">
                    Rest
                </div>
            </div>

            <div>
                <h3 className="text-white font-bold text-2xl mb-1">Sleep Aid</h3>
                <p className="text-indigo-200/60 text-xs leading-relaxed font-medium">
                    Drift off with calming soundscapes and binaural beats.
                </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors bg-indigo-900/30 p-2 rounded-lg w-fit border border-indigo-500/20 backdrop-blur-md">
                <span>Play Sounds</span>
                <i className="fa-solid fa-play group-hover:translate-x-1 transition-transform text-[10px]"></i>
            </div>
        </div>
    </div>
  );
};