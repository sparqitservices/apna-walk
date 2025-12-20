
import React, { useState, useEffect, useRef } from 'react';

interface BreathPhase {
  label: string;
  duration: number;
  scale: number;
  text: string;
}

interface BreathingTechnique {
  id: string;
  name: string;
  description: string;
  benefits: string;
  form: string;
  phases: BreathPhase[];
  color: string;
  gradient: string;
  border: string;
  shadow: string;
}

const TECHNIQUES: BreathingTechnique[] = [
  { 
    id: 'box', 
    name: 'Box Breathing', 
    description: 'The Navy SEAL technique for instant focus.',
    benefits: 'Regulates the autonomic nervous system, lowers cortisol, and improves concentration during high-stress situations.',
    form: 'Sit tall with your back straight. Inhale deeply through your nose, hold the air in your lungs, exhale slowly through your mouth, and hold the empty state. Keep all phases equal in length.',
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
    description: 'The "Natural Tranquilizer" for the nervous system.',
    benefits: 'Designed to bring the body into a state of deep relaxation. Highly effective for falling asleep or reducing acute anxiety.',
    form: 'Place the tip of your tongue against the ridge of tissue just behind your upper front teeth. Exhale completely through your mouth with a "whoosh" sound. Inhale quietly through your nose, hold, then exhale forcefully.',
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
    name: 'Coherent Breathing', 
    description: 'Sync your heart and mind for long-term balance.',
    benefits: 'Optimizes Heart Rate Variability (HRV). This slow, steady pace signals safety to the brain, balancing the emotional centers.',
    form: 'Breathe gently and naturally through your nose. Avoid force; let the breath flow like a pendulum. Focus on a smooth transition between inhalation and exhalation without any pause.',
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

// Add missing interface definition for the component props
interface BreathExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BreathExerciseModal: React.FC<BreathExerciseModalProps> = ({ isOpen, onClose }) => {
  const [activeTechniqueIdx, setActiveTechniqueIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TECHNIQUES[0].phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const technique = TECHNIQUES[activeTechniqueIdx];
  const currentPhase = technique.phases[phaseIdx];

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
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'start' ? 2 : 1));
      
      osc.start(now);
      osc.stop(now + (type === 'start' ? 2 : 1));
  };

  const speakGuide = (text: string) => {
      if (!soundEnabled) return;
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.7;
          window.speechSynthesis.speak(utterance);
      }
  };

  useEffect(() => {
    if (isOpen) {
        setPhaseIdx(0);
        setSecondsLeft(TECHNIQUES[activeTechniqueIdx].phases[0].duration);
        setCycles(0);
        setIsRunning(false);
        setShowInfo(false);
    } else {
        setIsRunning(false);
        window.speechSynthesis.cancel();
    }
  }, [isOpen, activeTechniqueIdx]);

  useEffect(() => {
    if (isRunning) {
        timerRef.current = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    handlePhaseChange();
                    return 0;
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
  }, [isRunning, phaseIdx, activeTechniqueIdx, soundEnabled]);

  const handlePhaseChange = () => {
      if (navigator.vibrate) navigator.vibrate(50);
      
      const nextPhaseIdx = (phaseIdx + 1) % technique.phases.length;
      const nextPhase = technique.phases[nextPhaseIdx];
      
      if (nextPhaseIdx === 0) {
          setCycles(c => c + 1);
          playTone(440, 'start');
      } else {
          playTone(330, 'transition');
      }
      
      speakGuide(nextPhase.text);
      
      setPhaseIdx(nextPhaseIdx);
      setSecondsLeft(nextPhase.duration);
  };

  const toggleTimer = () => {
      if (!isRunning) {
          initAudio();
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
      
      <div className="w-full max-w-md flex justify-between items-center absolute top-6 px-6 z-20">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">Breathe</h2>
            <p className="text-slate-400 text-xs font-medium">Mindfulness & Relaxation</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showInfo ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                title="Technique Info"
              >
                <i className="fa-solid fa-circle-info"></i>
              </button>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${soundEnabled ? 'bg-slate-800 text-brand-400' : 'bg-slate-800 text-slate-500'}`}
                title={soundEnabled ? "Mute Voice Cues" : "Unmute Voice Cues"}
              >
                <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
              </button>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative mt-12">
          
          {showInfo ? (
              <div className="w-full bg-slate-900/80 border border-slate-700 rounded-3xl p-6 animate-fade-in z-30 shadow-2xl backdrop-blur-xl">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className={`text-xl font-black ${technique.color}`}>{technique.name}</h3>
                      <button onClick={() => setShowInfo(false)} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                  <div className="space-y-5 overflow-y-auto max-h-[50vh] pr-2 no-scrollbar">
                      <div>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Overview</p>
                          <p className="text-sm text-slate-200 leading-relaxed">{technique.description}</p>
                      </div>
                      <div>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Key Benefits</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{technique.benefits}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                          <p className="text-xs font-black text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-person-rays"></i> Proper Form
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                              {technique.form}
                          </p>
                      </div>
                  </div>
                  <button 
                    onClick={() => { setShowInfo(false); if(!isRunning) toggleTimer(); }}
                    className={`w-full mt-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${technique.color.replace('text', 'bg')} text-slate-900`}
                  >
                    Start Now
                  </button>
              </div>
          ) : (
              <div 
                className="relative w-72 h-72 flex items-center justify-center mb-12 cursor-pointer group touch-manipulation"
                onClick={toggleTimer}
                role="button"
                aria-label={isRunning ? "Stop breathing exercise" : "Start breathing exercise"}
              >
                  <div 
                    className={`absolute inset-0 rounded-full bg-gradient-to-tr ${technique.gradient} blur-[60px] transition-all ease-in-out group-hover:opacity-40`}
                    style={{ 
                        transform: isRunning ? `scale(${currentPhase.scale * 1.15})` : 'scale(0.8)',
                        opacity: isRunning ? (currentPhase.scale > 1.0 ? 0.6 : 0.3) : 0.1,
                        transitionDuration: isRunning ? `${currentPhase.duration}s` : '1.5s'
                    }}
                  ></div>

                  <div 
                     className={`w-48 h-48 rounded-full border-4 ${technique.border} ${technique.shadow} flex items-center justify-center relative bg-slate-900/90 backdrop-blur-xl transition-all ease-in-out z-10 shadow-2xl group-active:scale-95 ${!isRunning ? 'animate-breathing' : ''}`}
                     style={{ 
                         transform: isRunning ? `scale(${currentPhase.scale})` : 'scale(1)',
                         transitionDuration: isRunning ? `${currentPhase.duration}s` : '1s'
                     }}
                  >
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        style={{ 
                            transform: isRunning ? `scale(${1/currentPhase.scale})` : 'scale(1)',
                            transition: 'transform 0s'
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
                                  <p className="text-slate-300 font-medium">Tap to Start</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {isRunning && (
                      <div className="absolute inset-0 animate-spin-slow opacity-40 pointer-events-none">
                          <div className={`absolute top-0 left-1/2 w-2 h-2 rounded-full ${technique.color.replace('text', 'bg')} shadow-[0_0_10px_currentColor]`}></div>
                      </div>
                  )}
              </div>
          )}

          <div className="w-full px-4 space-y-8 z-20">
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

              {!showInfo && (
                  <div className="text-center space-y-1">
                      <h3 className={`text-lg font-bold ${technique.color} transition-colors`}>{technique.name}</h3>
                      <p className="text-slate-400 text-sm">{technique.description}</p>
                  </div>
              )}

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
