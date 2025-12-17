import React, { useState, useEffect, useRef } from 'react';

export const RhythmGuide: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(115);
  const [volume, setVolume] = useState(0.5);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

  // Initialize AudioContext
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = (time: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();

    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);

    // High pitch short "tick"
    osc.frequency.value = 1200;
    osc.type = 'sine';

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  };

  const scheduler = () => {
    // while there are notes that will play this time interval
    while (nextNoteTimeRef.current < (audioCtxRef.current?.currentTime || 0) + scheduleAheadTime) {
        playClick(nextNoteTimeRef.current);
        const secondsPerBeat = 60.0 / bpm;
        nextNoteTimeRef.current += secondsPerBeat;
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      setIsPlaying(false);
    } else {
      initAudio();
      nextNoteTimeRef.current = audioCtxRef.current?.currentTime || 0;
      scheduler();
      setIsPlaying(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    };
  }, []);

  // Visual pulse duration calculation for CSS
  const pulseSpeed = 60 / bpm;

  const getIntensityColor = () => {
      if (bpm < 105) return 'text-blue-400 border-blue-500/30 shadow-blue-500/20';
      if (bpm < 125) return 'text-brand-400 border-brand-500/30 shadow-brand-500/20';
      return 'text-orange-400 border-orange-500/30 shadow-orange-500/20';
  };

  return (
    <div className="w-full max-w-md h-full min-h-[260px] bg-dark-card border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden transition-all flex flex-col justify-between">
      
      {/* Background Pulse Effect */}
      {isPlaying && (
           <div 
             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-current opacity-5 rounded-full animate-ping pointer-events-none"
             style={{ 
                 color: bpm < 105 ? '#60a5fa' : bpm < 125 ? '#4ade80' : '#fb923c',
                 animationDuration: `${pulseSpeed}s` 
             }}
           ></div>
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-drum text-slate-400 text-sm"></i> Rhythm Guide
            </h3>
            <p className="text-slate-400 text-xs">Sync your steps to the beat</p>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${isPlaying ? getIntensityColor() : 'text-slate-500 border-slate-700 bg-slate-800'}`}>
            {bpm} BPM
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        {/* Play Button */}
        <button 
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl transition-all active:scale-95 border-2 ${isPlaying ? 'bg-slate-800 border-red-500 text-red-500' : 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500'}`}
        >
            <i className={`fa-solid ${isPlaying ? 'fa-stop' : 'fa-play pl-1'}`}></i>
        </button>

        {/* Sliders Area */}
        <div className="flex-1 space-y-3">
            {/* Presets */}
            <div className="flex justify-between gap-1">
                <button onClick={() => setBpm(100)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 100 ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Stroll</button>
                <button onClick={() => setBpm(115)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 115 ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Brisk</button>
                <button onClick={() => setBpm(130)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 130 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Power</button>
            </div>

            {/* Slider */}
            <div className="relative h-6 flex items-center">
                <input 
                    type="range" 
                    min="90" 
                    max="140" 
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
      </div>
      
      {/* Visual Metronome Dots */}
      <div className="flex justify-center gap-2 mt-4 opacity-50">
          {[1,2,3,4].map(i => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-75 ${isPlaying ? 'bg-brand-400' : 'bg-slate-700'}`}
                style={{ 
                    animation: isPlaying ? `bounce ${pulseSpeed}s infinite` : 'none',
                    animationDelay: `${i * (pulseSpeed/4)}s` 
                }}
              ></div>
          ))}
      </div>
    </div>
  );
};