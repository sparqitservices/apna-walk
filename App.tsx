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
import { generateBadges, getHydrationTip, generatePersonalizedNudge } from './services/geminiService';
import { fetchTotalPendingCount } from './services/socialService';
import { fetchPendingBuddyCount } from './services/buddyService';
import { getWeather } from './services/weatherService';
import { updateMetadata } from './services/seoService';
import { requestNotificationPermission, sendNotification } from './services/notificationService';
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
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [hydration, setHydration] = useState<HydrationLog>({ date: '', currentMl: 0, goalMl: 2500 });
  const [location, setLocation] = useState<string>("Detecting..."); 
  const [country, setCountry] = useState<string>("");
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null);
  
  const [notifyState, setNotifyState] = useState<Record<string, number>>({});
  const lastStepCheckRef = useRef<number>(0);

  const { 
      dailySteps, 
      sessionSteps, 
      isTrackingSession, 
      startSession, 
      stopSession, 
      activateDailyTracking
  } = usePedometer(settings.sensitivity);
  
  const metronome = useMetronome();
  const [duration, setDuration] = useState(0);

  // --- REFINED NOTIFICATION HEARTBEAT WITH AI ---
  useEffect(() => {
    if (!profile.isLoggedIn) return;

    const checkTriggers = async () => {
        const now = Date.now();
        const progress = (dailySteps / settings.stepGoal) * 100;
        
        // 1. Goal Milestone
        if (progress >= 100 && !notifyState.goal_100) {
            const aiText = await generatePersonalizedNudge('GOAL_100', { locality: location, steps: dailySteps, goal: settings.stepGoal, weather, coachVibe: settings.coachVibe });
            sendNotification('GOAL_100', aiText);
            setNotifyState(prev => ({ ...prev, goal_100: now }));
        } else if (progress >= 50 && !notifyState.goal_50) {
            const aiText = await generatePersonalizedNudge('GOAL_50', { locality: location, steps: dailySteps, goal: settings.stepGoal, weather, coachVibe: settings.coachVibe });
            sendNotification('GOAL_50', aiText);
            setNotifyState(prev => ({ ...prev, goal_50: now }));
        }

        // 2. Sedentary Check
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 21) {
            if (dailySteps === lastStepCheckRef.current) {
                const lastSedentary = notifyState.last_sedentary_notify || 0;
                if (now - lastSedentary > 7200000) { // Notify every 2 hours if lazy
                    const aiText = await generatePersonalizedNudge('SEDENTARY', { locality: location, steps: dailySteps, goal: settings.stepGoal, weather, coachVibe: settings.coachVibe });
                    sendNotification('SEDENTARY', aiText);
                    setNotifyState(prev => ({ ...prev, last_sedentary_notify: now }));
                }
            }
        }
        
        lastStepCheckRef.current = dailySteps;
    };

    const heartbeat = setInterval(checkTriggers, 60000 * 5); // Check every 5 mins
    return () => clearInterval(heartbeat);
  }, [dailySteps, settings.stepGoal, profile.isLoggedIn, notifyState, location, weather, settings.coachVibe]);

  // ... (rest of App component code)
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
        }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
        setLocation("Geo disabled");
        return;
    }
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
    requestNotificationPermission();
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

  // Main UI remains...
  return (
    <div>{/* App UI */}</div>
  );
};

export default App;