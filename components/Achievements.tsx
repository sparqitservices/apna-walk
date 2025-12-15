import React from 'react';
import { Badge } from '../types';

interface AchievementsProps {
  totalSteps: number;
  earnedBadges: Badge[];
}

export const Achievements: React.FC<AchievementsProps> = ({ totalSteps, earnedBadges }) => {
  // Standard hardcoded milestones
  const milestones = [
    { id: 'm1', limit: 1000, icon: "fa-shoe-prints", title: "First Steps", color: "text-blue-400" },
    { id: 'm2', limit: 5000, icon: "fa-person-running", title: "Go Getter", color: "text-brand-400" },
    { id: 'm3', limit: 10000, icon: "fa-fire", title: "Calorie Burner", color: "text-orange-400" },
    { id: 'm4', limit: 25000, icon: "fa-medal", title: "Pro Walker", color: "text-purple-400" },
  ];

  return (
    <div className="w-full max-w-md bg-dark-card p-6 rounded-3xl border border-slate-800 mb-6">
       <div className="flex items-center gap-2 mb-4">
            <h3 className="font-bold text-white">Your Achievements</h3>
            {earnedBadges.length > 0 && (
                <span className="bg-brand-500/20 text-brand-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-500/30">
                    {earnedBadges.length} Special
                </span>
            )}
       </div>
       
       {/* Milestones Row */}
       <div className="flex justify-between mb-6 pb-6 border-b border-slate-700/50">
          {milestones.map((badge) => {
             const unlocked = totalSteps >= badge.limit;
             return (
                <div key={badge.id} className="flex flex-col items-center w-1/4">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 transition-all duration-500 ${unlocked ? `bg-slate-800 ${badge.color} border-${badge.color.split('-')[1]}-500 shadow-lg` : 'bg-slate-900 text-slate-700 border-slate-800'}`}>
                      <i className={`fa-solid ${badge.icon} text-lg`}></i>
                   </div>
                   <span className={`text-[10px] font-bold text-center leading-tight ${unlocked ? 'text-slate-200' : 'text-slate-600'}`}>{badge.title}</span>
                </div>
             );
          })}
       </div>

       {/* AI Badges Grid */}
       {earnedBadges.length > 0 ? (
           <div className="grid grid-cols-4 gap-4">
               {earnedBadges.map((badge) => (
                   <div key={badge.id} className="flex flex-col items-center group relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700 mb-2 shadow-md group-hover:scale-110 transition-transform`}>
                             <i className={`fa-solid ${badge.icon} ${badge.color} text-xl`}></i>
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 text-center leading-tight truncate w-full">{badge.title}</span>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                            <p className="font-bold text-white mb-1">{badge.title}</p>
                            <p>{badge.description}</p>
                            <p className="text-slate-500 mt-1">{new Date(badge.dateEarned).toLocaleDateString()}</p>
                        </div>
                   </div>
               ))}
           </div>
       ) : (
           <div className="text-center py-2">
               <p className="text-xs text-slate-500 italic">Keep walking to unlock secret AI badges!</p>
           </div>
       )}
    </div>
  );
};