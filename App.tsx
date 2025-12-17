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
import { RhythmDetailModal } from './components/RhythmDetailModal'; // NEW
import { WorkoutPlannerModal } from './components/WorkoutPlannerModal';
import { ActivePlanCard } from './components/ActivePlanCard';
import { HydrationCard } from './components/HydrationCard';
import { HydrationModal } from './components/HydrationModal';
import { EventsModal } from './components/EventsModal';
import { LegalModal, DocType } from './components/LegalModal';
import { StatsDetailModal } from './components/StatsDetailModal'; 
import { ApnaWalkLogo } from './components/ApnaWalkLogo'; 
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { AdminDashboard } from './components/AdminDashboard'; 
import { VisualShareModal } from './components/VisualShareModal';
import { usePedometer } from './hooks/usePedometer';
import { useMetronome } from './hooks/useMetronome'; // NEW
import { UserSettings, WalkSession, UserProfile, DailyHistory, Badge, RoutePoint, WeatherData, WeeklyPlan, HydrationLog } from './types';
import { saveHistory, getHistory, saveSettings, getSettings, getBadges, addBadge, hasSeenTutorial, markTutorialSeen, getProfile, saveProfile, saveActivePlan, getActivePlan, getHydration, saveHydration, syncDailyStatsToCloud, syncSessionToCloud, syncLocationToCloud } from './services/storageService';
import { generateBadges, getHydrationTip } from './services/geminiService';
import { getWeather } from './services/weatherService';
import { scheduleReminders, requestNotificationPermission } from './services/notificationService';
import { supabase } from './services/supabaseClient'; 
import { signOut, syncProfile } from './services/authService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// THEMES Updated to match Professional Palette
const THEMES = {
  green: {
    // Primary Green #4CAF50 Scale
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
  // --- Simple Router Check ---
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Static Page Routes
  if (path === '/privacy-policy') {
      return <PrivacyPolicyPage />;
  }
  if (path === '/terms-conditions') {
      return <TermsConditionsPage />;
  }
  // ADMIN ROUTE
  if (path === '/admin') {
      return <AdminDashboard />;
  }

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

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('strideai_theme_mode');
    return saved ? saved === 'dark' : true; // Default to dark if not set
  });

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [historyRange, setHistoryRange] = useState<'week' | 'month'>('week');
  const [sessionSort, setSessionSort] = useState<'recent' | 'longest' | 'steps'>('recent');
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [hydration, setHydration] = useState<HydrationLog>({ date: '', currentMl: 0, goalMl: 2500 });
  const [hydrationTip, setHydrationTip] = useState<string>("");
  const [location, setLocation] = useState<string>("Lucknow, UP"); // Default location
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
  const [showRhythmDetail, setShowRhythmDetail] = useState(false);
  
  // Visual Share Modal State
  const [visualShare, setVisualShare] = useState<{ isOpen: boolean, type: 'quote' | 'stats', data: any }>({
      isOpen: false,
      type: 'quote',
      data: null
  });
  
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
  
  // Rhythm Hook
  const metronome = useMetronome();

  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const notificationIntervalRef = useRef<any>(null);
  
  // Timestamps for notifications - Initialized to now
  const lastWaterCheckRef = useRef<number>(Date.now());
  const lastWalkCheckRef = useRef<number>(Date.now());
  const lastBreathCheckRef = useRef<number>(Date.now());
  
  // Sync Debounce Ref
  const syncTimeoutRef = useRef<any>(null);

  // --- Theme Toggle Logic ---
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

  const toggleThemeMode = () => {
    setIsDarkMode(!isDarkMode);
  };

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

    // 2. Setup Supabase Auth Listener with Persistent Session Handling
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
            // Explicitly handle sign out event
            // Only clear if not in guest mode intentionally
            const local = getProfile();
            if (!local?.isGuest) {
                 setProfile({ name: '', email: '', isLoggedIn: false, isGuest: false });
            }
        }
    });

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // --- CLOUD SYNC LOGIC ---
  useEffect(() => {
      if (!profile.isLoggedIn || profile.isGuest || !profile.id) return;
      
      // Debounced Sync for Daily Stats
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      syncTimeoutRef.current = setTimeout(() => {
          const today = new Date().toISOString().split('T')[0];
          const dist = (dailySteps * settings.strideLengthCm) / 100;
          const cal = Math.round((dailySteps * 0.04) * (settings.weightKg / 70));
          
          if (navigator.onLine) {
             syncDailyStatsToCloud(profile.id!, today, dailySteps, cal, dist);
          }
      }, 5000); // Sync 5 seconds after last step update
      
      return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [dailySteps, profile.id, profile.isLoggedIn, profile.isGuest]);
  
  // Online listener to sync when connection restores
  useEffect(() => {
      const handleOnline = () => {
          if (profile.isLoggedIn && !profile.isGuest && profile.id && dailySteps > 0) {
              const today = new Date().toISOString().split('T')[0];
              const dist = (dailySteps * settings.strideLengthCm) / 100;
              const cal = Math.round((dailySteps * 0.04) * (settings.weightKg / 70));
              syncDailyStatsToCloud(profile.id, today, dailySteps, cal, dist);
              console.log("Back online: Synced stats");
          }
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
  }, [profile, dailySteps]);

  // Sync Location when updated
  useEffect(() => {
      if (!profile.isLoggedIn || profile.isGuest || !profile.id || location === "Lucknow, UP") return;
      if (navigator.onLine) {
          syncLocationToCloud(profile.id, location);
      }
  }, [location, profile.id]);

  // --- Location & Permission Logic (ONLY AFTER LOGIN) ---
  const fetchLocalWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    const data = await getWeather(lat, lng);
    setWeather(data);
    setWeatherLoading(false);
  };

  const useDefaultLocation = () => {
        // Lucknow Coordinates
        const defLat = 26.8467;
        const defLng = 80.9462;
        setLocation("Lucknow, UP");
        setCoords({ lat: defLat, lng: defLng });
        fetchLocalWeather(defLat, defLng);
  };

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    setLocation("Locating...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
            setCoords({ lat: latitude, lng: longitude });
            fetchLocalWeather(latitude, longitude);
        },
        (err) => {
            console.warn("GPS failed", err);
            // Revert to default if failed
            useDefaultLocation();
            if (err.code === 1) { // PERMISSION_DENIED
                alert("Please allow location access to get local weather.");
            }
        },
        { timeout: 10000 }
    );
  };

  useEffect(() => {
    // Only run if user is logged in
    if (!profile.isLoggedIn) return;

    // 1. Activate Pedometer (Motion Sensors) automatically
    // This enables the "offline" step recording for daily steps without user hitting 'Start'
    activateDailyTracking();

    // 2. Location Logic
    // Default to Lucknow immediately so the UI is populated
    useDefaultLocation();

  }, [profile.isLoggedIn]);

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
    const isAnyNotificationEnabled = settings.notifications.water || settings.notifications.walk || settings.notifications.breath;
    
    if (profile.isLoggedIn && isAnyNotificationEnabled) {
        // Request permission if not already done, but usually triggered in settings
        if (Notification.permission === 'default') {
             // We don't force request here to avoid annoyance on load, waiting for user setting toggle
        }
        
        const checkReminders = () => {
             const triggered = scheduleReminders(
                settings.notifications, 
                { 
                    water: lastWaterCheckRef.current, 
                    walk: lastWalkCheckRef.current, 
                    breath: lastBreathCheckRef.current
                },
                dailySteps
            );

            if (triggered.includes('water')) lastWaterCheckRef.current = Date.now();
            if (triggered.includes('walk')) lastWalkCheckRef.current = Date.now();
            if (triggered.includes('breath')) lastBreathCheckRef.current = Date.now();
        };

        // Check every 15 minutes (900000 ms)
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
        
        // --- SYNC SESSION TO CLOUD ---
        if (!profile.isGuest && profile.id && navigator.onLine) {
            syncSessionToCloud(profile.id, sessionData);
        }
        
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
    // requestNotificationPermission(); // Delayed to allow user context
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

  // --- Visual Share Handlers ---
  const handleQuoteShare = (quote: {text: string, author: string}) => {
      setVisualShare({ isOpen: true, type: 'quote', data: quote });
  };

  const handleStatsShare = (session: WalkSession) => {
      setVisualShare({ isOpen: true, type: 'stats', data: session });
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

      {/* Top Bar - Updated to Dark Teal for Professional Look */}
      <div className="flex justify-between items-center p-6 bg-apna-teal text-white border-b border-apna-teal/50 shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3" onClick={() => setShowSettings(true)}>
           <div className={`w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center font-bold cursor-pointer hover:border-brand-500 transition-all overflow-hidden ${profile.isGuest ? 'bg-slate-600 text-slate-300' : 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'}`}>
                {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" /> : (profile.isGuest ? <i className="fa-solid fa-user"></i> : profile.name.charAt(0).toUpperCase())}
           </div>
           <div>
               {/* Updated Logo in Header */}
               <div className="-ml-2">
                    <ApnaWalkLogo size={36} showText={true} />
               </div>
               <div 
                    className="flex items-center gap-1 pl-1 mt-0.5 cursor-pointer hover:text-brand-100 transition-colors group"
                    onClick={(e) => { e.stopPropagation(); handleRefreshLocation(); }}
                    title="Click to update location"
               >
                   <i className="fa-solid fa-location-dot text-[10px] text-brand-200 group-hover:text-white transition-colors"></i>
                   <p className="text-brand-100 text-xs font-medium truncate max-w-[100px] group-hover:text-white transition-colors">{location}</p>
               </div>
           </div>
        </div>
        <div className="flex gap-2">
            {installPrompt && (
                <button onClick={handleInstall} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center animate-pulse shadow-md"><i className="fa-solid fa-download"></i></button>
            )}
            
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleThemeMode}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors shadow-sm"
              aria-label="Toggle Dark Mode"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors shadow-sm"><i className="fa-solid fa-gear"></i></button>
        </div>
      </div>

      <main className="px-4 pt-6 max-w-4xl mx-auto w-full">
        
        {motionError && (
            <div className="w-full bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4 text-center animate-pulse">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {motionError} <span className="opacity-75 block text-xs mt-1">Tap start to request permission.</span>
            </div>
        )}
        
        {!motionPermissionGranted && !profile.isGuest && (
             <div className="w-full bg-brand-500/10 border border-brand-500/30 text-brand-600 p-3 rounded-lg text-sm mb-4 text-center cursor-pointer" onClick={() => activateDailyTracking()}>
                <i className="fa-solid fa-person-walking mr-2"></i>
                Tap here to enable automatic step counting
             </div>
        )}

        {isTrackingSession && (
            <div className={`w-full max-w-md mx-auto px-3 py-1 rounded-full text-xs flex items-center justify-center mb-4 gap-2 border ${gpsError ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-600'}`}>
                {gpsError ? <span>Indoor Workout Mode</span> : <span>GPS Active ({route.length} pts)</span>}
            </div>
        )}

        {/* --- MAIN HERO SECTION --- */}
        <div className="flex flex-col items-center justify-center mb-8">
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

            {/* Main Action Button */}
            <div className="w-full max-w-md">
                <button 
                    onClick={handleToggleTracking}
                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    isTrackingSession 
                        ? 'bg-red-500 text-white border border-red-600 hover:bg-red-600' 
                        : 'bg-apna-orange text-white shadow-apna-orange/20 hover:bg-orange-600 animate-breathing hover:animate-none'
                    }`}
                >
                    {isTrackingSession ? <><i className="fa-solid fa-stop"></i> End Session</> : <><i className="fa-solid fa-play"></i> Start Workout</>}
                </button>
            </div>
        </div>

        {/* --- SECONDARY ACTIONS ROW --- */}
        {!isTrackingSession && !profile.isGuest && (
            <div className="w-full max-w-md mx-auto mb-8">
                {activePlan ? <ActivePlanCard plan={activePlan} onRemove={handleRemovePlan} /> : (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowPlanner(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-3 rounded-2xl flex flex-col justify-center items-start shadow-lg hover:border-brand-500/30 transition-all group h-28">
                            <div className="w-8 h-8 rounded-full bg-brand-900/30 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform mb-2">
                                <i className="fa-solid fa-calendar-days"></i>
                            </div>
                            <div className="text-white font-bold text-sm">Plan Your Week</div>
                            <div className="text-slate-400 text-xs">AI-curated schedule</div>
                        </button>
                        
                        <button onClick={() => setShowEvents(true)} className="bg-gradient-to-r from-apna-navy to-slate-900 border border-slate-700 p-3 rounded-2xl flex flex-col justify-center items-start shadow-lg hover:border-blue-500/30 transition-all group h-28 relative overflow-hidden">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-2 relative z-10">
                                <i className="fa-solid fa-users"></i>
                            </div>
                            <div className="text-white font-bold text-sm relative z-10">Community Events</div>
                            <div className="text-slate-400 text-xs relative z-10">Join local marathons</div>
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- INFORMATION GRID LAYOUT --- */}
        {/* Simplified grid to ensure equal heights for all cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto items-stretch">
            
            <RhythmGuide 
                bpm={metronome.bpm}
                setBpm={metronome.setBpm}
                isPlaying={metronome.isPlaying}
                togglePlay={metronome.togglePlay}
                onClick={() => setShowRhythmDetail(true)}
            />
            
            <HydrationCard 
                data={hydration} 
                onClick={() => setShowHydrationModal(true)} 
                onQuickAdd={handleQuickHydration}
                recommendation={hydrationTip}
            />
            
            {settings.enableLocation && (coords || weatherLoading) && (
                <WeatherCard 
                    weather={weather} 
                    loading={weatherLoading} 
                    onRefresh={() => coords && fetchLocalWeather(coords.lat, coords.lng)}
                    onClick={() => setShowWeatherDetail(true)}
                />
            )}
            
            <VirtualTrekCard totalLifetimeSteps={totalLifetimeSteps} />
        </div>

        {/* --- FULL WIDTH SECTIONS --- */}
        <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
            <DailyQuote onShare={handleQuoteShare} />
            
            {dailySteps > 0 && (
                 <button onClick={handleShare} className="w-full md:w-auto mx-auto flex items-center justify-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 px-6 py-3 rounded-full hover:bg-brand-100 transition-colors border border-brand-200">
                    <i className="fa-solid fa-share-nodes"></i> Share Today's Progress
                 </button>
            )}

            <Achievements totalSteps={totalLifetimeSteps} earnedBadges={earnedBadges} />

            {/* Activity History Chart */}
            <div className="bg-dark-card p-6 rounded-3xl border border-dark-border shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-dark-text">Activity History</h3>
                    <div className="bg-dark-card border border-dark-border rounded-full p-1 flex">
                        <button onClick={() => setHistoryRange('week')} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${historyRange === 'week' ? 'bg-brand-600 text-white' : 'text-dark-muted hover:text-dark-text'}`}>Week</button>
                        <button onClick={() => setHistoryRange('month')} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${historyRange === 'month' ? 'bg-brand-600 text-white' : 'text-dark-muted hover:text-dark-text'}`}>Month</button>
                    </div>
                </div>
                <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.chartData}>
                        <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-color)' }} />
                        <Bar dataKey="steps" radius={[4, 4, 4, 4]}>
                            {analytics.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.steps > settings.stepGoal ? '#4CAF50' : '#B0BEC5'} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-dark-border flex flex-col items-center text-center">
                        <span className="text-[10px] text-dark-muted font-bold uppercase">Best Day</span>
                        <span className="text-xl font-bold text-dark-text">{analytics.bestDay.steps.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-dark-border flex flex-col items-center text-center">
                        <span className="text-[10px] text-dark-muted font-bold uppercase">Longest Walk</span>
                        <span className="text-xl font-bold text-dark-text">{(analytics.longestSession.distance / 1000).toFixed(2)} km</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Floating Action Buttons */}
        {!showCoach && !profile.isGuest && (
             <button onClick={() => setShowCoach(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-brand-500 to-brand-600 rounded-full shadow-xl flex items-center justify-center text-white z-40 hover:scale-105 transition-transform"><i className="fa-solid fa-robot text-2xl"></i></button>
        )}
        
        <button 
            onClick={() => setShowHydrationModal(true)} 
            className="fixed bottom-24 left-6 w-12 h-12 bg-dark-card rounded-full shadow-xl border border-dark-border flex items-center justify-center overflow-hidden z-40 hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
        >
            <div 
                className="absolute bottom-0 left-0 w-full bg-blue-500/30 transition-all duration-1000 ease-out group-hover:bg-blue-500/40"
                style={{ height: `${Math.min((hydration.currentMl / hydration.goalMl) * 100, 100)}%` }}
            ></div>
            <i className="fa-solid fa-glass-water text-xl text-blue-400 relative z-10 drop-shadow-sm"></i>
        </button>

        <button onClick={() => setShowBreath(true)} className="fixed bottom-6 left-6 w-12 h-12 bg-dark-card rounded-full shadow-xl border border-dark-border flex items-center justify-center text-cyan-400 z-40 hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"><i className="fa-solid fa-lungs text-xl"></i></button>

      </main>

      {/* Modals */}
      <AICoachModal 
        session={currentSession} 
        isOpen={showCoach} 
        onClose={() => setShowCoach(false)} 
        isGuest={!!profile.isGuest} 
        onLoginRequest={() => { setShowCoach(false); handleLogout(); }} 
        onShareStats={handleStatsShare}
      />
      
      <VisualShareModal 
        isOpen={visualShare.isOpen} 
        onClose={() => setVisualShare(prev => ({ ...prev, isOpen: false }))} 
        type={visualShare.type} 
        data={visualShare.data} 
      />

      <BreathExerciseModal isOpen={showBreath} onClose={() => setShowBreath(false)} />
      <WorkoutPlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} onSavePlan={handleSavePlan} />
      <EventsModal isOpen={showEvents} onClose={() => setShowEvents(false)} locationName={location} />
      <WeatherDetailedModal isOpen={showWeatherDetail} onClose={() => setShowWeatherDetail(false)} weather={weather} />
      <HydrationModal isOpen={showHydrationModal} onClose={() => setShowHydrationModal(false)} data={hydration} onUpdate={handleHydrationUpdate} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} profile={profile} onSave={handleSaveData} onLogout={handleLogout} onLoginRequest={() => { setShowSettings(false); handleLogout(); }} />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} text={`I just walked ${dailySteps} steps with ApnaWalk!`} url={window.location.href} />
      <TutorialModal isOpen={showTutorial} onClose={closeTutorial} />
      <RhythmDetailModal 
          isOpen={showRhythmDetail} 
          onClose={() => setShowRhythmDetail(false)} 
          bpm={metronome.bpm}
          setBpm={metronome.setBpm}
          isPlaying={metronome.isPlaying}
          togglePlay={metronome.togglePlay}
      />
      
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