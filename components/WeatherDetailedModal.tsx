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
  
  // AQI Scale Logic for visual bar
  const aqiPercent = weather.aqi ? Math.min((weather.aqi / 300) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
       <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
          
          {/* Header */}
          <div className="absolute top-4 right-4 z-10">
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-xmark"></i>
              </button>
          </div>

          {/* Main Visual Section */}
          <div className={`p-8 pb-12 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b ${weather.isDay ? 'from-blue-500/20 to-dark-card' : 'from-slate-800 to-dark-card'}`}>
              
              {/* Background Glow */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] opacity-30 ${color.replace('text-', 'bg-')}`}></div>

              <div className={`text-7xl mb-4 ${color} drop-shadow-xl relative z-10 animate-breathing`}>
                  <i className={`fa-solid ${icon}`}></i>
              </div>
              
              <h2 className="text-5xl font-bold text-white mb-1">{weather.temperature}°</h2>
              <p className="text-xl text-slate-300 font-medium">{label}</p>
              
              {/* Grid Stats */}
              <div className="grid grid-cols-2 gap-8 mt-8 w-full">
                   <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                       <i className="fa-solid fa-wind text-slate-400 mb-1"></i>
                       <span className="text-white font-bold">{weather.windSpeed} km/h</span>
                       <span className="text-[10px] text-slate-400">Wind Speed</span>
                   </div>
                   <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                       {/* Mocking humidity/feel as API is simple in this demo, real app would pass these */}
                       <i className="fa-solid fa-droplet text-blue-400 mb-1"></i>
                       <span className="text-white font-bold">45%</span>
                       <span className="text-[10px] text-slate-400">Humidity</span>
                   </div>
              </div>
          </div>

          {/* AQI Section */}
          <div className="p-6 pt-2 bg-dark-card">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-lungs text-brand-400"></i> Air Quality Index
              </h3>
              
              {weather.aqi !== undefined && aqiInfo ? (
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                      <div className="flex justify-between items-end mb-2">
                          <div className={`text-3xl font-bold ${aqiInfo.color}`}>
                              {weather.aqi}
                          </div>
                          <div className={`text-sm font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-600 ${aqiInfo.color}`}>
                              {aqiInfo.label}
                          </div>
                      </div>
                      
                      {/* Gradient Bar */}
                      <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden relative mb-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
                          <div className="absolute top-0 bottom-0 bg-slate-900 w-1 transition-all border-l border-white" style={{ left: `${aqiPercent}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase">
                          <span>Good</span>
                          <span>Hazardous</span>
                      </div>
                      
                      <p className="mt-4 text-xs text-slate-400 leading-relaxed border-t border-slate-700 pt-3">
                          {weather.aqi <= 50 ? "Great air quality! Perfect for a long outdoor walk." :
                           weather.aqi <= 100 ? "Acceptable air quality. Enjoy your walk." :
                           weather.aqi <= 150 ? "Sensitive groups should reduce outdoor exertion." :
                           "Air quality is unhealthy. Consider walking indoors or wearing a mask."}
                      </p>
                  </div>
              ) : (
                  <div className="text-center text-slate-500 py-4">Data Unavailable</div>
              )}
          </div>
       </div>
    </div>
  );
};
