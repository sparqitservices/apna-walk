
import React, { useState, useEffect } from 'react';
import { RadialProgress } from './components/RadialProgress';
import { StatsGrid } from './components/StatsGrid';
import { AICoachModal } from './components/AICoachModal';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { Achievements } from './components/Achievements';
import { DailyQuote } from './components/DailyQuote';
import { VisualShareModal } from './components/VisualShareModal';
import { usePedometer } from './hooks/usePedometer';
import { UserProfile, UserSettings, WalkSession } from './types';
import { getProfile, saveProfile, getSettings, saveSettings, saveHistory } from './services/storageService';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getProfile() || { name: '', email: '', isLoggedIn: false, isGuest: false });
  const [settings, setSettings] = useState<UserSettings>(() => getSettings() || {
    weightKg: 70,
    heightCm: 175,
    strideLengthCm: 73,
    stepGoal: 6000,
    sensitivity: 3,
    enableLocation: true,
    theme: 'green',
    notifications: { water: true, walk: true, breath: true }
  });

  const { 
    dailySteps, 
    sessionSteps, 
    isTrackingSession, 
    lastStepTimestamp,
    permissionGranted, 
    requestPermission, 
    startSession, 
    stopSession,
    error: sensorError
  } = usePedometer(settings.sensitivity);

  const [showCoach, setShowCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  /* Fix: Corrected visualShare state typing to include 'quote' | 'stats' instead of being locked to 'stats' */
  const [visualShare, setVisualShare] = useState<{
    isOpen: boolean;
    type: 'stats' | 'quote';
    data: any;
  }>({ isOpen: false, type: 'stats', data: null as any });

  const displaySteps = isTrackingSession ? sessionSteps : dailySteps;
  const displayDistance = (displaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((displaySteps * 0.04) * (settings.weightKg / 70));

  const handleStartWorkout = async () => {
    const granted = await requestPermission();
    if (granted) {
        startSession();
        if (navigator.vibrate) navigator.vibrate(150);
    } else {
        alert("Please enable Motion Sensor permissions to track your movement!");
    }
  };

  const handleFinishWorkout = () => {
    const finalSteps = stopSession();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (finalSteps > 0) {
        const sessionData: WalkSession = {
            id: `sess-${Date.now()}`,
            startTime: Date.now() - 3600000, // Approximate for demo
            steps: finalSteps,
            distanceMeters: (finalSteps * settings.strideLengthCm) / 100,
            calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)),
            durationSeconds: 3600 
        };
        setCurrentSession(sessionData);
        saveHistory(0, sessionData); // Save to local storage
        setShowCoach(true);
    }
  };

  if (!profile.isLoggedIn) {
    return <LoginScreen onLogin={() => {}} onGuest={() => setProfile({ ...profile, isLoggedIn: true, isGuest: true })} onShowLegal={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white font-sans pb-24 overflow-x-hidden">
      
      {/* Premium Navbar */}
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <i className="fa-solid fa-person-running text-brand-500 text-xl"></i>
                <h1 className="text-2xl font-black italic tracking-tighter"><span className="text-brand-500">APNA</span>WALK</h1>
            </div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[4px] mt-1 ml-8">Engine: AI Precision</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-[1.2rem] bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <i className="fa-solid fa-user-gear text-slate-400"></i>
        </button>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-12 space-y-12">
        
        {sensorError && (
            <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl flex items-start gap-4 text-red-400 animate-message-pop">
                <i className="fa-solid fa-triangle-exclamation mt-1"></i>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Sensor Error</p>
                    <p className="text-xs leading-relaxed opacity-80">{sensorError}</p>
                </div>
            </div>
        )}

        {/* Dynamic Step Engine Container */}
        <section className="flex flex-col items-center">
            <RadialProgress 
                current={displaySteps} 
                total={settings.stepGoal} 
                label={isTrackingSession ? "Session Progress" : "Day Overall"}
                subLabel={isTrackingSession ? "Engine Running..." : "Walk on, Boss!"}
                isActive={isTrackingSession}
                lastStepTime={lastStepTimestamp}
            />

            <div className="w-full grid grid-cols-1 gap-6 mt-8">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={0} onStatClick={() => {}} />
                
                <button 
                    onClick={isTrackingSession ? handleFinishWorkout : handleStartWorkout}
                    className={`w-full py-7 rounded-[2.5rem] font-black text-base tracking-[6px] uppercase shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-5 border-t border-white/20 ${isTrackingSession ? 'bg-gradient-to-tr from-red-700 to-red-500 text-white' : 'bg-gradient-to-tr from-brand-700 to-brand-500 text-white'}`}
                >
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/10">
                        <i className={`fa-solid ${isTrackingSession ? 'fa-stop' : 'fa-play pl-1'}`}></i>
                    </div>
                    {isTrackingSession ? 'Finish Workout' : 'Start Walking'}
                </button>
            </div>
        </section>

        {/* Motivational Cards */}
        <section className="space-y-8">
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={dailySteps} earnedBadges={[]} />
        </section>
      </main>

      {/* Floating AI Coach Trigger */}
      <button 
        onClick={() => setShowCoach(true)}
        className="fixed bottom-8 right-8 w-20 h-20 bg-gradient-to-tr from-brand-600 to-emerald-400 rounded-[2rem] shadow-[0_25px_60px_rgba(76,175,80,0.4)] flex flex-col items-center justify-center text-white z-50 hover:scale-110 active:scale-90 transition-all border-2 border-white/10 group"
      >
        <i className="fa-solid fa-robot text-2xl group-hover:animate-bounce"></i>
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Coach</span>
      </button>

      {/* Modals Layer */}
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={profile.isGuest!} onLoginRequest={() => {}} onShareStats={() => {}} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={(s, p) => { setSettings(s); saveSettings(s); setProfile(p); saveProfile(p); }} onLogout={() => setProfile({...profile, isLoggedIn: false})} onLoginRequest={() => {}} />
      <VisualShareModal isOpen={visualShare.isOpen} onClose={() => setVisualShare(v => ({ ...v, isOpen: false }))} type={visualShare.type} data={visualShare.data} />
    </div>
  );
};

export default App;
