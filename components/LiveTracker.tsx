
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, RoutePoint, WalkSession, UserSettings } from '../types';
import { calculateDistance, saveWalkToCloud } from '../services/trackingService';
import { getLocalityName } from '../services/parkService';

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
    const [followUser, setFollowUser] = useState(true);
    const [mapStyle, setMapStyle] = useState<'dark' | 'terrain'>('dark');
    const [currentRoad, setCurrentRoad] = useState<string>("Locating Road...");
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
    const tileLayerRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen && !leafletMap.current) {
            setTimeout(initMap, 200);
        }
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        };
    }, [isOpen]);

    const updateMapStyle = (style: 'dark' | 'terrain') => {
        if (!leafletMap.current) return;
        if (tileLayerRef.current) leafletMap.current.removeLayer(tileLayerRef.current);
        
        const url = style === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            
        tileLayerRef.current = L.tileLayer(url).addTo(leafletMap.current);
        setMapStyle(style);
    };

    const initMap = () => {
        if (!mapRef.current) return;
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const map = L.map(mapRef.current!, { zoomControl: false }).setView([latitude, longitude], 17);
            
            leafletMap.current = map;
            updateMapStyle('dark');
            
            const icon = L.divIcon({
                className: 'bg-transparent',
                html: `
                    <div class="relative w-8 h-8 flex items-center justify-center">
                        <div class="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                        <div class="w-6 h-6 bg-brand-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white">
                            <i class="fa-solid fa-location-arrow text-[10px] transform -rotate-45"></i>
                        </div>
                    </div>
                `,
                iconSize: [32, 32]
            });
            
            markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
            polylineRef.current = L.polyline([], { 
                color: '#4CAF50', 
                weight: 6, 
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(map);

            const loc = await getLocalityName(latitude, longitude);
            setCurrentRoad(loc.locality);
        });
    };

    const startTracking = () => {
        if (navigator.vibrate) navigator.vibrate([30, 50]);
        setIsTracking(true);
        setIsPaused(false);
        setRoute([]);
        setStats({ distance: 0, duration: 0, speed: 0, avgSpeed: 0, steps: 0 });

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
                    if (d > 2.5) { 
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

            if (leafletMap.current) {
                if (followUser) leafletMap.current.panTo([newPoint.lat, newPoint.lng]);
                markerRef.current.setLatLng([newPoint.lat, newPoint.lng]);
                polylineRef.current.addLatLng([newPoint.lat, newPoint.lng]);
            }
        }, (err) => console.error(err), { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 5000 
        });
    };

    const stopTracking = async () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTracking(false);

        if (route.length > 2) {
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
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-bg z-[100] flex flex-col overflow-hidden">
            <div ref={mapRef} className="absolute inset-0 z-0" />

            {/* Header Overlay */}
            <div className="absolute top-6 left-6 right-6 flex flex-col gap-4 z-10 pointer-events-none">
                <div className="flex justify-between items-center">
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-dark-card/90 backdrop-blur-xl border border-slate-700 text-white flex items-center justify-center shadow-2xl pointer-events-auto active:scale-90 transition-all"
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-white text-[10px] font-black uppercase tracking-[3px] truncate max-w-[150px]">{currentRoad}</span>
                    </div>

                    <div className="flex flex-col gap-3 pointer-events-auto">
                        <button 
                            onClick={() => setFollowUser(!followUser)}
                            className={`w-12 h-12 rounded-2xl backdrop-blur-xl border flex items-center justify-center shadow-2xl transition-all ${followUser ? 'bg-brand-600 border-brand-400 text-white' : 'bg-dark-card/90 border-slate-700 text-slate-400'}`}
                        >
                            <i className="fa-solid fa-location-crosshairs"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Viewport */}
            <div className="mt-auto relative z-10 p-6 sm:p-10">
                <div className="bg-[#0a0f14]/90 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] p-8 animate-message-pop">
                    
                    <div className="grid grid-cols-2 gap-10 mb-8 border-b border-white/5 pb-8">
                        <div className="flex flex-col items-center">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mb-2">Total Road Distance</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-white italic tracking-tighter">{(stats.distance / 1000).toFixed(2)}</span>
                                <span className="text-xs font-black text-brand-500 uppercase">km</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[4px] mb-2">Pulse Duration</p>
                            <div className="text-5xl font-black text-white tabular-nums tracking-tighter italic">
                                {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-10">
                        <StatItem label="Steps" value={Math.round(stats.distance / (settings.strideLengthCm / 100)).toLocaleString()} unit="Walk" color="text-brand-400" />
                        <StatItem label="Velocity" value={stats.speed.toFixed(1)} unit="km/h" color="text-blue-400" />
                        <StatItem label="Burn" value={Math.round(0.57 * settings.weightKg * (stats.distance / 1000)).toString()} unit="kcal" color="text-orange-400" />
                    </div>

                    <div className="flex gap-4">
                        {!isTracking ? (
                            <button 
                                onClick={startTracking}
                                className="flex-1 bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-black py-6 rounded-3xl shadow-2xl active:scale-[0.98] transition-all text-sm uppercase tracking-[5px] flex items-center justify-center gap-4"
                            >
                                <i className="fa-solid fa-play"></i> Start Road Session
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`w-24 h-20 rounded-3xl border-2 flex items-center justify-center text-2xl transition-all active:scale-95 ${isPaused ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                                </button>
                                <button 
                                    onClick={stopTracking}
                                    className="flex-1 bg-gradient-to-tr from-red-700 to-red-500 text-white font-black py-6 rounded-3xl shadow-2xl active:scale-[0.98] transition-all text-sm uppercase tracking-[5px] flex items-center justify-center gap-4"
                                >
                                    <i className="fa-solid fa-square"></i> Finish Walk
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{unit}</p>
    </div>
);
