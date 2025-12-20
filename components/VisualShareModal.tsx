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
      // Increased delay slightly to ensure clean render
      const timer = setTimeout(generateImage, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  const generateImage = async () => {
    if (cardRef.current && typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2, // 2x density for sharp social media posts
          backgroundColor: '#0f172a', 
          useCORS: true,
          logging: false,
          allowTaint: true
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
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const file = new File([blob], "apnawalk-update.png", { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My ApnaWalk Progress',
          text: type === 'quote' ? 'Today\'s inspiration from ApnaWalk!' : 'Crushing my fitness goals with ApnaWalk!'
        });
      } else {
        handleDownload(); // Fallback
      }
    } catch (e) {
      console.log('Share failed', e);
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imgUrl) return;
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `apnawalk-${type}-${Date.now()}.png`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-sm relative animate-message-pop">
        <div className="flex justify-between items-center mb-6 text-white px-2">
            <div>
                <h3 className="font-black text-xl italic tracking-tighter uppercase">Export Progress</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[3px]">Share with your squad</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-800/50 rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700/50 shadow-lg">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {/* Card Preview Container */}
        <div className="aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 bg-slate-900 group relative">
            {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 rounded-2xl border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[5px] animate-pulse">Rendering Design...</p>
                </div>
            ) : (
                <img src={imgUrl!} alt="Share Preview" className="w-full h-full object-contain" />
            )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
            <button 
                onClick={handleShare}
                disabled={generating}
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 disabled:opacity-30 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-brand-500/20 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-xs"
            >
                <i className="fa-solid fa-share-nodes text-base"></i> Share Achievement
            </button>
            
            <button 
                onClick={handleDownload}
                disabled={generating}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black py-4 rounded-[1.5rem] shadow-lg disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-xs"
            >
                <i className="fa-solid fa-download text-base"></i> Save to Gallery
            </button>
        </div>
      </div>

      {/* HIDDEN RENDER AREA - Optimized for html2canvas capture */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div 
            ref={cardRef} 
            className="w-[500px] h-[625px] bg-[#020617] text-white p-12 flex flex-col relative overflow-hidden"
          >
              {/* Premium Background Elements */}
              <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
              
              {/* Geometric Decoration */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>
              
              {/* Dot Grid Pattern Overlay */}
              <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '24px 24px'}}></div>

              {/* Branding Header */}
              <div className="flex justify-between items-center mb-12 relative z-10">
                  <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex items-center gap-4">
                      <ApnaWalkLogo size={44} useGradient={false} />
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px]">Certified By</p>
                      <p className="text-base font-black text-white italic leading-tight">ApnaWalk AI</p>
                  </div>
              </div>

              {/* Content Core */}
              <div className="flex-1 flex flex-col justify-center relative z-10">
                  {type === 'quote' && (
                      <div className="text-center bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-brand-500/40"></div>
                        <i className="fa-solid fa-quote-left text-6xl text-brand-500 mb-8 block opacity-30"></i>
                        <p className="text-3xl font-black italic leading-[1.2] text-white mb-10 tracking-tight">
                            "{data.text}"
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-px bg-slate-700"></div>
                            <p className="text-brand-400 font-black uppercase tracking-[5px] text-sm">{data.author}</p>
                            <div className="w-12 h-px bg-slate-700"></div>
                        </div>
                      </div>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <div className="mb-10 text-center">
                              <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter italic">Walk Summary</h2>
                              <div className="inline-block px-4 py-1.5 bg-brand-600/20 rounded-full border border-brand-500/20">
                                <p className="text-brand-400 text-xs font-black uppercase tracking-[5px]">
                                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                              {[
                                  { icon: 'fa-shoe-prints', color: 'text-brand-400', val: data.steps.toLocaleString(), label: 'Steps', bg: 'bg-brand-500/10' },
                                  { icon: 'fa-fire', color: 'text-orange-500', val: data.calories, label: 'Calories', bg: 'bg-orange-500/10' },
                                  { icon: 'fa-route', color: 'text-blue-500', val: (data.distance/1000).toFixed(2), label: 'Km Covered', bg: 'bg-blue-500/10' },
                                  { icon: 'fa-stopwatch', color: 'text-purple-500', val: `${Math.floor(data.duration/60)}m`, label: 'Duration', bg: 'bg-purple-500/10' }
                              ].map((stat, i) => (
                                  <div key={i} className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center group">
                                      <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-4 border border-white/5`}>
                                          <i className={`fa-solid ${stat.icon} text-2xl`}></i>
                                      </div>
                                      <div className="text-4xl font-black tabular-nums tracking-tighter italic">{stat.val}</div>
                                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* Branding Footer */}
              <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center relative z-10">
                  <div className="flex flex-col">
                      <p className="text-[11px] text-brand-500 font-black uppercase tracking-[6px] mb-1">Join the community</p>
                      <p className="text-xl font-black text-white italic tracking-tighter leading-none">www.apnawalk.com</p>
                  </div>
                  
                  <div className="flex gap-4">
                      <div className="w-14 h-14 bg-white text-[#020617] rounded-[1.2rem] flex items-center justify-center shadow-2xl">
                          <i className="fa-solid fa-person-walking text-2xl"></i>
                      </div>
                      <div className="w-14 h-14 bg-slate-800 rounded-[1.2rem] flex items-center justify-center border border-white/10 shadow-2xl">
                          <i className="fa-solid fa-robot text-brand-500 text-2xl"></i>
                      </div>
                  </div>
              </div>
              
              {/* Bottom Signature Bar */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] opacity-60"></div>
          </div>
      </div>
    </div>
  );
};