
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
    
    const totalMinutes = seconds / 60;
    const paceMin = km > 0.01 ? Math.floor(totalMinutes / km) : 0;
    const paceSec = km > 0.01 ? Math.round(((totalMinutes / km) - paceMin) * 60) : 0;

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-fade-in touch-none overflow-hidden select-none">
            {/* Immersive Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className={`absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${isTracking ? 'bg-brand-500' : 'bg-slate-700'}`}></div>
                <div className={`absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-[120px] animate-pulse delay-1000 transition-colors duration-1000 ${isTracking ? 'bg-blue-600' : 'bg-slate-800'}`}></div>
            </div>

            <header className="p-8 flex justify-between items-center z-10 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none">
                        <span className={isTracking ? 'text-brand-500' : 'text-slate-500'}>{isTracking ? 'Live' : 'Ready'}</span> Path
                    </h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Manual Intelligence Mode</p>
                </div>
                {isTracking ? (
                    <div className="bg-slate-900 border border-white/5 px-6 py-2.5 rounded-2xl shadow-inner">
                        <span className="text-brand-500 text-sm font-black tabular-nums">{formatTime(seconds)}</span>
                    </div>
                ) : (
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center active:scale-90 transition-all border border-slate-700">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                <div className="relative scale-110 sm:scale-125">
                    <RadialProgress 
                        current={steps} 
                        total={settings.stepGoal} 
                        label={isTracking ? "Session Steps" : "Starting Line"} 
                        subLabel={isTracking ? "Keep Pushing Guru!" : "Tap Start to Record"} 
                        isActive={isTracking} 
                        lastStepTime={lastStepTime} 
                        onClick={!isTracking ? onStart : undefined}
                    />
                    
                    {/* Visual Pulse Ring */}
                    <div className={`absolute inset-[-30px] border-2 border-dashed rounded-full animate-spin-slow pointer-events-none transition-colors duration-1000 ${isTracking ? 'border-white/10' : 'border-white/5'}`}></div>
                </div>

                {isTracking ? (
                    <div className="w-full max-w-sm mt-16 grid grid-cols-3 gap-4 animate-fade-in">
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center shadow-xl">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Distance</p>
                            <p className="text-white font-black italic text-lg leading-none">{km.toFixed(2)}<small className="text-[10px] opacity-40 uppercase ml-1 not-italic">km</small></p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center shadow-xl">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Pace</p>
                            <p className="text-white font-black italic text-lg leading-none">{paceMin}'{paceSec.toString().padStart(2, '0')}"</p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl text-center shadow-xl">
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Energy</p>
                            <p className="text-orange-400 font-black italic text-lg leading-none">{kcal}<small className="text-[10px] opacity-40 uppercase ml-1 not-italic">kcal</small></p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-16 text-center animate-pulse">
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[5px]">Waiting for movement signature</p>
                    </div>
                )}

                <div className="mt-12 px-10 text-center min-h-[3rem] flex items-center justify-center">
                    <p className="text-brand-400/80 text-sm font-medium italic tracking-tight leading-relaxed max-w-xs mx-auto">
                        {isTracking ? `"${activePhrase}"` : '"Chalo Guru, jootey pehno aur nikal pado!"'}
                    </p>
                </div>
            </main>

            <footer className="p-10 shrink-0 z-10 flex flex-col items-center">
                {!isTracking ? (
                    <button 
                        onClick={onStart}
                        className="w-full py-6 rounded-[2.5rem] bg-gradient-to-tr from-brand-600 to-emerald-500 text-white font-black text-sm uppercase tracking-[8px] shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-95 transition-all border border-white/10"
                    >
                        Start Session
                    </button>
                ) : (
                    <button 
                        onClick={onFinish}
                        className="w-full py-6 rounded-[2.5rem] bg-gradient-to-tr from-red-600 to-orange-500 text-white font-black text-sm uppercase tracking-[8px] shadow-[0_20px_50px_rgba(220,38,38,0.3)] active:scale-95 transition-all border border-white/10"
                    >
                        Finish Session
                    </button>
                )}
                
                <div className="mt-8 flex items-center gap-3 opacity-30">
                    <div className={`w-1 h-1 rounded-full animate-pulse ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[4px]">
                        {isTracking ? 'Local Signature Recording Active' : 'Standby for Encryption'}
                    </span>
                    <div className={`w-1 h-1 rounded-full animate-pulse ${isTracking ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                </div>
            </footer>

            <style>{`
                .animate-spin-slow { animation: spin 20s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
