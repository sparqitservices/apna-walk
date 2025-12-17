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
      if (bpm < 110) return 'text-blue-400 border-blue-500/30 shadow-blue-500/20'; // Stroll (100)
      if (bpm < 130) return 'text-brand-400 border-brand-500/30 shadow-brand-500/20'; // Brisk (120)
      return 'text-orange-400 border-orange-500/30 shadow-orange-500/20'; // Power (140)
  };

  const getLabel = () => {
      if (bpm < 110) return 'Stroll';
      if (bpm < 130) return 'Brisk';
      return 'Power';
  };

  return (
    <div 
        onClick={onClick}
        className="w-full max-w-md h-full min-h-[260px] bg-dark-card border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden transition-all flex flex-col justify-between group cursor-pointer hover:border-slate-600"
    >
      
      {/* Background Pulse Effect */}
      {isPlaying && (
           <div 
             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-current opacity-5 rounded-full animate-ping pointer-events-none"
             style={{ 
                 color: bpm < 110 ? '#60a5fa' : bpm < 130 ? '#4ade80' : '#fb923c',
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
        {/* Play Button - Stop propagation to prevent opening modal when just toggling play */}
        <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl transition-all active:scale-95 border-2 ${isPlaying ? 'bg-slate-800 border-red-500 text-red-500' : 'bg-brand-600 border-brand-500 text-white hover:bg-brand-500'}`}
        >
            <i className={`fa-solid ${isPlaying ? 'fa-stop' : 'fa-play pl-1'}`}></i>
        </button>

        {/* Sliders Area - Clicking here stops propagation to allow interacting with controls without opening modal */}
        <div className="flex-1 space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Presets */}
            <div className="flex justify-between gap-1">
                <button onClick={() => setBpm(100)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 100 ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Stroll</button>
                <button onClick={() => setBpm(120)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 120 ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Brisk</button>
                <button onClick={() => setBpm(140)} className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors border ${bpm === 140 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>Power</button>
            </div>

            {/* Slider */}
            <div className="relative h-6 flex items-center">
                <input 
                    type="range" 
                    min="80" 
                    max="160" 
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
      </div>
      
      {/* Visual Footer */}
      <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-700/50 relative z-10">
          <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Current Mode</p>
              <p className={`text-sm font-bold ${bpm < 110 ? 'text-blue-400' : bpm < 130 ? 'text-brand-400' : 'text-orange-400'}`}>
                  {getLabel()}
              </p>
          </div>
          <span className="text-[10px] text-brand-400 font-bold flex items-center gap-1 group-hover:underline">
              More Details <i className="fa-solid fa-arrow-right"></i>
          </span>
      </div>
    </div>
  );
};