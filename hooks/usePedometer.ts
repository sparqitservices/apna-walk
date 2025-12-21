
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
    // Dynamic threshold based on sensitivity (1-5 range)
    const dynamicThreshold = 1.4 - ((sensitivity - 3) * 0.15);

    // Reset buffer if user stopped moving
    if (now - lastStepTimeRef.current > MAX_STEP_DELAY) {
        stepBufferRef.current = 0;
    }

    // Step detected if signal is falling from a peak above threshold
    if (lastSmoothMagRef.current > dynamicThreshold && smoothMag < lastSmoothMagRef.current) {
        if (now - lastStepTimeRef.current > MIN_STEP_DELAY) {
            stepBufferRef.current += 1;
            lastStepTimeRef.current = now;

            // Only update UI if we are in a walking rhythm
            if (stepBufferRef.current >= CONSECUTIVE_STEPS_REQUIRED) {
                // If this is exactly the required count, add the whole buffer at once
                const inc = stepBufferRef.current === CONSECUTIVE_STEPS_REQUIRED ? CONSECUTIVE_STEPS_REQUIRED : 1;
                
                setDailySteps(prev => prev + inc);
                if (isTrackingSession) setSessionSteps(prev => prev + inc);
                setLastStepTimestamp(now); // Trigger UI ripple
            }
        }
    }
    
    lastSmoothMagRef.current = smoothMag;
  }, [sensitivity, isTrackingSession]);

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          window.addEventListener('devicemotion', handleMotion);
          return true;
        }
        setError("Permission for motion sensors was denied.");
        return false;
      } catch (e) {
        setError("Could not request sensor access. Secure context (HTTPS) required.");
        return false;
      }
    } else {
      // Non-iOS or older browsers
      setPermissionGranted(true);
      window.addEventListener('devicemotion', handleMotion);
      return true;
    }
  };

  useEffect(() => {
     return () => window.removeEventListener('devicemotion', handleMotion);
  }, [handleMotion]);

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
