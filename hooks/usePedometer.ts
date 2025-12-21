
import { useState, useEffect, useRef, useCallback } from 'react';

// ALGORITHM CONSTANTS
const LPF_ALPHA = 0.8; 
const MIN_STEP_DELAY = 280; // ~3.5 steps per second max
const MAX_STEP_DELAY = 1800; // Reset rhythm if more than 1.8s between steps
const CONSECUTIVE_STEPS_REQUIRED = 6; // Filter out accidental shakes
const MAG_SMOOTH_FACTOR = 0.7; 

export const usePedometer = (sensitivity: number = 3) => {
  const [dailySteps, setDailySteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [isTrackingSession, setIsTrackingSession] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastStepTimestamp, setLastStepTimestamp] = useState(0); // For UI ripple
  
  // Internal tracking refs to avoid re-renders on every sensor tick (60Hz+)
  const lastStepTimeRef = useRef<number>(0);
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastSmoothMagRef = useRef<number>(0);
  const stepBufferRef = useRef<number>(0); 

  // Load daily steps on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`daily_steps_${today}`);
    if (saved) setDailySteps(parseInt(saved, 10));
  }, []);

  // Save daily steps whenever they change
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

    // 2. Calculate Linear Acceleration Magnitude (User movement)
    const linearX = rawX - gravityRef.current.x;
    const linearY = rawY - gravityRef.current.y;
    const linearZ = rawZ - gravityRef.current.z;
    const currentMagnitude = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
    
    // 3. Smooth the Magnitude Signal
    const smoothMag = MAG_SMOOTH_FACTOR * lastSmoothMagRef.current + (1 - MAG_SMOOTH_FACTOR) * currentMagnitude;

    // 4. Threshold & Peak Detection
    const now = Date.now();
    const dynamicThreshold = 1.4 - ((sensitivity - 3) * 0.15);

    if (now - lastStepTimeRef.current > MAX_STEP_DELAY) {
        stepBufferRef.current = 0;
    }

    if (lastSmoothMagRef.current > dynamicThreshold && smoothMag < lastSmoothMagRef.current) {
        if (now - lastStepTimeRef.current > MIN_STEP_DELAY) {
            stepBufferRef.current += 1;
            lastStepTimeRef.current = now;

            if (stepBufferRef.current >= CONSECUTIVE_STEPS_REQUIRED) {
                const inc = stepBufferRef.current === CONSECUTIVE_STEPS_REQUIRED ? CONSECUTIVE_STEPS_REQUIRED : 1;
                
                setDailySteps(prev => prev + inc);
                if (isTrackingSession) setSessionSteps(prev => prev + inc);
                setLastStepTimestamp(now); 
            }
        }
    }
    
    lastSmoothMagRef.current = smoothMag;
  }, [sensitivity, isTrackingSession]);

  // Robustly manage the event listener lifecycle
  useEffect(() => {
    if (permissionGranted) {
      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [permissionGranted, handleMotion]);

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          return true;
        }
        setError("Motion sensor access denied.");
        return false;
      } catch (e) {
        setError("Secure context (HTTPS) required for sensors.");
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
  };

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
    lastStepTimestamp,
    error,
    permissionGranted,
    requestPermission,
    startSession,
    stopSession
  };
};
