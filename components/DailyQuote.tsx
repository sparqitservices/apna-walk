import React, { useMemo } from 'react';

const QUOTES = [
  { text: "Walking is man's best medicine.", author: "Hippocrates" },
  { text: "All truly great thoughts are conceived while walking.", author: "Friedrich Nietzsche" },
  { text: "An early-morning walk is a blessing for the whole day.", author: "Henry David Thoreau" },
  { text: "Walking brings me back to myself.", author: "Laurette Gagnon Beaulieu" },
  { text: "If you are in a bad mood, go for a walk. If you are still in a bad mood, go for another walk.", author: "Hippocrates" },
  { text: "Walking: the most ancient exercise and still the best modern exercise.", author: "Carrie Latet" },
  { text: "Everywhere is walking distance if you have the time.", author: "Steven Wright" },
  { text: "Thoughts come clearly while one walks.", author: "Thomas Mann" },
  { text: "Me thinks that the moment my legs begin to move, my thoughts begin to flow.", author: "Henry David Thoreau" },
  { text: "Walk as if you are kissing the Earth with your feet.", author: "Thich Nhat Hanh" },
  { text: "The best remedy for a short temper is a long walk.", author: "Jacqueline Schiff" },
  { text: "Of all exercises walking is the best.", author: "Thomas Jefferson" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Walking is the best possible exercise. Habituate yourself to walk very far.", author: "Thomas Jefferson" }
];

interface DailyQuoteProps {
    onShare?: (quote: { text: string, author: string }) => void;
}

export const DailyQuote: React.FC<DailyQuoteProps> = ({ onShare }) => {
  const quote = useMemo(() => {
    // Select a quote based on the day of the year (rotates daily)
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    
    // Use modulus to cycle through quotes if we run out of unique days vs quotes length
    return QUOTES[day % QUOTES.length];
  }, []);

  return (
    <div 
        onClick={() => onShare && onShare(quote)}
        className="w-full bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl mb-6 relative overflow-hidden group hover:bg-slate-800/60 transition-all cursor-pointer active:scale-[0.99] shadow-md hover:border-brand-500/30"
        title="Tap to share this quote"
    >
       {/* Decorative Quote Mark */}
       <div className="absolute top-2 right-4 text-slate-700/30 text-6xl font-serif font-black transform translate-x-2 -translate-y-2 select-none pointer-events-none">
         "
       </div>
       
       <div className="relative z-10 flex gap-4">
          <div className="w-1 bg-gradient-to-b from-brand-400 to-brand-600 rounded-full h-auto shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
          <div>
              <p className="text-slate-200 italic text-sm mb-3 leading-relaxed font-medium group-hover:text-white transition-colors">
                  "{quote.text}"
              </p>
              <div className="flex justify-between items-end">
                  <p className="text-brand-400 text-[10px] font-bold uppercase tracking-widest opacity-80">
                      — {quote.author}
                  </p>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fa-solid fa-share-nodes mr-1"></i> Share
                  </span>
              </div>
          </div>
       </div>
    </div>
  );
};