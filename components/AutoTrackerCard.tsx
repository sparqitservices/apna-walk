
import React, { useMemo } from 'react';
import { DailyHistory } from '../types';

interface AutoTrackerCardProps {
    isActive: boolean;
    currentMode: 'walking' | 'cycling' | 'driving' | 'stationary';
    history: DailyHistory[];
    onClick: () => void;
}

export const AutoTrackerCard: React.FC<AutoTrackerCardProps> = ({ isActive, currentMode, history, onClick }) => {
    const getModeMeta = () => {
        switch(currentMode) {
            case 'walking': return { label: 'On Foot', icon: 'fa-person-walking', color: 'text-brand-400', phrase: 'Arre Boss! Kadmo ki raftaar ek number hai!' };
            case 'cycling': return { label: 'Cycling', icon: 'fa-bicycle', color: 'text-blue-400', phrase: 'Riding mode on! Stamina boost ho raha hai.' };
            case 'driving': return { label: 'Cruising', icon: 'fa-car', color: 'text-orange-400', phrase: 'Gaddi bhaga rahe ho? Drive safe, guru!' };
            default: return { label: 'Standby', icon: 'fa-satellite-dish', color: 'text-slate-500', phrase: 'Awaiting your signature move...' };
        }
    };

    // Calculate mini sparkline data
    const sparkData = useMemo(() => {
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split('T')[0];
            const day = history.find(h => h.date === iso);
            const dist = day?.sessions?.reduce((acc, s) => acc + s.distanceMeters, 0) || 0;
            last7.push(dist);
        }
        const max = Math.max(...last7, 1000); // at least 1km scale
        return last7.map(d => (d / max) * 100);
    }, [history]);

    const meta = getModeMeta();

    return (
        <div 
            onClick={onClick}
            className="w-full bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] p-6 group cursor-pointer hover:bg-slate-800/60 transition-all shadow-2xl relative overflow-hidden"
        >
            {/* Background Accent Animation */}
            <div className={`absolute top-0 right-0 p-8 opacity-[0.03] text-8xl ${meta.color} rotate-12 pointer-events-none transition-all duration-700 group-hover:scale-125`}>
                <i className={`fa-solid ${meta.icon}`}></i>
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-[1.5rem] bg-slate-900 border border-white/5 flex items-center justify-center ${meta.color} shadow-inner transition-transform group-hover:rotate-12`}>
                        <i className={`fa-solid ${meta.icon} text-xl`}></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-black text-xl italic tracking-tighter uppercase">{meta.label}</h3>
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[3px] mt-1">Intelligence Radar</p>
                    </div>
                </div>
                
                {/* 7-Day Sparkline */}
                <div className="flex items-end gap-1 h-10 bg-black/20 p-2 rounded-xl border border-white/5">
                    {sparkData.map((h, i) => (
                        <div 
                            key={i} 
                            style={{ height: `${Math.max(h, 10)}%` }} 
                            className={`w-1.5 rounded-full ${i === 6 ? 'bg-brand-500 animate-pulse' : 'bg-slate-700'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                <p className="text-xs text-slate-300 font-medium italic mb-2">"{meta.phrase}"</p>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-[4px]">E2E Encryption</span>
                        <div className="h-3 w-px bg-slate-800"></div>
                        <span className="text-[8px] text-emerald-500 font-black uppercase tracking-[3px]">GPS: Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">7-Day Analysis</span>
                        <i className="fa-solid fa-chevron-right text-[8px]"></i>
                    </div>
                </div>
            </div>
        </div>
    );
};
