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
      const timer = setTimeout(generateImage, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  const generateImage = async () => {
    if (cardRef.current && typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          backgroundColor: '#020617', 
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
                <h3 className="font-black text-xl italic tracking-tighter uppercase">Export Progress</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[3px]">Ready for Instagram</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-800/50 rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700/50 shadow-lg">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div className="aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-slate-800 bg-slate-900 group relative">
            {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 rounded-2xl border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[5px] animate-pulse">Designing Card...</p>
                </div>
            ) : (
                <img src={imgUrl!} alt="Share Preview" className="w-full h-full object-contain" />
            )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3">
            <button 
                onClick={handleShare}
                disabled={generating}
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 disabled:opacity-30 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-brand-500/20 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-[4px] text-[10px]"
            >
                <i className="fa-solid fa-share-nodes text-sm"></i> 
                {type === 'quote' ? 'Share this Quote' : 'Share Achievement'}
            </button>
            
            <button 
                onClick={handleDownload}
                disabled={generating}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black py-4 rounded-[1.5rem] shadow-lg disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-3 transition-all uppercase tracking-[4px] text-[10px]"
            >
                <i className="fa-solid fa-download text-sm"></i> Save to Gallery
            </button>
        </div>
      </div>

      {/* HIDDEN RENDER AREA - Centered Logo & Added QR */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div 
            ref={cardRef} 
            className="w-[500px] h-[720px] bg-[#020617] text-white p-12 flex flex-col relative overflow-hidden"
          >
              {/* Premium Background Elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>
              <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px'}}></div>

              {/* CENTERED LOGO HEADER */}
              <div className="flex flex-col items-center mb-8 relative z-10">
                  <div className="bg-white/5 backdrop-blur-md px-8 py-4 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-2xl">
                      <ApnaWalkLogo size={52} useGradient={true} />
                      <p className="text-[12px] text-brand-400 font-black uppercase tracking-[6px] mt-3 italic">apnawalk.com</p>
                  </div>
              </div>

              {/* Content Core */}
              <div className="flex-1 flex flex-col justify-center relative z-10 mb-8">
                  {type === 'quote' && (
                      <div className="text-center bg-white/5 backdrop-blur-xl p-10 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FF9933] to-[#138808] opacity-50"></div>
                        <i className="fa-solid fa-quote-left text-6xl text-brand-500 mb-8 block opacity-20"></i>
                        <p className="text-4xl font-black italic leading-[1.1] text-white mb-10 tracking-tight">
                            "{data.text}"
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-10 h-px bg-slate-700"></div>
                            <p className="text-[#FF9933] font-black uppercase tracking-[6px] text-xs">— {data.author}</p>
                            <div className="w-10 h-px bg-slate-700"></div>
                        </div>
                      </div>
                  )}

                  {type === 'stats' && (
                      <div className="w-full">
                          <div className="mb-8 text-center">
                              <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter italic">Walk Summary</h2>
                              <div className="inline-block px-5 py-2 bg-brand-600/20 rounded-full border border-brand-500/20">
                                <p className="text-brand-400 text-[10px] font-black uppercase tracking-[6px]">
                                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-5">
                              {[
                                  { icon: 'fa-shoe-prints', color: 'text-brand-400', val: data.steps.toLocaleString(), label: 'Steps', bg: 'bg-brand-500/10' },
                                  { icon: 'fa-fire', color: 'text-orange-500', val: data.calories, label: 'Calories', bg: 'bg-orange-500/10' },
                                  { icon: 'fa-route', color: 'text-blue-500', val: (data.distance/1000).toFixed(2), label: 'Km Covered', bg: 'bg-blue-500/10' },
                                  { icon: 'fa-stopwatch', color: 'text-purple-500', val: `${Math.floor(data.duration/60)}m`, label: 'Duration', bg: 'bg-purple-500/10' }
                              ].map((stat, i) => (
                                  <div key={i} className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center group">
                                      <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} mb-3 border border-white/5`}>
                                          <i className={`fa-solid ${stat.icon} text-xl`}></i>
                                      </div>
                                      <div className="text-3xl font-black tabular-nums tracking-tighter italic">{stat.val}</div>
                                      <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1.5">{stat.label}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* Enhanced Branding Footer with QR Code */}
              <div className="mt-auto pt-8 border-t border-white/10 relative z-10 flex flex-col items-center gap-6">
                  
                  <div className="w-full flex justify-between items-center">
                      <div className="flex flex-col">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px] mb-1">Download & Join</p>
                          <p className="text-xl font-black text-white italic tracking-tighter leading-none">www.apnawalk.com</p>
                      </div>
                      
                      <div className="flex gap-3">
                          <div className="w-12 h-12 bg-white text-[#020617] rounded-full flex items-center justify-center shadow-xl border border-white">
                              <i className="fa-solid fa-person-walking text-xl"></i>
                          </div>
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                              <i className="fa-solid fa-robot text-brand-400 text-xl"></i>
                          </div>
                      </div>
                  </div>

                  {/* QR SECTION */}
                  <div className="flex flex-col items-center gap-4 w-full">
                      <div className="inline-flex items-center gap-4 px-8 py-3 bg-gradient-to-r from-[#FF9933]/10 via-white/5 to-[#138808]/10 border border-white/10 rounded-[2rem] backdrop-blur-xl shadow-2xl">
                          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                          <p className="text-[12px] font-black text-white uppercase tracking-[8px] mr-[-8px]">Download App Now!</p>
                      </div>
                      
                      {/* Scan Friendly QR Code */}
                      <div className="p-3 bg-white rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.2)] border-2 border-brand-500/20">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://apnawalk.com&bgcolor=ffffff&color=020617" 
                            alt="QR Code" 
                            className="w-20 h-20"
                          />
                      </div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-[3px] opacity-70">Scan to join the squad</p>
                  </div>
              </div>
              
              {/* Bottom Decorative Signature */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] opacity-40"></div>
          </div>
      </div>
    </div>
  );
};