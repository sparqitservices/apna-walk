
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    permissionGranted, 
    requestPermission, 
    startSession, 
    stopSession,
    error: sensorError
  } = usePedometer(settings.sensitivity);

  const [showCoach, setShowCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [visualShare, setVisualShare] = useState({ isOpen: false, type: 'stats', data: null });

  const displaySteps = isTrackingSession ? sessionSteps : dailySteps;
  const displayDistance = (displaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((displaySteps * 0.04) * (settings.weightKg / 70));

  const handleStartTracking = async () => {
    const granted = await requestPermission();
    if (granted) {
        startSession();
        if (navigator.vibrate) navigator.vibrate(100);
    } else {
        alert("We need motion sensor access to count your steps!");
    }
  };

  const handleFinishTracking = () => {
    const finalSteps = stopSession();
    if (finalSteps > 0) {
        const sessionData: WalkSession = {
            id: `sess-${Date.now()}`,
            startTime: Date.now(),
            steps: finalSteps,
            distanceMeters: (finalSteps * settings.strideLengthCm) / 100,
            calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)),
            durationSeconds: 0 // In a real app, track elapsed time
        };
        setCurrentSession(sessionData);
        saveHistory(0, sessionData);
        setShowCoach(true);
    }
  };

  if (!profile.isLoggedIn) {
    return <LoginScreen onLogin={() => {}} onGuest={() => setProfile({ ...profile, isLoggedIn: true, isGuest: true })} onShowLegal={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white font-sans pb-24 overflow-x-hidden">
      
      {/* Minimal Header */}
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur sticky top-0 z-40">
        <div className="flex flex-col">
            <h1 className="text-xl font-black italic tracking-tighter"><span className="text-brand-500">APNA</span>WALK</h1>
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-[3px]">Smart Step Engine</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-lg active:scale-90 transition-transform">
            <i className="fa-solid fa-user-gear text-slate-400"></i>
        </button>
      </div>

      <main className="max-w-lg mx-auto px-6 pt-10 space-y-12">
        
        {/* Sensor Error Alert */}
        {sensorError && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-message-pop">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <p className="text-[10px] font-black uppercase tracking-wider">{sensorError}</p>
            </div>
        )}

        {/* The Heart of the App: The Counter */}
        <section className="flex flex-col items-center">
            <RadialProgress 
                current={displaySteps} 
                total={settings.stepGoal} 
                label={isTrackingSession ? "Workout Active" : "Today's Progress"}
                subLabel={isTrackingSession ? "Counting your move..." : "Keep Moving!"}
                isActive={isTrackingSession}
            />

            <div className="w-full grid grid-cols-1 gap-4 mt-6">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={0} onStatClick={() => {}} />
                
                <button 
                    onClick={isTrackingSession ? handleFinishTracking : handleStartTracking}
                    className={`w-full py-6 rounded-[2rem] font-black text-sm tracking-[5px] uppercase shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${isTrackingSession ? 'bg-red-600 text-white shadow-red-900/20' : 'bg-brand-600 text-white shadow-brand-900/40'}`}
                >
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <i className={`fa-solid ${isTrackingSession ? 'fa-stop' : 'fa-play pl-1'}`}></i>
                    </div>
                    {isTrackingSession ? 'Finish Workout' : 'Start Walking'}
                </button>
            </div>
        </section>

        {/* Social & Motivation */}
        <section className="space-y-8">
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={dailySteps} earnedBadges={[]} />
        </section>
      </main>

      {/* Floating Action Button for AI Coach */}
      <button 
        onClick={() => setShowCoach(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-brand-600 to-emerald-400 rounded-[1.5rem] shadow-[0_20px_50px_rgba(76,175,80,0.3)] flex items-center justify-center text-white text-2xl z-50 hover:scale-110 active:scale-90 transition-all border-2 border-white/10"
      >
        <i className="fa-solid fa-robot"></i>
      </button>

      {/* Modals */}
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={profile.isGuest!} onLoginRequest={() => {}} onShareStats={() => {}} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={(s, p) => { setSettings(s); saveSettings(s); setProfile(p); saveProfile(p); }} onLogout={() => setProfile({...profile, isLoggedIn: false})} onLoginRequest={() => {}} />
      <VisualShareModal isOpen={visualShare.isOpen} onClose={() => setVisualShare(v => ({ ...v, isOpen: false }))} type={visualShare.type as any} data={visualShare.data} />
    </div>
  );
};

export default App;
