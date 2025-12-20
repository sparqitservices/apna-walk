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
      const timer = setTimeout(generateImage, 1500); 
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  const generateImage = async () => {
    if (cardRef.current && typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3, 
          backgroundColor: '#020617', 
          useCORS: true,
          logging: false,
          allowTaint: true,
          letterRendering: true
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
      const file = new File([blob], "apnawalk-share.png", { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'ApnaWalk Inspiration',
          text: type === 'quote' ? 'Daily inspiration from ApnaWalk!' : 'Check out my progress on ApnaWalk!'
        });
      } else {
        handleDownload();
      }
    } catch (e) {
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
                <h3 className="font-black text-xl italic tracking-tighter uppercase text-brand-400">Share Progress</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[3px]">Export high-quality card</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-800/50 rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700/50 shadow-lg">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {/* Card Preview Container */}
        <div className="aspect-[3/4.2] w-full rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-slate-800 bg-slate-900 group relative">
            {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 rounded-2xl border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[5px] animate-pulse">Polishing design...</p>
                </div>
            ) : (
                <img src={imgUrl!} alt="Share Preview" className="w-full h-full object-contain" />
            )}
        </div>

        {/* Modal Buttons */}
        <div className="mt-8 grid grid-cols-1 gap-3">
            <button 
                onClick={handleShare}
                disabled={generating}
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 disabled:opacity-30 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-brand-500/20 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-[4px] text-[10px]"
            >
                <i className="fa-solid fa-share-nodes text-sm"></i> 
                {type === 'quote' ? 'share this quote' : 'share achievement'}
            </button>
            
            <button 
                onClick={handleDownload}
                disabled={generating}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black py-4 rounded-[1.5rem] shadow-lg disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-[4px] text-[10px]"
            >
                <i className="fa-solid fa-download text-sm"></i> save to gallery
            </button>
        </div>
      </div>

      {/* HIDDEN RENDER AREA - Optimized for html2canvas */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div 
            ref={cardRef} 
            className="w-[600px] h-[840px] bg-[#020617] text-white p-16 flex flex-col relative overflow-hidden"
          >
              {/* Top Accent Bar */}
              <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
              
              {/* Atmospheric background glows */}
              <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]"></div>

              {/* CENTERED LOGO - GRADIENT DISABLED TO PREVENT BOXING EFFECT */}
              <div className="flex flex-col items-center mb-16 relative z-10 pt-4">
                  <ApnaWalkLogo size={100} useGradient={false} className="scale-110" />
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 flex flex-col justify-center relative z-10 px-4 mb-20">
                  {type === 'quote' && (
                      <div className="text-center relative">
                        <i className="fa-solid fa-quote-left text-[120px] text-brand-500 mb-6 block opacity-[0.07] absolute -top-16 -left-12"></i>
                        
                        <div className="bg-white/[0.03] backdrop-blur-xl p-16 rounded-[4rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative">
                            <p className="text-[44px] font-black italic leading-[1.1] text-white mb-12 tracking-tight">
                                "{data.text}"
                            </p>
                            <div className="flex items-center justify-center gap-8">
                                <div className="w-16 h-0.5 bg-slate-700"></div>
                                <p className="text-[#FF9933] font-black uppercase tracking-[8px] text-xl">{data.author}</p>
                                <div className="w-16 h-0.5 bg-slate-700"></div>
                            </div>
                        </div>
                      </div>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <div className="mb-12 text-center">
                              <h2 className="text-7xl font-black text-white mb-4 uppercase tracking-tighter italic">Walk Summary</h2>
                              <div className="inline-block px-8 py-3 bg-brand-600/10 rounded-full border border-brand-500/20">
                                <p className="text-brand-400 text-sm font-black uppercase tracking-[8px]">
                                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-8">
                              {[
                                  { icon: 'fa-shoe-prints', color: 'text-brand-400', val: data.steps.toLocaleString(), label: 'Steps', bg: 'bg-brand-500/10' },
                                  { icon: 'fa-fire', color: 'text-orange-500', val: data.calories, label: 'Calories', bg: 'bg-orange-500/10' },
                                  { icon: 'fa-route', color: 'text-blue-500', val: (data.distance/1000).toFixed(2), label: 'Km Covered', bg: 'bg-blue-500/10' },
                                  { icon: 'fa-stopwatch', color: 'text-purple-500', val: `${Math.floor(data.duration/60)}m`, label: 'Duration', bg: 'bg-purple-500/10' }
                              ].map((stat, i) => (
                                  <div key={i} className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col items-center group">
                                      <div className={`w-16 h-16 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-4 border border-white/5`}>
                                          <i className={`fa-solid ${stat.icon} text-3xl`}></i>
                                      </div>
                                      <div className="text-5xl font-black tabular-nums tracking-tighter italic text-white">{stat.val}</div>
                                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* FOOTER: QR Left, URL Right */}
              <div className="mt-auto pt-10 border-t border-white/10 relative z-10 flex items-end justify-between w-full">
                  
                  {/* Bottom Left: Clean QR Code */}
                  <div className="flex flex-col items-start gap-4">
                      <div className="p-3 bg-white rounded-[2rem] shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://apnawalk.com&bgcolor=ffffff&color=020617" 
                            alt="QR Code" 
                            className="w-24 h-24"
                          />
                      </div>
                      <div className="ml-1">
                        <p className="text-[12px] font-black text-white uppercase tracking-[4px]">Scan to Join</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[2px]">Get the app now</p>
                      </div>
                  </div>

                  {/* Bottom Right: URL */}
                  <div className="text-right flex flex-col items-end pb-2">
                      <div className="flex items-center gap-3 px-5 py-2 bg-brand-600/10 border border-brand-500/20 rounded-full mb-4">
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                          <p className="text-brand-400 text-[10px] font-black uppercase tracking-[6px] mr-[-6px]">Join the Movement</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-[4px] block mb-1 opacity-70">Visit our home:</span>
                      <p className="text-4xl font-black text-white italic tracking-tighter leading-none">www.apnawalk.com</p>
                  </div>
              </div>
              
              {/* Bottom Decorative Bar */}
              <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] opacity-30"></div>
          </div>
      </div>
    </div>
  );
};