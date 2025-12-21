
import React from 'react';
import { WalkSession } from '../types';
import { RouteMap } from './RouteMap';

interface DailyTimelineProps {
  sessions: WalkSession[];
  onViewDetails: (session: WalkSession) => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ sessions, onViewDetails }) => {
  if (sessions.length === 0) {
    return (
      <div className="w-full bg-slate-800/20 border-2 border-dashed border-slate-700/50 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center group hover:border-brand-500/30 transition-all">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:text-brand-500 transition-colors">
              <i className="fa-solid fa-map-location text-2xl"></i>
          </div>
          <h4 className="text-white font-black text-sm uppercase tracking-widest">No Path Recorded</h4>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-2">Your timeline is empty. Chalo, start walking!</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500">Today's Timeline</h3>
          <span className="text-[9px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full font-black border border-brand-500/20 uppercase tracking-widest">{sessions.length} Sessions</span>
      </div>

      <div className="relative space-y-8 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-brand-500 before:to-slate-800">
        {sessions.map((session, idx) => (
          <div key={session.id} className="relative pl-12 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
            {/* Timeline Indicator */}
            <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-slate-900 border-2 border-brand-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(76,175,80,0.3)]">
                <i className="fa-solid fa-shoe-prints text-brand-500 text-xs"></i>
            </div>

            {/* Card Content */}
            <div 
              onClick={() => onViewDetails(session)}
              className="bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] overflow-hidden hover:bg-slate-800/60 transition-all cursor-pointer group active:scale-[0.98] shadow-xl"
            >
              {/* Mini Map */}
              {session.route && session.route.length > 0 && (
                <div className="h-32 w-full relative pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                   <RouteMap route={session.route} className="h-full w-full" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                   <div className="absolute bottom-2 right-4 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest border border-white/5">
                      Path Traced
                   </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] text-brand-400 font-black uppercase tracking-widest mb-1">
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h4 className="text-white font-black text-lg italic tracking-tighter">
                        {session.steps.toLocaleString()} <span className="text-[10px] not-italic text-slate-500 font-bold uppercase tracking-widest ml-1">Steps</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-black text-sm italic">{(session.distanceMeters / 1000).toFixed(2)} KM</span>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Distance</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50">
                   <div className="flex items-center gap-2">
                      <i className="fa-solid fa-stopwatch text-slate-500 text-[10px]"></i>
                      <span className="text-[10px] text-slate-300 font-bold">{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <i className="fa-solid fa-fire text-orange-500 text-[10px]"></i>
                      <span className="text-[10px] text-slate-300 font-bold">{session.calories} kcal</span>
                   </div>
                   <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fa-solid fa-chevron-right text-brand-500 text-xs"></i>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
