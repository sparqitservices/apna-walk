
import { DailyHistory, UserSettings, Badge, WalkSession, UserProfile, WeeklyPlan, HydrationLog, AdminUserView } from '../types';
import { supabase } from './supabaseClient';

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
    if (steps > 0) history[existingIndex].steps += steps;
    if (session) {
      if (!history[existingIndex].sessions) {
        history[existingIndex].sessions = [];
      }
      history[existingIndex].sessions!.push(session);
    }
  } else {
    history.push({ 
      date: today, 
      steps: steps > 0 ? steps : 0,
      sessions: session ? [session] : []
    });
  }

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

export const getHydration = (): HydrationLog => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(KEYS.HYDRATION);
    if (stored) {
        const log: HydrationLog = JSON.parse(stored);
        if (log.date === today) {
            return log;
        }
    }
    return { date: today, currentMl: 0, goalMl: 2500 };
};

export const saveHydration = (log: HydrationLog) => {
    localStorage.setItem(KEYS.HYDRATION, JSON.stringify(log));
};

// --- CLOUD SYNC METHODS ---

export const syncSettingsToCloud = async (userId: string, settings: UserSettings) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ settings: settings })
            .eq('id', userId);
        if (error) console.error("Cloud Settings Sync Error:", error);
    } catch (e) { console.error(e); }
};

export const fetchUserSettingsFromCloud = async (userId: string): Promise<UserSettings | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .single();
        if (error) return null;
        return data?.settings as UserSettings || null;
    } catch (e) { return null; }
};

export const fetchHistoryFromCloud = async (userId: string): Promise<DailyHistory[]> => {
    try {
        const { data: logs, error: logsError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });
        
        if (logsError) throw logsError;

        const { data: sessions, error: sessError } = await supabase
            .from('walking_sessions')
            .select('*')
            .eq('user_id', userId);

        if (sessError) throw sessError;

        const history: DailyHistory[] = logs.map((log: any) => {
            const dateStr = log.date;
            const daySessions = sessions
                .filter((s: any) => {
                   const sDate = new Date(s.start_time).toISOString().split('T')[0];
                   return sDate === dateStr;
                })
                .map((s: any) => ({
                    id: s.id,
                    startTime: s.start_time,
                    steps: s.steps,
                    durationSeconds: s.duration_seconds,
                    distanceMeters: s.distance_meters,
                    calories: Math.round(s.steps * 0.04),
                    route: s.route_data ? JSON.parse(s.route_data) : undefined
                }));

            return {
                date: dateStr,
                steps: log.steps,
                sessions: daySessions
            };
        });

        return history;
    } catch (e) {
        console.error("Cloud History Fetch Error:", e);
        return [];
    }
};

export const syncDailyStatsToCloud = async (userId: string, date: string, steps: number, calories: number, distance: number) => {
    try {
        const { error } = await supabase
            .from('daily_logs')
            .upsert({ 
                user_id: userId, 
                date, 
                steps, 
                calories, 
                distance_meters: distance,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, date' });
            
        if (error) console.error("Sync Error (Daily Stats):", error);
    } catch (e) { console.error("Sync Exception:", e); }
};

export const syncSessionToCloud = async (userId: string, session: WalkSession) => {
    try {
        const { error } = await supabase
            .from('walking_sessions')
            .upsert({
                id: session.id,
                user_id: userId,
                start_time: session.startTime,
                duration_seconds: session.durationSeconds,
                steps: session.steps,
                distance_meters: session.distanceMeters,
                route_data: session.route ? JSON.stringify(session.route) : null,
                created_at: new Date().toISOString()
            });
            
        if (error) console.error("Sync Error (Session):", error);
    } catch (e) { console.error("Sync Exception:", e); }
};

export const syncLocationToCloud = async (userId: string, locationName: string) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                last_location: locationName,
                last_active: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (error) console.error("Sync Error (Location):", error);
    } catch (e) { console.error("Sync Exception:", e); }
};

// --- ADMIN FETCH METHODS ---

export const fetchAllUsersAdmin = async (): Promise<AdminUserView[]> => {
    try {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*');
            
        if (profileError) throw profileError;

        const today = new Date().toISOString().split('T')[0];
        const { data: dailyLogs, error: logsError } = await supabase
            .from('daily_logs')
            .select('user_id, steps')
            .eq('date', today);

        if (logsError) throw logsError;

        return profiles.map((p: any) => {
             const todayLog = dailyLogs?.find((l: any) => l.user_id === p.id);
             return {
                 id: p.id,
                 full_name: p.full_name || 'Unknown',
                 email: p.email,
                 avatar_url: p.avatar_url,
                 last_location: p.last_location || 'Unknown',
                 last_active: p.last_active,
                 today_steps: todayLog ? todayLog.steps : 0
             };
        });
    } catch (e) {
        console.error("Admin Fetch Error:", e);
        return [];
    }
};

export const fetchUserSessionsAdmin = async (userId: string): Promise<WalkSession[]> => {
    try {
        const { data, error } = await supabase
            .from('walking_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        return data.map((s: any) => ({
            id: s.id,
            startTime: s.start_time,
            steps: s.steps,
            durationSeconds: s.duration_seconds,
            distanceMeters: s.distance_meters,
            calories: Math.round(s.steps * 0.04),
            route: s.route_data ? JSON.parse(s.route_data) : undefined
        }));
    } catch (e) {
        console.error("Admin Session Fetch Error:", e);
        return [];
    }
};
