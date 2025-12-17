
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
import { saveHistory, getHistory, saveSettings, getSettings, getBadges, addBadge, hasSeenTutorial, markTutorialSeen, getProfile, saveProfile, saveActivePlan, getActivePlan, getHydration, saveHydration, syncDailyStatsToCloud, syncSessionToCloud, syncLocationToCloud } from './services/storageService';
import { generateBadges, getHydrationTip } from './services/geminiService';
import { fetchTotalPendingCount } from './services/socialService';
import { getWeather } from './services/weatherService';
import { scheduleReminders, requestNotificationPermission } from './services/notificationService';
import { supabase } from './services/supabaseClient'; 
import { signOut, syncProfile } from './services/authService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const THEMES = {
  green: {
    50: '232 245 233', 100: '200 230 201', 400: '102 187 106', 500: '76 175 80', 600: '56 142 60', 900: '27 94 32'
  },
  blue: {
    50: '239 246 255', 100: '219 234 254', 400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 900: '30 58 138'
  },
  orange: {
    50: '255 251 235', 100: '254 243 199', 400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 900: '120 53 15'
  },
  purple: {
    50: '250 245 255', 100: '243 232 255', 400: '192 132 252', 500: '168 85 247', 600: '147 51 234', 900: '88 28 135'
  },
  pink: {
    50: '255 241 242', 100: '255 228 230', 400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 900: '136 19 55'
  }
};

const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    sensitivity: 3,
    enableLocation: true,
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
  const [location, setLocation] = useState<string>("Lucknow, UP"); 
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
  const [totalPendingSocial, setTotalPendingSocial] = useState(0);
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
  const notificationIntervalRef = useRef<any>(null);
  const lastWaterCheckRef = useRef<number>(Date.now());
  const lastWalkCheckRef = useRef<number>(Date.now());
  const lastBreathCheckRef = useRef<number>(Date.now());
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
    if (savedSettings) setSettings(savedSettings);
    setHistory(getHistory());
    setEarnedBadges(getBadges());
    setActivePlan(getActivePlan());
    setHydration(getHydration());

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            syncProfile(session.user).then(p => {
                const fullProfile = { ...p, id: session.user.id };
                setProfile(fullProfile);
                saveProfile(fullProfile);
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
            if (!local?.isGuest) {
                 setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
            }
        }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Notification counter for social hub
  useEffect(() => {
    if (profile.isLoggedIn && !profile.isGuest && profile.id) {
        const updatePending = () => {
            fetchTotalPendingCount(profile.id!).then(setTotalPendingSocial);
        };
        updatePending();
        const interval = setInterval(updatePending, 30000); // Check every 30s
        return () => clearInterval(interval);
    }
  }, [profile.isLoggedIn, profile.isGuest, profile.id, showSocialHub]);

  useEffect(() => {
      if (!profile.isLoggedIn || profile.isGuest || !profile.id) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
          const today = new Date().toISOString().split('T')[0];
          const dist = (dailySteps * settings.strideLengthCm) / 100;
          const cal = Math.round((dailySteps * 0.04) * (settings.weightKg / 70));
          if (navigator.onLine) syncDailyStatsToCloud(profile.id!, today, dailySteps, cal, dist);
      }, 5000); 
      return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [dailySteps, profile.id, profile.isLoggedIn, profile.isGuest]);
  
  useEffect(() => {
      const handleOnline = () => {
          if (profile.isLoggedIn && !profile.isGuest && profile.id && dailySteps > 0) {
              const today = new Date().toISOString().split('T')[0];
              const dist = (dailySteps * settings.strideLengthCm) / 100;
              const cal = Math.round((dailySteps * 0.04) * (settings.weightKg / 70));
              syncDailyStatsToCloud(profile.id, today, dailySteps, cal, dist);
          }
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
  }, [profile, dailySteps]);

  const fetchLocalWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    const data = await getWeather(lat, lng);
    setWeather(data);
    setWeatherLoading(false);
  };

  const useDefaultLocation = () => {
        const defLat = 26.8467;
        const defLng = 80.9462;
        setLocation("Lucknow, UP");
        setCoords({ lat: defLat, lng: defLng });
        fetchLocalWeather(defLat, defLng);
  };

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) return;
    setLocation("Locating...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
            setCoords({ lat: latitude, lng: longitude });
            fetchLocalWeather(latitude, longitude);
        },
        () => useDefaultLocation(),
        { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!profile.isLoggedIn) return;
    activateDailyTracking();
    useDefaultLocation();
  }, [profile.isLoggedIn]);

  useEffect(() => {
    if (weather && !hydrationTip && !profile.isGuest) {
        getHydrationTip(hydration.currentMl, hydration.goalMl, dailySteps, weather)
            .then(tip => { if(tip) setHydrationTip(tip); });
    }
  }, [weather, profile.isLoggedIn]);

  useEffect(() => {
    const isAnyNotificationEnabled = settings.notifications.water || settings.notifications.walk || settings.notifications.breath;
    if (profile.isLoggedIn && isAnyNotificationEnabled) {
        const checkReminders = () => {
             const triggered = scheduleReminders(
                settings.notifications, 
                { water: lastWaterCheckRef.current, walk: lastWalkCheckRef.current, breath: lastBreathCheckRef.current },
                dailySteps
            );
            if (triggered.includes('water')) lastWaterCheckRef.current = Date.now();
            if (triggered.includes('walk')) lastWalkCheckRef.current = Date.now();
            if (triggered.includes('breath')) lastBreathCheckRef.current = Date.now();
        };
        notificationIntervalRef.current = setInterval(checkReminders, 15 * 60 * 1000); 
    }
    return () => clearInterval(notificationIntervalRef.current);
  }, [profile.isLoggedIn, settings.notifications, dailySteps]);

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
    let longestSession = { distance: 0, date: '-', duration: 0 };
    let filteredSessions: { date: string, session: WalkSession }[] = [];
    const limitDate = new Date();
    limitDate.setDate(new Date().getDate() - (historyRange === 'week' ? 7 : 30));
    const limitStr = limitDate.toISOString().split('T')[0];

    data.forEach(day => {
        if (day.steps > bestDay.steps) bestDay = { steps: day.steps, date: day.date };
        if (day.sessions) {
            day.sessions.forEach(s => {
                if (s.distanceMeters > longestSession.distance) longestSession = { distance: s.distanceMeters, date: day.date, duration: s.durationSeconds };
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
    return { chartData, bestDay, longestSession, displaySessions: filteredSessions.slice(0, 10) };
  }, [history, historyRange, sessionSort, historyFilter]);

  useEffect(() => {
    if (isTrackingSession) {
      timerRef.current = window.setInterval(() => setDuration(prev => prev + 1), 1000);
      if (settings.enableLocation && navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
              (position) => {
                  if (position.coords.accuracy > 30) return;
                  const newPoint = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: Date.now() };
                  setRoute(prev => {
                      if (prev.length === 0) return [newPoint];
                      if (calcDistance(prev[prev.length - 1].lat, prev[prev.length - 1].lng, newPoint.lat, newPoint.lng) > 3) return [...prev, newPoint];
                      return prev;
                  });
              },
              () => setGpsError(true),
              { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
          );
      } else setGpsError(true);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isTrackingSession, settings.enableLocation]);

  const handleStartSession = () => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(100);
    setRoute([]);
    setGpsError(!settings.enableLocation);
    startSession();
  };

  const handleFinishSession = async () => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(100);
    const finalSteps = stopSession();
    if (finalSteps > 10 || duration > 30) {
        const spm = duration > 0 ? (finalSteps / (duration / 60)) : 0;
        let sessionType: WalkSession['type'] = 'Normal Walk';
        if (duration > 2700) sessionType = 'Long Walk';
        else if (spm > 120) sessionType = 'Power Walk';
        else if (spm > 100) sessionType = 'Brisk Walk';

        const sessionData: WalkSession = { id: `sess-${Date.now()}`, startTime: Date.now() - (duration * 1000), steps: finalSteps, distanceMeters: (finalSteps * settings.strideLengthCm) / 100, calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)), durationSeconds: duration, route: route, type: sessionType };
        setCurrentSession(sessionData);
        const newHistory = saveHistory(0, sessionData);
        if (!profile.isGuest && profile.id && navigator.onLine) syncSessionToCloud(profile.id, sessionData);
        const today = new Date().toISOString().split('T')[0];
        const dayIdx = newHistory.findIndex(h => h.date === today);
        if (dayIdx >= 0) {
            newHistory[dayIdx].steps = dailySteps; 
            localStorage.setItem('strideai_history', JSON.stringify(newHistory));
        }
        setHistory(newHistory);
        if (!profile.isGuest) {
            try {
                const newBadge = await generateBadges(sessionData, newHistory, earnedBadges);
                if (newBadge) {
                    setEarnedBadges(addBadge(newBadge));
                    setNewBadgeAlert(newBadge);
                    setTimeout(() => setNewBadgeAlert(null), 5000);
                }
            } catch (e) { console.error(e); }
        }
        setShowCoach(true);
    }
    setDuration(0);
    setRoute([]);
  };

  const handleToggleTracking = () => isTrackingSession ? handleFinishSession() : handleStartSession();
  const checkTutorial = () => { if (!hasSeenTutorial()) setShowTutorial(true); };
  const closeTutorial = () => { setShowTutorial(false); markTutorialSeen(); };
  const handleGuest = () => { const newProfile = { name: 'Guest', email: '', isLoggedIn: true, isGuest: true }; setProfile(newProfile); saveProfile(newProfile); checkTutorial(); };
  const handleLogout = async () => { if(!profile.isGuest) await signOut(); setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false }); saveProfile({ name: '', email: '', isLoggedIn: false, isGuest: false }); setShowSettings(false); };
  const handleSaveData = (newSettings: UserSettings, newProfile: UserProfile) => { setSettings(newSettings); saveSettings(newSettings); setProfile(newProfile); saveProfile(newProfile); };
  
  // Fix: handleSavePlan to update local state and storage
  const handleSavePlan = (plan: WeeklyPlan) => {
    setActivePlan(plan);
    saveActivePlan(plan);
  };

  // Fix: handleRemovePlan to clear active plan from state and storage
  const handleRemovePlan = () => {
    setActivePlan(null);
    saveActivePlan(null);
  };

  const handleHydrationUpdate = (newLog: HydrationLog) => { setHydration(newLog); saveHydration(newLog); lastWaterCheckRef.current = Date.now(); };
  const handleQuickHydration = () => { const newLog = { ...hydration, currentMl: hydration.currentMl + 250 }; setHydration(newLog); saveHydration(newLog); lastWaterCheckRef.current = Date.now(); };
  const handleInstall = () => { if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.then((choice: any) => { if (choice.outcome === 'accepted') setInstallPrompt(null); }); } };
  const handleShare = async () => { const text = `I just walked ${dailySteps} steps with ApnaWalk!`; if (navigator.share) { try { await navigator.share({ title: 'ApnaWalk', text, url: window.location.href }); } catch (err) {} } else setShowShareModal(true); };
  const handleQuoteShare = (quote: {text: string, author: string}) => setVisualShare({ isOpen: true, type: 'quote', data: quote });
  const handleStatsShare = (session: WalkSession) => setVisualShare({ isOpen: true, type: 'stats', data: session });

  const getTypeColor = (type?: string) => {
      switch(type) {
          case 'Power Walk': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
          case 'Brisk Walk': return 'text-brand-400 bg-brand-500/10 border-brand-500/30';
          case 'Long Walk': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
          default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      }
  };

  if (authLoading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profile.isLoggedIn) return <><LoginScreen onLogin={() => {}} onGuest={handleGuest} onShowLegal={(type) => setLegalDoc(type)} /><LegalModal isOpen={!!legalDoc} type={legalDoc} onClose={() => setLegalDoc(null)} /></>;

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans pb-24 selection:bg-brand-500/30 transition-colors duration-500">
      {newBadgeAlert && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-dark-card border-2 border-brand-400 text-dark-text px-6 py-4 rounded-2xl shadow-2xl shadow-brand-500/50 flex flex-col items-center">
                   <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">New Badge!</div>
                   <div className="flex items-center gap-3">
                       <i className={`fa-solid ${newBadgeAlert.icon} ${newBadgeAlert.color} text-3xl`}></i>
                       <div className="text-left"><div className="font-bold text-lg">{newBadgeAlert.title}</div><div className="text-xs text-dark-muted">{newBadgeAlert.description}</div></div>
                   </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center p-6 bg-dark-bg/95 backdrop-blur-sm text-dark-text sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3" onClick={() => setShowSettings(true)}>
           <div className={`w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center font-bold cursor-pointer hover:border-brand-500 transition-all overflow-hidden ${profile.isGuest ? 'bg-slate-600 text-slate-300' : 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'}`}>
                {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" /> : (profile.isGuest ? <i className="fa-solid fa-user"></i> : profile.name.charAt(0).toUpperCase())}
           </div>
           <div><div className="-ml-2"><ApnaWalkLogo size={36} showText={true} /></div><div className="flex items-center gap-1 pl-1 mt-0.5 cursor-pointer hover:text-brand-500 transition-colors group" onClick={(e) => { e.stopPropagation(); handleRefreshLocation(); }}><i className="fa-solid fa-location-dot text-[10px] text-brand-500 group-hover:text-brand-400 transition-colors"></i><p className="text-slate-500 text-xs font-medium truncate max-w-[100px] group-hover:text-dark-text transition-colors">{location}</p></div></div>
        </div>
        <div className="flex gap-2">
            {installPrompt && <button onClick={handleInstall} className="w-10 h-10 rounded-full bg-dark-card border border-dark-border text-dark-text hover:bg-slate-700 flex items-center justify-center animate-pulse shadow-sm transition-colors"><i className="fa-solid fa-download"></i></button>}
            <button onClick={toggleThemeMode} className="w-10 h-10 rounded-full bg-dark-card border border-dark-border text-dark-text hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm"><i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-dark-card border border-dark-border text-dark-text hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm"><i className="fa-solid fa-wrench"></i></button>
        </div>
      </div>

      <main className="px-4 pt-6 max-w-4xl mx-auto w-full">
        {motionError && <div className="w-full bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4 text-center animate-pulse"><i className="fa-solid fa-triangle-exclamation mr-2"></i>{motionError}</div>}
        {!motionPermissionGranted && !profile.isGuest && <div className="w-full bg-brand-500/10 border border-brand-500/30 text-brand-600 p-3 rounded-lg text-sm mb-4 text-center cursor-pointer" onClick={() => activateDailyTracking()}><i className="fa-solid fa-person-walking mr-2"></i>Tap here to enable step counting</div>}

        <div className="flex flex-col items-center justify-center mb-8">
            <RadialProgress current={isTrackingSession ? sessionSteps : dailySteps} total={settings.stepGoal} label={isTrackingSession ? "Workout Steps" : "Today's Steps"} subLabel={isTrackingSession ? "Workout Active" : "Auto-Recording"} isActive={isTrackingSession} onClick={handleToggleTracking} />
            <StatsGrid calories={displayCalories} distance={displayDistance} duration={duration} onStatClick={setSelectedStat} />
            <div className="w-full max-w-md space-y-4">
                <button onClick={handleToggleTracking} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${isTrackingSession ? 'bg-red-500 text-white border border-red-600 hover:bg-red-600' : 'bg-apna-orange text-white shadow-apna-orange/20 hover:bg-orange-600 animate-breathing hover:animate-none'}`}>{isTrackingSession ? <><i className="fa-solid fa-stop"></i> End Session</> : <><i className="fa-solid fa-play"></i> Start Workout</>}</button>
                <RhythmGuide bpm={metronome.bpm} setBpm={metronome.setBpm} isPlaying={metronome.isPlaying} togglePlay={metronome.togglePlay} onClick={() => setShowRhythmDetail(true)} />
            </div>
        </div>

        {!isTrackingSession && !profile.isGuest && (
            <div className="w-full max-w-md mx-auto mb-8 animate-fade-in">
                {activePlan ? <ActivePlanCard plan={activePlan} onRemove={handleRemovePlan} /> : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button onClick={() => setShowPlanner(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-4 rounded-3xl flex flex-col justify-center items-start shadow-xl hover:border-brand-500/50 transition-all group h-32">
                            <div className="w-8 h-8 rounded-xl bg-brand-900/30 flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white transition-all mb-3 shadow-inner">
                                <i className="fa-solid fa-calendar-days"></i>
                            </div>
                            <div className="text-white font-black text-[11px] uppercase tracking-tighter">AI Planner</div>
                        </button>
                        <button onClick={() => setShowSocialHub(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-4 rounded-3xl flex flex-col justify-center items-start shadow-xl hover:border-orange-500/50 transition-all group h-32 relative overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-orange-900/30 flex items-center justify-center text-orange-400 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all mb-3 shadow-inner relative z-10">
                                <i className="fa-solid fa-users"></i>
                            </div>
                            <div className="text-white font-black text-[11px] uppercase tracking-tighter relative z-10">Social Hub</div>
                            {totalPendingSocial > 0 && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-bounce z-20">
                                    {totalPendingSocial}
                                </div>
                            )}
                        </button>
                        <button onClick={() => setShowBuddyFinder(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-4 rounded-3xl flex flex-col justify-center items-start shadow-xl hover:border-blue-500/50 transition-all group h-32 relative overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-blue-900/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all mb-3 shadow-inner relative z-10">
                                <i className="fa-solid fa-people-arrows"></i>
                            </div>
                            <div className="text-white font-black text-[11px] uppercase tracking-tighter relative z-10">Buddy</div>
                        </button>
                        <button onClick={() => setShowParkFinder(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-4 rounded-3xl flex flex-col justify-center items-start shadow-xl hover:border-emerald-500/50 transition-all group h-32 relative overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-emerald-900/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all mb-3 shadow-inner relative z-10">
                                <i className="fa-solid fa-tree"></i>
                            </div>
                            <div className="text-white font-black text-[11px] uppercase tracking-tighter relative z-10">Parks</div>
                        </button>
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto items-stretch">
            <HydrationCard data={hydration} onClick={() => setShowHydrationModal(true)} onQuickAdd={handleQuickHydration} recommendation={hydrationTip} />
            <BreathExerciseCard onClick={() => setShowBreath(true)} />
            <SleepCard onClick={() => setShowSleepModal(true)} />
            {settings.enableLocation && (coords || weatherLoading) && <WeatherCard weather={weather} loading={weatherLoading} onRefresh={() => coords && fetchLocalWeather(coords.lat, coords.lng)} onClick={() => setShowWeatherDetail(true)} />}
            <VirtualTrekCard totalLifetimeSteps={totalLifetimeSteps} />
        </div>

        <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
            <DailyQuote onShare={handleQuoteShare} />
            {dailySteps > 0 && <button onClick={handleShare} className="w-full md:w-auto mx-auto flex items-center justify-center gap-2 text-sm font-bold text-brand-500 bg-brand-500/10 px-8 py-4 rounded-full hover:bg-brand-500/20 transition-all border border-brand-500/20 shadow-lg"><i className="fa-solid fa-share-nodes"></i> Share Progress</button>}
            <Achievements totalSteps={totalLifetimeSteps} earnedBadges={earnedBadges} />

            <div className="bg-dark-card p-6 rounded-3xl border border-dark-border shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="font-black text-xl text-white tracking-tighter italic">Activity History</h3>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] md:max-w-none no-scrollbar">
                            {['All', 'Normal Walk', 'Brisk Walk', 'Power Walk', 'Long Walk'].map(f => (
                                <button key={f} onClick={() => setHistoryFilter(f as any)} className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest transition-all border ${historyFilter === f ? 'bg-brand-600 text-white border-brand-500 shadow-lg' : 'text-slate-500 border-slate-800 hover:border-slate-500'}`}>{f === 'All' ? 'All' : f.split(' ')[0]}</button>
                            ))}
                        </div>
                        <div className="bg-slate-800 rounded-full p-1 flex border border-slate-700">
                            <button onClick={() => setHistoryRange('week')} className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest transition-all ${historyRange === 'week' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Week</button>
                            <button onClick={() => setHistoryRange('month')} className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest transition-all ${historyRange === 'month' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Month</button>
                        </div>
                    </div>
                </div>
                <div className="h-48 w-full mb-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.chartData}><XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} dy={10} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '16px', color: 'var(--text-color)', fontWeight: 'bold' }} /><Bar dataKey="steps" radius={[6, 6, 6, 6]}>{analytics.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.steps >= settings.stepGoal ? '#4CAF50' : '#374151'} />))}</Bar></BarChart></ResponsiveContainer></div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex flex-col items-center text-center shadow-inner"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Best Day</span><span className="text-2xl font-black text-white">{analytics.bestDay.steps.toLocaleString()}</span></div>
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex flex-col items-center text-center shadow-inner"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Longest km</span><span className="text-2xl font-black text-white">{(analytics.longestSession.distance / 1000).toFixed(2)}</span></div>
                </div>
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-4">Recent Squad Updates</h4>
                    {analytics.displaySessions.length > 0 ? analytics.displaySessions.map((item, idx) => (
                            <div key={item.session.id || idx} onClick={() => setSelectedStat('distance')} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/60 hover:border-slate-600 transition-all cursor-pointer animate-message-pop"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm border shadow-inner ${getTypeColor(item.session.type)}`}><i className={`fa-solid ${item.session.type === 'Power Walk' ? 'fa-bolt' : item.session.type === 'Long Walk' ? 'fa-mountain-sun' : 'fa-person-walking'}`}></i></div><div><div className="text-xs font-black text-white">{item.date} <span className="opacity-40 font-medium ml-1">• {new Date(item.session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.session.type || 'Normal Walk'} • {Math.floor(item.session.durationSeconds / 60)}m</div></div></div><div className="text-right"><div className="text-lg font-black text-brand-400 leading-none">{item.session.steps}</div><div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Steps</div></div></div>
                        )) : <div className="text-center py-10 text-slate-600 font-bold italic border-2 border-dashed border-slate-800 rounded-3xl">No sessions recorded yet. Start walking!</div>}
                </div>
            </div>
        </div>
        
        {!showCoach && !profile.isGuest && <button onClick={() => setShowCoach(true)} className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-tr from-brand-500 to-brand-600 rounded-2xl shadow-2xl flex items-center justify-center text-white z-40 hover:scale-105 active:scale-95 transition-all"><i className="fa-solid fa-robot text-3xl"></i></button>}
        <button onClick={() => setShowHydrationModal(true)} className="fixed bottom-24 left-6 w-14 h-14 bg-dark-card rounded-2xl shadow-xl border border-dark-border flex items-center justify-center overflow-hidden z-40 hover:scale-105 transition-all group"><div className="absolute bottom-0 left-0 w-full bg-blue-500/30 transition-all duration-1000 ease-out group-hover:bg-blue-500/40" style={{ height: `${Math.min((hydration.currentMl / hydration.goalMl) * 100, 100)}%` }}></div><i className="fa-solid fa-glass-water text-2xl text-blue-400 relative z-10 drop-shadow-md"></i></button>
        <button onClick={() => setShowBreath(true)} className="fixed bottom-6 left-6 w-14 h-14 bg-dark-card rounded-2xl shadow-xl border border-dark-border flex items-center justify-center text-cyan-400 z-40 hover:scale-105 transition-all"><i className="fa-solid fa-lungs text-2xl"></i></button>
      </main>

      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={!!profile.isGuest} onLoginRequest={() => { setShowCoach(false); handleLogout(); }} onShareStats={handleStatsShare} />
      <VisualShareModal isOpen={visualShare.isOpen} onClose={() => setVisualShare(prev => ({ ...prev, isOpen: false }))} type={visualShare.type} data={visualShare.data} />
      <SleepModal isOpen={showSleepModal} onClose={() => setShowSleepModal(false)} />
      <BreathExerciseModal isOpen={showBreath} onClose={() => setShowBreath(false)} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={handleSavePlan} />
      <EventsModal isOpen={showEvents} onClose={() => setShowEvents(false)} locationName={location} />
      <WeatherDetailedModal isOpen={showWeatherDetail} onClose={() => setShowWeatherDetail(false)} weather={weather} />
      <HydrationModal isOpen={showHydrationModal} onClose={() => setShowHydrationModal(false)} data={hydration} onUpdate={handleHydrationUpdate} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={handleSaveData} onLogout={handleLogout} onLoginRequest={() => { setShowSettings(false); handleLogout(); }} />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} text={`I just walked ${dailySteps} steps with ApnaWalk!`} url={window.location.href} />
      <TutorialModal isOpen={showTutorial} onClose={closeTutorial} />
      <SocialHub isOpen={showSocialHub} onClose={() => setShowSocialHub(false)} profile={profile} /> 
      <BuddyFinder isOpen={showBuddyFinder} onClose={() => setShowBuddyFinder(false)} profile={profile} />
      <ParkFinder isOpen={showParkFinder} onClose={() => setShowParkFinder(false)} profile={profile} />
      <RhythmDetailModal isOpen={showRhythmDetail} onClose={() => setShowRhythmDetail(false)} bpm={metronome.bpm} setBpm={metronome.setBpm} isPlaying={metronome.isPlaying} togglePlay={metronome.togglePlay} />
      <StatsDetailModal isOpen={!!selectedStat} onClose={() => setSelectedStat(null)} type={selectedStat} data={{ calories: displayCalories, distance: displayDistance, duration: duration, steps: currentDisplaySteps }} route={route} />
    </div>
  );
};

export default App;
