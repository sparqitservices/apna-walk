import React, { useState, useEffect, useRef } from 'react';

interface BreathExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TECHNIQUES = [
  { 
    id: 'box', 
    name: 'Box Breathing', 
    description: 'Focus & Stress Relief',
    phases: [
      { label: 'Inhale', duration: 4, scale: 1.5, text: 'Breathe In' },
      { label: 'Hold', duration: 4, scale: 1.5, text: 'Hold' },
      { label: 'Exhale', duration: 4, scale: 1.0, text: 'Breathe Out' },
      { label: 'Hold', duration: 4, scale: 1.0, text: 'Hold' }
    ],
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/30 to-blue-500/30',
    border: 'border-cyan-500/50',
    shadow: 'shadow-cyan-500/20'
  },
  { 
    id: '478', 
    name: '4-7-8 Relax', 
    description: 'Sleep & Anxiety',
    phases: [
      { label: 'Inhale', duration: 4, scale: 1.5, text: 'Breathe In' },
      { label: 'Hold', duration: 7, scale: 1.5, text: 'Hold' },
      { label: 'Exhale', duration: 8, scale: 1.0, text: 'Breathe Out' }
    ],
    color: 'text-indigo-400',
    gradient: 'from-indigo-500/30 to-purple-500/30',
    border: 'border-indigo-500/50',
    shadow: 'shadow-indigo-500/20'
  },
  { 
    id: 'coherent', 
    name: 'Coherent', 
    description: 'Balance & Calm',
    phases: [
      { label: 'Inhale', duration: 6, scale: 1.5, text: 'Breathe In' },
      { label: 'Exhale', duration: 6, scale: 1.0, text: 'Breathe Out' }
    ],
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/30 to-teal-500/30',
    border: 'border-emerald-500/50',
    shadow: 'shadow-emerald-500/20'
  }
];

export const BreathExerciseModal: React.FC<BreathExerciseModalProps> = ({ isOpen, onClose }) => {
  const [activeTechniqueIdx, setActiveTechniqueIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TECHNIQUES[0].phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const technique = TECHNIQUES[activeTechniqueIdx];
  const currentPhase = technique.phases[phaseIdx];

  // Initialize Audio Context on user interaction (start button)
  const initAudio = () => {
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  };

  const playTone = (freq: number, type: 'start' | 'transition') => {
      if (!soundEnabled || !audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Gentle envelope for a bell/chime-like sound
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(type === 'start' ? 0.1 : 0.05, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'start' ? 2 : 1));
      
      osc.start(now);
      osc.stop(now + (type === 'start' ? 2 : 1));
  };

  const speakGuide = (text: string) => {
      if (!soundEnabled) return;
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop previous
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.85; // Slightly slower for calmness
          utterance.pitch = 1;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
      }
  };

  // Reset when technique changes or modal opens
  useEffect(() => {
    if (isOpen) {
        setPhaseIdx(0);
        setSecondsLeft(TECHNIQUES[activeTechniqueIdx].phases[0].duration);
        setCycles(0);
        setIsRunning(false);
    } else {
        setIsRunning(false);
        window.speechSynthesis.cancel();
    }
  }, [isOpen, activeTechniqueIdx]);

  useEffect(() => {
    if (isRunning) {
        timerRef.current = window.setInterval(() => {
            setSecondsLeft((prev) => {
                // If we are about to hit 0, we switch phases. 
                // However, we rely on the logic below to switch exactly when needed.
                // Actually, we decrement first. 
                if (prev <= 1) {
                    handlePhaseChange();
                    return 0; // Value will be overwritten by handlePhaseChange
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, phaseIdx, activeTechniqueIdx, soundEnabled]); // soundEnabled dep ensures closure has correct value

  const handlePhaseChange = () => {
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Calculate next phase
      const nextPhaseIdx = (phaseIdx + 1) % technique.phases.length;
      const nextPhase = technique.phases[nextPhaseIdx];
      
      // Update Cycles if we wrapped around
      if (nextPhaseIdx === 0) {
          setCycles(c => c + 1);
          playTone(440, 'start'); // Higher/Longer chime for new cycle
      } else {
          playTone(330, 'transition'); // Softer chime for phase switch
      }
      
      speakGuide(nextPhase.text);
      
      setPhaseIdx(nextPhaseIdx);
      setSecondsLeft(nextPhase.duration);
  };

  const toggleTimer = () => {
      if (!isRunning) {
          initAudio();
          // Speak the initial phase immediately on start
          speakGuide(currentPhase.text);
      } else {
          window.speechSynthesis.cancel();
      }
      setIsRunning(!isRunning);
  };

  const selectTechnique = (idx: number) => {
      setIsRunning(false);
      window.speechSynthesis.cancel();
      setActiveTechniqueIdx(idx);
      setPhaseIdx(0);
      setSecondsLeft(TECHNIQUES[idx].phases[0].duration);
      setCycles(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center absolute top-6 px-6 z-20">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">Breathe</h2>
            <p className="text-slate-400 text-xs font-medium">Mindfulness & Relaxation</p>
          </div>
          <div className="flex gap-4">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${soundEnabled ? 'bg-slate-800 text-brand-400' : 'bg-slate-800 text-slate-500'}`}
              >
                <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
              </button>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative">
          
          {/* Main Visualizer */}
          <div 
            className="relative w-72 h-72 flex items-center justify-center mb-12 cursor-pointer group touch-manipulation"
            onClick={toggleTimer}
            role="button"
            aria-label={isRunning ? "Stop breathing exercise" : "Start breathing exercise"}
          >
              {/* Outer Glow Ring */}
              <div 
                className={`absolute inset-0 rounded-full bg-gradient-to-tr ${technique.gradient} blur-[60px] transition-all ease-in-out group-hover:opacity-40`}
                style={{ 
                    transform: isRunning ? `scale(${currentPhase.scale * 1.15})` : 'scale(0.8)',
                    opacity: isRunning ? (currentPhase.scale > 1.0 ? 0.6 : 0.3) : 0.1,
                    transitionDuration: isRunning ? `${currentPhase.duration}s` : '1.5s'
                }}
              ></div>

              {/* Main Breathing Circle */}
              <div 
                 className={`w-48 h-48 rounded-full border-4 ${technique.border} ${technique.shadow} flex items-center justify-center relative bg-slate-900/90 backdrop-blur-xl transition-all ease-in-out z-10 shadow-2xl group-active:scale-95`}
                 style={{ 
                     transform: isRunning ? `scale(${currentPhase.scale})` : 'scale(1)',
                     transitionDuration: isRunning ? `${currentPhase.duration}s` : '1s'
                 }}
              >
                  {/* Inner text content (Counter-scale to remain readable) */}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ 
                        transform: isRunning ? `scale(${1/currentPhase.scale})` : 'scale(1)',
                        transition: 'transform 0s' // Instant counter-scale, assuming parent handles smooth transform
                    }}
                  >
                      {isRunning ? (
                          <>
                            <span className={`text-2xl font-bold ${technique.color} drop-shadow-md animate-fade-in`}>{currentPhase.text}</span>
                            <span className="text-5xl font-light text-white mt-2 tabular-nums">{secondsLeft}</span>
                            <span className="text-[10px] text-slate-500 mt-2 font-medium">Tap to Stop</span>
                          </>
                      ) : (
                          <div className="text-center animate-fade-in">
                              <i className={`fa-solid fa-lungs text-3xl ${technique.color} mb-3`}></i>
                              <p className="text-slate-300 font-medium animate-breathing">Tap to Start</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Orbiting particles for decoration */}
              {isRunning && (
                  <div className="absolute inset-0 animate-spin-slow opacity-40 pointer-events-none">
                      <div className={`absolute top-0 left-1/2 w-2 h-2 rounded-full ${technique.color.replace('text', 'bg')} shadow-[0_0_10px_currentColor]`}></div>
                  </div>
              )}
          </div>

          {/* Controls & Stats */}
          <div className="w-full px-4 space-y-8 z-20">
              
              {/* Technique Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center">
                  {TECHNIQUES.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => selectTechnique(idx)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                            activeTechniqueIdx === idx 
                            ? `bg-slate-800 text-white ${t.border} shadow-lg` 
                            : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800/50'
                        }`}
                      >
                          {t.name}
                      </button>
                  ))}
              </div>

              <div className="text-center space-y-1">
                  <h3 className={`text-lg font-bold ${technique.color} transition-colors`}>{technique.name}</h3>
                  <p className="text-slate-400 text-sm">{technique.description}</p>
              </div>

              <div className="flex justify-center">
                <button
                    onClick={toggleTimer}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all active:scale-95 ${
                        isRunning 
                        ? 'bg-slate-800 text-red-400 border border-slate-700 hover:bg-slate-700' 
                        : 'bg-white text-slate-900 hover:bg-slate-200'
                    }`}
                >
                    <i className={`fa-solid ${isRunning ? 'fa-pause' : 'fa-play pl-1'}`}></i>
                </button>
              </div>

              <div className={`text-center transition-opacity duration-500 ${cycles > 0 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="inline-block bg-slate-800/50 px-4 py-1 rounded-full border border-slate-700/50">
                    <span className="text-xs text-slate-500 font-medium">Completed Cycles: <span className="text-white ml-1">{cycles}</span></span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};