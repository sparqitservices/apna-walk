import React from 'react';

interface StatsGridProps {
  calories: number;
  distance: number;
  duration: number; // seconds
  onStatClick: (type: 'calories' | 'distance' | 'time') => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ calories, distance, duration, onStatClick }) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-md mx-auto mb-6">
      
      <button 
        onClick={() => onStatClick('calories')}
        className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800 transition-all active:scale-95 group"
      >
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
           <i className="fa-solid fa-fire text-orange-500 text-xl"></i>
        </div>
        <span className="text-xl font-bold text-dark-text group-hover:text-white transition-colors">{calories}</span>
        <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Kcal</span>
      </button>

      <button 
        onClick={() => onStatClick('distance')}
        className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all active:scale-95 group"
      >
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-route text-blue-500 text-xl"></i>
        </div>
        <span className="text-xl font-bold text-dark-text group-hover:text-white transition-colors">{(distance / 1000).toFixed(2)}</span>
        <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Km</span>
      </button>

      <button 
        onClick={() => onStatClick('time')}
        className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 transition-all active:scale-95 group"
      >
        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-stopwatch text-purple-500 text-xl"></i>
        </div>
        <span className="text-xl font-bold text-dark-text group-hover:text-white transition-colors">{formatTime(duration)}</span>
        <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Time</span>
      </button>
      
    </div>
  );
};