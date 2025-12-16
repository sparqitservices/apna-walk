import React from 'react';
import { RoutePoint } from '../types';
import { RouteMap } from './RouteMap';

interface StatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'calories' | 'distance' | 'time' | null;
  data: {
      calories: number;
      distance: number; // meters
      duration: number; // seconds
      steps: number;
  };
  route: RoutePoint[];
}

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({ isOpen, onClose, type, data, route }) => {
  if (!isOpen || !type) return null;

  // Food equivalent logic
  const FOODS = [
      { name: 'Samosa', cal: 250, icon: '🥟' },
      { name: 'Gulab Jamun', cal: 150, icon: '🟤' },
      { name: 'Cup of Chai', cal: 100, icon: '☕' },
      { name: 'Banana', cal: 100, icon: '🍌' },
      { name: 'Slice of Pizza', cal: 280, icon: '🍕' }
  ];

  const getFoodEquivalent = (cal: number) => {
      const match = FOODS.find(f => cal >= f.cal) || FOODS[2]; // Default to chai
      const count = (cal / match.cal).toFixed(1);
      return { ...match, count };
  };

  const renderContent = () => {
    switch (type) {
        case 'calories':
            const food = getFoodEquivalent(data.calories);
            return (
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto border-4 border-orange-500/20">
                        <i className="fa-solid fa-fire text-5xl text-orange-500 animate-pulse"></i>
                    </div>
                    <div>
                        <h2 className="text-6xl font-black text-white tabular-nums">{data.calories}</h2>
                        <p className="text-orange-400 font-bold uppercase tracking-widest mt-1">Calories Burned</p>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-4">Equivalent To</p>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-5xl" role="img" aria-label={food.name}>{food.icon}</span>
                            <div className="text-left">
                                <span className="block text-2xl font-bold text-white">{food.count}</span>
                                <span className="text-slate-400 text-sm">{food.name}s</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 italic">Keep walking to burn that extra treat!</p>
                    </div>
                </div>
            );

        case 'distance':
            return (
                <div className="space-y-6">
                    <div className="text-center">
                         <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto border-4 border-blue-500/20 mb-4">
                            <i className="fa-solid fa-route text-5xl text-blue-500"></i>
                        </div>
                        <h2 className="text-5xl font-black text-white tabular-nums">{(data.distance / 1000).toFixed(2)}</h2>
                        <p className="text-blue-400 font-bold uppercase tracking-widest text-sm">Kilometers</p>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                         {route.length > 1 ? (
                             <div className="relative">
                                 <RouteMap route={route} className="h-48 w-full rounded-xl" />
                                 <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white">
                                     Live GPS Path
                                 </div>
                             </div>
                         ) : (
                             <div className="h-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                                 <i className="fa-solid fa-satellite-dish text-2xl mb-2 opacity-50"></i>
                                 <p className="text-xs">No GPS route recorded yet</p>
                                 <p className="text-[10px] opacity-70">Start a workout to map your walk</p>
                             </div>
                         )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
                             <span className="block text-xl font-bold text-white">{data.steps.toLocaleString()}</span>
                             <span className="text-[10px] text-slate-400 uppercase">Total Steps</span>
                         </div>
                         <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
                             <span className="block text-xl font-bold text-white">{(data.distance * 0.762 / 1000 * 1312).toFixed(0)}</span>
                             <span className="text-[10px] text-slate-400 uppercase">~Yards</span>
                         </div>
                    </div>
                </div>
            );

        case 'time':
            const hrs = Math.floor(data.duration / 3600);
            const mins = Math.floor((data.duration % 3600) / 60);
            const secs = data.duration % 60;
            const timeStr = hrs > 0 
                ? `${hrs}h ${mins}m` 
                : `${mins}m ${secs}s`;
            
            // Calculate Pace (min/km)
            const km = data.distance / 1000;
            let pace = "0'00\"";
            if (km > 0.1) {
                const totalMins = data.duration / 60;
                const paceMin = Math.floor(totalMins / km);
                const paceSec = Math.round((totalMins / km - paceMin) * 60);
                pace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
            }

            return (
                <div className="space-y-6 text-center">
                    <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto border-4 border-purple-500/20 mb-4 relative">
                        <i className="fa-solid fa-stopwatch text-5xl text-purple-500"></i>
                        <div className="absolute inset-0 rounded-full border-t-4 border-purple-500 animate-spin" style={{ animationDuration: '3s' }}></div>
                    </div>
                    
                    <div>
                        <h2 className="text-5xl font-black text-white tabular-nums">{timeStr}</h2>
                        <p className="text-purple-400 font-bold uppercase tracking-widest text-sm">Active Duration</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                             <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Avg Pace</span>
                             <span className="text-2xl font-bold text-white">{pace}</span>
                             <span className="text-[10px] text-slate-500 block">/ km</span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                             <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Start Time</span>
                             <span className="text-2xl font-bold text-white">
                                 {data.duration > 0 
                                    ? new Date(Date.now() - data.duration * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                    : '--:--'}
                             </span>
                        </div>
                    </div>
                    
                    <div className="bg-purple-900/20 p-3 rounded-xl border border-purple-500/30 text-xs text-purple-200">
                        <i className="fa-solid fa-bolt mr-1"></i> Consistent pace builds better stamina.
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
        <div className="bg-dark-card w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden animate-message-pop">
             {/* Header */}
             <div className="absolute top-4 right-4 z-10">
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                    <i className="fa-solid fa-xmark"></i>
                </button>
             </div>

             <div className="p-8">
                 {renderContent()}
             </div>
        </div>
    </div>
  );
};