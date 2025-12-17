import React from 'react';

interface RhythmGuideProps {
    bpm: number;
    isPlaying: boolean;
    togglePlay: () => void;
    setBpm: (bpm: number) => void;
    onClick: () => void;
}

export const RhythmGuide: React.FC<RhythmGuideProps> = ({ bpm, isPlaying, togglePlay, setBpm, onClick }) => {
  
  // Visual pulse duration calculation for CSS
  const pulseSpeed = 60 / bpm;

  const getIntensityColor = () => {
      if (bpm < 110) return 'text-blue-400';
      if (bpm < 130) return 'text-brand-400';
      return 'text-orange-400';
  };

  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md bg-dark-card border border-slate-800 px-5 py-4 rounded-3xl shadow-lg relative overflow-hidden transition-all group cursor-pointer hover:border-slate-600 flex items-center gap-4 h-[110px]"
    >
      
      {/* Background Pulse Effect */}
      {isPlaying && (
           <div 
             className="absolute left-10 top-1/2 -translate-y-1/2 w-32 h-32 bg-current opacity-10 rounded-full animate-ping pointer-events-none"
             style={{ 
                 color: bpm < 110 ? '#60a5fa' : bpm < 130 ? '#4ade80' : '#fb923c',
                 animationDuration: `${pulseSpeed}s` 
             }}
           ></div>
      )}

      {/* Play Button (Left Side) */}
      <div className="relative z-10 shrink-0">
        <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl transition-all active:scale-95 border-2 ${isPlaying ? 'bg-slate-800 border-red-500 text-red-500' : 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500'}`}
        >
            <i className={`fa-solid ${isPlaying ? 'fa-stop' : 'fa-play pl-1'}`}></i>
        </button>
      </div>

      {/* Controls (Right Side - Expanded) */}
      <div className="flex-1 flex flex-col justify-center gap-2 relative z-10">
          
          {/* Header Row */}
          <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <i className="fa-solid fa-drum text-slate-400 text-xs"></i> Rhythm Guide
              </h3>
              <div className={`text-sm font-black font-mono ${isPlaying ? getIntensityColor() : 'text-slate-500'}`}>
                  {bpm} BPM
              </div>
          </div>

          {/* Slider Row */}
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setBpm(Math.max(80, bpm - 5))} className="w-6 h-6 rounded bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs border border-slate-700">
                  <i className="fa-solid fa-minus"></i>
              </button>
              
              <div className="flex-1 h-8 flex items-center">
                <input 
                    type="range" 
                    min="80" 
                    max="160" 
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-brand-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button onClick={() => setBpm(Math.min(160, bpm + 5))} className="w-6 h-6 rounded bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs border border-slate-700">
                  <i className="fa-solid fa-plus"></i>
              </button>
          </div>

          {/* Presets Row */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
             <span className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${bpm === 100 ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'text-slate-500 border-slate-700 hover:bg-slate-800'}`} onClick={() => setBpm(100)}>Stroll</span>
             <span className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${bpm === 120 ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' : 'text-slate-500 border-slate-700 hover:bg-slate-800'}`} onClick={() => setBpm(120)}>Brisk</span>
             <span className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${bpm === 140 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'text-slate-500 border-slate-700 hover:bg-slate-800'}`} onClick={() => setBpm(140)}>Power</span>
          </div>
      </div>
    </div>
  );
};