import React, { useState } from 'react';
import { ApnaWalkLogo } from './ApnaWalkLogo';
import { signInWithGoogle } from '../services/authService';

interface LoginScreenProps {
  onLogin: (name: string, email: string) => void; // Kept for Guest flow compatibility
  onGuest: () => void;
  onShowLegal: (type: 'privacy' | 'terms') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGuest, onShowLegal }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
        await signInWithGoogle();
        // The app will reload/redirect due to OAuth, so we don't need to manually call onLogin here.
        // App.tsx will handle the session check on mount.
    } catch (error: any) {
        console.error("Login Failed", error);
        setErrorMsg(error.message || "Failed to connect to Google.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-dark-bg to-dark-bg z-0"></div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="mb-8 animate-fade-in scale-90 sm:scale-100">
           <ApnaWalkLogo size={120} />
        </div>

        {/* Auth Buttons */}
        <div className="w-full space-y-4 animate-message-pop" style={{ animationDelay: '0.2s' }}>
          
          {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg text-center mb-2">
                  {errorMsg}
              </div>
          )}

          {/* Google Button */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-100 text-slate-800 font-medium py-4 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group"
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
                <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-dark-bg px-2 text-slate-500 uppercase tracking-wider">Or</span>
            </div>
          </div>

          {/* Guest Button */}
          <button 
            onClick={onGuest}
            className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-medium py-4 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-user-secret"></i> Start Walking (Guest Mode)
          </button>

        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
             <p className="text-xs text-slate-600">
                By continuing, you agree to our <button onClick={() => onShowLegal('terms')} className="text-brand-500 hover:underline">Terms</button> & <button onClick={() => onShowLegal('privacy')} className="text-brand-500 hover:underline">Privacy Policy</button>.
             </p>
             <p className="text-xs text-slate-700">Powered by Sparq IT Service</p>
        </div>
      </div>
    </div>
  );
};