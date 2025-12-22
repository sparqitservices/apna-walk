
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

  // Initialize Google One Tap with modern browser support (FedCM)
  useEffect(() => {
    let isMounted = true;

    const initializeOneTap = () => {
      // One Tap requires HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        console.warn("Google One Tap requires a secure context (HTTPS). Fallback to manual login.");
        return;
      }

      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
          // Initialize Google Identity Services
          google.accounts.id.initialize({
            client_id: "680287114674-8b6g3id67v9sq6o47is6n9m2v991j2sh.apps.googleusercontent.com", 
            callback: async (response: any) => {
              if (!isMounted) return;
              setIsLoading(true);
              setErrorMsg(null);
              try {
                // response.credential is the JWT ID Token
                await signInWithGoogleOneTap(response.credential);
              } catch (err: any) {
                console.error("One Tap Authentication Failed:", err);
                if (isMounted) {
                  setErrorMsg("Auth sync failed. Please use the button below.");
                  setIsLoading(false);
                }
              }
            },
            // Configuration for maximum compatibility
            auto_select: false, 
            itp_support: true,
            use_fedcm_for_prompt: true, // Google's new standard for privacy-preserving auth
            context: 'signin',
            ux_mode: 'popup', // Ensure it shows as a bubble/popup
            cancel_on_tap_outside: false
          });

          // Display the One Tap prompt
          google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed()) {
              const reason = notification.getNotDisplayedReason();
              console.debug("One Tap Not Displayed:", reason);
              // If it's suppressed (e.g. user closed it before), we don't show error, 
              // just let them use the manual button.
            }
            if (notification.isSkippedMoment()) {
              console.log("One Tap skipped:", notification.getSkippedReason());
            }
          });
        } catch (e) {
          console.warn("Google Identity initialization error:", e);
        }
      }
    };

    // Delay slightly to ensure script is fully ready
    const timer = setTimeout(initializeOneTap, 1500);
    return () => { 
        isMounted = false; 
        clearTimeout(timer);
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
        await signInWithGoogle();
        // Browser handles redirect via Supabase OAuth
    } catch (error: any) {
        console.error("Standard OAuth Login Failed:", error);
        setErrorMsg("Network error. Check connection and try again.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#FF6B00] opacity-[0.08] blur-[100px] rounded-full animate-pulse-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#22C55E] opacity-[0.05] blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Brand Identity */}
        <div className="mb-14 text-center animate-fade-in">
           <div className="scale-125 mb-4 inline-block">
               <ApnaWalkLogo size={56} />
           </div>
           <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-slate-700 to-transparent mx-auto mt-4 mb-2"></div>
           <p className="text-slate-500 text-[10px] font-black tracking-[4px] uppercase text-center">India's Smartest Step Counter</p>
        </div>

        <div className="w-full space-y-4">
          
          {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center mb-2 animate-message-pop">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> {errorMsg}
              </div>
          )}

          {/* Primary Login Button (Standard OAuth) - Reliable fallback */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-slate-900 font-black py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-brand-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group border-2 border-white uppercase text-xs tracking-widest"
          >
             {isLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin text-slate-600"></i>
             ) : (
                <>
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Continue with Gmail</span>
                </>
             )}
          </button>

          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
                <span className="bg-[#0a0f14] px-4 text-slate-600 uppercase font-black tracking-[5px]">Or</span>
            </div>
          </div>

          <button 
            onClick={onGuest}
            disabled={isLoading}
            className="w-full bg-slate-800/40 hover:bg-slate-800/60 text-slate-300 font-black py-5 rounded-[2rem] border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-[4px] disabled:opacity-50"
          >
            <i className="fa-solid fa-user-secret opacity-50"></i> Try Guest Mode
          </button>

        </div>

        {/* Footer Links */}
        <div className="mt-16 text-center space-y-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
             <div className="flex justify-center gap-6">
                <button onClick={() => onShowLegal('terms')} className="text-[10px] font-black text-slate-500 hover:text-brand-500 uppercase tracking-widest transition-colors">Terms</button>
                <div className="w-1 h-1 bg-slate-800 rounded-full my-auto"></div>
                <button onClick={() => onShowLegal('privacy')} className="text-[10px] font-black text-slate-500 hover:text-brand-500 uppercase tracking-widest transition-colors">Privacy</button>
             </div>
             
             <div className="pt-8 border-t border-white/5 mt-4">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[2px] leading-loose">
                    Built for Bharat<br/>
                    <span className="text-white opacity-80 font-black tracking-widest uppercase">Sparq IT Ecosystem</span>
                </p>
             </div>
        </div>
      </div>

      {/* Google One Tap will render automatically in the top-right if configured correctly */}
    </div>
  );
};
