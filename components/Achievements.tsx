
import React from 'react';
import { Badge } from '../types';

interface AchievementsProps {
  totalSteps: number;
  earnedBadges: Badge[];
}

export const Achievements: React.FC<AchievementsProps> = ({ totalSteps, earnedBadges }) => {
  // Standard hardcoded milestones with Desi flavor
  const milestones = [
    { id: 'm1', limit: 1000, icon: "fa-shoe-prints", title: "Shuruaat", color: "text-blue-400" },
    { id: 'm2', limit: 5000, icon: "fa-person-running", title: "Raftaar", color: "text-brand-400" },
    { id: 'm3', limit: 10000, icon: "fa-fire", title: "Josh", color: "text-orange-400" },
    { id: 'm4', limit: 25000, icon: "fa-medal", title: "Maharathi", color: "text-purple-400" },
  ];

  const specialCount = earnedBadges.length;

  return (
    <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] p-6 group transition-all hover:bg-slate-800/60 shadow-2xl relative overflow-hidden">
        
        {/* Background Accent Animation */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl text-brand-500 rotate-12 pointer-events-none transition-all duration-700 group-hover:scale-125">
            <i className="fa-solid fa-medal"></i>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start relative z-10 mb-8">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[1.5rem] bg-slate-900 border border-white/5 flex items-center justify-center text-brand-400 shadow-inner transition-transform group-hover:rotate-12">
                    <i className="fa-solid fa-trophy text-xl"></i>
                </div>
                <div>
                    <h3 className="text-white font-black text-xl italic tracking-tighter uppercase">Glory & Badges</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[3px] mt-1">Subject Achievements</p>
                </div>
            </div>
            {specialCount > 0 && (
                <div className="bg-brand-500 text-white font-black text-[9px] px-3 py-1.5 rounded-xl shadow-lg border border-white/20 animate-pulse">
                    {specialCount} SPECIAL UNLOCKED
                </div>
            )}
        </div>

        {/* Milestones Row */}
        <div className="grid grid-cols-4 gap-3 relative z-10 mb-8">
            {milestones.map((badge) => {
                const unlocked = totalSteps >= badge.limit;
                return (
                    <div key={badge.id} className="flex flex-col items-center">
                        <div className={`w-full aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${unlocked ? `bg-slate-900 ${badge.color} border-brand-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]` : 'bg-slate-950/40 text-slate-800 border-slate-800'}`}>
                            <i className={`fa-solid ${badge.icon} ${unlocked ? 'text-lg' : 'text-sm'}`}></i>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest mt-2 text-center leading-tight ${unlocked ? 'text-white' : 'text-slate-700'}`}>
                            {badge.title}
                        </span>
                    </div>
                );
            })}
        </div>

        {/* Special AI Badges Grid (Small Icons if any) */}
        {earnedBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                {earnedBadges.map((badge) => (
                    <div key={badge.id} className="w-8 h-8 rounded-lg bg-slate-900 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs shadow-lg hover:scale-110 transition-transform cursor-help" title={badge.description}>
                        <i className={`fa-solid ${badge.icon}`}></i>
                    </div>
                ))}
            </div>
        )}

        {/* Footer/Status Section */}
        <div className="pt-6 border-t border-white/5 relative z-10">
            <p className="text-xs text-slate-300 font-medium italic mb-2">
                {totalSteps >= 10000 ? '"Jhandey gaad diye, guru! Agla milestone door nahi."' : '"Dheere dheere hi sahi, par kadam rukne nahi chahiye."'}
            </p>
            <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-600 font-black uppercase tracking-[4px]">Verified Hall of Fame</span>
                <div className="flex items-center gap-2 text-brand-400">
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        {totalSteps.toLocaleString()} Steps LifeTime
                    </span>
                    <i className="fa-solid fa-chevron-right text-[8px]"></i>
                </div>
            </div>
        </div>
    </div>
  );
};
