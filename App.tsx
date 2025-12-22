
import React, { useState, useEffect, useMemo } from 'react';
import { RadialProgress } from './components/RadialProgress';
import { StatsGrid } from './components/StatsGrid';
import { AICoachModal } from './components/AICoachModal';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { Achievements } from './components/Achievements';
import { DailyQuote } from './components/DailyQuote';
import { VisualShareModal } from './components/VisualShareModal';
import { WorkoutPlannerModal } from './components/WorkoutPlannerModal';
import { SocialHub } from './components/SocialHub';
import { BuddyFinder } from './components/BuddyFinder';
import { ParkFinder } from './components/ParkFinder';
import { HydrationModal } from './components/HydrationModal';
import { HydrationCard } from './components/HydrationCard';
import { BreathExerciseModal } from './components/BreathExerciseModal';
import { BreathExerciseCard } from './components/BreathExerciseCard';
import { SleepModal } from './components/SleepModal';
import { SleepCard } from './components/SleepCard';
import { WeatherCard } from './components/WeatherCard';
import { WeatherDetailedModal } from './components/WeatherDetailedModal';
import { VirtualTrekCard } from './components/VirtualTrekCard';
import { RhythmGuide } from './components/RhythmGuide';
import { RhythmDetailModal } from './components/RhythmDetailModal';
import { LiveTracker } from './components/LiveTracker';
import { SessionDetailModal } from './components/SessionDetailModal';
import { JourneyHubModal } from './components/JourneyHubModal';
import { PathSnailTrail } from './components/PathSnailTrail';

import { usePedometer } from './hooks/usePedometer';
import { useMetronome } from './hooks/useMetronome';
import { useAutoTracker } from './hooks/useAutoTracker';
import { UserProfile, UserSettings, WalkSession, HydrationLog, WeatherData, DailyHistory } from './types';
import { 
    getProfile, saveProfile, getSettings, saveSettings, saveHistory, 
    getHydration, saveHydration, saveActivePlan, getHistory, 
    fetchCloudHistory, fetchCloudHydration 
} from './services/storageService';
import { signOut, syncProfile } from './services/authService';
import { supabase } from './services/supabaseClient';
import { getWeather } from './services/weatherService';
import { getLocalityName } from './services/parkService';
import { getHydrationTip } from './services/geminiService';
import { updateLiveLocation } from './services/buddyService';

// --- GLOBAL CACHE CONTROL ---
const CURRENT_APP_VERSION = "2.3.0"; 

const App: React.FC = () => {
  // 1. Check if we are returning from OAuth (tokens in URL)
  const isReturningFromAuth = window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery');

  // 2. Initial State from Cache (Optimistic)
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedVersion = localStorage.getItem('apnawalk_schema_version');
    if (savedVersion !== CURRENT_APP_VERSION) {
        localStorage.clear(); 
        localStorage.setItem('apnawalk_schema_version', CURRENT_APP_VERSION);
        return { name: '', email: '', isLoggedIn: false, isGuest: false };
    }
    return getProfile() || { name: '', email: '', isLoggedIn: false, isGuest: false };
  });

  // Only show loading if we have NO profile AND we are returning from OAuth
  const [isInitialLoading, setIsInitialLoading] = useState(!profile.isLoggedIn && isReturningFromAuth);

  const [settings, setSettings] = useState<UserSettings>(() => getSettings() || {
    weightKg: 70, heightCm: 175, strideLengthCm: 73, stepGoal: 6000,
    sensitivity: 3, enableLocation: true, theme: 'green',
    notifications: { water: true, walk: true, breath: true }
  });

  const { dailySteps, sessionSteps, isTrackingSession, lastStepTimestamp, requestPermission, startSession, stopSession } = usePedometer(profile.id, settings.sensitivity);
  const { bpm, isPlaying, togglePlay, setBpm } = useMetronome(115);

  // UI States
  const [showCoach, setShowCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showBuddy, setShowBuddy] = useState(false);
  const [showParks, setShowParks] = useState(false);
  const [showHydration, setShowHydration] = useState(false);
  const [showBreath, setShowBreath] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [showRhythmDetail, setShowRhythmDetail] = useState(false);
  const [showJourneyHub, setShowJourneyHub] = useState(false);
  const [selectedForensicSession, setSelectedForensicSession] = useState<WalkSession | null>(null);

  // Data States
  const [hydration, setHydration] = useState<HydrationLog>(() => getHydration());
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locality, setLocality] = useState<string>("Detecting...");
  const [fullHistory, setFullHistory] = useState<DailyHistory[]>(() => getHistory());
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [visualShare, setVisualShare] = useState<{ isOpen: boolean; type: 'stats' | 'quote'; data: any; }>({ isOpen: false, type: 'stats', data: null as any });

  // AUTH LIFECYCLE (Optimized)
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            // Immediately check for session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && mounted) {
                const userProfile = await syncProfile(session.user);
                setProfile(userProfile);
                saveProfile(userProfile);
                // Clear the hash from URL without refreshing
                if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
            }
        } catch (e) { 
            console.error("Auth init failed", e);
        } finally {
            if (mounted) setIsInitialLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("Supabase Auth Event:", event);
      
      if (session?.user) {
        const userProfile = await syncProfile(session.user);
        setProfile(userProfile);
        saveProfile(userProfile);
        setIsInitialLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
        localStorage.removeItem('strideai_profile');
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  // Background Data Sync
  useEffect(() => {
      if (profile.isLoggedIn && !profile.isGuest && profile.id) {
          fetchCloudHistory(profile.id).then(setFullHistory).catch(() => {});
          fetchCloudHydration(profile.id).then(setHydration).catch(() => {});
      }
  }, [profile.isLoggedIn, profile.isGuest, profile.id]);

  const handleLogout = async () => {
    await signOut();
    setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
    setShowSettings(false);
  };

  const { isAutoRecording, autoRoute } = useAutoTracker(
      profile.isLoggedIn, 
      dailySteps, 
      settings, 
      async (session) => {
          const updatedHistory = await saveHistory(profile.id, session.steps, session);
          setFullHistory(updatedHistory);
      }
  );

  // Geo & Weather Background
  useEffect(() => {
    if (settings.enableLocation && profile.isLoggedIn) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const [w, l] = await Promise.all([
                getWeather(pos.coords.latitude, pos.coords.longitude),
                getLocalityName(pos.coords.latitude, pos.coords.longitude)
            ]);
            setWeather(w);
            setLocality(l.locality);
            const tip = await getHydrationTip(hydration.currentMl, hydration.goalMl, dailySteps, w);
            setHydrationTip(tip);
        }, null, { enableHighAccuracy: false });
    }
  }, [settings.enableLocation, profile.isLoggedIn]);

  const displaySteps = isTrackingSession ? sessionSteps : dailySteps;
  const displayDistance = (displaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((displaySteps * 0.04) * (settings.weightKg / 70));

  const handleToggleTracking = async () => {
    if (isTrackingSession) {
        const finalSteps = stopSession();
        const session: WalkSession = {
            id: `manual-${Date.now()}`,
            startTime: Date.now() - (finalSteps > 0 ? 300 : 0), 
            steps: finalSteps,
            distanceMeters: (finalSteps * settings.strideLengthCm) / 100,
            calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)),
            durationSeconds: 0 
        };
        const updated = await saveHistory(profile.id, session.steps, session);
        setFullHistory(updated);
        setCurrentSession(session);
        setShowCoach(true);
    } else {
        const granted = await requestPermission();
        if (granted) startSession();
    }
  };

  const handleHydrationUpdate = (newLog: HydrationLog) => {
    setHydration(newLog);
    saveHydration(profile.id, newLog);
  };

  const todayData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return fullHistory.find(h => h.date === todayStr) || { steps: 0, sessions: [] };
  }, [fullHistory]);

  if (isInitialLoading) {
    return (
        <div className="min-h-screen bg-[#0a0f14] flex flex-col items-center justify-center p-6">
            <div className="relative w-16 h-16 mb-8">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl"></div>
                <div className="absolute inset-0 border-4 border-brand-500 rounded-2xl border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[5px] animate-pulse">Establishing Session...</p>
        </div>
    );
  }

  if (!profile.isLoggedIn) {
    return <LoginScreen 
        onLogin={() => {}} 
        onGuest={() => setProfile({ ...profile, isLoggedIn: true, isGuest: true, id: 'guest' })} 
        onShowLegal={() => {}} 
    />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white font-sans pb-32 overflow-x-hidden animate-fade-in">
      
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <i className="fa-solid fa-person-running text-brand-500 text-xl"></i>
                <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none"><span className="text-brand-500">Apna</span>Walk</h1>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-8 overflow-hidden">
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`${isAutoRecording ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutoRecording ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                </span>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] truncate max-w-[200px] leading-tight">
                    {locality}
                </p>
            </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <i className="fa-solid fa-user-gear text-slate-400"></i>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-10 space-y-12">
        
        <section className="flex flex-col items-center">
            <RadialProgress current={displaySteps} total={settings.stepGoal} label={isTrackingSession ? "Session Live" : "Today's Walk"} subLabel="Tap to control" lastStepTime={lastStepTimestamp} isActive={isTrackingSession} onClick={handleToggleTracking} />
            <div className="w-full grid grid-cols-1 gap-6 mt-8">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={0} onStatClick={() => {}} />
                <div className="flex gap-4 w-full">
                    {!isTrackingSession ? (
                        <button onClick={handleToggleTracking} className="flex-1 bg-gradient-to-r from-brand-600 to-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-xl text-xs uppercase tracking-[5px] flex items-center justify-center gap-3 border border-white/10"><i className="fa-solid fa-play"></i> Start Walk</button>
                    ) : (
                        <button onClick={handleToggleTracking} className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black py-5 rounded-[2rem] shadow-xl text-xs uppercase tracking-[5px] flex items-center justify-center gap-3 border border-white/10"><i className="fa-solid fa-square"></i> Finish Walk</button>
                    )}
                </div>
                <div onClick={() => setShowJourneyHub(true)} className="bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] p-6 flex flex-col gap-6 hover:bg-slate-800/60 transition-all cursor-pointer group shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] mb-1">Journey Log</p>
                            <h4 className="text-white font-black text-2xl italic tracking-tighter uppercase">{todayData.sessions?.length || 0} Path Segments</h4>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                            <i className="fa-solid fa-map-location-dot text-xl"></i>
                        </div>
                    </div>
                    <div className="w-full h-20 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/5 relative z-10">
                        {autoRoute.length > 1 ? <PathSnailTrail route={autoRoute} className="h-16 w-full opacity-60" /> : <div className="flex items-center gap-3 opacity-20"><i className="fa-solid fa-satellite-dish animate-pulse"></i><span className="text-[10px] font-black uppercase tracking-widest">Awaiting Movement</span></div>}
                    </div>
                    <div className="flex justify-between items-center pt-2 relative z-10">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[3px]">Tap to browse history</span>
                        <div className="flex items-center gap-2 text-brand-500"><span className="text-[10px] font-black uppercase tracking-widest">Full Access</span><i className="fa-solid fa-chevron-right text-xs"></i></div>
                    </div>
                </div>
            </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ToolCard icon="fa-calendar-day" label="AI Plan" color="bg-slate-800/40" iconColor="text-brand-400" onClick={() => setShowPlanner(true)} />
            <ToolCard icon="fa-users-line" label="Social" color="bg-slate-800/40" iconColor="text-orange-400" onClick={() => setShowSocial(true)} />
            <ToolCard icon="fa-people-arrows" label="Buddy" color="bg-slate-800/40" iconColor="text-blue-400" onClick={() => setShowBuddy(true)} />
            <ToolCard icon="fa-map-location-dot" label="Parks" color="bg-slate-800/40" iconColor="text-emerald-400" onClick={() => setShowParks(true)} />
        </section>

        <section className="space-y-4">
            <HydrationCard data={hydration} recommendation={hydrationTip} onClick={() => setShowHydration(true)} onQuickAdd={() => handleHydrationUpdate({...hydration, currentMl: hydration.currentMl + 250})} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BreathExerciseCard onClick={() => setShowBreath(true)} />
                <SleepCard onClick={() => setShowSleep(true)} />
            </div>
            <RhythmGuide bpm={bpm} isPlaying={isPlaying} togglePlay={togglePlay} setBpm={setBpm} onClick={() => setShowRhythmDetail(true)} />
            <VirtualTrekCard totalLifetimeSteps={dailySteps} />
        </section>

        <section className="space-y-8 pb-10">
            <WeatherCard weather={weather} loading={weatherLoading} onClick={() => setShowWeatherDetail(true)} />
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={dailySteps} earnedBadges={[]} />
        </section>
      </main>

      <button onClick={() => setShowCoach(true)} className="fixed bottom-8 right-8 w-20 h-20 bg-gradient-to-tr from-brand-600 to-emerald-400 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-white z-50 hover:scale-110 active:scale-90 transition-all border-2 border-white/10 group">
        <i className="fa-solid fa-robot text-2xl group-hover:animate-bounce"></i>
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Coach</span>
      </button>

      <JourneyHubModal isOpen={showJourneyHub} onClose={() => setShowJourneyHub(false)} history={fullHistory} onViewSegment={(s) => setSelectedForensicSession(s)} />
      <SessionDetailModal session={selectedForensicSession} onClose={() => setSelectedForensicSession(null)} onShare={(s) => setVisualShare({ isOpen: true, type: 'stats', data: s })} />
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={profile.isGuest!} onLoginRequest={() => {}} onShareStats={() => {}} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={(s, p) => { setSettings(s); saveSettings(profile.id, s); setProfile(p); saveProfile(p); }} onLogout={handleLogout} onLoginRequest={() => {}} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={(p) => { saveActivePlan(p); setShowPlanner(false); }} />
      <SocialHub isOpen={showSocial} onClose={() => setShowSocial(false)} profile={profile} />
      <BuddyFinder isOpen={showBuddy} onClose={() => setShowBuddy(false)} profile={profile} />
      <ParkFinder isOpen={showParks} onClose={() => setShowParks(false)} profile={profile} />
      <HydrationModal isOpen={showHydration} onClose={() => setShowHydration(false)} data={hydration} onUpdate={handleHydrationUpdate} />
      <BreathExerciseModal isOpen={showBreath} onClose={() => setShowBreath(false)} />
      <SleepModal isOpen={showSleep} onClose={() => setShowSleep(false)} />
      <WeatherDetailedModal isOpen={showWeatherDetail} onClose={() => setShowWeatherDetail(false)} weather={weather} />
      <RhythmDetailModal isOpen={showRhythmDetail} onClose={() => setShowRhythmDetail(false)} bpm={bpm} setBpm={setBpm} isPlaying={isPlaying} togglePlay={togglePlay} />
      <VisualShareModal isOpen={visualShare.isOpen} onClose={() => setVisualShare(v => ({ ...v, isOpen: false }))} type={visualShare.type} data={visualShare.data} />
    </div>
  );
};

const ToolCard = ({ icon, label, color, iconColor, onClick }: { icon: string, label: string, color: string, iconColor: string, onClick: () => void }) => (
    <button onClick={onClick} className={`${color} p-6 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.03] active:scale-95 group backdrop-blur-sm`}>
        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${iconColor} text-xl shadow-inner group-hover:rotate-12 transition-transform`}>
            <i className={`fa-solid ${icon}`}></i>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[3px] text-slate-400 text-center">{label}</span>
    </button>
);

export default App;
