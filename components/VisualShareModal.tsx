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
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[3px]">High Quality Export</p>
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

      {/* HIDDEN RENDER AREA - Optimized for high-quality capture */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div 
            ref={cardRef} 
            className="w-[600px] h-[840px] bg-[#020617] text-white p-12 flex flex-col relative overflow-hidden"
          >
              {/* Brand Accent Bar */}
              <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
              
              {/* Premium atmospheric glows */}
              <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[140px]"></div>

              {/* CENTERED SMALL LOGO - FIXED "WALK" TEXT BACKGROUND */}
              <div className="flex flex-col items-center mb-10 relative z-10 pt-6">
                  <div className="flex items-center gap-3">
                      <i className="fa-solid fa-person-walking text-brand-500 text-5xl"></i>
                      <div className="flex items-baseline gap-1.5 leading-none">
                          <span className="font-black text-4xl text-white">Apna</span>
                          {/* Using simple text with solid color to avoid html2canvas clipping/boxing issues */}
                          <span className="font-black text-4xl text-[#FF9800]">Walk</span>
                      </div>
                  </div>
                  <div className="h-0.5 w-12 bg-slate-800 mt-4 rounded-full"></div>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 flex flex-col justify-center relative z-10 px-4 mb-16">
                  {type === 'quote' && (
                      <div className="text-center relative">
                        <i className="fa-solid fa-quote-left text-[140px] text-brand-500 mb-6 block opacity-[0.05] absolute -top-20 -left-14"></i>
                        
                        <div className="bg-white/[0.03] backdrop-blur-3xl p-16 rounded-[4.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative">
                            <p className="text-[46px] font-black italic leading-[1.1] text-white mb-12 tracking-tight drop-shadow-2xl">
                                "{data.text}"
                            </p>
                            <div className="flex items-center justify-center gap-8">
                                <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                                <p className="text-[#FF9933] font-black uppercase tracking-[8px] text-2xl drop-shadow-lg">{data.author}</p>
                                <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                            </div>
                        </div>
                      </div>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <div className="mb-14 text-center">
                              <h2 className="text-7xl font-black text-white mb-4 uppercase tracking-tighter italic">Walk Summary</h2>
                              <div className="inline-block px-8 py-3 bg-brand-600/10 rounded-full border border-brand-500/20 backdrop-blur-sm">
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
                                  <div key={i} className="bg-slate-900/40 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col items-center group backdrop-blur-md">
                                      <div className={`w-16 h-16 ${stat.bg} rounded-3xl flex items-center justify-center ${stat.color} mb-4 border border-white/5 shadow-inner`}>
                                          <i className={`fa-solid ${stat.icon} text-3xl`}></i>
                                      </div>
                                      <div className="text-5xl font-black tabular-nums tracking-tighter italic text-white drop-shadow-md">{stat.val}</div>
                                      <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* FOOTER: QR Left, URL Right - Balanced Layout */}
              <div className="mt-auto pt-10 border-t border-white/10 relative z-10 flex items-center justify-between w-full">
                  
                  {/* Bottom Left: Scan-Friendly QR */}
                  <div className="flex items-center gap-6">
                      <div className="p-3 bg-white rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] border-2 border-brand-500/20">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://apnawalk.com&bgcolor=ffffff&color=020617" 
                            alt="QR" 
                            className="w-20 h-20"
                          />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[12px] font-black text-white uppercase tracking-[4px] leading-tight">Scan to Join</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[2px] mt-1">Get the app now</p>
                      </div>
                  </div>

                  {/* Bottom Right: Clean Domain Link */}
                  <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-3 px-5 py-2 bg-brand-600/10 border border-brand-500/20 rounded-full mb-4">
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                          <p className="text-brand-400 text-[10px] font-black uppercase tracking-[6px] mr-[-6px]">Walk Daily</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-[3px] block mb-1 opacity-70">website url</span>
                      <p className="text-4xl font-black text-white italic tracking-tighter leading-none drop-shadow-xl">www.apnawalk.com</p>
                  </div>
              </div>
              
              {/* Bottom Brand Bar */}
              <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] opacity-20"></div>
          </div>
      </div>
    </div>
  );
};