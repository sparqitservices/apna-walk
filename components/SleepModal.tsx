import React, { useState, useEffect, useRef } from 'react';

interface SleepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOUNDSCAPES = [
    { id: 'white', name: 'White Noise', icon: 'fa-fan', color: 'text-slate-300', desc: 'Consistent static for blocking noise' },
    { id: 'pink', name: 'Heavy Rain', icon: 'fa-cloud-showers-heavy', color: 'text-blue-400', desc: 'Deep soothing pink noise' },
    { id: 'brown', name: 'Distant Thunder', icon: 'fa-bolt', color: 'text-indigo-400', desc: 'Low rumble brown noise' },
    { id: 'theta', name: 'Theta Waves', icon: 'fa-brain', color: 'text-purple-400', desc: 'Binaural beats for deep relaxation' },
];

export const SleepModal: React.FC<SleepModalProps> = ({ isOpen, onClose }) => {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Initialize Audio Context
  const initAudio = () => {
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  };

  const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'pink' | 'brown') => {
      const bufferSize = 2 * ctx.sampleRate; // 2 seconds buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      if (type === 'white') {
          for (let i = 0; i < bufferSize; i++) {
              output[i] = Math.random() * 2 - 1;
          }
      } else if (type === 'pink') {
          let b0, b1, b2, b3, b4, b5, b6;
          b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              b0 = 0.99886 * b0 + white * 0.0555179;
              b1 = 0.99332 * b1 + white * 0.0750759;
              b2 = 0.96900 * b2 + white * 0.1538520;
              b3 = 0.86650 * b3 + white * 0.3104856;
              b4 = 0.55000 * b4 + white * 0.5329522;
              b5 = -0.7616 * b5 - white * 0.0168980;
              output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
              output[i] *= 0.11; 
              b6 = white * 0.115926;
          }
      } else if (type === 'brown') {
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              output[i] = (lastOut + (0.02 * white)) / 1.02;
              lastOut = output[i];
              output[i] *= 3.5; 
          }
      }
      return buffer;
  };

  const playSound = (id: string) => {
      initAudio();
      stopSound(); // Stop previous

      const ctx = audioCtxRef.current!;
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      if (id === 'theta') {
          // Binaural Beats: Two oscillators with slight difference
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const merger = ctx.createChannelMerger(2);
          
          osc1.type = 'sine';
          osc1.frequency.value = 200; // Carrier
          osc1.connect(merger, 0, 0); // Left

          osc2.type = 'sine';
          osc2.frequency.value = 206; // 6Hz difference (Theta)
          osc2.connect(merger, 0, 1); // Right

          merger.connect(gainNode);
          osc1.start();
          osc2.start();
          
          // Store both as a custom object to stop later
          sourceNodeRef.current = { 
              stop: () => { osc1.stop(); osc2.stop(); },
              disconnect: () => { osc1.disconnect(); osc2.disconnect(); } 
          } as any;

      } else {
          // Noise Colors
          const buffer = createNoiseBuffer(ctx, id as 'white' | 'pink' | 'brown');
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(gainNode);
          source.start();
          sourceNodeRef.current = source;
      }

      setActiveSound(id);
  };

  const stopSound = () => {
      if (sourceNodeRef.current) {
          try {
            (sourceNodeRef.current as any).stop();
            sourceNodeRef.current.disconnect();
          } catch(e) {}
          sourceNodeRef.current = null;
      }
      setActiveSound(null);
  };

  const handleVolumeChange = (newVol: number) => {
      setVolume(newVol);
      if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(newVol, audioCtxRef.current!.currentTime);
      }
  };

  const startTimer = (min: number) => {
      setTimerMinutes(min);
      setTimeLeft(min * 60);
      
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      timerIntervalRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  stopSound();
                  setTimerMinutes(null);
                  clearInterval(timerIntervalRef.current!);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const cancelTimer = () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setTimerMinutes(null);
      setTimeLeft(0);
  };

  // Cleanup on unmount/close
  useEffect(() => {
      if (!isOpen) {
          stopSound();
          cancelTimer();
      }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1b4b] w-full max-w-md rounded-3xl overflow-hidden border border-indigo-900 shadow-2xl relative flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-center z-10">
            <div>
                <h2 className="text-white font-bold text-2xl tracking-tight">Sleep Sanctuary</h2>
                <p className="text-indigo-300 text-xs">Calming sounds for deep rest</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-300 hover:text-white flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {/* Visualizer / Active State */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Stars */}
            <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-20 right-20 w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
                <div className="absolute bottom-10 left-1/2 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse delay-150"></div>
            </div>

            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${activeSound ? 'bg-indigo-500/10 shadow-[0_0_50px_rgba(99,102,241,0.2)]' : 'bg-slate-900/50'}`}>
                {activeSound ? (
                    <>
                        <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                        <i className={`fa-solid ${SOUNDSCAPES.find(s => s.id === activeSound)?.icon} text-5xl text-indigo-200 animate-pulse`}></i>
                    </>
                ) : (
                    <i className="fa-solid fa-moon text-5xl text-slate-700"></i>
                )}
            </div>

            {timerMinutes && (
                <div className="mt-6 bg-indigo-900/40 border border-indigo-500/30 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <i className="fa-regular fa-clock text-indigo-300 text-xs"></i>
                    <span className="text-white font-mono text-sm font-bold">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <button onClick={cancelTimer} className="ml-2 text-indigo-400 hover:text-white text-xs">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-[#17153b] border-t border-indigo-900/50">
            
            {/* Sound Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {SOUNDSCAPES.map((sound) => (
                    <button
                        key={sound.id}
                        onClick={() => activeSound === sound.id ? stopSound() : playSound(sound.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all active:scale-95 text-left ${
                            activeSound === sound.id 
                            ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50' 
                            : 'bg-indigo-900/20 border-indigo-900/50 hover:bg-indigo-900/40'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeSound === sound.id ? 'bg-indigo-500 text-white' : 'bg-indigo-950 ' + sound.color}`}>
                            <i className={`fa-solid ${sound.icon}`}></i>
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${activeSound === sound.id ? 'text-white' : 'text-slate-300'}`}>{sound.name}</div>
                            <div className="text-[10px] text-indigo-300/60 leading-none mt-0.5 hidden sm:block">{sound.desc}</div>
                        </div>
                        {activeSound === sound.id && <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
                    </button>
                ))}
            </div>

            {/* Volume */}
            <div className="mb-6 flex items-center gap-3">
                <i className="fa-solid fa-volume-low text-indigo-400 text-xs"></i>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer"
                />
                <i className="fa-solid fa-volume-high text-indigo-400 text-xs"></i>
            </div>

            {/* Timer Presets */}
            <div className="flex justify-between items-center bg-indigo-950/50 p-1 rounded-xl">
                {[15, 30, 60].map(min => (
                    <button
                        key={min}
                        onClick={() => startTimer(min)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                            timerMinutes === min 
                            ? 'bg-indigo-600 text-white shadow' 
                            : 'text-indigo-300 hover:text-white hover:bg-indigo-900'
                        }`}
                    >
                        {min} Min
                    </button>
                ))}
                <button 
                    onClick={cancelTimer} 
                    className="px-3 text-indigo-400 hover:text-white text-xs disabled:opacity-30" 
                    disabled={!timerMinutes}
                >
                    Off
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};