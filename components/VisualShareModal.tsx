import React, { useRef, useState, useEffect } from 'react';
import { ApnaWalkLogo } from './ApnaWalkLogo';

declare const html2canvas: any;

interface VisualShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quote' | 'stats';
  data: any;
}

export const VisualShareModal: React.FC<VisualShareModalProps> = ({ isOpen, onClose, type, data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setImgUrl(null);
      setGenerating(true);
      // Wait for DOM to render the hidden card
      setTimeout(generateImage, 1000);
    }
  }, [isOpen, data]);

  const generateImage = async () => {
    if (cardRef.current && typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2, // High resolution
          backgroundColor: '#1a2327', // Dark theme background
          useCORS: true,
          logging: false
        });
        setImgUrl(canvas.toDataURL('image/png'));
        setGenerating(false);
      } catch (err) {
        console.error("Image generation failed", err);
        setGenerating(false);
      }
    }
  };

  const handleShare = async () => {
    if (!imgUrl) return;
    
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "apnawalk-share.png", { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My ApnaWalk Update',
          text: type === 'quote' ? 'Found this inspiring quote on ApnaWalk!' : 'Check out my latest workout stats!'
        });
      } else {
        // Fallback: Download
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = 'apnawalk-card.png';
        link.click();
      }
    } catch (e) {
      console.log('Share failed, fallback to download', e);
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = 'apnawalk-card.png';
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-sm relative">
        <div className="flex justify-between items-center mb-4 text-white">
            <h3 className="font-bold text-lg">Share Card</h3>
            <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {generating ? (
            <div className="aspect-[4/5] w-full bg-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <i className="fa-solid fa-paintbrush fa-spin text-3xl mb-3"></i>
                <p className="text-sm">Creating design...</p>
            </div>
        ) : (
            <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                {imgUrl && <img src={imgUrl} alt="Share Preview" className="w-full h-full object-contain bg-slate-900" />}
            </div>
        )}

        <button 
            onClick={handleShare}
            disabled={generating}
            className="w-full mt-6 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
            {generating ? 'Processing...' : <><i className="fa-solid fa-share-nodes"></i> Share / Download</>}
        </button>
      </div>

      {/* HIDDEN RENDER AREA - This is what gets captured */}
      <div className="fixed left-[-9999px] top-0">
          <div 
            ref={cardRef} 
            className="w-[400px] h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 flex flex-col relative overflow-hidden"
          >
              {/* Background patterns */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

              {/* Header */}
              <div className="flex justify-center mb-8 relative z-10 scale-90 origin-top">
                  <ApnaWalkLogo size={40} useGradient={false} />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center items-center relative z-10 text-center">
                  {type === 'quote' && (
                      <>
                        <i className="fa-solid fa-quote-left text-4xl text-brand-500/50 mb-4 self-start"></i>
                        <p className="text-2xl font-serif italic leading-relaxed text-slate-100 mb-6">
                            "{data.text}"
                        </p>
                        <div className="w-16 h-1 bg-brand-500 rounded-full mb-4"></div>
                        <p className="text-brand-400 font-bold uppercase tracking-widest text-sm">— {data.author}</p>
                      </>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter italic">Workout Complete</h2>
                          <p className="text-brand-400 text-sm font-bold mb-8 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                                  <i className="fa-solid fa-shoe-prints text-brand-500 text-xl mb-1"></i>
                                  <div className="text-2xl font-bold">{data.steps}</div>
                                  <div className="text-[10px] text-slate-400 uppercase">Steps</div>
                              </div>
                              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                                  <i className="fa-solid fa-fire text-orange-500 text-xl mb-1"></i>
                                  <div className="text-2xl font-bold">{data.calories}</div>
                                  <div className="text-[10px] text-slate-400 uppercase">Calories</div>
                              </div>
                              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                                  <i className="fa-solid fa-route text-blue-500 text-xl mb-1"></i>
                                  <div className="text-2xl font-bold">{(data.distance/1000).toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-400 uppercase">Km</div>
                              </div>
                              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                                  <i className="fa-solid fa-stopwatch text-purple-500 text-xl mb-1"></i>
                                  <div className="text-2xl font-bold">{Math.floor(data.duration/60)}m</div>
                                  <div className="text-[10px] text-slate-400 uppercase">Time</div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-end relative z-10">
                  <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tracked on</p>
                      <p className="text-sm font-bold text-white">ApnaWalk App</p>
                  </div>
                  <div className="flex gap-2">
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs"><i className="fa-solid fa-person-walking"></i></div>
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs"><i className="fa-solid fa-robot"></i></div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};