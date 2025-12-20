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
            <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {generating ? (
            <div className="aspect-[4/5] w-full bg-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <i className="fa-solid fa-paintbrush fa-spin text-3xl mb-3"></i>
                <p className="text-sm font-black uppercase tracking-widest">Designing Your Card...</p>
            </div>
        ) : (
            <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                {imgUrl && <img src={imgUrl} alt="Share Preview" className="w-full h-full object-contain bg-slate-900" />}
            </div>
        )}

        <button 
            onClick={handleShare}
            disabled={generating}
            className="w-full mt-6 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-3 transition-all"
        >
            {generating ? (
                <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
            ) : (
                <><i className="fa-solid fa-share-nodes"></i> Share Achievement</>
            )}
        </button>
      </div>

      {/* HIDDEN RENDER AREA - This is what gets captured by html2canvas */}
      <div className="fixed left-[-9999px] top-0">
          <div 
            ref={cardRef} 
            className="w-[450px] h-[600px] bg-slate-950 text-white p-10 flex flex-col relative overflow-hidden"
          >
              {/* Desi Premium Background Theme */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF9933]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#138808]/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
              <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>

              {/* Header Logo Area */}
              <div className="flex justify-center mb-10 relative z-10">
                  <ApnaWalkLogo size={52} useGradient={false} />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col justify-center items-center relative z-10 text-center">
                  {type === 'quote' && (
                      <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-sm w-full">
                        <i className="fa-solid fa-quote-left text-5xl text-[#FF9933] mb-6 block opacity-80"></i>
                        <p className="text-3xl font-serif italic leading-tight text-slate-100 mb-8 font-black">
                            "{data.text}"
                        </p>
                        <div className="w-20 h-1.5 bg-gradient-to-r from-[#FF9933] to-[#138808] mx-auto mb-5 rounded-full"></div>
                        <p className="text-[#FF9933] font-black uppercase tracking-[4px] text-base">— {data.author}</p>
                      </div>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Walk Summary</h2>
                          <p className="text-[#138808] text-sm font-black mb-10 uppercase tracking-[6px]">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          
                          <div className="grid grid-cols-2 gap-5 mb-8">
                              <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                                  <i className="fa-solid fa-shoe-prints text-[#FF9933] text-2xl mb-2"></i>
                                  <div className="text-3xl font-black tabular-nums">{data.steps.toLocaleString()}</div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Steps</div>
                              </div>
                              <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                                  <i className="fa-solid fa-fire text-orange-500 text-2xl mb-2"></i>
                                  <div className="text-3xl font-black tabular-nums">{data.calories}</div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Calories</div>
                              </div>
                              <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                                  <i className="fa-solid fa-route text-blue-500 text-2xl mb-2"></i>
                                  <div className="text-3xl font-black tabular-nums">{(data.distance/1000).toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Kilometers</div>
                              </div>
                              <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                                  <i className="fa-solid fa-stopwatch text-purple-500 text-2xl mb-2"></i>
                                  <div className="text-3xl font-black tabular-nums">{Math.floor(data.duration/60)}m</div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Time</div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {/* Enhanced Footer with URL and Centered Icons */}
              <div className="mt-auto pt-8 border-t border-white/10 flex justify-between items-center relative z-10">
                  <div className="flex flex-col">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-[3px]">Tracking Active</p>
                      <p className="text-base font-black text-white italic tracking-tighter leading-none mt-1">ApnaWalk App</p>
                      <p className="text-[11px] text-[#138808] font-bold tracking-[2px] mt-1.5 opacity-90">www.apnawalk.com</p>
                  </div>
                  
                  {/* Perfectly Centered Icons */}
                  <div className="flex gap-3">
                      <div className="w-10 h-10 bg-slate-800/80 rounded-full flex items-center justify-center border border-white/5 shadow-xl">
                          <i className="fa-solid fa-person-walking text-white text-base leading-none"></i>
                      </div>
                      <div className="w-10 h-10 bg-slate-800/80 rounded-full flex items-center justify-center border border-white/5 shadow-xl">
                          <i className="fa-solid fa-robot text-white text-base leading-none"></i>
                      </div>
                  </div>
              </div>
              
              {/* Bottom Decorative Bar */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] opacity-50"></div>
          </div>
      </div>
    </div>
  );
};