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
      <div className="w-full max-w-md bg-dark-card border border-slate-800 p-4 rounded-2xl mb-6 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-5 w-full animate-pulse">
            {/* Icon Skeleton */}
            <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0"></div>
            
            <div className="flex-1 space-y-3">
                {/* Temp & AQI Row */}
                <div className="flex justify-between items-center w-full">
                    <div className="h-8 w-20 bg-slate-800 rounded-md"></div>
                    <div className="h-6 w-16 bg-slate-800 rounded-md"></div>
                </div>
                
                {/* Condition Row */}
                <div className="h-4 w-32 bg-slate-800 rounded-md"></div>
                
                {/* Date/Time Row */}
                <div className="h-3 w-24 bg-slate-800 rounded-md"></div>
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
        className="w-full max-w-md bg-gradient-to-r from-dark-card to-slate-900 border border-slate-700 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.98]"
    >
        {/* Background Accent */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-xl transition-colors duration-1000 ${color.replace('text-', 'bg-')}`}></div>

        <div className="flex items-center gap-5 z-10 w-full">
            <div className={`text-4xl ${color} drop-shadow-md`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="flex-1">
                <div className="flex items-baseline justify-between w-full">
                    <div className="text-3xl font-bold text-dark-text leading-none flex items-start gap-1">
                        {weather.temperature}
                        <span className="text-sm font-normal text-dark-muted mt-1">°C</span>
                    </div>
                    {/* AQI Badge */}
                    {weather.aqi !== undefined && aqiInfo && (
                        <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-sm">
                            <i className={`fa-solid fa-lungs ${aqiInfo.color} text-xs`}></i>
                            <div className="flex flex-col items-start leading-tight">
                                <span className={`text-[10px] font-extrabold ${aqiInfo.color}`}>AQI {weather.aqi}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{aqiInfo.label}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="text-xs text-dark-muted font-medium uppercase tracking-wide flex items-center gap-2 mt-1">
                    <span>{label}</span>
                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                    <span className="flex items-center gap-1">
                        <i className="fa-solid fa-wind"></i>
                        {weather.windSpeed} km/h
                        {weather.windDirection !== undefined && (
                             <span className="flex items-center ml-1 gap-1" title={`${weather.windDirection}°`}>
                                <i 
                                    className="fa-solid fa-arrow-up text-[10px] transform" 
                                    style={{ transform: `rotate(${weather.windDirection}deg)` }}
                                ></i>
                                <span>{getCardinalDirection(weather.windDirection)}</span>
                             </span>
                        )}
                    </span>
                </div>
                
                <div className="text-[10px] text-dark-muted mt-1.5 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 font-medium">
                        <i className="fa-regular fa-clock"></i>
                        <span>{dateStr} • {timeStr}</span>
                   </div>
                   <span className="text-brand-400 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                       See Details <i className="fa-solid fa-chevron-right ml-0.5"></i>
                   </span>
                </div>
            </div>
        </div>
        
        {onRefresh && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRefresh(); }} 
                className="absolute top-2 right-2 text-dark-muted hover:text-dark-text transition-colors z-20 p-2 rounded-full hover:bg-slate-700/50"
                title="Refresh Weather"
            >
                <i className="fa-solid fa-rotate-right text-xs"></i>
            </button>
        )}
    </div>
  );
};