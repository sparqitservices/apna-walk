
import { useState, useEffect, useRef, useCallback } from 'react';

// ALGORITHM SETTINGS
const LPF_ALPHA = 0.8; 
const MIN_STEP_DELAY = 250; // Minimum ms between steps (max ~4 steps/sec)
const MAX_STEP_DELAY = 2000; 
const CONSECUTIVE_STEPS_REQUIRED = 5; 
const MAG_SMOOTH_FACTOR = 0.6; 
const BASE_THRESHOLD = 1.2;

export const usePedometer = (sensitivity: number = 3) => {
  const [dailySteps, setDailySteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [isTrackingSession, setIsTrackingSession] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Internal tracking refs
  const lastStepTime = useRef<number>(0);
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastSmoothMag = useRef<number>(0);
  const stepBuffer = useRef<number>(0); 
  const isWalkingRef = useRef<boolean>(false);

  // Load daily steps
  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`daily_steps_${today}`);
      if (saved) setDailySteps(parseInt(saved, 10));
  }, []);

  // Persist daily steps
  useEffect(() => {
      if (dailySteps > 0) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`daily_steps_${today}`, dailySteps.toString());
      }
  }, [dailySteps]);
  
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const { x, y, z } = accelerationIncludingGravity;
    const rawX = x || 0;
    const rawY = y || 0;
    const rawZ = z || 0;

    // 1. Isolate Gravity (Low-Pass Filter)
    gravityRef.current.x = LPF_ALPHA * gravityRef.current.x + (1 - LPF_ALPHA) * rawX;
    gravityRef.current.y = LPF_ALPHA * gravityRef.current.y + (1 - LPF_ALPHA) * rawY;
    gravityRef.current.z = LPF_ALPHA * gravityRef.current.z + (1 - LPF_ALPHA) * rawZ;

    // 2. Calculate Linear Acceleration (Magnitude of movement without gravity)
    const linearX = rawX - gravityRef.current.x;
    const linearY = rawY - gravityRef.current.y;
    const linearZ = rawZ - gravityRef.current.z;

    const currentMagnitude = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
    
    // 3. Smooth the signal
    const smoothMag = MAG_SMOOTH_FACTOR * lastSmoothMag.current + (1 - MAG_SMOOTH_FACTOR) * currentMagnitude;

    // 4. Peak Detection Logic
    const now = Date.now();
    const dynamicThreshold = BASE_THRESHOLD - ((sensitivity - 3) * 0.2);

    // If we've been idle too long, reset the consecutive step buffer
    if (now - lastStepTime.current > MAX_STEP_DELAY) {
        stepBuffer.current = 0;
        isWalkingRef.current = false;
    }

    // Detect a step (Peak crossing the threshold)
    if (lastSmoothMag.current > dynamicThreshold && smoothMag < lastSmoothMag.current) {
        if (now - lastStepTime.current > MIN_STEP_DELAY) {
            stepBuffer.current += 1;
            lastStepTime.current = now;

            // Only count steps if we've detected a rhythm (CONSECUTIVE_STEPS_REQUIRED)
            // This prevents counting single accidental bumps as steps.
            if (stepBuffer.current >= CONSECUTIVE_STEPS_REQUIRED) {
                const stepsToAdd = stepBuffer.current === CONSECUTIVE_STEPS_REQUIRED ? CONSECUTIVE_STEPS_REQUIRED : 1;
                
                setDailySteps(prev => prev + stepsToAdd);
                if (isTrackingSession) {
                    setSessionSteps(prev => prev + stepsToAdd);
                }
                
                if (!isWalkingRef.current) isWalkingRef.current = true;
            }
        }
    }
    
    lastSmoothMag.current = smoothMag;
  }, [sensitivity, isTrackingSession]);

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          return true;
        }
        setError("Motion permission denied.");
        return false;
      } catch (e) {
        setError("Sensors not available on this connection.");
        return false;
      }
    } else {
      setPermissionGranted(true);
      window.addEventListener('devicemotion', handleMotion);
      return true;
    }
  };

  useEffect(() => {
     if (permissionGranted) {
         window.addEventListener('devicemotion', handleMotion);
     }
     return () => window.removeEventListener('devicemotion', handleMotion);
  }, [permissionGranted, handleMotion]);

  const startSession = () => {
    setSessionSteps(0);
    setIsTrackingSession(true);
  };

  const stopSession = () => {
    setIsTrackingSession(false);
    const final = sessionSteps;
    setSessionSteps(0);
    return final;
  };

  return {
    dailySteps,
    sessionSteps,
    isTrackingSession,
    error,
    permissionGranted,
    requestPermission,
    startSession,
    stopSession
  };
};
