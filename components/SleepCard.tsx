
import React from 'react';

interface SleepCardProps {
  onClick: () => void;
}

export const SleepCard: React.FC<SleepCardProps> = ({ onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="w-full h-full min-h-[280px] bg-gradient-to-br from-[#020617] to-[#1e1b4b] border border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden group cursor-pointer shadow-2xl hover:border-indigo-400/40 transition-all active:scale-[0.98] flex flex-col"
    >
        {/* Starfield Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full animate-pulse opacity-40"></div>
            <div className="absolute top-12 right-12 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-700 opacity-30"></div>
            <div className="absolute bottom-16 left-1/4 w-1 h-1 bg-indigo-300 rounded-full animate-pulse delay-1000 opacity-50"></div>
            <div className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-white rounded-full opacity-20"></div>
            {/* Moon Glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] transition-all duration-1000 group-hover:bg-indigo-600/20"></div>
        </div>

        <div className="relative z-10 p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform duration-500 border border-indigo-500/20 shadow-inner backdrop-blur-sm">
                    <i className="fa-solid fa-moon text-2xl group-hover:rotate-12 transition-transform"></i>
                </div>
                <div className="flex flex-col items-end">
                    <span className="bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full text-[8px] font-black text-indigo-200 uppercase tracking-widest backdrop-blur-md">
                        Muscle Repair
                    </span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Growth Hormone Focus</span>
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-white font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none">Sleep Aid</h3>
                <p className="text-indigo-200/60 text-[11px] leading-relaxed font-medium mb-4 max-w-[90%]">
                    Binaural beats and deep frequencies designed for athletic rest.
                </p>

                <div className="flex flex-wrap gap-2">
                    <span className="text-[8px] font-black text-slate-400 border border-slate-700/50 px-2 py-1 rounded-lg bg-black/20 uppercase tracking-wider">Theta Waves</span>
                    <span className="text-[8px] font-black text-slate-400 border border-slate-700/50 px-2 py-1 rounded-lg bg-black/20 uppercase tracking-wider">Brown Noise</span>
                    <span className="text-[8px] font-black text-slate-400 border border-slate-700/50 px-2 py-1 rounded-lg bg-black/20 uppercase tracking-wider">Delta Sleep</span>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-300 uppercase tracking-widest group-hover:text-indigo-100 transition-colors">
                    <span>Rest Better</span>
                    <i className="fa-solid fa-play text-[8px] group-hover:scale-125 transition-transform"></i>
                </div>
                {/* Visual Audio Wave */}
                <div className="flex items-end gap-[2px] h-4">
                    <div className="w-[3px] h-1 bg-indigo-500/40 rounded-full animate-wave" style={{ animationDelay: '0s' }}></div>
                    <div className="w-[3px] h-3 bg-indigo-500/60 rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-[3px] h-2 bg-indigo-500/40 rounded-full animate-wave" style={{ animationDelay: '0.4s' }}></div>
                    <div className="w-[3px] h-4 bg-indigo-500/80 rounded-full animate-wave" style={{ animationDelay: '0.6s' }}></div>
                </div>
            </div>
        </div>

        <style>{`
            @keyframes wave {
                0%, 100% { height: 4px; }
                50% { height: 12px; }
            }
        `}</style>
    </div>
  );
};
