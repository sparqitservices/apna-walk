import { DailyHistory, UserSettings, Badge, WalkSession, UserProfile, WeeklyPlan, HydrationLog } from '../types';

const KEYS = {
  HISTORY: 'strideai_history',
  SETTINGS: 'strideai_settings',
  BADGES: 'strideai_badges',
  TUTORIAL: 'strideai_tutorial_seen',
  PROFILE: 'strideai_profile',
  ACTIVE_PLAN: 'strideai_active_plan',
  HYDRATION: 'strideai_hydration'
};

export const saveHistory = (steps: number, session?: WalkSession) => {
  const today = new Date().toISOString().split('T')[0];
  const historyStr = localStorage.getItem(KEYS.HISTORY);
  let history: DailyHistory[] = historyStr ? JSON.parse(historyStr) : [];
  
  const existingIndex = history.findIndex(h => h.date === today);
  
  if (existingIndex >= 0) {
    history[existingIndex].steps += steps;
    if (session) {
      if (!history[existingIndex].sessions) {
        history[existingIndex].sessions = [];
      }
      history[existingIndex].sessions!.push(session);
    }
  } else {
    history.push({ 
      date: today, 
      steps,
      sessions: session ? [session] : []
    });
  }

  // Keep last 30 days for better analysis
  if (history.length > 30) {
    history = history.slice(history.length - 30);
  }

  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  return history;
};

export const getHistory = (): DailyHistory[] => {
  const historyStr = localStorage.getItem(KEYS.HISTORY);
  if (!historyStr) return [];
  return JSON.parse(historyStr);
};

export const saveSettings = (settings: UserSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): UserSettings | null => {
  const s = localStorage.getItem(KEYS.SETTINGS);
  return s ? JSON.parse(s) : null;
};

export const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
};

export const getProfile = (): UserProfile | null => {
  const p = localStorage.getItem(KEYS.PROFILE);
  return p ? JSON.parse(p) : null;
};

export const saveBadges = (badges: Badge[]) => {
  localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
};

export const getBadges = (): Badge[] => {
  const b = localStorage.getItem(KEYS.BADGES);
  return b ? JSON.parse(b) : [];
};

export const addBadge = (badge: Badge): Badge[] => {
    const current = getBadges();
    // Prevent duplicates by ID or Title
    if (current.some(b => b.id === badge.id || b.title === badge.title)) {
        return current;
    }
    const updated = [...current, badge];
    saveBadges(updated);
    return updated;
};

export const hasSeenTutorial = (): boolean => {
    return localStorage.getItem(KEYS.TUTORIAL) === 'true';
};

export const markTutorialSeen = () => {
    localStorage.setItem(KEYS.TUTORIAL, 'true');
};

export const saveActivePlan = (plan: WeeklyPlan | null) => {
  if (plan) {
    localStorage.setItem(KEYS.ACTIVE_PLAN, JSON.stringify(plan));
  } else {
    localStorage.removeItem(KEYS.ACTIVE_PLAN);
  }
};

export const getActivePlan = (): WeeklyPlan | null => {
  const p = localStorage.getItem(KEYS.ACTIVE_PLAN);
  return p ? JSON.parse(p) : null;
};

// --- Hydration Methods ---

export const getHydration = (): HydrationLog => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(KEYS.HYDRATION);
    if (stored) {
        const log: HydrationLog = JSON.parse(stored);
        // Reset if date changed
        if (log.date === today) {
            return log;
        }
    }
    // Return default for today
    return { date: today, currentMl: 0, goalMl: 2500 };
};

export const saveHydration = (log: HydrationLog) => {
    localStorage.setItem(KEYS.HYDRATION, JSON.stringify(log));
};
