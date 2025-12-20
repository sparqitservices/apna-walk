import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RadialProgress } from './components/RadialProgress';
import { StatsGrid } from './components/StatsGrid';
import { AICoachModal } from './components/AICoachModal';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { Achievements } from './components/Achievements';
import { DailyQuote } from './components/DailyQuote';
import { ShareModal } from './components/ShareModal';
import { TutorialModal } from './components/TutorialModal';
import { WeatherCard } from './components/WeatherCard';
import { WeatherDetailedModal } from './components/WeatherDetailedModal';
import { BreathExerciseModal } from './components/BreathExerciseModal';
import { BreathExerciseCard } from './components/BreathExerciseCard'; 
import { SleepCard } from './components/SleepCard'; 
import { SleepModal } from './components/SleepModal';
import { VirtualTrekCard } from './components/VirtualTrekCard';
import { RhythmGuide } from './components/RhythmGuide';
import { RhythmDetailModal } from './components/RhythmDetailModal';
import { WorkoutPlannerModal } from './components/WorkoutPlannerModal';
import { ActivePlanCard } from './components/ActivePlanCard';
import { HydrationCard } from './components/HydrationCard';
import { HydrationModal } from './components/HydrationModal';
import { EventsModal } from './components/EventsModal';
import { SocialHub } from './components/SocialHub'; 
import { BuddyFinder } from './components/BuddyFinder';
import { ParkFinder } from './components/ParkFinder';
import { LiveTracker } from './components/LiveTracker';
import { LegalModal, DocType } from './components/LegalModal';
import { StatsDetailModal } from './components/StatsDetailModal'; 
import { ApnaWalkLogo } from './components/ApnaWalkLogo'; 
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { AdminDashboard } from './components/AdminDashboard'; 
import { VisualShareModal } from './components/VisualShareModal';
import { usePedometer } from './hooks/usePedometer';
import { useMetronome } from './hooks/useMetronome';
import { UserSettings, WalkSession, UserProfile, DailyHistory, Badge, RoutePoint, WeatherData, WeeklyPlan, HydrationLog } from './types';
import { saveHistory, getHistory, saveSettings, getSettings, getBadges, addBadge, hasSeenTutorial, markTutorialSeen, getProfile, saveProfile, saveActivePlan, getActivePlan, getHydration, saveHydration, syncDailyStatsToCloud, syncSessionToCloud, syncLocationToCloud, syncSettingsToCloud, fetchUserSettingsFromCloud, fetchHistoryFromCloud } from './services/storageService';
import { generateBadges, getHydrationTip } from './services/geminiService';
import { fetchTotalPendingCount } from './services/socialService';
import { fetchPendingBuddyCount } from './services/buddyService';
import { getWeather } from './services/weatherService';
import { updateMetadata } from './services/seoService';
import { scheduleReminders, requestNotificationPermission } from './services/notificationService';
import { supabase } from './services/supabaseClient'; 
import { signOut, syncProfile } from './services/authService';
import { getLocalityName } from './services/parkService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const THEMES = {
  green: { 50: '232 245 233', 100: '200 230 201', 400: '102 187 106', 500: '76 175 80', 600: '56 142 60', 900: '27 94 32' },
  blue: { 50: '239 246 255', 100: '219 234 254', 400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 900: '30 58 138' },
  orange: { 50: '255 251 235', 100: '254 243 199', 400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 900: '120 53 15' },
  purple: { 50: '250 245 255', 100: '243 232 255', 400: '192 132 252', 500: '168 85 247', 600: '147 51 234', 900: '88 28 135' },
  pink: { 50: '255 241 242', 100: '255 228 230', 400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 900: '136 19 55' }
};

const App: React.FC = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  if (path === '/privacy-policy') return <PrivacyPolicyPage />;
  if (path === '/terms-conditions') return <TermsConditionsPage />;
  if (path === '/admin') return <AdminDashboard />;

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = getProfile();
    return saved || { name: '', email: '', isLoggedIn: false, isGuest: false };
  });
  
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    weightKg: 70,
    heightCm: 175,
    strideLengthCm: 73,
    stepGoal: 6000,
    distanceGoal: 5000,
    calorieGoal: 300,
    sensitivity: 3,
    enableLocation: true,
    coachVibe: 'Energetic',
    notifications: { water: true, walk: true, breath: true },
    theme: 'green'
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('strideai_theme_mode');
    return saved ? saved === 'dark' : true; 
  });

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [historyRange, setHistoryRange] = useState<'week' | 'month'>('week');
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Normal Walk' | 'Brisk Walk' | 'Power Walk' | 'Long Walk'>('All');
  const [sessionSort, setSessionSort] = useState<'recent' | 'longest' | 'steps'>('recent');
  
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [hydration, setHydration] = useState<HydrationLog>({ date: '', currentMl: 0, goalMl: 2500 });
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [location, setLocation] = useState<string>("Detecting..."); 
  const [country, setCountry] = useState<string>("");
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [gpsError, setGpsError] = useState(false);
  const [newBadgeAlert, setNewBadgeAlert] = useState<Badge | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBreath, setShowBreath] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showSocialHub, setShowSocialHub] = useState(false); 
  const [showBuddyFinder, setShowBuddyFinder] = useState(false);
  const [showParkFinder, setShowParkFinder] = useState(false);
  const [showLiveTracker, setShowLiveTracker] = useState(false);
  const [totalPendingSocial, setTotalPendingSocial] = useState(0);
  const [totalPendingBuddies, setTotalPendingBuddies] = useState(0);
  const [legalDoc, setLegalDoc] = useState<DocType>(null);
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [selectedStat, setSelectedStat] = useState<'calories' | 'distance' | 'time' | null>(null);
  const [showRhythmDetail, setShowRhythmDetail] = useState(false);
  
  const [visualShare, setVisualShare] = useState<{ isOpen: boolean, type: 'quote' | 'stats', data: any }>({
      isOpen: false,
      type: 'quote',
      data: null
  });
  
  const { 
      dailySteps, 
      sessionSteps, 
      isTrackingSession, 
      startSession, 
      stopSession, 
      activateDailyTracking,
      permissionGranted: motionPermissionGranted,
      error: motionError 
  } = usePedometer(settings.sensitivity);
  
  const metronome = useMetronome();
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const syncTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('strideai_theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('strideai_theme_mode', 'light');
    }
  }, [isDarkMode]);

  const toggleThemeMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const savedSettings = getSettings();
    if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
    setHistory(getHistory());
    setEarnedBadges(getBadges());
    setActivePlan(getActivePlan());
    setHydration(getHydration());

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            syncProfile(session.user).then(async (p) => {
                const fullProfile = { ...p, id: session.user.id };
                setProfile(fullProfile);
                saveProfile(fullProfile);
                const cloudSettings = await fetchUserSettingsFromCloud(session.user.id);
                if (cloudSettings) setSettings(prev => ({ ...prev, ...cloudSettings }));
                const cloudHistory = await fetchHistoryFromCloud(session.user.id);
                if (cloudHistory.length > 0) setHistory(cloudHistory);
            });
        }
        setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            syncProfile(session.user).then(p => {
                const fullProfile = { ...p, id: session.user.id };
                setProfile(fullProfile);
                saveProfile(fullProfile);
            });
        } else if (event === 'SIGNED_OUT') {
            const local = getProfile();
            if (!local?.isGuest) setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
        }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
        setLocation("Geo disabled");
        return;
    }
    setLocation("Detecting...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            getLocalityName(latitude, longitude).then(data => {
                setLocation(data.locality);
                setCountry(data.country);
            });
            setCoords({ lat: latitude, lng: longitude });
            fetchLocalWeather(latitude, longitude);
        },
        () => setLocation("Tap to set location"),
        { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchLocalWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    const data = await getWeather(lat, lng);
    setWeather(data);
    setWeatherLoading(false);
  };

  useEffect(() => {
    if (!profile.isLoggedIn) return;
    activateDailyTracking();
    handleRefreshLocation();
  }, [profile.isLoggedIn]);

  useEffect(() => {
    const root = document.documentElement;
    const themeColors = THEMES[settings.theme] || THEMES.green;
    root.style.setProperty('--brand-50', themeColors[50]);
    root.style.setProperty('--brand-100', themeColors[100]);
    root.style.setProperty('--brand-400', themeColors[400]);
    root.style.setProperty('--brand-500', themeColors[500]);
    root.style.setProperty('--brand-600', themeColors[600]);
    root.style.setProperty('--brand-900', themeColors[900]);
  }, [settings.theme]);

  const currentDisplaySteps = isTrackingSession ? sessionSteps : dailySteps;
  const displayDistance = (currentDisplaySteps * settings.strideLengthCm) / 100;
  const displayCalories = Math.round((currentDisplaySteps * 0.04) * (settings.weightKg / 70));
  const totalLifetimeSteps = history.reduce((acc, curr) => acc + curr.steps, 0) + dailySteps;

  const analytics = useMemo(() => {
    const data = history.length > 0 ? history : [];
    const sliceCount = historyRange === 'week' ? 7 : 30;
    const chartData = data.slice(-sliceCount);
    if (chartData.length === 0) chartData.push({ date: new Date().toISOString().split('T')[0], steps: 0 } as any);
    let bestDay = { steps: 0, date: '-' };
    let filteredSessions: { date: string, session: WalkSession }[] = [];
    const limitDate = new Date();
    limitDate.setDate(new Date().getDate() - (historyRange === 'week' ? 7 : 30));
    const limitStr = limitDate.toISOString().split('T')[0];

    data.forEach(day => {
        if (day.steps > bestDay.steps) bestDay = { steps: day.steps, date: day.date };
        if (day.sessions) {
            day.sessions.forEach(s => {
                if (historyFilter !== 'All' && s.type !== historyFilter) return;
                if (day.date >= limitStr) filteredSessions.push({ date: day.date, session: s });
            });
        }
    });

    filteredSessions.sort((a, b) => {
        if (sessionSort === 'longest') return b.session.distanceMeters - a.session.distanceMeters;
        else if (sessionSort === 'steps') return b.session.steps - a.session.steps;
        return b.session.startTime - a.session.startTime;
    });
    return { chartData, bestDay, displaySessions: filteredSessions };
  }, [history, historyRange, sessionSort, historyFilter]);

  const handleToggleTracking = () => isTrackingSession ? handleFinishSession() : handleStartSession();
  const handleStartSession = () => { if (typeof navigator.vibrate === 'function') navigator.vibrate(100); setRoute([]); setGpsError(!settings.enableLocation); startSession(); };
  const handleFinishSession = async (gpsSession?: WalkSession) => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(100);
    if (gpsSession) { setCurrentSession(gpsSession); const newHistory = saveHistory(0, gpsSession); setHistory(newHistory); setShowCoach(true); setShowLiveTracker(false); return; }
    const finalSteps = stopSession();
    if (finalSteps > 10 || duration > 30) {
        const sessionData: WalkSession = { id: `sess-${Date.now()}`, startTime: Date.now() - (duration * 1000), steps: finalSteps, distanceMeters: (finalSteps * settings.strideLengthCm) / 100, calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)), durationSeconds: duration, route: route };
        setCurrentSession(sessionData);
        const newHistory = saveHistory(0, sessionData);
        setHistory(newHistory);
        setShowCoach(true);
    }
    setDuration(0); setRoute([]);
  };

  const handleLogout = async () => { if(!profile.isGuest) await signOut(); setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false }); setShowSettings(false); };
  const handleQuickHydration = () => { const newLog = { ...hydration, currentMl: hydration.currentMl + 250 }; setHydration(newLog); saveHydration(newLog); };

  if (authLoading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profile.isLoggedIn) return <><LoginScreen onLogin={() => {}} onGuest={() => setProfile({ name: 'Guest', email: '', isLoggedIn: true, isGuest: true })} onShowLegal={(type) => setLegalDoc(type)} /><LegalModal isOpen={!!legalDoc} type={legalDoc} onClose={() => setLegalDoc(null)} /></>;

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans pb-24 selection:bg-brand-500/30 transition-colors duration-500 overflow-x-hidden">
      
      {/* NAVBAR: VERTICAL LOGO & LOCATION BLOCK */}
      <div className="flex justify-between items-start p-6 bg-dark-bg/95 backdrop-blur-sm text-dark-text sticky top-0 z-40 transition-colors border-b border-white/5">
        <div 
          className="flex flex-col items-start cursor-pointer group" 
          onClick={handleRefreshLocation}
          title="Tap to refresh location"
        >
           <ApnaWalkLogo size={32} showText={true} className="!items-start" />
           <div className="flex items-center gap-1.5 mt-0.5 ml-0.5">
                <i className={`fa-solid fa-location-dot text-[10px] transition-colors ${location === 'Detecting...' ? 'text-brand-500 animate-pulse' : 'text-brand-500 group-hover:text-brand-400'}`}></i>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[2px] truncate max-w-[200px] group-hover:text-dark-text transition-colors">
                    {location}{country ? `, ${country}` : ""}
                </p>
           </div>
        </div>
        <div className="flex gap-2.5 items-center">
            <button onClick={toggleThemeMode} className="w-10 h-10 rounded-full bg-dark-card border border-dark-border text-dark-text hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm"><i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
            <button onClick={() => setShowSettings(true)} className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all overflow-hidden border-white/10 ${profile.isGuest ? 'bg-slate-700 text-slate-400' : 'bg-brand-600 text-white shadow-xl shadow-brand-500/20'}`}>
                {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" /> : (profile.isGuest ? <i className="fa-solid fa-user-secret"></i> : <span className="text-lg">{profile.username?.charAt(0).toUpperCase() || profile.name.charAt(0).toUpperCase()}</span>)}
            </button>
        </div>
      </div>

      <main className="px-4 pt-6 max-w-4xl mx-auto w-full space-y-10">
        
        {/* HERO SECTION: STEPS & STATS STRIP */}
        <section className="flex flex-col items-center">
            <RadialProgress 
              current={isTrackingSession ? sessionSteps : dailySteps} 
              total={settings.stepGoal} 
              label={isTrackingSession ? "Workout Steps" : "Today's Steps"} 
              subLabel={isTrackingSession ? "Workout Active" : "Tap to Start Workout"} 
              isActive={isTrackingSession} 
              onClick={handleToggleTracking} 
            />
            <div className="w-full max-w-md -mt-4">
                <StatsGrid calories={displayCalories} distance={displayDistance} duration={duration} onStatClick={setSelectedStat} />
            </div>
            
            <div className="w-full max-w-md grid grid-cols-4 gap-3 mt-4">
                <button onClick={handleToggleTracking} className={`col-span-3 py-5 rounded-3xl font-black text-sm tracking-[4px] uppercase shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-3 ${isTrackingSession ? 'bg-red-600 text-white' : 'bg-brand-600 text-white shadow-brand-500/30'}`}>
                    <i className={`fa-solid ${isTrackingSession ? 'fa-stop' : 'fa-play'}`}></i>
                    {isTrackingSession ? 'End Session' : 'Start Workout'}
                </button>
                <button onClick={() => setShowLiveTracker(true)} className="bg-slate-800 hover:bg-slate-700 text-brand-400 border border-slate-700 rounded-3xl shadow-lg flex items-center justify-center text-xl transition-all active:scale-95" title="GPS Navigation"><i className="fa-solid fa-diamond-turn-right"></i></button>
            </div>
        </section>

        {/* PRIMARY TOOLS GRID: TOOLS FIRST */}
        <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[5px] ml-1">Primary Tools</h4>
            {!profile.isGuest && (
                activePlan ? <ActivePlanCard plan={activePlan} onRemove={() => setActivePlan(null)} /> : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { id: 'planner', label: 'AI Planner', icon: 'fa-calendar-day', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'hover:border-brand-500/40', action: () => setShowPlanner(true), badge: 0 },
                            { id: 'social', label: 'Social Hub', icon: 'fa-users', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/40', action: () => setShowSocialHub(true), badge: totalPendingSocial },
                            { id: 'buddy', label: 'Buddy', icon: 'fa-people-arrows', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/40', action: () => setShowBuddyFinder(true), badge: totalPendingBuddies },
                            { id: 'parks', label: 'Parks', icon: 'fa-map-location-dot', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/40', action: () => setShowParkFinder(true), badge: 0 }
                        ].map(tool => (
                            <button key={tool.id} onClick={tool.action} className={`bg-dark-card border border-slate-800/50 p-6 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 group h-40 relative overflow-hidden ${tool.border}`}>
                                <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center ${tool.color} group-hover:scale-110 transition-transform mb-4 shadow-inner`}><i className={`fa-solid ${tool.icon} text-xl`}></i></div>
                                <div className="text-white font-black text-[10px] uppercase tracking-widest text-center">{tool.label}</div>
                                {!!tool.badge && tool.badge > 0 && <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-dark-card shadow-lg animate-bounce">{tool.badge}</div>}
                            </button>
                        ))}
                    </div>
                )
            )}
        </section>

        {/* HEALTH SUITE: ORGANIZED GRID */}
        <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[5px] ml-1">Health Suite</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-[280px]"><HydrationCard data={hydration} onClick={() => setShowHydrationModal(true)} onQuickAdd={handleQuickHydration} recommendation={hydrationTip} /></div>
                <div className="h-[280px]"><BreathExerciseCard onClick={() => setShowBreath(true)} /></div>
                <div className="h-[280px]"><SleepCard onClick={() => setShowSleepModal(true)} /></div>
            </div>
        </section>

        {/* UTILITIES: WEATHER & TRACKS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[320px]"><VirtualTrekCard totalLifetimeSteps={totalLifetimeSteps} /></div>
            {settings.enableLocation && (coords || weatherLoading) && (
                <div className="h-[320px]"><WeatherCard weather={weather} loading={weatherLoading} onRefresh={() => coords && fetchLocalWeather(coords.lat, coords.lng)} onClick={() => setShowWeatherDetail(true)} /></div>
            )}
        </section>

        {/* MOTIVATION & SYNC */}
        <section className="space-y-8">
            <DailyQuote onShare={(q) => setVisualShare({ isOpen: true, type: 'quote', data: q })} />
            <Achievements totalSteps={totalLifetimeSteps} earnedBadges={earnedBadges} />
            <RhythmGuide bpm={metronome.bpm} setBpm={metronome.setBpm} isPlaying={metronome.isPlaying} togglePlay={metronome.togglePlay} onClick={() => setShowRhythmDetail(true)} />
        </section>

        {/* ANALYTICS HUB */}
        <section className="bg-dark-card p-8 rounded-[3rem] border border-slate-800 shadow-2xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="font-black text-2xl text-white tracking-tighter uppercase italic">History</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Past 30 Days Insight</p>
                </div>
                <div className="bg-slate-800 rounded-2xl p-1 flex border border-slate-700">
                    <button onClick={() => setHistoryRange('week')} className={`text-[10px] font-black px-6 py-2 rounded-xl uppercase tracking-widest transition-all ${historyRange === 'week' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Week</button>
                    <button onClick={() => setHistoryRange('month')} className={`text-[10px] font-black px-6 py-2 rounded-xl uppercase tracking-widest transition-all ${historyRange === 'month' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Month</button>
                </div>
            </div>

            <div className="h-48 w-full bg-slate-900/50 rounded-3xl p-4 border border-slate-800/50">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.chartData}>
                        <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: '900' }} dy={10} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1a2327', border: '1px solid #37474F', borderRadius: '12px', fontSize: '10px' }} />
                        <Bar dataKey="steps" radius={[4, 4, 4, 4]}>
                            {analytics.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.steps >= settings.stepGoal ? '#4CAF50' : '#374151'} />))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid gap-3">
                {analytics.displaySessions.slice(0, 5).map(({ date, session }, idx) => (
                    <div key={session.id || idx} className="bg-slate-800/20 border border-slate-800 p-5 rounded-3xl flex justify-between items-center group hover:bg-slate-800/40 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 text-xl border border-brand-500/20"><i className="fa-solid fa-person-walking"></i></div>
                            <div>
                                <span className="text-white font-black text-sm italic">{session.steps.toLocaleString()} STEPS</span>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{new Date(session.startTime).toLocaleDateString()} • {Math.floor(session.durationSeconds / 60)} MIN</div>
                            </div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-brand-500 transition-colors"></i>
                    </div>
                ))}
            </div>
        </section>
        
        {/* GLOBAL FLOATING AI COACH */}
        {!showCoach && !profile.isGuest && (
            <button onClick={() => setShowCoach(true)} className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-3xl shadow-[0_0_40px_rgba(76,175,80,0.4)] flex items-center justify-center text-white z-40 hover:scale-105 active:scale-95 transition-all animate-message-pop">
                <i className="fa-solid fa-robot text-3xl drop-shadow-lg"></i>
            </button>
        )}
      </main>

      {/* MODALS */}
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={!!profile.isGuest} onLoginRequest={() => { setShowCoach(false); handleLogout(); }} onShareStats={(s) => setVisualShare({ isOpen: true, type: 'stats', data: s })} />
      <VisualShareModal isOpen={visualShare.isOpen} onClose={() => setVisualShare(prev => ({ ...prev, isOpen: false }))} type={visualShare.type} data={visualShare.data} />
      <SleepModal isOpen={showSleepModal} onClose={() => setShowSleepModal(false)} />
      <BreathExerciseModal isOpen={showBreath} onClose={() => setShowBreath(false)} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={(p) => { setActivePlan(p); saveActivePlan(p); }} />
      <EventsModal isOpen={showEvents} onClose={() => setShowEvents(false)} locationName={location} />
      <WeatherDetailedModal isOpen={showWeatherDetail} onClose={() => setShowWeatherDetail(false)} weather={weather} />
      <HydrationModal isOpen={showHydrationModal} onClose={() => setShowHydrationModal(false)} data={hydration} onUpdate={(h) => { setHydration(h); saveHydration(h); }} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={(s, p) => { setSettings(s); saveSettings(s); setProfile(p); saveProfile(p); }} onLogout={handleLogout} onLoginRequest={() => { setShowSettings(false); handleLogout(); }} />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} text={`I just walked ${dailySteps} steps with ApnaWalk!`} url={window.location.href} />
      <SocialHub isOpen={showSocialHub} onClose={() => setShowSocialHub(false)} profile={profile} /> 
      <BuddyFinder isOpen={showBuddyFinder} onClose={() => setShowBuddyFinder(false)} profile={profile} />
      <ParkFinder isOpen={showParkFinder} onClose={() => setShowParkFinder(false)} profile={profile} />
      <LiveTracker isOpen={showLiveTracker} onClose={() => setShowLiveTracker(false)} profile={profile} settings={settings} onFinish={handleFinishSession} />
      <RhythmDetailModal isOpen={showRhythmDetail} onClose={() => setShowRhythmDetail(false)} bpm={metronome.bpm} setBpm={metronome.setBpm} isPlaying={metronome.isPlaying} togglePlay={metronome.togglePlay} />
      <StatsDetailModal isOpen={!!selectedStat} onClose={() => setSelectedStat(null)} type={selectedStat} data={{ calories: displayCalories, distance: displayDistance, duration: duration, steps: currentDisplaySteps }} route={route} />
    </div>
  );
};

export default App;