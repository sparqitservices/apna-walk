
import { DailyHistory, UserSettings, Badge, WalkSession, UserProfile, HydrationLog, ReliefLog, WeeklyPlan, AdminUserView } from '../types';
import { supabase } from './supabaseClient';

const KEYS = {
  HISTORY: 'strideai_history',
  SETTINGS: 'strideai_settings',
  BADGES: 'strideai_badges',
  PROFILE: 'strideai_profile',
  ACTIVE_PLAN: 'strideai_active_plan',
  HYDRATION: 'strideai_hydration',
  RELIEF: 'strideai_relief'
};

const isCloudUser = (userId?: string) => !!userId && userId !== 'guest';

export const saveProfile = async (profile: UserProfile) => {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  if (isCloudUser(profile.id)) {
      await supabase.from('profiles').upsert({
          id: profile.id,
          full_name: profile.name,
          username: profile.username,
          bio: profile.bio,
      });
  }
};

export const getProfile = (): UserProfile | null => {
  const p = localStorage.getItem(KEYS.PROFILE);
  return p ? JSON.parse(p) : null;
};

export const saveSettings = async (userId: string | undefined, settings: UserSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): UserSettings | null => {
  const s = localStorage.getItem(KEYS.SETTINGS);
  return s ? JSON.parse(s) : null;
};

export const saveHistory = async (userId: string | undefined, steps: number, session?: WalkSession) => {
  const today = new Date().toISOString().split('T')[0];
  const historyStr = localStorage.getItem(KEYS.HISTORY);
  let history: DailyHistory[] = historyStr ? JSON.parse(historyStr) : [];
  const existingIndex = history.findIndex(h => h.date === today);
  
  if (existingIndex >= 0) {
    if (steps > 0) history[existingIndex].steps += steps;
    if (session) {
      if (!history[existingIndex].sessions) history[existingIndex].sessions = [];
      history[existingIndex].sessions!.push(session);
    }
  } else {
    history.push({ date: today, steps: steps > 0 ? steps : 0, sessions: session ? [session] : [] });
  }
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  return history;
};

export const getHistory = (): DailyHistory[] => {
  const historyStr = localStorage.getItem(KEYS.HISTORY);
  return historyStr ? JSON.parse(historyStr) : [];
};

export const saveHydration = async (userId: string | undefined, log: HydrationLog) => {
    localStorage.setItem(KEYS.HYDRATION, JSON.stringify(log));
};

export const getHydration = (): HydrationLog => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(KEYS.HYDRATION);
    if (stored) {
        const log: HydrationLog = JSON.parse(stored);
        if (log.date === today) return log;
    }
    return { date: today, currentMl: 0, goalMl: 2500 };
};

export const saveRelief = async (userId: string | undefined, log: ReliefLog) => {
    localStorage.setItem(KEYS.RELIEF, JSON.stringify(log));
};

export const getRelief = (): ReliefLog => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(KEYS.RELIEF);
    if (stored) {
        const log: ReliefLog = JSON.parse(stored);
        if (log.date === today) return log;
    }
    return { date: today, count: 0, goal: 7 };
};

export const saveBadges = (badges: Badge[]) => {
  localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
};

export const getBadges = (): Badge[] => {
  const b = localStorage.getItem(KEYS.BADGES);
  return b ? JSON.parse(b) : [];
};

// Added missing export: saveActivePlan
export const saveActivePlan = async (plan: WeeklyPlan) => {
    localStorage.setItem(KEYS.ACTIVE_PLAN, JSON.stringify(plan));
};

// Added missing export: fetchCloudHistory
export const fetchCloudHistory = async (userId: string): Promise<DailyHistory[]> => {
    // Stub implementation: fallback to local history if cloud is not ready
    return getHistory();
};

// Added missing export: fetchCloudHydration
export const fetchCloudHydration = async (userId: string): Promise<HydrationLog> => {
    // Stub implementation: fallback to local hydration if cloud is not ready
    return getHydration();
};

// Added missing export: fetchAllUsersAdmin
export const fetchAllUsersAdmin = async (): Promise<AdminUserView[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) throw error;
    
    return (data || []).map(p => ({
        id: p.id,
        username: p.username || 'walker',
        email: p.email || '',
        full_name: p.full_name || 'Apna Walker',
        today_steps: 0,
        last_location: 'Global Sector',
        last_active: new Date().toISOString(),
        avatar_url: p.avatar_url
    }));
};

// Added missing export: fetchUserSessionsAdmin
export const fetchUserSessionsAdmin = async (userId: string): Promise<WalkSession[]> => {
    return []; // Stub
};

// Added missing export: fetchUserHistoryAdmin
export const fetchUserHistoryAdmin = async (userId: string): Promise<DailyHistory[]> => {
    return []; // Stub
};
