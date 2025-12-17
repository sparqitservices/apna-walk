import { useState, useEffect, useRef, useCallback } from 'react';

export const useMetronome = (initialBpm: number = 115) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [volume, setVolume] = useState(0.5);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const lookahead = 25.0; 
  const scheduleAheadTime = 0.1; 

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = useCallback((time: number) => {
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
  }, [volume]);

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < (audioCtxRef.current?.currentTime || 0) + scheduleAheadTime) {
        playClick(nextNoteTimeRef.current);
        const secondsPerBeat = 60.0 / bpm;
        nextNoteTimeRef.current += secondsPerBeat;
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  }, [bpm, playClick]);

  // Restart scheduler if BPM changes while playing to update timing immediately
  useEffect(() => {
      if (isPlaying) {
          if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
          scheduler();
      }
      return () => {
          if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      };
  }, [bpm, isPlaying, scheduler]);

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

  return {
      isPlaying,
      togglePlay,
      bpm,
      setBpm,
      volume, 
      setVolume
  };
};