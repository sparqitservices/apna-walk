
import React, { useMemo, useState } from 'react';
import { DailyHistory, WalkSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AutoHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: DailyHistory[];
}

export const AutoHistoryModal: React.FC<AutoHistoryModalProps> = ({ isOpen, onClose, history }) => {
    const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

    const last7Days = useMemo(() => {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split('T')[0];
            const dayData = history.find(h => h.date === iso) || { date: iso, steps: 0, sessions: [] };
            
            const totals = { walking: 0, cycling: 0, driving: 0 };
            dayData.sessions?.forEach(s => {
                const type = s.activityType || 'walking';
                if (type in totals) totals[type as keyof typeof totals] += s.distanceMeters / 1000;
            });

            result.push({
                date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                fullDate: iso,
                ...totals,
                total: totals.walking + totals.cycling + totals.driving
            });
        }
        return result;
    }, [history]);

    if (!isOpen) return null;

    const getActivityIcon = (type?: string) => {
        switch(type) {
            case 'cycling': return 'fa-bicycle';
            case 'driving': return 'fa-car';
            default: return 'fa-person-walking';
        }
    };

    const getActivityColor = (type?: string) => {
        switch(type) {
            case 'cycling': return 'text-blue-400';
            case 'driving': return 'text-orange-400';
            default: return 'text-brand-500';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[160] flex flex-col animate-fade-in">
            <header className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-white font-black text-2xl italic tracking-tighter uppercase">Travel Forensics</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px]">7-Day Movement Analysis</p>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center active:scale-90 transition-all border border-slate-700 shadow-xl">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                {/* Mode Legend */}
                <div className="flex justify-center gap-6 bg-slate-900/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Walking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Cycling</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Driving</span>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-slate-900/30 rounded-[2.5rem] border border-slate-800 p-6 h-72 shadow-2xl relative">
                    <p className="absolute top-4 left-6 text-[9px] font-black uppercase tracking-[3px] text-slate-600">Distance Telemetry (KM)</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last7Days}>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px'}}
                                labelStyle={{color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px'}}
                            />
                            <Bar dataKey="walking" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="cycling" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="driving" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Day-by-Day Granular Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 ml-2">Recent Timeline</h3>
                    {last7Days.map((day, idx) => (
                        <div key={idx} className="bg-slate-800/20 border border-slate-800/50 rounded-3xl p-5 overflow-hidden relative">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-black italic text-lg uppercase tracking-tight">{day.date}</span>
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{day.fullDate}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-black text-sm">{day.total.toFixed(1)} KM</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {day.total === 0 ? (
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">No movement recorded</p>
                                ) : (
                                    ['walking', 'cycling', 'driving'].map(mode => {
                                        const val = (day as any)[mode];
                                        if (val > 0) return (
                                            <div key={mode} className="bg-slate-900/60 border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0">
                                                <i className={`fa-solid ${getActivityIcon(mode)} ${getActivityColor(mode)} text-[10px]`}></i>
                                                <span className="text-[10px] font-black text-white uppercase italic">{val.toFixed(1)}km</span>
                                            </div>
                                        );
                                        return null;
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-brand-500/10 border border-brand-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                    <i className="fa-solid fa-shield-halved text-brand-500 text-xl mt-1"></i>
                    <div>
                        <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Local Forensics Only</h4>
                        <p className="text-slate-400 text-[10px] leading-relaxed font-bold uppercase tracking-tighter">Your travel paths are stored using browser-side AES encryption. No GPS coordinate ever leaves this device. Not even your buddies can see this history.</p>
                    </div>
                </div>
            </div>

            <footer className="p-8 bg-slate-900/50 border-t border-white/5 flex flex-col gap-4">
                <button onClick={onClose} className="w-full py-5 rounded-[2rem] bg-white text-slate-900 font-black uppercase tracking-[5px] text-xs shadow-2xl active:scale-95 transition-all">Dismiss Timeline</button>
                <p className="text-center text-[8px] text-slate-600 font-black uppercase tracking-[4px]">End-to-End Local Integrity System</p>
            </footer>
        </div>
    );
};
