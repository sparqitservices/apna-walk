
import React, { useState, useEffect, useRef } from 'react';
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
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    let isMounted = true;

    const initializeGSI = () => {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
          console.warn("GSI library not yet loaded");
          return;
      }

      try {
        // ApnaWalk Official Client ID
        const client_id = "680287114674-8b6g3id67v9sq6o47is6n9m2v991j2sh.apps.googleusercontent.com";
        
        google.accounts.id.initialize({
          client_id: client_id,
          callback: async (response: any) => {
            if (!isMounted) return;
            setIsLoading(true);
            setErrorMsg(null);
            try {
              // Valid JWT ID Token from Google
              await signInWithGoogleOneTap(response.credential);
            } catch (err: any) {
              console.error("Auth sync failed:", err);
              if (isMounted) {
                setErrorMsg("One Tap failed. Please use the button below.");
                setIsLoading(false);
              }
            }
          },
          auto_select: false,
          itp_support: true, 
          use_fedcm_for_prompt: true, // Required for modern Chrome (130+)
          context: 'signin'
        });

        // 1. Render standard button as reliable primary method
        if (googleBtnRef.current) {
            google.accounts.id.renderButton(googleBtnRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                width: 320
            });
        }

        // 2. Trigger One Tap with logging
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.debug("One Tap Display Issue:", notification.getNotDisplayedReason());
          }
          if (notification.isSkippedMoment()) {
            console.debug("One Tap Skipped:", notification.getSkippedReason());
          }
        });

      } catch (e) {
        console.warn("GSI setup error:", e);
      }
    };

    // Delay initialization to ensure script is fully ready
    const timer = setTimeout(initializeGSI, 1500);
    return () => { 
        isMounted = false; 
        clearTimeout(timer);
    };
  }, []);

  const handleManualLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
        await signInWithGoogle();
        // Redirect is handled by Supabase/Google OAuth
    } catch (err: any) {
        console.error("Manual Login Error:", err);
        setErrorMsg("Access Denied. Check your connection or try Guest Mode.");
        setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      onGuest();
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#FF6B00] opacity-[0.06] blur-[100px] rounded-full animate-pulse-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#22C55E] opacity-[0.04] blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Brand Reveal */}
        <div className="mb-14 text-center animate-fade-in">
           <div className="scale-125 mb-4 inline-block">
               <ApnaWalkLogo size={56} />
           </div>
           <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-auto mt-4 mb-2"></div>
           <p className="text-slate-500 text-[9px] font-black tracking-[5px] uppercase text-center">India's Smartest Step Counter</p>
        </div>

        <div className="w-full space-y-6 flex flex-col items-center">
          
          {errorMsg && (
              <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center animate-message-pop">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> {errorMsg}
              </div>
          )}

          {/* Official Google GSI Button Container */}
          <div className="w-full flex justify-center min-h-[50px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div ref={googleBtnRef} className="w-full flex justify-center"></div>
          </div>

          <div className="relative py-4 w-full">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
                <span className="bg-[#0a0f14] px-6 text-slate-600 uppercase font-black tracking-[6px]">Secure Sync</span>
            </div>
          </div>

          {/* Manual OAuth Button (Fallback) */}
          <button 
            onClick={handleManualLogin}
            disabled={isLoading}
            className="w-full max-w-[320px] bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-full border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-[4px] disabled:opacity-50"
          >
             {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-brands fa-google text-brand-500"></i> Manual Sign In</>}
          </button>

          <button 
            onClick={handleGuestMode}
            disabled={isLoading}
            className="w-full max-w-[320px] bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 font-black py-4 rounded-full border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-[4px] disabled:opacity-50"
          >
            <i className="fa-solid fa-user-secret opacity-40"></i> Try Guest Mode
          </button>

        </div>

        {/* Legal & Branding */}
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
