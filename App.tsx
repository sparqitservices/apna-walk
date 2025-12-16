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
import { VirtualTrekCard } from './components/VirtualTrekCard';
import { RhythmGuide } from './components/RhythmGuide';
import { WorkoutPlannerModal } from './components/WorkoutPlannerModal';
import { ActivePlanCard } from './components/ActivePlanCard';
import { HydrationCard } from './components/HydrationCard';
import { HydrationModal } from './components/HydrationModal';
import { EventsModal } from './components/EventsModal';
import { LegalModal, DocType } from './components/LegalModal';
import { StatsDetailModal } from './components/StatsDetailModal'; 
import { ApnaWalkLogo } from './components/ApnaWalkLogo'; 
import { usePedometer } from './hooks/usePedometer';
import { UserSettings, WalkSession, UserProfile, DailyHistory, Badge, RoutePoint, WeatherData, WeeklyPlan, HydrationLog } from './types';
import { saveHistory, getHistory, saveSettings, getSettings, getBadges, addBadge, hasSeenTutorial, markTutorialSeen, getProfile, saveProfile, saveActivePlan, getActivePlan, getHydration, saveHydration } from './services/storageService';
import { generateBadges, getHydrationTip } from './services/geminiService';
import { getWeather } from './services/weatherService';
import { scheduleReminders, requestNotificationPermission } from './services/notificationService';
import { supabase } from './services/supabaseClient'; 
import { signOut, syncProfile } from './services/authService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';

const THEMES = {
  green: {
    50: '240 253 244', 100: '220 252 231', 400: '74 222 128', 500: '34 197 94', 600: '22 163 74', 900: '20 83 45'
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

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [historyRange, setHistoryRange] = useState<'week' | 'month'>('week');
  const [sessionSort, setSessionSort] = useState<'recent' | 'longest' | 'steps'>('recent');
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [hydration, setHydration] = useState<HydrationLog>({ date: '', currentMl: 0, goalMl: 2500 });
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [location, setLocation] = useState<string>("Locating...");
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
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [legalDoc, setLegalDoc] = useState<DocType>(null);
  const [currentSession, setCurrentSession] = useState<WalkSession | null>(null);
  const [selectedStat, setSelectedStat] = useState<'calories' | 'distance' | 'time' | null>(null); 
  
  // Pedometer Hook
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
  
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const notificationIntervalRef = useRef<any>(null);
  const lastWaterCheckRef = useRef<number>(Date.now());

  // --- Auth & Initial Load Logic ---
  useEffect(() => {
    // 1. Check local storage first
    const savedSettings = getSettings();
    if (savedSettings) setSettings(savedSettings);
    if(savedSettings && typeof savedSettings.enableLocation === 'undefined') {
        setSettings(prev => ({...prev, enableLocation: true}));
    }
    setHistory(getHistory());
    setEarnedBadges(getBadges());
    setActivePlan(getActivePlan());
    setHydration(getHydration());

    // 2. Setup Supabase Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            syncProfile(session.user).then(p => {
                setProfile(p);
                saveProfile(p);
                activateDailyTracking();
            });
        }
        setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            syncProfile(session.user).then(p => {
                setProfile(p);
                saveProfile(p);
                activateDailyTracking();
            });
        } else {
            // Check if we were in guest mode before clearing
            const local = getProfile();
            if (!local?.isGuest) {
                // If not guest, clear profile on logout
                setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
            }
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Location Logic ---
  const fetchLocalWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    const data = await getWeather(lat, lng);
    setWeather(data);
    setWeatherLoading(false);
  };

  useEffect(() => {
    const useDefaultLocation = () => {
        const defLat = 28.6139;
        const defLng = 77.2090;
        setLocation("New Delhi");
        setCoords({ lat: defLat, lng: defLng });
        fetchLocalWeather(defLat, defLng);
    };

    const checkLocation = () => {
        if (settings.enableLocation !== false && navigator.geolocation) {
            // Don't set loading on mount to avoid flicker if coords exist
            if(!coords) setWeatherLoading(true);
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
                    setCoords({ lat: latitude, lng: longitude });
                    fetchLocalWeather(latitude, longitude);
                },
                (err) => {
                    console.warn("GPS failed", err);
                    useDefaultLocation();
                },
                { timeout: 5000 }
            );
        } else if (settings.enableLocation === false) {
             setLocation("Location Disabled");
             setWeather(null);
             setWeatherLoading(false);
        } else {
             useDefaultLocation();
        }
    };
    checkLocation();

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setInstallPrompt(e);
    });
  }, []);

  // Fetch Hydration Tip when weather is ready
  useEffect(() => {
    if (weather && !hydrationTip && !profile.isGuest) {
        getHydrationTip(hydration.currentMl, hydration.goalMl, dailySteps, weather)
            .then(tip => {
                if(tip) setHydrationTip(tip);
            });
    }
  }, [weather, profile.isLoggedIn]);

  // Notification Scheduler Loop
  useEffect(() => {
    if (profile.isLoggedIn && settings.notifications) {
        if (Notification.permission === 'default') {
             requestNotificationPermission();
        }
        notificationIntervalRef.current = setInterval(() => {
            const result = scheduleReminders(
                settings.notifications, 
                lastWaterCheckRef.current,
                dailySteps
            );
            if (result === 'water_sent') {
                lastWaterCheckRef.current = Date.now();
            }
        }, 15 * 60 * 1000); 
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
    if (chartData.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        chartData.push({ date: today, steps: 0 } as any);
    }
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
                if (s.distanceMeters > longestSession.distance) {
                    longestSession = { distance: s.distanceMeters, date: day.date, duration: s.durationSeconds };
                }
                if (day.date >= limitStr) filteredSessions.push({ date: day.date, session: s });
            });
        }
    });

    filteredSessions.sort((a, b) => {
        if (sessionSort === 'longest') return b.session.distanceMeters - a.session.distanceMeters;
        else if (sessionSort === 'steps') return b.session.steps - a.session.steps;
        return b.session.startTime - a.session.startTime;
    });
    
    return { chartData, bestDay, longestSession, displaySessions: filteredSessions.slice(0, 5) };
  }, [history, historyRange, sessionSort]);

  // Session Logic
  useEffect(() => {
    if (isTrackingSession) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      if (settings.enableLocation) {
        setGpsError(false);
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    setGpsError(false);
                    if (position.coords.accuracy > 30) return;
                    const newPoint: RoutePoint = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now()
                    };
                    setRoute(prev => {
                        if (prev.length === 0) return [newPoint];
                        const last = prev[prev.length - 1];
                        const dist = calcDistance(last.lat, last.lng, newPoint.lat, newPoint.lng);
                        if (dist > 3) return [...prev, newPoint];
                        return prev;
                    });
                },
                (err) => { setGpsError(true); },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        } else { setGpsError(true); }
      } else { setGpsError(true); }
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
        const sessionData: WalkSession = {
            id: `sess-${Date.now()}`,
            startTime: Date.now() - (duration * 1000), 
            steps: finalSteps,
            distanceMeters: (finalSteps * settings.strideLengthCm) / 100,
            calories: Math.round((finalSteps * 0.04) * (settings.weightKg / 70)),
            durationSeconds: duration,
            route: route
        };
        
        setCurrentSession(sessionData);
        const newHistory = saveHistory(0, sessionData);
        
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
                    const updatedBadges = addBadge(newBadge);
                    setEarnedBadges(updatedBadges);
                    setNewBadgeAlert(newBadge);
                    setTimeout(() => setNewBadgeAlert(null), 5000);
                }
            } catch (e) { console.error("Badge generation failed", e); }
        }
        setShowCoach(true);
    }
    
    setDuration(0);
    setRoute([]);
  };

  const handleToggleTracking = () => {
      if (isTrackingSession) {
          handleFinishSession();
      } else {
          handleStartSession();
      }
  };

  const checkTutorial = () => { if (!hasSeenTutorial()) setShowTutorial(true); };

  const closeTutorial = () => {
      setShowTutorial(false);
      markTutorialSeen();
  };

  const handleGuest = () => {
    const newProfile = { name: 'Guest', email: '', isLoggedIn: true, isGuest: true };
    setProfile(newProfile);
    saveProfile(newProfile);
    activateDailyTracking();
    requestNotificationPermission(); 
    checkTutorial();
  };

  const handleLogout = async () => {
    if(!profile.isGuest) {
        await signOut();
    }
    const emptyProfile = { name: '', email: '', isLoggedIn: false, isGuest: false };
    setProfile(emptyProfile);
    saveProfile(emptyProfile);
    setShowSettings(false);
  };

  const handleSaveData = (newSettings: UserSettings, newProfile: UserProfile) => {
      setSettings(newSettings);
      saveSettings(newSettings);
      setProfile(newProfile);
      saveProfile(newProfile);
  };

  const handleHydrationUpdate = (newLog: HydrationLog) => {
      setHydration(newLog);
      saveHydration(newLog);
      lastWaterCheckRef.current = Date.now(); 
  };

  const handleQuickHydration = () => {
      const newLog = { ...hydration, currentMl: hydration.currentMl + 250 };
      setHydration(newLog);
      saveHydration(newLog);
      lastWaterCheckRef.current = Date.now();
  };

  const handleInstall = () => {
      if (installPrompt) {
          installPrompt.prompt();
          installPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
          });
      }
  };

  const handleShare = async () => {
    const text = `I just walked ${dailySteps} steps today with ApnaWalk!`;
    if (navigator.share) {
        try { await navigator.share({ title: 'ApnaWalk', text: text, url: window.location.href }); } 
        catch (err) { console.log('Error sharing:', err); }
    } else { setShowShareModal(true); }
  };
  
  const handleSavePlan = (plan: WeeklyPlan) => {
      saveActivePlan(plan);
      setActivePlan(plan);
  };
  
  const handleRemovePlan = () => {
      saveActivePlan(null);
      setActivePlan(null);
  };

  if (authLoading) {
      return (
          <div className="min-h-screen bg-dark-bg flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!profile.isLoggedIn) return (
      <>
        <LoginScreen onLogin={() => {}} onGuest={handleGuest} onShowLegal={(type) => setLegalDoc(type)} />
        <LegalModal isOpen={!!legalDoc} type={legalDoc} onClose={() => setLegalDoc(null)} />
      </>
  );

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans pb-24 selection:bg-brand-500/30 transition-colors duration-500">
      
      {/* New Badge Popup */}
      {newBadgeAlert && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-dark-card border-2 border-brand-400 text-dark-text px-6 py-4 rounded-2xl shadow-2xl shadow-brand-500/50 flex flex-col items-center">
                   <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">New Badge Unlocked!</div>
                   <div className="flex items-center gap-3">
                       <i className={`fa-solid ${newBadgeAlert.icon} ${newBadgeAlert.color} text-3xl`}></i>
                       <div className="text-left">
                           <div className="font-bold text-lg">{newBadgeAlert.title}</div>
                           <div className="text-xs text-dark-muted">{newBadgeAlert.description}</div>
                       </div>
                   </div>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 bg-gradient-to-b from-dark-card to-transparent">
        <div className="flex items-center gap-3" onClick={() => setShowSettings(true)}>
           <div className={`w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center font-bold cursor-pointer hover:border-brand-500 transition-all overflow-hidden ${profile.isGuest ? 'bg-slate-600 text-slate-300' : 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'}`}>
                {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" /> : (profile.isGuest ? <i className="fa-solid fa-user"></i> : profile.name.charAt(0).toUpperCase())}
           </div>
           <div>
               {/* Updated Logo in Header */}
               <div className="-ml-2">
                    <ApnaWalkLogo size={40} showText={true} />
               </div>
               <div className="flex items-center gap-1 pl-1 mt-1">
                   <i className="fa-solid fa-location-dot text-[10px] text-dark-muted"></i>
                   <p className="text-dark-muted text-xs font-medium truncate max-w-[100px]">{location}</p>
               </div>
           </div>
        </div>
        <div className="flex gap-2">
            {installPrompt && (
                <button onClick={handleInstall} className="w-10 h-10 rounded-full bg-dark-card text-brand-400 border border-brand-500/30 flex items-center justify-center animate-pulse"><i className="fa-solid fa-download"></i></button>
            )}
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-dark-card border border-slate-700 flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-slate-700 transition-colors"><i className="fa-solid fa-gear"></i></button>
        </div>
      </div>

      <main className="px-4 flex flex-col items-center">
        
        {motionError && (
            <div className="w-full max-w-md bg-red-900/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-4 text-center animate-pulse">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {motionError} <span className="opacity-75 block text-xs mt-1">Tap start to request permission.</span>
            </div>
        )}
        
        {!motionPermissionGranted && !profile.isGuest && (
             <div className="w-full max-w-md bg-brand-500/10 border border-brand-500/30 text-brand-200 p-3 rounded-lg text-sm mb-4 text-center cursor-pointer" onClick={() => activateDailyTracking()}>
                <i className="fa-solid fa-person-walking mr-2"></i>
                Tap here to enable automatic step counting
             </div>
        )}

        {isTrackingSession && (
            <div className={`w-full max-w-md px-3 py-1 rounded-full text-xs flex items-center justify-center mb-4 gap-2 border ${gpsError ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'}`}>
                {gpsError ? <span>Indoor Workout Mode</span> : <span>GPS Active ({route.length} pts)</span>}
            </div>
        )}

        <RadialProgress 
          current={isTrackingSession ? sessionSteps : dailySteps} 
          total={settings.stepGoal} 
          label={isTrackingSession ? "Workout Steps" : "Today's Steps"}
          subLabel={isTrackingSession ? "Workout Active" : "Auto-Recording"}
          isActive={isTrackingSession}
          onClick={handleToggleTracking}
        />

        <StatsGrid 
          calories={displayCalories} 
          distance={displayDistance} 
          duration={duration} 
          onStatClick={setSelectedStat} 
        />

        <div className="flex gap-4 mb-6 w-full max-w-md">
          <button 
            onClick={handleToggleTracking}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isTrackingSession 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500/20' 
                : 'bg-brand-600 text-white shadow-brand-500/20 hover:bg-brand-500 animate-breathing hover:animate-none'
            }`}
          >
            {isTrackingSession ? <><i className="fa-solid fa-stop"></i> End Session</> : <><i className="fa-solid fa-play"></i> Start Workout</>}
          </button>
        </div>
        
        {!isTrackingSession && !profile.isGuest && (
            activePlan ? <ActivePlanCard plan={activePlan} onRemove={handleRemovePlan} /> : (
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
                <button onClick={() => setShowPlanner(true)} className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-3 rounded-2xl flex flex-col justify-center items-start shadow-lg hover:border-brand-500/30 transition-all group h-28">
                    <div className="w-8 h-8 rounded-full bg-brand-900/30 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform mb-2">
                        <i className="fa-solid fa-calendar-days"></i>
                    </div>
                    <div className="text-white font-bold text-sm">Plan Your Week</div>
                    <div className="text-slate-400 text-xs">AI-curated schedule</div>
                </button>
                
                <button onClick={() => setShowEvents(true)} className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-3 rounded-2xl flex flex-col justify-center items-start shadow-lg hover:border-blue-500/30 transition-all group h-28 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-2 relative z-10">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div className="text-white font-bold text-sm relative z-10">Community Events</div>
                    <div className="text-slate-400 text-xs relative z-10">Join local marathons</div>
                </button>
            </div>
        ))}

        <RhythmGuide />

        {settings.enableLocation && (coords || weatherLoading) && (
            <WeatherCard 
                weather={weather} 
                loading={weatherLoading} 
                onRefresh={() => coords && fetchLocalWeather(coords.lat, coords.lng)}
                onClick={() => setShowWeatherDetail(true)}
            />
        )}
        
        <VirtualTrekCard totalLifetimeSteps={totalLifetimeSteps} />

        <DailyQuote />
        
        {dailySteps > 0 && (
             <button onClick={handleShare} className="mb-8 flex items-center gap-2 text-sm font-medium text-brand-400 bg-brand-400/10 px-4 py-2 rounded-full hover:bg-brand-400/20 transition-colors border border-brand-500/20">
                <i className="fa-solid fa-share-nodes"></i> Share Today's Progress
             </button>
        )}

        <Achievements totalSteps={totalLifetimeSteps} earnedBadges={earnedBadges} />

        <HydrationCard 
            data={hydration} 
            onClick={() => setShowHydrationModal(true)} 
            onQuickAdd={handleQuickHydration}
            recommendation={hydrationTip}
        />

        <div className="w-full max-w-md mb-8">
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-lg text-white">Activity History</h3>
                <div className="bg-slate-800 rounded-full p-1 flex">
                    <button onClick={() => setHistoryRange('week')} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${historyRange === 'week' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>Week</button>
                    <button onClick={() => setHistoryRange('month')} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${historyRange === 'month' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>Month</button>
                </div>
            </div>
            <div className="bg-dark-card p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.chartData}>
                        <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--card-color)', border: 'none', borderRadius: '8px', color: 'var(--text-color)' }} />
                        <Bar dataKey="steps" radius={[4, 4, 4, 4]}>
                            {analytics.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.steps > settings.stepGoal ? '#22c55e' : '#334155'} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Best Day</span>
                        <span className="text-xl font-bold text-white">{analytics.bestDay.steps.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Longest Walk</span>
                        <span className="text-xl font-bold text-white">{(analytics.longestSession.distance / 1000).toFixed(2)} km</span>
                    </div>
                </div>
            </div>
        </div>
        
        {!showCoach && !profile.isGuest && (
             <button onClick={() => setShowCoach(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-brand-500 to-brand-600 rounded-full shadow-xl flex items-center justify-center text-white z-40 hover:scale-105 transition-transform"><i className="fa-solid fa-robot text-2xl"></i></button>
        )}
        
        <button 
            onClick={() => setShowHydrationModal(true)} 
            className="fixed bottom-24 left-6 w-12 h-12 bg-slate-800 rounded-full shadow-xl border border-slate-700 flex items-center justify-center overflow-hidden z-40 hover:scale-105 hover:bg-slate-700 transition-all group"
        >
            <div 
                className="absolute bottom-0 left-0 w-full bg-blue-500/30 transition-all duration-1000 ease-out group-hover:bg-blue-500/40"
                style={{ height: `${Math.min((hydration.currentMl / hydration.goalMl) * 100, 100)}%` }}
            ></div>
            <i className="fa-solid fa-glass-water text-xl text-blue-400 relative z-10 drop-shadow-sm"></i>
        </button>

        <button onClick={() => setShowBreath(true)} className="fixed bottom-6 left-6 w-12 h-12 bg-slate-800 rounded-full shadow-xl border border-slate-700 flex items-center justify-center text-cyan-400 z-40 hover:scale-105 hover:bg-slate-700 transition-all"><i className="fa-solid fa-lungs text-xl"></i></button>

      </main>

      {/* Modals */}
      <AICoachModal session={currentSession} isOpen={showCoach} onClose={() => setShowCoach(false)} isGuest={!!profile.isGuest} onLoginRequest={() => { setShowCoach(false); handleLogout(); }} />
      <BreathExerciseModal isOpen={showBreath} onClose={() => setShowBreath(false)} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={handleSavePlan} />
      <EventsModal isOpen={showEvents} onClose={() => setShowEvents(false)} locationName={location} />
      <WeatherDetailedModal isOpen={showWeatherDetail} onClose={() => setShowWeatherDetail(false)} weather={weather} />
      <HydrationModal isOpen={showHydrationModal} onClose={() => setShowHydrationModal(false)} data={hydration} onUpdate={handleHydrationUpdate} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={handleSaveData} onLogout={handleLogout} onLoginRequest={() => { setShowSettings(false); handleLogout(); }} />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} text={`I just walked ${dailySteps} steps with ApnaWalk!`} url={window.location.href} />
      <TutorialModal isOpen={showTutorial} onClose={closeTutorial} />
      
      {/* Detail Stat Modal */}
      <StatsDetailModal 
         isOpen={!!selectedStat} 
         onClose={() => setSelectedStat(null)} 
         type={selectedStat} 
         data={{ calories: displayCalories, distance: displayDistance, duration: duration, steps: currentDisplaySteps }}
         route={route} 
      />

    </div>
  );
};
export default App;