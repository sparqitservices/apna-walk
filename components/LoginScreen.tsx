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

  // Initialize Google One Tap
  useEffect(() => {
    let isMounted = true;

    const initializeOneTap = () => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: "680287114674-8b6g3id67v9sq6o47is6n9m2v991j2sh.apps.googleusercontent.com", 
          callback: async (response: any) => {
            if (!isMounted) return;
            setIsLoading(true);
            try {
              await signInWithGoogleOneTap(response.credential);
              // State sync is handled by onAuthStateChange in App.tsx
            } catch (err: any) {
              console.error("One Tap Login Failed", err);
              if (isMounted) {
                setErrorMsg("Automatic detection failed. Use the button.");
                setIsLoading(false);
              }
            }
          },
          auto_select: false, // MANDATORY: This prevents the app from logging in without a user tap
          itp_support: true,
          cancel_on_tap_outside: true,
        });

        // Trigger the prompt
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.log("One Tap skipped:", notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
            console.log("One Tap moment skipped:", notification.getSkippedReason());
          }
        });
      }
    };

    const timer = setTimeout(initializeOneTap, 1200);
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
    } catch (error: any) {
        console.error("Login Failed", error);
        setErrorMsg(error.message || "Failed to connect to Google.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/10 via-dark-bg to-dark-bg z-0"></div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="mb-12 animate-fade-in scale-110">
           <ApnaWalkLogo size={48} />
           <p className="text-dark-muted text-xs font-medium tracking-widest uppercase mt-2 text-center">Walk Towards Fitness</p>
        </div>

        {/* Auth Buttons */}
        <div className="w-full space-y-4 animate-message-pop" style={{ animationDelay: '0.2s' }}>
          
          {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded-lg text-center mb-2">
                  {errorMsg}
              </div>
          )}

          {/* Google Button */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white dark:bg-white text-slate-800 font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group border border-slate-200"
          >
             {isLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin text-slate-600"></i>
             ) : (
                <>
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                    <span>Continue with Gmail</span>
                </>
             )}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-dark-bg px-2 text-dark-muted uppercase tracking-wider">Or</span>
            </div>
          </div>

          {/* Guest Button */}
          <button 
            onClick={onGuest}
            className="w-full bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-dark-text font-medium py-4 rounded-xl border border-dark-border transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-user-secret"></i> Start Walking (Guest Mode)
          </button>

        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
             <p className="text-xs text-dark-muted">
                By continuing, you agree to our <a href="/terms-conditions" className="text-brand-500 hover:underline">Terms</a> & <a href="/privacy-policy" className="text-brand-500 hover:underline">Privacy Policy</a>.
             </p>
             
             <div className="pt-6 pb-2 border-t border-dark-border/20 mt-4">
                <p className="text-xs text-dark-muted">
                    Built with ❤️ & <span className="text-orange-500 font-bold">Masala Chai ☕</span> by 
                    <span className="block text-brand-500 font-bold mt-1 text-sm tracking-wide">Afzal Hameed</span>
                    <span className="text-[10px] block opacity-70">from Sparq IT Service</span>
                </p>
             </div>
        </div>
      </div>
    </div>
  );
};