
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
    const [activeActivityType, setActiveActivityType] = useState<'walking' | 'cycling' | 'driving' | 'stationary'>('stationary');
    
    const watchIdRef = useRef<number | null>(null);
    const lastStepCountRef = useRef(dailySteps);
    const inactivityTimerRef = useRef<number | null>(null);
    const sessionDataRef = useRef({ distance: 0, startTime: 0, stepsAtStart: 0, maxSpeed: 0, type: 'stationary' as any });

    const SPEED_WALK_MAX = 7;
    const SPEED_CYCLE_MAX = 25;

    useEffect(() => {
        if (!isLoggedIn || !settings.autoTravelHistory) {
            stopAutoSession();
            return;
        }

        const checkInterval = setInterval(() => {
            if (!isAutoRecording) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    const speed = (pos.coords.speed || 0) * 3.6;
                    const stepsTaken = dailySteps - lastStepCountRef.current;
                    if (speed > 2.5 || stepsTaken > 12) {
                        startAutoSession();
                    }
                    lastStepCountRef.current = dailySteps;
                }, null, { enableHighAccuracy: true });
            }
        }, 20000);

        return () => clearInterval(checkInterval);
    }, [dailySteps, isLoggedIn, isAutoRecording, settings.autoTravelHistory]);

    const determineActivity = (speedKmh: number, stepsIncreased: boolean) => {
        if (speedKmh > SPEED_CYCLE_MAX) return 'driving';
        if (speedKmh > SPEED_WALK_MAX) return 'cycling';
        if (stepsIncreased || speedKmh > 0.5) return 'walking';
        return 'stationary';
    };

    const startAutoSession = () => {
        if (watchIdRef.current) return;
        
        setIsAutoRecording(true);
        const startTime = Date.now();
        sessionDataRef.current = { 
            distance: 0, 
            startTime, 
            stepsAtStart: dailySteps, 
            maxSpeed: 0,
            type: 'walking' 
        };
        setCurrentRoute([]);

        watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
            const speedKmh = (pos.coords.speed || 0) * 3.6;
            const newPoint: RoutePoint = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now(),
                speed: pos.coords.speed || 0
            };

            const stepsTaken = dailySteps - lastStepCountRef.current;
            const currentType = determineActivity(speedKmh, stepsTaken > 0);
            
            if (currentType !== 'stationary') {
                resetInactivityTimer();
                if (currentType !== activeActivityType) {
                    setActiveActivityType(currentType);
                    sessionDataRef.current.type = currentType;
                }
            }

            setCurrentRoute(prev => {
                if (prev.length > 0) {
                    const lastPoint = prev[prev.length - 1];
                    const d = calculateDistance(lastPoint, newPoint);
                    if (d > 3) { // 3m filter for auto mode to save battery
                        sessionDataRef.current.distance += d;
                        sessionDataRef.current.maxSpeed = Math.max(sessionDataRef.current.maxSpeed, speedKmh);
                        const newRoute = [...prev, newPoint];
                        return newRoute.slice(-200); 
                    }
                    return prev;
                }
                return [newPoint];
            });

            lastStepCountRef.current = dailySteps;
        }, (err) => {
            console.warn("AutoTracker GPS warning:", err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 0, // Ensure hardware updates for precision
            timeout: 8000
        });
    };

    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = window.setTimeout(() => {
            stopAutoSession();
        }, 180000); 
    };

    const stopAutoSession = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        const finalDist = sessionDataRef.current.distance;
        if (finalDist > 100) { 
            const duration = Math.round((Date.now() - sessionDataRef.current.startTime) / 1000);
            const steps = Math.max(0, dailySteps - sessionDataRef.current.stepsAtStart);
            
            const session: WalkSession = {
                id: `auto-${Date.now()}`,
                startTime: sessionDataRef.current.startTime,
                endTime: Date.now(),
                steps: sessionDataRef.current.type === 'walking' ? steps : 0,
                distanceMeters: finalDist,
                calories: sessionDataRef.current.type === 'walking' ? Math.round(0.04 * steps * (settings.weightKg / 70)) : 0,
                durationSeconds: duration,
                route: [...currentRoute],
                activityType: sessionDataRef.current.type,
                avgSpeed: (finalDist / duration) * 3.6,
                maxSpeed: sessionDataRef.current.maxSpeed
            };
            onSessionEnd(session);
        }

        setIsAutoRecording(false);
        setActiveActivityType('stationary');
        setCurrentRoute([]);
        lastStepCountRef.current = dailySteps;
    };

    return { isAutoRecording, autoRoute: currentRoute, activeActivityType };
};
