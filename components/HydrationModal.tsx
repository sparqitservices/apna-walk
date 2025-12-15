import React, { useState, useEffect } from 'react';
import { HydrationLog } from '../types';

interface HydrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HydrationLog;
  onUpdate: (newData: HydrationLog) => void;
}

const DRINKS = [
    { id: 'sip', amount: 100, label: 'Sip', icon: 'fa-mug-hot' },
    { id: 'glass', amount: 250, label: 'Glass', icon: 'fa-glass-water' },
    { id: 'bottle', amount: 500, label: 'Bottle', icon: 'fa-bottle-water' },
    { id: 'jug', amount: 750, label: 'Sport', icon: 'fa-flask' },
];

export const HydrationModal: React.FC<HydrationModalProps> = ({ isOpen, onClose, data, onUpdate }) => {
  const [current, setCurrent] = useState(data.currentMl);
  const [goal, setGoal] = useState(data.goalMl);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
      setCurrent(data.currentMl);
      setGoal(data.goalMl);
  }, [data, isOpen]);

  const handleAdd = (amount: number) => {
      setAnimating(true);
      const newVal = current + amount;
      setCurrent(newVal);
      onUpdate({ ...data, currentMl: newVal, goalMl: goal });
      setTimeout(() => setAnimating(false), 800);
  };

  const handleGoalChange = (val: number) => {
      setGoal(val);
      onUpdate({ ...data, currentMl: current, goalMl: val });
  };

  if (!isOpen) return null;

  const percent = Math.min((current / goal) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center z-10 absolute top-0 left-0 right-0">
          <button 
            onClick={() => setShowGoalInput(!showGoalInput)}
            className="text-xs bg-slate-800/50 backdrop-blur px-3 py-1.5 rounded-full text-slate-300 border border-slate-700 hover:bg-slate-700"
          >
            <i className="fa-solid fa-bullseye mr-1"></i> Edit Goal
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800/50 text-slate-400 hover:text-white flex items-center justify-center backdrop-blur">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Visual Section */}
        <div className="relative h-72 bg-slate-900 flex items-center justify-center overflow-hidden">
            {/* Water Wave Animation */}
            <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-1000 ease-in-out opacity-80"
                style={{ height: `${percent}%` }}
            >
                <div className="absolute top-0 left-0 w-[200%] h-4 bg-blue-400 opacity-50 animate-wave rounded-full blur-sm -translate-y-1/2"></div>
                <div className="absolute top-0 left-0 w-[200%] h-4 bg-blue-300 opacity-30 animate-wave rounded-full blur-md -translate-y-1/2" style={{ animationDelay: '-1s' }}></div>
            </div>

            {/* Floating Bubbles */}
            {animating && (
                <>
                    <div className="absolute bottom-0 left-1/4 w-3 h-3 bg-white/30 rounded-full animate-[messagePop_1s_ease-out_forwards]"></div>
                    <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-white/20 rounded-full animate-[messagePop_1.2s_ease-out_forwards] delay-100"></div>
                    <div className="absolute bottom-0 left-3/4 w-2 h-2 bg-white/40 rounded-full animate-[messagePop_0.8s_ease-out_forwards] delay-75"></div>
                </>
            )}

            {/* Center Stats */}
            <div className="z-10 text-center relative">
                <div className="text-5xl font-bold text-white drop-shadow-md tabular-nums">
                    {current}<span className="text-lg font-medium text-slate-300 ml-1">ml</span>
                </div>
                <div className="text-sm text-slate-200 mt-1 font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm inline-block">
                    Goal: {goal}ml
                </div>
            </div>
        </div>

        {/* Controls Section */}
        <div className="bg-dark-card p-6 border-t border-slate-800 flex-1 overflow-y-auto">
            
            {showGoalInput && (
                <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700 animate-message-pop">
                    <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Set Daily Goal (ml)</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" 
                            min="1000" 
                            max="5000" 
                            step="250"
                            value={goal}
                            onChange={(e) => handleGoalChange(Number(e.target.value))}
                            className="flex-1 accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-white font-mono font-bold w-16 text-right">{goal}</span>
                    </div>
                </div>
            )}

            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Quick Add</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                {DRINKS.map((d) => (
                    <button
                        key={d.id}
                        onClick={() => handleAdd(d.amount)}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 transition-all active:scale-95 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <i className={`fa-solid ${d.icon}`}></i>
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold text-sm">+{d.amount}ml</div>
                            <div className="text-slate-500 text-xs">{d.label}</div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
                 <button 
                    onClick={() => {
                        if(confirm('Reset today\'s hydration?')) {
                            onUpdate({ ...data, currentMl: 0, goalMl: goal });
                            setCurrent(0);
                        }
                    }}
                    className="hover:text-red-400 transition-colors flex items-center gap-1"
                 >
                     <i className="fa-solid fa-rotate-left"></i> Reset
                 </button>
                 <span>Stay hydrated! 💧</span>
            </div>
        </div>
      </div>
    </div>
  );
};