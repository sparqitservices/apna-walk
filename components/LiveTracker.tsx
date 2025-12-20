
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, RoutePoint, WalkSession, UserSettings } from '../types';
import { calculateDistance, saveWalkToCloud } from '../services/trackingService';

declare const L: any;

interface LiveTrackerProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    settings: UserSettings;
    onFinish: (session: WalkSession) => void;
}

export const LiveTracker: React.FC<LiveTrackerProps> = ({ isOpen, onClose, profile, settings, onFinish }) => {
    const [isTracking, setIsTracking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [route, setRoute] = useState<RoutePoint[]>([]);
    const [stats, setStats] = useState({
        distance: 0,
        duration: 0,
        speed: 0,
        avgSpeed: 0,
        steps: 0
    });

    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen && !leafletMap.current) {
            setTimeout(initMap, 200);
        }
        return () => {
            stopTracking();
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        };
    }, [isOpen]);

    const initMap = () => {
        if (!mapRef.current) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            const map = L.map(mapRef.current!, { zoomControl: false }).setView([latitude, longitude], 17);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
            
            leafletMap.current = map;
            
            const icon = L.divIcon({
                className: 'bg-transparent',
                html: `<div class="w-6 h-6 bg-brand-500 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center justify-center text-[10px] text-white"><i class="fa-solid fa-location-arrow"></i></div>`,
                iconSize: [24, 24]
            });
            
            markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
            polylineRef.current = L.polyline([], { color: '#4CAF50', weight: 5, opacity: 0.8 }).addTo(map);
        });
    };

    const startTracking = () => {
        setIsTracking(true);
        setIsPaused(false);
        setRoute([]);
        setStats({ distance: 0, duration: 0, speed: 0, avgSpeed: 0, steps: 0 });

        // Wake Lock API to keep screen on
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen').catch(() => {});
        }

        timerRef.current = window.setInterval(() => {
            if (!isPaused) setStats(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);

        watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
            if (isPaused) return;
            const newPoint: RoutePoint = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
                speed: pos.coords.speed || 0
            };

            setRoute(prev => {
                if (prev.length > 0) {
                    const d = calculateDistance(prev[prev.length - 1], newPoint);
                    if (d > 2) { // 2m threshold for higher accuracy
                        setStats(s => ({
                            ...s,
                            distance: s.distance + d,
                            speed: (pos.coords.speed || 0) * 3.6,
                            avgSpeed: (s.distance + d) / (s.duration || 1) * 3.6
                        }));
                        return [...prev, newPoint];
                    }
                    return prev;
                }
                return [newPoint];
            });

            // Update Map
            if (leafletMap.current) {
                leafletMap.current.panTo([newPoint.lat, newPoint.lng]);
                markerRef.current.setLatLng([newPoint.lat, newPoint.lng]);
                polylineRef.current.addLatLng([newPoint.lat, newPoint.lng]);
            }
        }, (err) => console.error(err), { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 });
    };

    const stopTracking = async () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTracking(false);

        if (route.length > 5) {
            const finalSession: WalkSession = {
                id: `gps-${Date.now()}`,
                startTime: route[0].timestamp,
                steps: Math.round(stats.distance / (settings.strideLengthCm / 100)),
                distanceMeters: stats.distance,
                calories: Math.round(0.57 * settings.weightKg * (stats.distance / 1000)),
                durationSeconds: stats.duration,
                route: route,
                avgSpeed: stats.avgSpeed,
                maxSpeed: Math.max(...route.map(p => (p.speed || 0) * 3.6))
            };

            if (!profile.isGuest && profile.id) {
                try {
                    await saveWalkToCloud(profile.id, finalSession);
                } catch (e) { console.error("Cloud save failed", e); }
            }
            onFinish(finalSession);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-bg z-[100] flex flex-col overflow-hidden">
            {/* Map Background */}
            <div ref={mapRef} className="absolute inset-0 z-0" />

            {/* Header Controls */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-dark-card/90 backdrop-blur border border-slate-700 text-white flex items-center justify-center shadow-lg"
                >
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
                <div className="bg-dark-card/90 backdrop-blur border border-slate-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isTracking && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                    <span className="text-white text-xs font-black uppercase tracking-widest">
                        {isPaused ? 'Paused' : isTracking ? 'Live Tracking' : 'Ready'}
                    </span>
                </div>
            </div>

            {/* Live Stats Overlay */}
            <div className="mt-auto relative z-10 p-6">
                <div className="bg-dark-card/95 backdrop-blur-xl border border-slate-700 rounded-[2.5rem] shadow-2xl p-8 animate-fade-in">
                    
                    {/* Main Stats Row */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="text-center border-r border-slate-800">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Distance</p>
                            <div className="text-4xl font-black text-white">{(stats.distance / 1000).toFixed(2)}<span className="text-sm ml-1 opacity-40">KM</span></div>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Time</p>
                            <div className="text-4xl font-black text-white">
                                {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-10 px-4">
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Speed</p>
                            <p className="text-lg font-black text-brand-400">{stats.speed.toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Avg Speed</p>
                            <p className="text-lg font-black text-blue-400">{stats.avgSpeed.toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Pace</p>
                            <p className="text-lg font-black text-orange-400">
                                {stats.distance > 100 ? (stats.duration / (stats.distance/1000) / 60).toFixed(1) : '--'}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        {!isTracking ? (
                            <button 
                                onClick={startTracking}
                                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-brand-900/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                            >
                                <i className="fa-solid fa-play"></i> START WALK
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`w-20 h-20 rounded-3xl border-2 flex items-center justify-center text-xl transition-all active:scale-95 ${isPaused ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                                </button>
                                <button 
                                    onClick={stopTracking}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-900/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                                >
                                    <i className="fa-solid fa-stop"></i> FINISH
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
