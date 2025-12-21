
import React, { useState, useMemo } from 'react';
import { WalkSession, DailyHistory } from '../types';
import { RouteMap } from './RouteMap';

interface DailyTimelineProps {
  history: DailyHistory[];
  onViewDetails: (session: WalkSession) => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ history, onViewDetails }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const activeDay = useMemo(() => {
    return history.find(h => h.date === selectedDate) || { date: selectedDate, steps: 0, sessions: [] };
  }, [history, selectedDate]);

  const sortedSessions = useMemo(() => {
    return [...(activeDay.sessions || [])].sort((a, b) => b.startTime - a.startTime);
  }, [activeDay.sessions]);

  // Generate last 7 days for the picker
  const dateStrip = useMemo(() => {
      return Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const iso = d.toISOString().split('T')[0];
          return {
              iso,
              day: d.toLocaleDateString('en-US', { weekday: 'short' }),
              date: d.getDate()
          };
      });
  }, []);

  return (
    <div className="w-full space-y-8">
      {/* Pulse Date Strip */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
          {dateStrip.map((item) => (
              <button
                key={item.iso}
                onClick={() => setSelectedDate(item.iso)}
                className={`flex flex-col items-center min-w-[60px] py-4 rounded-2xl transition-all border-2 ${
                    selectedDate === item.iso 
                    ? 'bg-brand-500 border-brand-400 text-white shadow-lg shadow-brand-500/20 scale-105' 
                    : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1">{item.day}</span>
                  <span className="text-lg font-black italic">{item.date}</span>
              </button>
          ))}
      </div>

      <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500">Activity Timeline</h3>
              <p className="text-white font-black text-xs mt-1 italic tracking-tighter">
                {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </p>
          </div>
          <div className="text-right">
              <div className="text-xl font-black text-brand-500 italic tracking-tighter">{activeDay.steps.toLocaleString()}</div>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Total Steps</p>
          </div>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="w-full bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center group">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-700 mb-4">
                <i className="fa-solid fa-map-location-dot text-2xl"></i>
            </div>
            <h4 className="text-slate-500 font-black text-xs uppercase tracking-[4px]">No Paths Found</h4>
            <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-2">Recording is automatic. Keep walking!</p>
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-brand-500 before:to-slate-900">
          {sortedSessions.map((session, idx) => (
            <div key={session.id} className="relative pl-12 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-slate-900 border-2 border-brand-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(76,175,80,0.3)]">
                  <i className={`fa-solid ${session.id.startsWith('auto') ? 'fa-bolt' : 'fa-person-walking'} text-brand-500 text-xs`}></i>
              </div>

              <div 
                onClick={() => onViewDetails(session)}
                className="bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] overflow-hidden hover:bg-slate-800/60 transition-all cursor-pointer group active:scale-[0.98] shadow-xl"
              >
                {session.route && session.route.length > 0 && (
                  <div className="h-32 w-full relative pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                     <RouteMap route={session.route} className="h-full w-full" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                     <div className="absolute bottom-2 right-4 bg-brand-500/90 backdrop-blur px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-[2px]">
                        Auto-Traced
                     </div>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] text-brand-400 font-black uppercase tracking-widest mb-1">
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <h4 className="text-white font-black text-2xl italic tracking-tighter">
                          {session.steps.toLocaleString()} <span className="text-[10px] not-italic text-slate-500 font-bold uppercase tracking-widest ml-1">Steps</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-black text-lg italic">{(session.distanceMeters / 1000).toFixed(2)} KM</span>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Captured</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-slate-700/50">
                     <div className="flex items-center gap-2">
                        <i className="fa-solid fa-clock text-slate-500 text-[10px]"></i>
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">{Math.floor(session.durationSeconds / 60)}m duration</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <i className="fa-solid fa-fire text-orange-500 text-[10px]"></i>
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">{session.calories} kcal</span>
                     </div>
                     <div className="ml-auto">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-500 group-hover:bg-brand-500/10 transition-all">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
