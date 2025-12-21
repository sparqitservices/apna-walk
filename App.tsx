
import React, { useState, useEffect } from 'react';
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
import { DailyTimeline } from './components/DailyTimeline';

import { usePedometer } from './hooks/usePedometer';
import { useMetronome } from './hooks/useMetronome';
import { UserProfile, UserSettings, WalkSession, HydrationLog, WeatherData, WeeklyPlan, DailyHistory } from './types';
import { getProfile, saveProfile, getSettings, saveSettings, saveHistory, getHydration, saveHydration, saveActivePlan, getHistory } from './services/storageService';
import { getWeather } from './services/weatherService';
import { getLocalityName } from './services/parkService';
import { getHydrationTip } from './services/geminiService';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getProfile() || { name: '', email: '', isLoggedIn: false, isGuest: false });
  const [settings, setSettings] = useState<UserSettings>(() => getSettings() || {
    weightKg: 70, heightCm: 175, strideLengthCm: 73, stepGoal: 6000,
    sensitivity: 3, enableLocation: true, theme: 'green',
    notifications: { water: true, walk: true, breath: true }
  });

  const { dailySteps, sessionSteps, isTrackingSession, lastStepTimestamp, permissionGranted, requestPermission, startSession, stopSession, error: sensorError } = usePedometer(settings.sensitivity);
  const { bpm, isPlaying, togglePlay, setBpm } = useMetronome(115);

  // Modal States
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
  const [showLiveTracker, setShowLiveTracker] = useState(false);

  // Data States
  const [hydration, setHydration] = useState<HydrationLog>(() => getHydration());
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locality, setLocality] = useState<string>("Local Sector");
  const [todaySessions, setTodaySessions] = useState<WalkSession[]>([]);
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [visualShare, setVisualShare] = useState<{ isOpen: boolean; type: 'stats' | 'quote'; data: any; }>({ isOpen: false, type: 'stats', data: null as any });

  useEffect(() => {
    // Load today's history from storage
    const history = getHistory();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = history.find(h => h.date === todayStr);
    if (todayLog && todayLog.sessions) {
        setTodaySessions(todayLog.sessions);
    }
  }, []);

  useEffect(() => {
    if (settings.enableLocation) {
        setWeatherLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const data = await getWeather(pos.coords.latitude, pos.coords.longitude);
            const locData = await getLocalityName(pos.coords.latitude, pos.coords.longitude);
            setWeather(data);
            setLocality(locData.locality);
            setWeatherLoading(false);
            
            const tip = await getHydrationTip(hydration.currentMl, hydration.goalMl, dailySteps, data);
            setHydrationTip(tip);
        }, () => setWeatherLoading(false));
    }
  }, [settings.enableLocation]);

  const displaySteps = isTrackingSession ? sessionSteps : dailySteps;
  const displayDistance = (displaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((displaySteps * 0.04) * (settings.weightKg / 70));

  const handleStartWorkout = async () => {
    const granted = await requestPermission();
    if (granted) { 
        setShowLiveTracker(true); 
        if (navigator.vibrate) navigator.vibrate(150); 
    }
    else { alert("Please enable Motion Sensor permissions to track your movement!"); }
  };

  const handleFinishWorkout = (session: WalkSession) => {
    saveHistory(session.steps, session);
    setTodaySessions(prev => [session, ...prev]);
    setCurrentSession(session);
    setShowLiveTracker(false);
    setShowCoach(true);
  };

  const handleHydrationUpdate = (newLog: HydrationLog) => {
    setHydration(newLog);
    saveHydration(newLog);
  };

  const handleSavePlan = (plan: WeeklyPlan) => {
    saveActivePlan(plan);
    setShowPlanner(false);
  };

  if (!profile.isLoggedIn) {
    return <LoginScreen onLogin={() => {}} onGuest={() => setProfile({ ...profile, isLoggedIn: true, isGuest: true })} onShowLegal={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white font-sans pb-32 overflow-x-hidden">
      
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <i className="fa-solid fa-person-running text-brand-500 text-xl"></i>
                <h1 className="text-2xl font-black italic tracking-tighter"><span className="text-brand-500">APNA</span>WALK</h1>
            </div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[4px] mt-1 ml-8">System: Online • {locality}</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-[1.2rem] bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <i className="fa-solid fa-user-gear text-slate-400"></i>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-10 space-y-16">
        
        {sensorError && (
            <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl flex items-start gap-4 text-red-400 animate-message-pop">
                <i className="fa-solid fa-triangle-exclamation mt-1"></i>
                <div><p className="text-[10px] font-black uppercase tracking-widest mb-1">Sensor Error</p><p className="text-xs leading-relaxed opacity-80">{sensorError}</p></div>
            </div>
        )}

        {/* --- MAIN DASHBOARD --- */}
        <section className="flex flex-col items-center">
            <RadialProgress current={displaySteps} total={settings.stepGoal} label="Today's Walk" subLabel="Walk on, Boss!" lastStepTime={lastStepTimestamp} />
            <div className="w-full grid grid-cols-1 gap-6 mt-8">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={0} onStatClick={() => {}} />
                
                <button onClick={handleStartWorkout} className="w-full py-7 rounded-[2.5rem] font-black text-base tracking-[6px] uppercase shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center gap-5 border-t border-white/20">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/10"><i className="fa-solid fa-play pl-1"></i></div>
                    Start Tracking
                </button>

                {/* --- DAILY TIMELINE CARD --- */}
                <DailyTimeline sessions={todaySessions} onViewDetails={(s) => { setCurrentSession(s); setShowCoach(true); }} />
            </div>
        </section>

        {/* --- PRIMARY TOOLS GRID --- */}
        <section>
            <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 mb-6 ml-2">Primary Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ToolCard icon="fa-calendar-day" label="AI Planner" color="bg-slate-800/40" iconColor="text-brand-400" onClick={() => setShowPlanner(true)} />
                <ToolCard icon="fa-users-line" label="Social Hub" color="bg-slate-800/40" iconColor="text-orange-400" onClick={() => setShowSocial(true)} />
                <ToolCard icon="fa-people-arrows" label="Buddy" color="bg-slate-800/40" iconColor="text-blue-400" onClick={() => setShowBuddy(true)} />
                <ToolCard icon="fa-map-location-dot" label="Parks" color="bg-slate-800/40" iconColor="text-emerald-400" onClick={() => setShowParks(true)} />
            </div>
        </section>

        {/* --- HEALTH SUITE --- */}
        <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 mb-6 ml-2">Health Suite</h3>
            <div className="space-y-4">
                <HydrationCard data={hydration} recommendation={hydrationTip} onClick={() => setShowHydration(true)} onQuickAdd={() => handleHydrationUpdate({...hydration, currentMl: hydration.currentMl + 250})} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BreathExerciseCard onClick={() => setShowBreath(true)} />
                    <SleepCard onClick={() => setShowSleep(true)} />
                </div>
            </div>
        </section>

        {/* --- TRAINING & PERFORMANCE --- */}
        <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 mb-6 ml-2">Performance Engine</h3>
            <div className="space-y-4">
                <RhythmGuide bpm={bpm} isPlaying={isPlaying} togglePlay={togglePlay} setBpm={setBpm} onClick={() => setShowRhythmDetail(true)} />
                <VirtualTrekCard totalLifetimeSteps={dailySteps} />
            </div>
        </section>

        {/* --- WEATHER & INSIGHTS --- */}
        <section className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 mb-6 ml-2">Environment & Motivation</h3>
            <WeatherCard weather={weather} loading={weatherLoading} onClick={() => setShowWeatherDetail(true)} />
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={dailySteps} earnedBadges={[]} />
        </section>
      </main>

      <button onClick={() => setShowCoach(true)} className="fixed bottom-8 right-8 w-20 h-20 bg-gradient-to-tr from-brand-600 to-emerald-400 rounded-[2rem] shadow-[0_25px_60px_rgba(76,175,80,0.4)] flex flex-col items-center justify-center text-white z-50 hover:scale-110 active:scale-90 transition-all border-2 border-white/10 group">
        <i className="fa-solid fa-robot text-2xl group-hover:animate-bounce"></i>
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Coach</span>
      </button>

      {/* --- MODAL LAYER --- */}
      <LiveTracker isOpen={showLiveTracker} onClose={() => setShowLiveTracker(false)} profile={profile} settings={settings} onFinish={handleFinishWorkout} />
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={profile.isGuest!} onLoginRequest={() => {}} onShareStats={() => {}} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={(s, p) => { setSettings(s); saveSettings(s); setProfile(p); saveProfile(p); }} onLogout={() => setProfile({...profile, isLoggedIn: false})} onLoginRequest={() => {}} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={handleSavePlan} />
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
    <button onClick={onClick} className={`${color} p-6 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.03] active:scale-95 group backdrop-blur-sm`}>
        <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${iconColor} text-xl shadow-inner group-hover:rotate-12 transition-transform`}>
            <i className={`fa-solid ${icon}`}></i>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-300 text-center">{label}</span>
    </button>
);

export default App;
