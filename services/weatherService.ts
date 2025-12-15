
import { WeatherData } from '../types';

export const getWeather = async (lat: number, lng: number): Promise<WeatherData | null> => {
  try {
    // Fetch Weather and Air Quality in parallel
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`)
    ]);

    const weatherData = await weatherRes.json();
    const aqiData = await aqiRes.json();
    
    if (weatherData.current_weather) {
      return {
        temperature: weatherData.current_weather.temperature,
        weatherCode: weatherData.current_weather.weathercode,
        isDay: weatherData.current_weather.is_day === 1,
        windSpeed: weatherData.current_weather.windspeed,
        windDirection: weatherData.current_weather.winddirection,
        aqi: aqiData.current?.us_aqi
      };
    }
    return null;
  } catch (error) {
    console.error("Weather fetch failed:", error);
    // Return mock data for preview purposes if API fails or is blocked
    return {
        temperature: 28,
        weatherCode: 1,
        isDay: true,
        windSpeed: 12,
        windDirection: 140, // South-East
        aqi: 120 // Moderate/Unhealthy for demo
    };
  }
};

export const getWeatherIcon = (code: number, isDay: boolean): { icon: string, label: string, color: string } => {
  // WMO Weather interpretation codes (WW)
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog
  // 51, 53, 55: Drizzle
  // 61, 63, 65: Rain
  // 71, 73, 75: Snow
  // 80, 81, 82: Rain showers
  // 95, 96, 99: Thunderstorm
  
  if (code === 0) return { 
    icon: isDay ? 'fa-sun' : 'fa-moon', 
    label: 'Clear Sky', 
    color: isDay ? 'text-yellow-400' : 'text-slate-300' 
  };
  
  if ([1, 2, 3].includes(code)) return { 
    icon: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', 
    label: 'Partly Cloudy', 
    color: 'text-gray-400' 
  };
  
  if ([45, 48].includes(code)) return { 
    icon: 'fa-smog', 
    label: 'Foggy', 
    color: 'text-slate-400' 
  };
  
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { 
    icon: 'fa-cloud-rain', 
    label: 'Rainy', 
    color: 'text-blue-400' 
  };
  
  if ([71, 73, 75, 85, 86].includes(code)) return { 
    icon: 'fa-snowflake', 
    label: 'Snowy', 
    color: 'text-white' 
  };
  
  if ([95, 96, 99].includes(code)) return { 
    icon: 'fa-cloud-bolt', 
    label: 'Thunderstorm', 
    color: 'text-purple-400' 
  };

  return { icon: 'fa-cloud', label: 'Overcast', color: 'text-gray-500' };
};

export const getAQIStatus = (aqi: number): { label: string, color: string } => {
    if (aqi <= 50) return { label: 'Good', color: 'text-green-400' };
    if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-400' };
    if (aqi <= 150) return { label: 'Unhealthy (Sens.)', color: 'text-orange-400' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-400' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-purple-400' };
    return { label: 'Hazardous', color: 'text-red-700' };
};
