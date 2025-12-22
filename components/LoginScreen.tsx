
import React, { useState, useEffect } from 'react';
import { ApnaWalkLogo } from './ApnaWalkLogo';
import { signInWithGoogle, signInWithGoogleOneTap } from '../services/authService';

interface LoginScreenProps {
  onLogin: (name: string, email: string) => void; 
  onGuest: () => void;
  onShowLegal: (type: 'privacy' | 'terms') => void;
}

declare const google: any;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGuest, onShowLegal }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeOneTap = () => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
          // Client ID for One Tap / FedCM (Must match GCP exactly)
          const client_id = "680287114674-8b6g3id67v9sq6o47is6n9m2v991j2sh.apps.googleusercontent.com";
          
          google.accounts.id.initialize({
            client_id: client_id,
            callback: async (response: any) => {
              if (!isMounted) return;
              setIsLoading(true);
              setErrorMsg(null);
              try {
                await signInWithGoogleOneTap(response.credential);
              } catch (err: any) {
                if (isMounted) {
                  setErrorMsg("One Tap failed. Use the button below.");
                  setIsLoading(false);
                }
              }
            },
            auto_select: false,
            itp_support: true, 
            use_fedcm_for_prompt: true,
            context: 'signin'
          });

          google.accounts.id.prompt();
        } catch (e) {
          console.debug("One Tap skip", e);
        }
      }
    };

    const timer = setTimeout(initializeOneTap, 1000);
    return () => { 
        isMounted = false; 
        clearTimeout(timer);
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    if (navigator.vibrate) navigator.vibrate(15);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Google Login.");
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      onGuest();
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#FF6B00] opacity-[0.06] blur-[100px] rounded-full animate-pulse-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#22C55E] opacity-[0.04] blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        <div className="mb-14 text-center animate-fade-in">
           <div className="scale-125 mb-4 inline-block">
               <ApnaWalkLogo size={56} />
           </div>
           <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-auto mt-4 mb-2"></div>
           <p className="text-slate-500 text-[9px] font-black tracking-[5px] uppercase text-center">India's Smartest Step Counter</p>
        </div>

        <div className="w-full space-y-5 flex flex-col items-center">
          
          {errorMsg && (
              <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center animate-message-pop">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> {errorMsg}
              </div>
          )}

          {/* Premium Custom Google Button (Reliable Redirect Flow) */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full max-w-[320px] h-[54px] bg-white text-slate-900 font-black rounded-full shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group relative overflow-hidden"
          >
            {isLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
                <>
                    <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="w-6 h-6" alt="G" />
                    <span className="uppercase text-[11px] tracking-[3px]">Continue with Google</span>
                </>
            )}
          </button>

          <div className="relative py-4 w-full">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
                <span className="bg-[#0a0f14] px-6 text-slate-600 uppercase font-black tracking-[6px]">Secure Sync</span>
            </div>
          </div>

          <button 
            onClick={handleGuestMode}
            disabled={isLoading}
            className="w-full max-w-[320px] bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 font-black py-4 rounded-full border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-[4px] disabled:opacity-50"
          >
            <i className="fa-solid fa-user-secret opacity-40"></i> Try Guest Mode
          </button>

        </div>

        {/* Legal */}
        <div className="mt-16 text-center space-y-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
             <div className="flex justify-center gap-8">
                <button onClick={() => onShowLegal('terms')} className="text-[9px] font-black text-slate-600 hover:text-brand-500 uppercase tracking-widest transition-colors">Terms</button>
                <div className="w-1 h-1 bg-slate-800 rounded-full my-auto opacity-30"></div>
                <button onClick={() => onShowLegal('privacy')} className="text-[9px] font-black text-slate-600 hover:text-brand-500 uppercase tracking-widest transition-colors">Privacy</button>
             </div>
             
             <div className="pt-8 border-t border-white/5">
                <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[3px] leading-loose">
                    Verified PWA<br/>
                    <span className="text-white opacity-40 font-black tracking-widest uppercase">Sparq IT Ecosystem</span>
                </p>
             </div>
        </div>
      </div>
    </div>
  );
};
