import React from 'react';

interface StatsGridProps {
  calories: number;
  distance: number;
  duration: number; // seconds
}

export const StatsGrid: React.FC<StatsGridProps> = ({ calories, distance, duration }) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-md mx-auto mb-6">
      <div className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800">
        <i className="fa-solid fa-fire text-orange-500 text-xl mb-2"></i>
        <span className="text-xl font-bold text-dark-text">{calories}</span>
        <span className="text-xs text-dark-muted">Kcal</span>
      </div>
      <div className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800">
        <i className="fa-solid fa-route text-blue-500 text-xl mb-2"></i>
        <span className="text-xl font-bold text-dark-text">{(distance / 1000).toFixed(2)}</span>
        <span className="text-xs text-dark-muted">Km</span>
      </div>
      <div className="bg-dark-card p-4 rounded-2xl flex flex-col items-center border border-slate-800">
        <i className="fa-solid fa-stopwatch text-purple-500 text-xl mb-2"></i>
        <span className="text-xl font-bold text-dark-text">{formatTime(duration)}</span>
        <span className="text-xs text-dark-muted">Time</span>
      </div>
    </div>
  );
};