
import { useState, useEffect, useRef, useCallback } from 'react';

// ALGORITHM SETTINGS
const LPF_ALPHA = 0.8; 
const MIN_STEP_DELAY = 300; // Minimum ms between steps
const MAX_STEP_DELAY = 2000; 
const CONSECUTIVE_STEPS_REQUIRED = 5; 
const MAG_SMOOTH_FACTOR = 0.5; 
const BASE_THRESHOLD = 1.1;

export const usePedometer = (sensitivity: number = 3) => {
  // Two Counters: Daily (Persistent) and Session (Volatile)
  const [dailySteps, setDailySteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  
  const [isTrackingSession, setIsTrackingSession] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calibration
  const [calibrationStatus, setCalibrationStatus] = useState<'idle' | 'walking'>('idle');
  const isCalibratingRef = useRef(false);
  const calibrationData = useRef<number[]>([]);

  const lastStepTime = useRef<number>(0);
  const gravityRef = useRef<{x: number, y: number, z: number}>({ x: 0, y: 0, z: 0 });
  const lastSmoothMag = useRef<number>(0);
  const activityLevel = useRef<number>(0);
  const stepBuffer = useRef<number>(0); 

  // Initialize Daily Steps from LocalStorage on mount
  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const savedKey = `daily_steps_${today}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
          setDailySteps(parseInt(saved, 10));
      }
  }, []);

  // Save Daily Steps whenever they change
  useEffect(() => {
      if (dailySteps > 0) {
        const today = new Date().toISOString().split('T')[0];
        const savedKey = `daily_steps_${today}`;
        localStorage.setItem(savedKey, dailySteps.toString());
      }
  }, [dailySteps]);
  
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const { x, y, z } = accelerationIncludingGravity;
    
    const rawX = x || 0;
    const rawY = y || 0;
    const rawZ = z || 0;

    // 1. Low-Pass Filter
    gravityRef.current.x = LPF_ALPHA * gravityRef.current.x + (1 - LPF_ALPHA) * rawX;
    gravityRef.current.y = LPF_ALPHA * gravityRef.current.y + (1 - LPF_ALPHA) * rawY;
    gravityRef.current.z = LPF_ALPHA * gravityRef.current.z + (1 - LPF_ALPHA) * rawZ;

    // 2. Linear Acceleration
    const linearX = rawX - gravityRef.current.x;
    const linearY = rawY - gravityRef.current.y;
    const linearZ = rawZ - gravityRef.current.z;

    // 3. Magnitude & Smoothing
    const currentMagnitude = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
    const smoothMag = MAG_SMOOTH_FACTOR * lastSmoothMag.current + (1 - MAG_SMOOTH_FACTOR) * currentMagnitude;

    // Activity Level
    activityLevel.current = (0.05 * smoothMag) + (0.95 * activityLevel.current);

    // Calibration
    if (isCalibratingRef.current) {
        if (smoothMag > 0.6) calibrationData.current.push(smoothMag);
        lastSmoothMag.current = smoothMag;
        return;
    }

    // Step Detection - Runs ALWAYS if permission granted
    let dynamicThreshold = BASE_THRESHOLD - ((sensitivity - 3) * 0.15);
    if (activityLevel.current < 0.35) dynamicThreshold += 0.45; 
    else if (activityLevel.current > 1.2) dynamicThreshold -= 0.1;

    const now = Date.now();
    if (stepBuffer.current > 0 && (now - lastStepTime.current > MAX_STEP_DELAY)) {
        stepBuffer.current = 0;
    }

    if (lastSmoothMag.current > dynamicThreshold && smoothMag < lastSmoothMag.current) {
        if (now - lastStepTime.current > MIN_STEP_DELAY) {
            stepBuffer.current += 1;
            lastStepTime.current = now;

            if (stepBuffer.current >= CONSECUTIVE_STEPS_REQUIRED) {
                const stepsToAdd = stepBuffer.current === CONSECUTIVE_STEPS_REQUIRED ? CONSECUTIVE_STEPS_REQUIRED : 1;
                
                // Update Daily Steps (Always)
                setDailySteps(prev => prev + stepsToAdd);

                // Update Session Steps (Only if session active)
                if (isTrackingSession) {
                    setSessionSteps(prev => prev + stepsToAdd);
                }
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
        } else {
          setError("Motion permission denied.");
          return false;
        }
      } catch (e) {
        setError("Error: " + e);
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
  };

  // Auto-start listener if permission is already granted (e.g. from previous session in same reload)
  useEffect(() => {
     if (permissionGranted) {
         window.addEventListener('devicemotion', handleMotion);
     }
     return () => window.removeEventListener('devicemotion', handleMotion);
  }, [permissionGranted, handleMotion]);

  // Initial Permission Check (Best effort for non-iOS)
  useEffect(() => {
      if (!typeof (DeviceMotionEvent as any).requestPermission) {
          setPermissionGranted(true);
      }
  }, []);

  // Public methods
  const activateDailyTracking = async () => {
      await requestPermission();
  };

  const startSession = () => {
    setSessionSteps(0);
    setIsTrackingSession(true);
  };

  const stopSession = () => {
    setIsTrackingSession(false);
    return sessionSteps;
  };

  const calibrateSensitivity = (onComplete: (recommended: number) => void) => {
      // Logic same as before...
      if (!window.DeviceMotionEvent) { onComplete(3); return; }
      requestPermission().then((granted) => {
          if (!granted) { onComplete(3); return; }
          isCalibratingRef.current = true;
          calibrationData.current = [];
          setCalibrationStatus('walking');
          setTimeout(() => {
              isCalibratingRef.current = false;
              setCalibrationStatus('idle');
              const data = calibrationData.current;
              if (data.length < 10) { onComplete(3); return; }
              data.sort((a, b) => b - a);
              const topChunk = data.slice(0, Math.ceil(data.length * 0.2));
              const avgPeak = topChunk.reduce((a, b) => a + b, 0) / topChunk.length;
              let suggested = 3;
              if (avgPeak > 2.2) suggested = 1;
              else if (avgPeak > 1.8) suggested = 2;
              else if (avgPeak > 1.2) suggested = 3;
              else if (avgPeak > 0.9) suggested = 4;
              else suggested = 5;
              onComplete(suggested);
          }, 5000);
      });
  };

  const simulateStep = () => {
    setDailySteps(prev => prev + 1);
    if(isTrackingSession) setSessionSteps(prev => prev + 1);
  };

  return {
    dailySteps,
    sessionSteps,
    isTrackingSession,
    error,
    permissionGranted,
    activateDailyTracking,
    startSession,
    stopSession,
    simulateStep,
    calibrateSensitivity,
    calibrationStatus
  };
};
