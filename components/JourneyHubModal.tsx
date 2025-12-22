
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WalkSession, DailyHistory, RoutePoint } from '../types';
import { RouteMap } from './RouteMap';

declare const L: any;

interface JourneyHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: DailyHistory[];
    onViewSegment: (session: WalkSession) => void;
}

export const JourneyHubModal: React.FC<JourneyHubModalProps> = ({ isOpen, onClose, history, onViewSegment }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const activeDay = useMemo(() => {
        return history.find(h => h.date === selectedDate) || { date: selectedDate, steps: 0, sessions: [] };
    }, [history, selectedDate]);

    const sortedSessions = useMemo(() => {
        return [...(activeDay.sessions || [])].sort((a, b) => b.startTime - a.startTime);
    }, [activeDay.sessions]);

    const allDayPoints = useMemo(() => {
        const points: RoutePoint[] = [];
        activeDay.sessions?.forEach(s => {
            if (s.route) points.push(...s.route);
        });
        return points;
    }, [activeDay.sessions]);

    const dailyBreakdown = useMemo(() => {
        const stats = { walking: 0, cycling: 0, driving: 0 };
        activeDay.sessions?.forEach(s => {
            const type = s.activityType || 'walking';
            if (type in stats) stats[type as keyof typeof stats] += s.distanceMeters;
        });
        return stats;
    }, [activeDay.sessions]);

    const dateStrip = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split('T')[0];
            return {
                iso,
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate(),
                month: d.toLocaleDateString('en-US', { month: 'short' })
            };
        });
    }, []);

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

    const formatDuration = (seconds: number) => {
        const mins = Math.round(seconds / 60);
        if (mins < 1) return "< 1m";
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex flex-col animate-fade-in">
            <header className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-white font-black text-2xl italic tracking-tighter uppercase">Journey Log</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px]">Private Timeline</p>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center active:scale-90 transition-all border border-slate-700 shadow-xl">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                <div className="p-6 bg-slate-900/30">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                        {dateStrip.map((item) => (
                            <button
                                key={item.iso}
                                onClick={() => setSelectedDate(item.iso)}
                                className={`flex flex-col items-center min-w-[70px] py-4 rounded-3xl transition-all border-2 ${
                                    selectedDate === item.iso 
                                    ? 'bg-brand-500 border-brand-400 text-white shadow-xl shadow-brand-500/20 scale-105' 
                                    : 'bg-slate-800/40 border-slate-800 text-slate-500'
                                }`}
                            >
                                <span className="text-[9px] font-black uppercase mb-1">{item.day}</span>
                                <span className="text-xl font-black italic leading-none">{item.date}</span>
                                <span className="text-[8px] font-bold uppercase mt-1 opacity-60">{item.month}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 space-y-6">
                    <div className="bg-slate-800/40 rounded-[3rem] border border-slate-700/50 overflow-hidden shadow-2xl relative">
                        <div className="h-64 w-full relative">
                            {allDayPoints.length > 0 ? (
                                <RouteMap route={allDayPoints} className="h-full w-full opacity-60" />
                            ) : (
                                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900/50 text-slate-600">
                                    <i className="fa-solid fa-map-location text-4xl mb-4 opacity-20"></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Paths Recorded</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
                            
                            <div className="absolute top-6 left-8 flex gap-3">
                                {/* Cast 'dist' to number to avoid 'unknown' comparison error */}
                                {Object.entries(dailyBreakdown).map(([mode, dist]) => (dist as number) > 0 && (
                                    <div key={mode} className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                        <i className={`fa-solid ${getActivityIcon(mode)} ${getActivityColor(mode)} text-[10px]`}></i>
                                        {/* Cast 'dist' to number for arithmetic operation */}
                                        <span className="text-[10px] font-black text-white uppercase italic">{((dist as number)/1000).toFixed(1)}km</span>
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                                <div>
                                    <p className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] mb-1">Today's Footsteps</p>
                                    <h3 className="text-3xl font-black text-white italic tracking-tighter">
                                        {activeDay.steps.toLocaleString()} <span className="text-sm font-bold opacity-40 not-italic uppercase">Steps</span>
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-black text-lg italic">{(sortedSessions.reduce((acc,s) => acc + s.distanceMeters, 0) / 1000).toFixed(2)} KM</p>
                                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Total Distance</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between ml-2">
                             <h4 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500">Timeline segments</h4>
                             <div className="flex items-center gap-1.5 opacity-40">
                                <i className="fa-solid fa-lock text-[8px]"></i>
                                <span className="text-[7px] font-black uppercase tracking-widest">Local-only history</span>
                             </div>
                        </div>
                        
                        {sortedSessions.length === 0 ? (
                            <div className="py-12 text-center text-slate-700">
                                <p className="text-[10px] font-black uppercase tracking-widest">Start moving to record your signature.</p>
                            </div>
                        ) : (
                            <div className="relative space-y-8 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-brand-500 before:to-slate-900">
                                {sortedSessions.map((session, idx) => (
                                    <div key={session.id} className="relative pl-12 group">
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-2xl bg-slate-900 border-2 ${getActivityColor(session.activityType).replace('text', 'border')} flex items-center justify-center z-10 shadow-lg group-hover:scale-110 transition-transform`}>
                                            <i className={`fa-solid ${getActivityIcon(session.activityType)} ${getActivityColor(session.activityType)} text-[10px]`}></i>
                                        </div>
                                        <div 
                                            onClick={() => onViewSegment(session)}
                                            className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 hover:bg-slate-800/60 transition-all cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">
                                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                    </p>
                                                    <h4 className="text-white font-black text-xl italic tracking-tighter capitalize flex items-center gap-2">
                                                        {session.activityType || 'Travel'} 
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase not-italic">({formatDuration(session.durationSeconds)})</span>
                                                    </h4>
                                                    {session.steps > 0 && (
                                                        <p className="text-brand-400 text-[10px] font-black uppercase tracking-widest mt-1">{session.steps.toLocaleString()} Steps Captured</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-white font-black text-base italic">{(session.distanceMeters / 1000).toFixed(2)} KM</span>
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-500 transition-colors mt-2 ml-auto">
                                                        <i className="fa-solid fa-chevron-right text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
