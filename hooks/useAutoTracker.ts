
import { useState, useEffect, useRef } from 'react';
import { RoutePoint, WalkSession, UserSettings, UserProfile } from '../types';
import { calculateDistance } from '../services/trackingService';

export const useAutoTracker = (
    isLoggedIn: boolean, 
    dailySteps: number, 
    settings: UserSettings,
    onSessionEnd: (session: WalkSession) => void
) => {
    const [isAutoRecording, setIsAutoRecording] = useState(false);
    const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([]);
    const [sessionStats, setSessionStats] = useState({ distance: 0, startTime: 0, stepsAtStart: 0 });
    
    const watchIdRef = useRef<number | null>(null);
    const lastStepCountRef = useRef(dailySteps);
    const inactivityTimerRef = useRef<number | null>(null);

    // Monitor for sustained rhythm to trigger auto-start
    useEffect(() => {
        if (!isLoggedIn || isAutoRecording) return;

        // If user took more than 25 steps in a short burst, fire up GPS
        if (dailySteps - lastStepCountRef.current > 25) {
            startAutoSession();
        }

        const interval = setInterval(() => {
            lastStepCountRef.current = dailySteps;
        }, 30000); // Check more frequently

        return () => clearInterval(interval);
    }, [dailySteps, isLoggedIn, isAutoRecording]);

    const startAutoSession = () => {
        if (watchIdRef.current) return;
        
        setIsAutoRecording(true);
        const startTime = Date.now();
        setSessionStats({ distance: 0, startTime, stepsAtStart: dailySteps });
        setCurrentRoute([]);

        watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
            const newPoint: RoutePoint = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
                speed: pos.coords.speed || 0
            };

            setCurrentRoute(prev => {
                if (prev.length > 0) {
                    const d = calculateDistance(prev[prev.length - 1], newPoint);
                    if (d > 3) { // 3m sensitivity
                        setSessionStats(s => ({ ...s, distance: s.distance + d }));
                        return [...prev, newPoint];
                    }
                    return prev;
                }
                return [newPoint];
            });

            resetInactivityTimer();
        }, null, {
            enableHighAccuracy: true,
            maximumAge: 0
        });
    };

    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = window.setTimeout(() => {
            stopAutoSession();
        }, 180000); // 3 minutes of stillness stops recording
    };

    const stopAutoSession = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (currentRoute.length > 8) { // Minimum 8 points for a valid journey segment
            const duration = Math.round((Date.now() - sessionStats.startTime) / 1000);
            const steps = dailySteps - sessionStats.stepsAtStart;
            
            const session: WalkSession = {
                id: `auto-${Date.now()}`,
                startTime: sessionStats.startTime,
                endTime: Date.now(),
                steps: Math.max(steps, Math.round(sessionStats.distance / (settings.strideLengthCm / 100))),
                distanceMeters: sessionStats.distance,
                calories: Math.round(0.04 * steps * (settings.weightKg / 70)),
                durationSeconds: duration,
                route: currentRoute,
                avgSpeed: (sessionStats.distance / duration) * 3.6
            };
            onSessionEnd(session);
        }

        setIsAutoRecording(false);
        setCurrentRoute([]);
    };

    return { isAutoRecording, autoRoute: currentRoute };
};
