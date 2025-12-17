import React from 'react';

interface RhythmDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
}

const MODES = [
    { 
        id: 'stroll', 
        bpm: 100, 
        label: 'Stroll', 
        desc: 'Slow Normal Walk', 
        detail: 'Casual pace. Good for warm-ups or recovery.',
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        activeBorder: 'border-blue-500' 
    },
    { 
        id: 'brisk', 
        bpm: 120, 
        label: 'Brisk', 
        desc: 'Fat Burn Zone', 
        detail: 'Elevated heart rate. You should be breathing harder but able to talk.',
        color: 'text-brand-400', 
        bg: 'bg-brand-500/10',
        border: 'border-brand-500/20',
        activeBorder: 'border-brand-500'
    },
    { 
        id: 'power', 
        bpm: 140, 
        label: 'Power', 
        desc: 'Fast Cardio', 
        detail: 'High intensity. Arms swinging, purposeful strides.',
        color: 'text-orange-400', 
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        activeBorder: 'border-orange-500'
    }
];

export const RhythmDetailModal: React.FC<RhythmDetailModalProps> = ({ 
    isOpen, onClose, bpm, setBpm, isPlaying, togglePlay 
}) => {
  if (!isOpen) return null;

  const pulseSpeed = 60 / bpm;
  
  // Find current mode roughly
  const currentMode = MODES.reduce((prev, curr) => {
      return (Math.abs(curr.bpm - bpm) < Math.abs(prev.bpm - bpm) ? curr : prev);
  });

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-white font-bold text-xl">Rhythm Guide</h2>
            <p className="text-slate-400 text-xs">Pace yourself perfectly</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            
            {/* Visualizer Circle */}
            <div className="flex justify-center mb-8 relative">
                <div 
                    onClick={togglePlay}
                    className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl cursor-pointer transition-all active:scale-95 ${isPlaying ? `${currentMode.activeBorder} bg-slate-800` : 'border-slate-700 bg-slate-800/50'}`}
                >
                    {isPlaying && (
                        <div 
                            className={`absolute w-full h-full rounded-full ${currentMode.bg} opacity-50 animate-ping pointer-events-none`}
                            style={{ animationDuration: `${pulseSpeed}s` }}
                        ></div>
                    )}
                    
                    <span className={`text-4xl font-black tabular-nums ${currentMode.color}`}>{bpm}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">BPM</span>
                    
                    <div className="mt-2">
                        {isPlaying ? <i className="fa-solid fa-pause text-white"></i> : <i className="fa-solid fa-play text-white"></i>}
                    </div>
                </div>
            </div>

            {/* Slider */}
            <div className="mb-8 px-2">
                <input 
                    type="range" 
                    min="80" 
                    max="160" 
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-white h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-bold uppercase">
                    <span>Slow</span>
                    <span>Fast</span>
                </div>
            </div>

            {/* Modes Grid */}
            <div className="grid gap-3">
                {MODES.map((mode) => {
                    const isActive = Math.abs(bpm - mode.bpm) < 10;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => setBpm(mode.bpm)}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${isActive ? `${mode.bg} ${mode.activeBorder}` : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                                <i className={`fa-solid ${mode.id === 'stroll' ? 'fa-person' : mode.id === 'brisk' ? 'fa-person-walking' : 'fa-person-running'}`}></i>
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                    {mode.label} <span className="opacity-50 text-xs font-normal ml-1">({mode.bpm} BPM)</span>
                                </h3>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${mode.color}`}>{mode.desc}</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">{mode.detail}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

      </div>
    </div>
  );
};