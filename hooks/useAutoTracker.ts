
import { useState, useEffect, useRef } from 'react';
import { RoutePoint, WalkSession, UserSettings } from '../types';
import { calculateDistance } from '../services/trackingService';

export const useAutoTracker = (
    isLoggedIn: boolean, 
    dailySteps: number, 
    settings: UserSettings,
    onSessionEnd: (session: WalkSession) => void
) => {
    const [isAutoRecording, setIsAutoRecording] = useState(false);
    const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([]);
    
    const watchIdRef = useRef<number | null>(null);
    const lastStepCountRef = useRef(dailySteps);
    const inactivityTimerRef = useRef<number | null>(null);
    const sessionDataRef = useRef({ distance: 0, startTime: 0, stepsAtStart: 0 });

    // Monitor for sustained rhythm to trigger auto-start
    useEffect(() => {
        if (!isLoggedIn) return;

        const checkInterval = setInterval(() => {
            const stepsTaken = dailySteps - lastStepCountRef.current;
            
            if (!isAutoRecording && stepsTaken > 20) {
                startAutoSession();
            }
            
            // Only update the "baseline" if we aren't recording, 
            // otherwise the baseline would move with the recording
            if (!isAutoRecording) {
                lastStepCountRef.current = dailySteps;
            }
        }, 15000); // Check every 15 seconds

        return () => clearInterval(checkInterval);
    }, [dailySteps, isLoggedIn, isAutoRecording]);

    const startAutoSession = () => {
        if (watchIdRef.current) return;
        
        setIsAutoRecording(true);
        const startTime = Date.now();
        sessionDataRef.current = { distance: 0, startTime, stepsAtStart: dailySteps };
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
                    const lastPoint = prev[prev.length - 1];
                    const d = calculateDistance(lastPoint, newPoint);
                    if (d > 5) { // 5m sensitivity to avoid GPS jitter
                        sessionDataRef.current.distance += d;
                        // Limit route array size to prevent memory lag on home screen
                        const newRoute = [...prev, newPoint];
                        return newRoute.slice(-100); 
                    }
                    return prev;
                }
                return [newPoint];
            });

            resetInactivityTimer();
        }, (err) => {
            console.warn("AutoTracker GPS warning:", err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 20000
        });
    };

    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = window.setTimeout(() => {
            stopAutoSession();
        }, 120000); // 2 minutes of inactivity stops recording
    };

    const stopAutoSession = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        const finalDist = sessionDataRef.current.distance;
        if (finalDist > 50) { // Only save if they walked at least 50m
            const duration = Math.round((Date.now() - sessionDataRef.current.startTime) / 1000);
            const steps = dailySteps - sessionDataRef.current.stepsAtStart;
            
            const session: WalkSession = {
                id: `auto-${Date.now()}`,
                startTime: sessionDataRef.current.startTime,
                endTime: Date.now(),
                steps: Math.max(steps, Math.round(finalDist / (settings.strideLengthCm / 100))),
                distanceMeters: finalDist,
                calories: Math.round(0.04 * steps * (settings.weightKg / 70)),
                durationSeconds: duration,
                route: [...currentRoute],
                avgSpeed: (finalDist / duration) * 3.6
            };
            onSessionEnd(session);
        }

        setIsAutoRecording(false);
        setCurrentRoute([]);
        lastStepCountRef.current = dailySteps; // Reset baseline
    };

    return { isAutoRecording, autoRoute: currentRoute };
};
