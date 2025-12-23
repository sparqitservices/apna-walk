
import React from 'react';
import { WeatherData } from '../types';
import { getWeatherIcon, getAQIStatus } from '../services/weatherService';

interface WeatherDetailedModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData | null;
}

export const WeatherDetailedModal: React.FC<WeatherDetailedModalProps> = ({ isOpen, onClose, weather }) => {
  if (!isOpen || !weather) return null;

  const { icon, label, color } = getWeatherIcon(weather.weatherCode, weather.isDay);
  const aqiInfo = weather.aqi !== undefined ? getAQIStatus(weather.aqi) : null;
  const aqiPercent = weather.aqi ? Math.min((weather.aqi / 300) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-0 sm:p-4 animate-fade-in">
       <div className="bg-[#0a0f14] w-full max-w-lg h-full sm:h-auto sm:rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative flex flex-col">
          
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40 shrink-0">
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${color} border border-white/5`}>
                   <i className={`fa-solid ${icon} text-xl`}></i>
                </div>
                <div>
                   <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic leading-none">Local Radar</h2>
                   <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mt-1">Environment Vitals</p>
                </div>
             </div>
             <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-90">
               <i className="fa-solid fa-xmark"></i>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className={`p-10 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b ${weather.isDay ? 'from-orange-500/10 to-transparent' : 'from-blue-900/20 to-transparent'}`}>
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] opacity-20 ${color.replace('text-', 'bg-')}`}></div>

                  <div className={`text-9xl mb-6 ${color} drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10 animate-breathing`}>
                      <i className={`fa-solid ${icon}`}></i>
                  </div>
                  
                  <div className="relative z-10 text-center">
                    <h2 className="text-8xl font-black text-white italic tracking-tighter leading-none">{Math.round(weather.temperature)}°</h2>
                    <p className={`text-xl font-black uppercase tracking-[5px] mt-4 ${color}`}>{label}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-sm">
                       <div className="flex flex-col items-center p-5 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-md">
                           <i className="fa-solid fa-wind text-slate-500 mb-2 text-lg"></i>
                           <span className="text-white font-black italic text-xl">{weather.windSpeed}<small className="text-[10px] ml-1 opacity-50 not-italic">km/h</small></span>
                           <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Wind Speed</span>
                       </div>
                       <div className="flex flex-col items-center p-5 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-md">
                           <i className="fa-solid fa-droplet text-blue-500 mb-2 text-lg"></i>
                           <span className="text-white font-black italic text-xl">45<small className="text-[10px] ml-1 opacity-50 not-italic">%</small></span>
                           <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Humidity</span>
                       </div>
                  </div>
              </div>

              <div className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20"><i className="fa-solid fa-lungs text-xs"></i></div>
                      <h3 className="text-white font-black text-xs uppercase tracking-[3px]">Air Quality Intel</h3>
                  </div>
                  
                  {weather.aqi !== undefined && aqiInfo ? (
                      <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                          <div className="flex justify-between items-center mb-6">
                              <div className="flex flex-col">
                                  <span className={`text-5xl font-black italic tracking-tighter ${aqiInfo.color}`}>{weather.aqi}</span>
                                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-[3px] mt-1">US AQI Standard</span>
                              </div>
                              <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest ${aqiInfo.color.replace('text', 'border')} ${aqiInfo.color.replace('text', 'bg')}/10 shadow-lg`}>
                                  {aqiInfo.label}
                              </div>
                          </div>
                          
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative mb-4">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
                              <div className="absolute top-0 bottom-0 bg-white w-1 shadow-[0_0_10px_white] transition-all duration-1000" style={{ left: `${aqiPercent}%` }}></div>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic">
                              {weather.aqi <= 50 ? "Jakaas mausam hai! Go for a long walk guru." :
                               weather.aqi <= 100 ? "Theek hai, but sensitive ho toh dhyan rakhna." :
                               "Hawa thodi heavy hai. Mask pehno ya ghar pe tehel lo."}
                          </p>
                      </div>
                  ) : (
                      <div className="text-center text-slate-500 py-4 italic uppercase text-[10px] font-black tracking-widest">Data Encrypted</div>
                  )}
              </div>
          </div>

          <div className="p-8 bg-slate-900/50 border-t border-white/5 flex flex-col gap-4 shrink-0">
                <button onClick={onClose} className="w-full py-5 rounded-[2rem] bg-white text-slate-900 font-black uppercase tracking-[5px] text-xs shadow-2xl active:scale-95 transition-all">Understood</button>
                <p className="text-center text-[8px] text-slate-600 font-black uppercase tracking-[4px]">Powered by Open-Meteo & Gemini AI</p>
          </div>
       </div>
    </div>
  );
};
