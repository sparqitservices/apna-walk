
import React from 'react';
import { WalkSession } from '../types';
import { RouteMap } from './RouteMap';

interface SessionDetailModalProps {
    session: WalkSession | null;
    onClose: () => void;
    onShare: (session: WalkSession) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, onClose, onShare }) => {
    if (!session) return null;

    const km = (session.distanceMeters / 1000).toFixed(2);
    const paceMin = km !== '0.00' ? Math.floor((session.durationSeconds / 60) / parseFloat(km)) : 0;
    const paceSec = km !== '0.00' ? Math.round(((session.durationSeconds / 60) / parseFloat(km) - paceMin) * 60) : 0;

    const getActivityLabel = (type?: string) => {
        switch(type) {
            case 'cycling': return 'Cycling Expedition';
            case 'driving': return 'Driving Route';
            default: return 'Walking Path';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-0 sm:p-4">
            <div className="bg-[#0a0f14] w-full max-w-2xl h-full sm:h-[94vh] sm:rounded-[3.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Immersive Map Header */}
                <div className="h-2/5 w-full relative bg-slate-900 shrink-0">
                    <RouteMap route={session.route || []} className="h-full w-full opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14] via-transparent to-transparent"></div>
                    
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                        <button onClick={onClose} className="w-12 h-12 rounded-[1.2rem] bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <button onClick={() => onShare(session)} className="w-12 h-12 rounded-[1.2rem] bg-brand-600 border border-brand-400 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                            <i className="fa-solid fa-share-nodes"></i>
                        </button>
                    </div>

                    <div className="absolute bottom-8 left-10">
                        <p className="text-brand-400 text-[10px] font-black uppercase tracking-[5px] mb-2">{getActivityLabel(session.activityType)}</p>
                        <h2 className="text-white text-4xl font-black italic tracking-tighter uppercase">
                            {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Session
                        </h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                    
                    {/* Core Matrix */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-slate-800/20 p-6 rounded-[2.5rem] border border-slate-800/50 flex flex-col items-center">
                            <i className={`fa-solid ${session.activityType === 'cycling' ? 'fa-bicycle' : session.activityType === 'driving' ? 'fa-car' : 'fa-shoe-prints'} text-brand-500 mb-3 text-xl`}></i>
                            <span className="text-3xl font-black text-white italic tabular-nums">
                                {session.activityType === 'walking' ? session.steps.toLocaleString() : (session.avgSpeed || 0).toFixed(1)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">
                                {session.activityType === 'walking' ? 'Steps Captured' : 'Avg km/h'}
                            </span>
                        </div>
                        <div className="bg-slate-800/20 p-6 rounded-[2.5rem] border border-slate-800/50 flex flex-col items-center">
                            <i className="fa-solid fa-route text-blue-500 mb-3 text-xl"></i>
                            <span className="text-3xl font-black text-white italic tabular-nums">{km}</span>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Kilometers</span>
                        </div>
                    </div>

                    {/* Performance Engine */}
                    <div className="bg-slate-800/30 p-8 rounded-[3rem] border border-white/5 shadow-inner">
                        <h3 className="text-[9px] font-black uppercase tracking-[4px] text-slate-500 mb-8 text-center">Performance Analytics</h3>
                        <div className="flex justify-between items-center px-4">
                            <div className="text-center">
                                <p className="text-2xl font-black text-white tabular-nums italic">{Math.floor(session.durationSeconds / 60)}:{(session.durationSeconds % 60).toString().padStart(2, '0')}</p>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Duration</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700/50"></div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-brand-400 tabular-nums italic">{(session.avgSpeed || 0).toFixed(1)}</p>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Avg Speed</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700/50"></div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-orange-500 tabular-nums italic">{session.calories || 0}</p>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Burn (Kcal)</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Coach Road Story */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                                <i className="fa-solid fa-robot"></i>
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[3px] text-white">Coach's Path Report</h3>
                        </div>
                        <div className="bg-gradient-to-br from-brand-900/20 to-slate-900 p-8 rounded-[2.5rem] border border-brand-500/20 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl text-brand-500 rotate-12 pointer-events-none italic font-black uppercase">VOICE</div>
                            <p className="text-slate-300 leading-relaxed font-medium italic">
                                {session.activityType === 'driving' ? 
                                    `"Arre Boss! Aaj toh gaddi bhagai hai! Drive careful rakha kar guru. Location history mein record ho gaya hai safely."` :
                                 session.activityType === 'cycling' ?
                                    `"Cyclist mode on! ${km}km ki riding solid thi. Stamina boost ho raha hai. Sab private hai tension mat le!"` :
                                    `"Arre Boss! Aaj toh tune rasta naap diya! ${(parseFloat(km) > 1) ? 'Long walk consistent thi, stamina ek number hai.' : 'Short break tha but momentum maintain raha.'} Ek number effort guru."`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-900/50 border-t border-white/5 shrink-0">
                    <button onClick={onClose} className="w-full py-6 rounded-[2rem] bg-white text-slate-900 font-black uppercase tracking-[5px] text-xs shadow-2xl active:scale-95 transition-all">Close Forensic</button>
                </div>
            </div>
        </div>
    );
};
