import React, { useMemo } from 'react';

interface VirtualTrekCardProps {
  totalLifetimeSteps: number;
}

const TREKS = [
  {
    id: 'marine-drive',
    name: 'Marine Drive Stroll',
    location: 'Mumbai',
    steps: 6000,
    image: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&q=80&w=1000',
    description: "The Queen's Necklace walk."
  },
  {
    id: 'lalbagh',
    name: 'Lalbagh Botanical Garden',
    location: 'Bangalore',
    steps: 15000,
    image: 'https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&q=80&w=1000',
    description: "A lush green path through the Glass House."
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal Gardens',
    location: 'Agra',
    steps: 30000,
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=1000',
    description: "Walking through history."
  },
  {
    id: 'rishikesh',
    name: 'Ganga Path',
    location: 'Rishikesh',
    steps: 75000,
    image: 'https://images.unsplash.com/photo-1598324789736-486160d1f961?auto=format&fit=crop&q=80&w=1000',
    description: "Serenity by the holy river."
  },
  {
    id: 'valley-flowers',
    name: 'Valley of Flowers',
    location: 'Uttarakhand',
    steps: 150000,
    image: 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?auto=format&fit=crop&q=80&w=1000',
    description: "A steep trek to paradise."
  },
  {
    id: 'leh-ladakh',
    name: 'The Great Himalayan Trek',
    location: 'Ladakh',
    steps: 500000,
    image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&q=80&w=1000',
    description: "The ultimate endurance test."
  }
];

export const VirtualTrekCard: React.FC<VirtualTrekCardProps> = ({ totalLifetimeSteps }) => {
  
  const progressData = useMemo(() => {
    let accumulated = 0;
    
    for (let i = 0; i < TREKS.length; i++) {
        const trek = TREKS[i];
        const threshold = accumulated + trek.steps;

        // If user is currently working on this trek
        if (totalLifetimeSteps < threshold) {
            const stepsInCurrentTrek = totalLifetimeSteps - accumulated;
            const percent = (stepsInCurrentTrek / trek.steps) * 100;
            return {
                current: trek,
                next: TREKS[i + 1] || null,
                percent: Math.max(5, percent), // Min 5% for visual
                stepsLeft: trek.steps - stepsInCurrentTrek,
                completed: false
            };
        }
        accumulated += trek.steps;
    }

    // If all completed
    return {
        current: TREKS[TREKS.length - 1],
        next: null,
        percent: 100,
        stepsLeft: 0,
        completed: true
    };
  }, [totalLifetimeSteps]);

  const { current, percent, stepsLeft, completed } = progressData;

  return (
    <div className="w-full max-w-md mb-8 relative group overflow-hidden rounded-3xl shadow-xl shadow-black/20">
       
       {/* Background Image */}
       <div className="absolute inset-0 z-0">
          <img 
            src={current.image} 
            alt={current.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-dark-card/80 to-transparent"></div>
       </div>

       <div className="relative z-10 p-6">
          <div className="flex justify-between items-start mb-4">
             <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Current Expedition
                    </span>
                </div>
                <h3 className="text-white font-bold text-xl leading-tight">{current.name}</h3>
                <p className="text-brand-400 text-sm font-medium"><i className="fa-solid fa-location-dot mr-1"></i> {current.location}</p>
             </div>
             {completed && (
                 <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-dark-bg shadow-lg animate-bounce">
                     <i className="fa-solid fa-trophy"></i>
                 </div>
             )}
          </div>

          <p className="text-slate-300 text-xs mb-4 line-clamp-2 opacity-80">
              {current.description}
          </p>

          <div className="space-y-2">
             <div className="flex justify-between text-xs font-bold">
                 <span className="text-white">{Math.round(percent)}% Complete</span>
                 <span className="text-slate-400">{completed ? 'Expedition Complete!' : `${stepsLeft.toLocaleString()} steps to go`}</span>
             </div>
             
             {/* Progress Bar */}
             <div className="h-3 w-full bg-slate-800/50 rounded-full backdrop-blur-sm border border-slate-600/30 overflow-hidden">
                 <div 
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 relative"
                    style={{ width: `${percent}%` }}
                 >
                     <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[width_2s_ease-in-out_infinite]"></div>
                 </div>
             </div>
          </div>
       </div>
    </div>
  );
};