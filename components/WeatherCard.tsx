import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { getWeatherIcon, getAQIStatus } from '../services/weatherService';

interface WeatherCardProps {
  weather: WeatherData | null;
  loading: boolean;
  onRefresh?: () => void;
  onClick?: () => void;
}

const getCardinalDirection = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading, onRefresh, onClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="w-full max-w-md h-full min-h-[300px] bg-dark-card border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-center">
        <div className="flex items-center gap-5 w-full animate-pulse">
            <div className="w-16 h-16 rounded-full bg-slate-800 shrink-0"></div>
            <div className="flex-1 space-y-4">
                <div className="h-10 w-24 bg-slate-800 rounded-md"></div>
                <div className="h-4 w-32 bg-slate-800 rounded-md"></div>
                <div className="h-3 w-20 bg-slate-800 rounded-md"></div>
            </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const { icon, label, color } = getWeatherIcon(weather.weatherCode, weather.isDay);
  const aqiInfo = weather.aqi !== undefined ? getAQIStatus(weather.aqi) : null;

  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md h-full min-h-[300px] bg-gradient-to-br from-dark-card to-slate-900 border border-slate-700 p-6 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.98]"
    >
        {/* Background Accent */}
        <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10 blur-3xl transition-colors duration-1000 ${color.replace('text-', 'bg-')}`}></div>

        <div className="flex justify-between items-start z-10 w-full">
            <div>
                <div className="flex items-start">
                    <span className="text-6xl font-black text-white tracking-tighter leading-none">{Math.round(weather.temperature)}°</span>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                     <div className={`text-sm font-bold uppercase tracking-wide ${color}`}>{label}</div>
                     {weather.aqi !== undefined && aqiInfo && (
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600 bg-slate-800/50 ${aqiInfo.color}`}>
                                AQI {weather.aqi}
                            </span>
                        </div>
                     )}
                </div>
            </div>
            
            <div className={`text-6xl ${color} drop-shadow-xl transform group-hover:scale-110 transition-transform duration-500`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
        </div>
        
        <div className="z-10 w-full mt-6">
            <div className="w-full h-px bg-slate-700/50 mb-4"></div>
            
            <div className="flex justify-between items-end">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                        <span className="w-5 flex justify-center"><i className="fa-solid fa-wind text-brand-500"></i></span>
                        <span>{weather.windSpeed} km/h {weather.windDirection !== undefined && getCardinalDirection(weather.windDirection)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <span className="w-5 flex justify-center"><i className="fa-regular fa-clock text-blue-400"></i></span>
                        <span>{dateStr} • {timeStr}</span>
                    </div>
                </div>
                
                <span className="text-brand-400 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 uppercase tracking-wider">
                    Details <i className="fa-solid fa-arrow-right"></i>
                </span>
            </div>
        </div>
        
        {onRefresh && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRefresh(); }} 
                className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors z-20 hidden group-hover:block"
                title="Refresh Weather"
            >
                <i className="fa-solid fa-rotate-right text-sm"></i>
            </button>
        )}
    </div>
  );
};