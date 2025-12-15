import React, { useMemo } from 'react';
import { WeeklyPlan, DailyWorkoutPlan } from '../types';

interface ActivePlanCardProps {
  plan: WeeklyPlan;
  onRemove: () => void;
}

export const ActivePlanCard: React.FC<ActivePlanCardProps> = ({ plan, onRemove }) => {
  const planState = useMemo(() => {
    const start = new Date(plan.createdAt);
    const now = new Date();
    
    // Calculate difference in days (0-indexed)
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    
    const isCompleted = diffDays >= 7;
    const currentDayIndex = Math.min(diffDays, 6); // Cap at last day if not completed logic
    const currentDay: DailyWorkoutPlan = plan.schedule[currentDayIndex];
    
    return { currentDay, isCompleted, dayNumber: currentDayIndex + 1 };
  }, [plan]);

  const { currentDay, isCompleted, dayNumber } = planState;

  const getIntensityColor = (level: string) => {
    switch(level) {
        case 'High': return 'text-red-400 border-red-500/30 bg-red-500/10';
        case 'Medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
        default: return 'text-green-400 border-green-500/30 bg-green-500/10';
    }
  };

  return (
    <div className="w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-3xl mb-6 shadow-xl relative overflow-hidden group">
        
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl text-brand-500 rotate-12 pointer-events-none">
             <i className="fa-solid fa-calendar-check"></i>
        </div>

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    Active Plan
                </span>
                <h3 className="text-white font-bold text-lg mt-1">{plan.goal}</h3>
            </div>
            <button 
                onClick={() => {
                    if(confirm("Stop current plan?")) onRemove();
                }}
                className="text-slate-500 hover:text-red-400 transition-colors text-xs"
            >
                <i className="fa-solid fa-trash"></i>
            </button>
        </div>

        {isCompleted ? (
            <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-green-400 text-2xl animate-bounce">
                    <i className="fa-solid fa-trophy"></i>
                </div>
                <h4 className="text-white font-bold text-lg">Plan Completed!</h4>
                <p className="text-slate-400 text-sm mb-4">You've finished your 7-day schedule.</p>
                <button 
                    onClick={onRemove}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-full transition-all text-sm"
                >
                    Start New Plan
                </button>
            </div>
        ) : (
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-bold uppercase">Day {dayNumber} of 7</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${getIntensityColor(currentDay.intensity)}`}>
                        {currentDay.intensity}
                    </span>
                </div>
                
                <h4 className="text-white font-bold text-xl mb-1">{currentDay.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">{currentDay.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                        <i className="fa-regular fa-clock text-brand-500"></i>
                        {currentDay.durationMinutes} mins
                    </div>
                    <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-person-running text-blue-500"></i>
                        {currentDay.type}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
