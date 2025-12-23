
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { RadialProgress } from './RadialProgress';

interface WalkingPortalProps {
    isOpen: boolean;
    onClose: () => void;
    isTracking: boolean;
    steps: number;
    settings: UserSettings;
    lastStepTime: number;
    onStart: () => void;
    onFinish: () => void;
}

const PHRASES = [
    "Arre Boss! Kadmo ki raftaar ek number hai!",
    "Chalte raho guru, stamina solid ban raha hai.",
    "Jakaas effort! Target door nahi.",
    "Kya baat hai! Raasta hi naap diya tune aaj.",
    "Energy toh dekho! Mausam bhi khush hai.",
    "Rukna mana hai! Keep that momentum."
];

export const WalkingPortal: React.FC<WalkingPortalProps> = ({ 
    isOpen, onClose, isTracking, steps, settings, lastStepTime, onStart, onFinish 
}) => {
    const [seconds, setSeconds] = useState(0);
    const [activePhrase, setActivePhrase] = useState(PHRASES[0]);

    useEffect(() => {
        let timer: number;
        if (isTracking && isOpen) {
            timer = window.setInterval(() => setSeconds(s => s + 1), 1000);
            if (seconds === 0) setActivePhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
        } else if (!isTracking) {
            setSeconds(0);
        }
        return () => clearInterval(timer);
    }, [isTracking, isOpen]);

    useEffect(() => {
        if (isTracking && seconds > 0 && seconds % 45 === 0) {
            setActivePhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
        }
    }, [seconds, isTracking]);

    if (!isOpen) return null;

    const km = (steps * settings.strideLengthCm) / 100000;
    const kcal = Math.round((steps * 0.04) * (settings.weightKg / 70));
    
    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-[#0a0f14] z-[200] flex flex-col animate-fade-in touch-none overflow-hidden select-none">
            {/* Immersive Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className={`absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[140px] animate-pulse transition-colors duration-1000 ${isTracking ? 'bg-brand-500' : 'bg-slate-700'}`}></div>
                <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[140px] animate-pulse delay-1000 transition-colors duration-1000 ${isTracking ? 'bg-blue-600' : 'bg-slate-800'}`}></div>
                
                {/* Accuracy/Tech Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:30px_30px]"></div>
            </div>

            <header className="p-8 flex justify-between items-center z-10 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none">
                        <span className={isTracking ? 'text-brand-500' : 'text-slate-500'}>{isTracking ? 'Live' : 'Ready'}</span> Walk
                    </h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Forensic Precision Mode</p>
                </div>
                
                <button 
                    onClick={onClose} 
                    className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex flex-col items-center justify-center active:scale-90 transition-all border border-slate-700 shadow-2xl group backdrop-blur-xl"
                >
                    <i className="fa-solid fa-xmark text-lg group-hover:text-white"></i>
                    <span className="text-[7px] font-black uppercase mt-1 opacity-50">{isTracking ? 'Finish' : 'Exit'}</span>
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
                {/* Accuracy Badge */}
                <div className="absolute top-0 flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-md">
                    <div className="flex gap-1 items-end h-3">
                        <div className="w-1 h-1.5 bg-emerald-500 rounded-full"></div>
                        <div className="w-1 h-2.5 bg-emerald-500 rounded-full"></div>
                        <div className={`w-1 h-3.5 bg-emerald-500 rounded-full ${isTracking ? 'animate-pulse' : ''}`}></div>
                    </div>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">High Signal Integrity</span>
                </div>

                <div className="relative scale-110 sm:scale-125 transition-transform duration-700">
                    <RadialProgress 
                        current={steps} 
                        total={settings.stepGoal} 
                        label={isTracking ? "Walk Steps" : "Ready Guru!"} 
                        subLabel={isTracking ? "Sensor Signature Captured" : "Tap Start to Record"} 
                        isActive={isTracking} 
                        lastStepTime={lastStepTime} 
                        onClick={!isTracking ? onStart : onFinish}
                    />
                    
                    {/* Visual Pulse Ring */}
                    <div className={`absolute inset-[-40px] border border-dashed rounded-full animate-spin-slow pointer-events-none transition-colors duration-1000 ${isTracking ? 'border-brand-500/20' : 'border-white/5'}`}></div>
                    {isTracking && (
                        <div className="absolute inset-[-60px] border border-brand-500/10 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '4s' }}></div>
                    )}
                </div>

                {isTracking ? (
                    <div className="w-full max-w-sm mt-20 grid grid-cols-3 gap-6 animate-fade-in">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] text-center shadow-2xl">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Distance</p>
                            <p className="text-white font-black italic text-2xl leading-none">{km.toFixed(2)}<small className="text-[12px] opacity-40 uppercase ml-1 not-italic">km</small></p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] text-center shadow-2xl ring-1 ring-brand-500/30">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Time</p>
                            <p className="text-brand-400 font-black italic text-2xl leading-none tabular-nums">{formatTime(seconds)}</p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] text-center shadow-2xl">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Energy</p>
                            <p className="text-orange-400 font-black italic text-2xl leading-none">{kcal}<small className="text-[12px] opacity-40 uppercase ml-1 not-italic">kcal</small></p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-20 text-center flex flex-col items-center">
                        <div className="w-16 h-1 bg-slate-800 rounded-full mb-4 overflow-hidden relative">
                             <div className="absolute inset-0 bg-brand-500 w-1/3 animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[5px]">Calibrating Motion Logic</p>
                    </div>
                )}

                <div className="mt-14 px-10 text-center min-h-[4rem] flex items-center justify-center">
                    <p className="text-brand-400/80 text-base font-medium italic tracking-tight leading-relaxed max-w-xs mx-auto drop-shadow-lg">
                        {isTracking ? `"${activePhrase}"` : '"Chalo Guru, ek bar Start tap karke dekho, mazza aayega!"'}
                    </p>
                </div>
            </main>

            <footer className="p-10 shrink-0 z-10 flex flex-col items-center bg-gradient-to-t from-[#0a0f14] to-transparent">
                {!isTracking ? (
                    <button 
                        onClick={onStart}
                        className="w-full max-w-sm py-7 rounded-[2.5rem] bg-gradient-to-tr from-brand-600 to-emerald-500 text-white font-black text-sm uppercase tracking-[8px] shadow-[0_25px_60px_rgba(16,185,129,0.4)] active:scale-95 transition-all border border-white/10 group"
                    >
                        <i className="fa-solid fa-play mr-2 group-hover:translate-x-1 transition-transform"></i>
                        Start Recording
                    </button>
                ) : (
                    <button 
                        onClick={onFinish}
                        className="w-full max-w-sm py-7 rounded-[2.5rem] bg-gradient-to-tr from-red-600 to-orange-500 text-white font-black text-sm uppercase tracking-[8px] shadow-[0_25px_60px_rgba(220,38,38,0.4)] active:scale-95 transition-all border border-white/10 group"
                    >
                        <i className="fa-solid fa-square mr-2 group-hover:scale-110 transition-transform"></i>
                        Finish & Save
                    </button>
                )}
                
                <div className="mt-10 flex items-center gap-4 opacity-30">
                    <div className="flex gap-1">
                        <div className={`w-1 h-1 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                        <div className={`w-1 h-1 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'} animate-pulse`}></div>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[4px]">
                        {isTracking ? 'Bio-Metric Stream Encrypted' : 'Standby for Signature'}
                    </span>
                    <div className="flex gap-1">
                        <div className={`w-1 h-1 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'} animate-pulse`}></div>
                        <div className={`w-1 h-1 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                    </div>
                </div>
            </footer>

            <style>{`
                .animate-spin-slow { animation: spin 20s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
            `}</style>
        </div>
    );
};
