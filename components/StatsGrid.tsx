import React from 'react';

interface StatsGridProps {
  calories: number;
  distance: number;
  duration: number; // seconds
  onStatClick: (type: 'calories' | 'distance' | 'time') => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ calories, distance, duration, onStatClick }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-between items-center bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-[2.5rem] p-4 w-full shadow-lg">
      
      <button 
        onClick={() => onStatClick('calories')}
        className="flex flex-col items-center flex-1 border-r border-slate-700/50 group"
      >
        <div className="flex items-center gap-2 mb-1">
           <i className="fa-solid fa-fire text-orange-500 text-xs"></i>
           <span className="text-xl font-black text-white italic tabular-nums leading-none">{calories}</span>
        </div>
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Kcal</span>
      </button>

      <button 
        onClick={() => onStatClick('distance')}
        className="flex flex-col items-center flex-1 border-r border-slate-700/50 group"
      >
        <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-route text-blue-500 text-xs"></i>
            <span className="text-xl font-black text-white italic tabular-nums leading-none">{(distance / 1000).toFixed(2)}</span>
        </div>
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Km</span>
      </button>

      <button 
        onClick={() => onStatClick('time')}
        className="flex flex-col items-center flex-1 group"
      >
        <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-stopwatch text-purple-500 text-xs"></i>
            <span className="text-xl font-black text-white italic tabular-nums leading-none">{formatTime(duration)}</span>
        </div>
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Time</span>
      </button>
      
    </div>
  );
};