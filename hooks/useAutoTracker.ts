
import { useState, useEffect, useRef } from 'react';
import { RoutePoint, WalkSession, UserSettings, UserProfile } from '../types';
import { calculateDistance } from '../services/trackingService';

export const useAutoTracker = (
    isPedometerActive: boolean, 
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

    // Monitor steps to trigger auto-start
    useEffect(() => {
        if (!isPedometerActive || isAutoRecording) return;

        // If user took more than 30 steps in the last 2 minutes, start recording
        if (dailySteps - lastStepCountRef.current > 30) {
            startAutoSession();
        }

        const interval = setInterval(() => {
            lastStepCountRef.current = dailySteps;
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [dailySteps, isPedometerActive, isAutoRecording]);

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
                    if (d > 5) { // Only add if moved > 5m
                        setSessionStats(s => ({ ...s, distance: s.distance + d }));
                        return [...prev, newPoint];
                    }
                    return prev;
                }
                return [newPoint];
            });

            // Reset inactivity timer on every GPS update that shows movement
            resetInactivityTimer();
        }, (err) => console.error("AutoTrack GPS Error", err), {
            enableHighAccuracy: true,
            maximumAge: 1000
        });
    };

    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = window.setTimeout(() => {
            stopAutoSession();
        }, 300000); // 5 minutes of no movement/GPS updates stops session
    };

    const stopAutoSession = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (currentRoute.length > 5) {
            const duration = Math.round((Date.now() - sessionStats.startTime) / 1000);
            const steps = dailySteps - sessionStats.stepsAtStart;
            
            const session: WalkSession = {
                id: `auto-${Date.now()}`,
                startTime: sessionStats.startTime,
                endTime: Date.now(),
                steps: steps > 0 ? steps : Math.round(sessionStats.distance / (settings.strideLengthCm / 100)),
                distanceMeters: sessionStats.distance,
                calories: Math.round(0.04 * (steps || 1) * (settings.weightKg / 70)),
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
