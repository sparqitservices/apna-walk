
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
import { WeatherDetailedModal } from './components/WeatherDetailedModal';
import { VirtualTrekCard } from './components/VirtualTrekCard';
import { RhythmGuide } from './components/RhythmGuide';
import { RhythmDetailModal } from './components/RhythmDetailModal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { JourneyHubModal } from './components/JourneyHubModal';
import { PathSnailTrail } from './components/PathSnailTrail';
import { AutoTrackerCard } from './components/AutoTrackerCard';
import { AutoHistoryModal } from './components/AutoHistoryModal';
import { WalkingPortal } from './components/WalkingPortal';

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
import { getWeather, getWeatherIcon, getAQIStatus } from './services/weatherService';
import { getLocalityName } from './services/parkService';
import { getHydrationTip } from './services/geminiService';

const CURRENT_APP_VERSION = "2.4.0"; 

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedVersion = localStorage.getItem('apnawalk_schema_version');
    if (savedVersion !== CURRENT_APP_VERSION) {
        localStorage.clear(); 
        localStorage.setItem('apnawalk_schema_version', CURRENT_APP_VERSION);
        return { name: '', email: '', isLoggedIn: false, isGuest: false };
    }
    return getProfile() || { name: '', email: '', isLoggedIn: false, isGuest: false };
  });

  const [isInitialLoading, setIsInitialLoading] = useState(() => {
      const isReturning = window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery');
      return isReturning && !profile.isLoggedIn;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = getSettings();
    const defaultSettings: UserSettings = {
        weightKg: 70, heightCm: 175, strideLengthCm: 73, stepGoal: 6000,
        sensitivity: 3, enableLocation: true, theme: 'green',
        autoTravelHistory: false,
        coachVibe: 'Energetic', coachVoiceEnabled: true,
        notifications: { water: true, walk: true, breath: true, achievements: true }
    };
    return saved ? { ...defaultSettings, ...saved } : defaultSettings;
  });

  const { dailySteps, sessionSteps, isTrackingSession, lastStepTimestamp, requestPermission, startSession, stopSession } = usePedometer(profile.id, settings.sensitivity);
  const { bpm, isPlaying, togglePlay, setBpm } = useMetronome(115);

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
  const [showAutoHistory, setShowAutoHistory] = useState(false);
  const [isWalkingPortalOpen, setIsWalkingPortalOpen] = useState(false);
  const [selectedForensicSession, setSelectedForensicSession] = useState<WalkSession | null>(null);

  const [hydration, setHydration] = useState<HydrationLog>(() => getHydration());
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locality, setLocality] = useState<string>("Detecting...");
  const [fullHistory, setFullHistory] = useState<DailyHistory[]>(() => getHistory());
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [visualShare, setVisualShare] = useState<{ isOpen: boolean; type: 'stats' | 'quote'; data: any; }>({ isOpen: false, type: 'stats', data: null as any });

  useEffect(() => {
    let mounted = true;
    const failSafe = setTimeout(() => { if (mounted && isInitialLoading) setIsInitialLoading(false); }, 3000);
    const initSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && mounted) {
                const userProfile = await syncProfile(session.user);
                setProfile(userProfile);
                saveProfile(userProfile);
                if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
            }
        } catch (e) { console.error(e); } finally { if (mounted) { setIsInitialLoading(false); clearTimeout(failSafe); } }
    };
    initSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session?.user) {
        const userProfile = await syncProfile(session.user);
        setProfile(userProfile);
        saveProfile(userProfile);
        setIsInitialLoading(false);
        clearTimeout(failSafe);
      } else if (event === 'SIGNED_OUT') {
        setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
        setIsInitialLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); clearTimeout(failSafe); };
  }, []);

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

  const { isAutoRecording, autoRoute, activeActivityType } = useAutoTracker(
      profile.isLoggedIn, 
      dailySteps, 
      settings, 
      async (session) => {
          const updatedHistory = await saveHistory(profile.id, session.steps, session);
          setFullHistory(updatedHistory);
      }
  );

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
  }, [settings.enableLocation, profile.isLoggedIn, dailySteps]);

  const displaySteps = dailySteps;
  const displayDistance = (displaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((displaySteps * 0.04) * (settings.weightKg / 70));

  const openWalkingPortal = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      setIsWalkingPortalOpen(true);
  };

  const handleStartSession = async () => {
      const granted = await requestPermission();
      if (granted) {
          if (navigator.vibrate) navigator.vibrate([30, 50]);
          startSession();
      }
  };

  const handleFinishSession = async () => {
    const finalSteps = stopSession();
    // Only save if some steps were taken during session or at least time passed
    if (finalSteps >= 0) {
        const session: WalkSession = { 
            id: `manual-${Date.now()}`, 
            startTime: Date.now() - 300, 
            steps: finalSteps, 
            distanceMeters: (finalSteps * settings.strideLengthCm) / 100, 
            calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)), 
            durationSeconds: 0,
            activityType: 'walking'
        };
        const updated = await saveHistory(profile.id, 0, session); 
        setFullHistory(updated);
        setCurrentSession(session);
        setIsWalkingPortalOpen(false);
        setShowCoach(true);
    } else {
        setIsWalkingPortalOpen(false);
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

  const todayBreakdown = useMemo(() => {
    const totals = { walking: 0, cycling: 0, driving: 0 };
    todayData.sessions?.forEach(s => {
        const type = s.activityType || 'walking';
        if (type in totals) totals[type as keyof typeof totals] += s.distanceMeters;
    });
    const sum = (totals.walking + totals.cycling + totals.driving) || 1;
    return { wP: (totals.walking / sum) * 100, cP: (totals.cycling / sum) * 100, dP: (totals.driving / sum) * 100, totalKm: (sum / 1000).toFixed(1) };
  }, [todayData.sessions]);

  if (isInitialLoading) {
    return (
        <div className="min-h-screen bg-[#0a0f14] flex flex-col items-center justify-center p-6">
            <div className="relative w-16 h-16 mb-8">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-2xl"></div>
                <div className="absolute inset-0 border-4 border-brand-500 rounded-2xl border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[5px] animate-pulse">Syncing Identity...</p>
        </div>
    );
  }

  if (!profile.isLoggedIn) {
    return <LoginScreen onLogin={() => {}} onGuest={() => setProfile({ ...profile, isLoggedIn: true, isGuest: true, id: 'guest' })} onShowLegal={() => {}} />;
  }

  return (
    <div className={`min-h-screen bg-[#0a0f14] text-white font-sans pb-32 overflow-x-hidden animate-fade-in ${isWalkingPortalOpen ? 'overflow-hidden h-screen' : ''}`}>
      
      <header className="p-4 sm:p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <i className="fa-solid fa-person-running text-brand-500 text-xl"></i>
                <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none"><span className="text-brand-500">Apna</span>Walk</h1>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-8 overflow-hidden">
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`${isAutoRecording || isTrackingSession ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutoRecording || isTrackingSession ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                </span>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[2px] truncate max-w-[120px] sm:max-w-[200px] leading-tight">
                    {locality}
                </p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {weather && (
                <button 
                    onClick={() => setShowWeatherDetail(true)}
                    className="flex items-center gap-2.5 px-4 h-12 rounded-2xl bg-white/5 border border-white/5 shadow-inner hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <div className={getWeatherIcon(weather.weatherCode, weather.isDay).color}>
                        <i className={`fa-solid ${getWeatherIcon(weather.weatherCode, weather.isDay).icon} text-sm`}></i>
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-sm font-black italic tabular-nums">{Math.round(weather.temperature)}°</span>
                        {weather.aqi !== undefined && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${getAQIStatus(weather.aqi).color.replace('text-', 'bg-')} shadow-[0_0_5px_currentColor]`}></div>
                                <span className="text-[7px] font-black uppercase text-slate-500 tracking-tighter">AQI {weather.aqi}</span>
                            </div>
                        )}
                    </div>
                </button>
            )}

            <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <i className="fa-solid fa-user-gear text-slate-400"></i>
            </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-10 space-y-12">
        <section className="flex flex-col items-center">
            <RadialProgress 
                current={displaySteps} 
                total={settings.stepGoal} 
                label={isTrackingSession ? "Session Live" : "Today's Walk"} 
                subLabel={isTrackingSession ? "Finish Inside Portal" : "Pao Pao Guru!"} 
                lastStepTime={lastStepTimestamp} 
                isActive={isTrackingSession}
                onClick={openWalkingPortal} 
            />
            <div className="w-full grid grid-cols-1 gap-6 mt-8">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={0} onStatClick={() => {}} />
                <div className="flex gap-4 w-full">
                    <button 
                        onClick={openWalkingPortal} 
                        className={`flex-1 transition-all duration-500 font-black py-5 rounded-[2rem] shadow-xl text-xs uppercase tracking-[5px] flex items-center justify-center gap-3 border border-white/10 ${isTrackingSession ? 'bg-emerald-500 text-white animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-brand-600 to-emerald-500 text-white'}`}
                    >
                        <i className={`fa-solid ${isTrackingSession ? 'fa-chart-line' : 'fa-play'}`}></i> 
                        {isTrackingSession ? 'View Active Walk' : 'Start Walk'}
                    </button>
                </div>
                <div onClick={() => setShowJourneyHub(true)} className="bg-slate-800/40 border border-slate-700/50 rounded-[2.5rem] p-6 flex flex-col gap-6 hover:bg-slate-800/60 transition-all cursor-pointer group shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] mb-1">Journey Log</p>
                            <h4 className="text-white font-black text-2xl italic tracking-tighter uppercase">{todayData.sessions?.length || 0} Path Segments</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-black text-xl italic tabular-nums leading-none">{todayBreakdown.totalKm} <small className="text-[10px] opacity-40 uppercase not-italic font-bold">KM</small></p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Today's Range</p>
                        </div>
                    </div>
                    <div className="w-full h-20 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/5 relative z-10">
                        {autoRoute.length > 1 ? <PathSnailTrail route={autoRoute} className="h-16 w-full opacity-60" /> : <div className="flex items-center gap-3 opacity-20"><i className="fa-solid fa-satellite-dish animate-pulse"></i><span className="text-[10px] font-black uppercase tracking-widest">Awaiting Movement</span></div>}
                    </div>
                    <div className="flex h-1.5 w-full bg-slate-900 rounded-full overflow-hidden relative z-10">
                        <div className="bg-brand-500 h-full" style={{ width: `${todayBreakdown.wP}%` }}></div>
                        <div className="bg-blue-500 h-full" style={{ width: `${todayBreakdown.cP}%` }}></div>
                        <div className="bg-orange-500 h-full" style={{ width: `${todayBreakdown.dP}%` }}></div>
                    </div>
                </div>
            </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
            <ToolCard icon="fa-calendar-day" label="AI Plan" sub="Guidance" iconColor="text-brand-400" onClick={() => setShowPlanner(true)} />
            <ToolCard icon="fa-users-line" label="Social" sub="Squads" iconColor="text-orange-400" onClick={() => setShowSocial(true)} />
            <ToolCard icon="fa-people-arrows" label="Buddy" sub="Muqabla" iconColor="text-blue-400" onClick={() => setShowBuddy(true)} />
            <ToolCard icon="fa-map-location-dot" label="Parks" sub="Radar" iconColor="text-emerald-400" onClick={() => setShowParks(true)} />
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
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={dailySteps} earnedBadges={[]} />
            <AutoTrackerCard isActive={settings.autoTravelHistory} currentMode={activeActivityType} history={fullHistory} onClick={() => setShowAutoHistory(true)} />
        </section>
      </main>

      <button onClick={() => setShowCoach(true)} className="fixed bottom-8 right-8 w-20 h-20 bg-gradient-to-tr from-brand-600 to-emerald-400 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-white z-50 hover:scale-110 active:scale-90 transition-all border-2 border-white/10 group">
        <i className="fa-solid fa-robot text-2xl group-hover:animate-bounce"></i>
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Coach</span>
      </button>

      <WalkingPortal 
          isOpen={isWalkingPortalOpen} 
          onClose={isTrackingSession ? handleFinishSession : () => setIsWalkingPortalOpen(false)} 
          isTracking={isTrackingSession}
          steps={sessionSteps}
          settings={settings}
          lastStepTime={lastStepTimestamp}
          onStart={handleStartSession}
          onFinish={handleFinishSession}
      />

      <JourneyHubModal isOpen={showJourneyHub} onClose={() => setShowJourneyHub(false)} history={fullHistory} onViewSegment={(s) => setSelectedForensicSession(s)} />
      <AutoHistoryModal isOpen={showAutoHistory} onClose={() => setShowAutoHistory(false)} history={fullHistory} />
      <SessionDetailModal session={selectedForensicSession} onClose={() => setSelectedForensicSession(null)} onShare={(s) => setVisualShare({ isOpen: true, type: 'stats', data: s })} />
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={profile.isGuest!} profile={profile} onLoginRequest={() => {}} onShareStats={() => {}} />
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

const ToolCard = ({ icon, label, sub, iconColor, onClick }: { icon: string, label: string, sub: string, iconColor: string, onClick: () => void }) => (
    <button onClick={onClick} className={`bg-slate-800/40 p-5 sm:p-6 rounded-[2.5rem] border border-slate-700/50 shadow-2xl flex flex-col gap-4 transition-all hover:bg-slate-800/60 active:scale-95 group backdrop-blur-sm relative overflow-hidden text-left`}>
        <div className={`absolute top-0 right-0 p-4 opacity-[0.03] text-6xl ${iconColor} rotate-12 pointer-events-none transition-all duration-700 group-hover:scale-125 group-hover:rotate-0`}><i className={`fa-solid ${icon}`}></i></div>
        <div className={`w-14 h-14 rounded-[1.5rem] bg-slate-900 border border-white/5 flex items-center justify-center ${iconColor} text-xl shadow-inner group-hover:rotate-12 transition-transform shrink-0`}><i className={`fa-solid ${icon}`}></i></div>
        <div className="relative z-10"><h3 className="text-white font-black text-lg italic tracking-tighter uppercase leading-none mb-1.5">{label}</h3><p className="text-[9px] text-slate-500 font-black uppercase tracking-[3px]">{sub}</p></div>
        <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"><i className={`fa-solid fa-chevron-right text-[10px] ${iconColor}`}></i></div>
    </button>
);

export default App;
