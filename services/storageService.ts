
import { DailyHistory, UserSettings, Badge, WalkSession, UserProfile, WeeklyPlan, HydrationLog, AdminUserView } from '../types';
import { supabase } from './supabaseClient';

const KEYS = {
  HISTORY: 'strideai_history',
  SETTINGS: 'strideai_settings',
  BADGES: 'strideai_badges',
  PROFILE: 'strideai_profile',
  ACTIVE_PLAN: 'strideai_active_plan',
  HYDRATION: 'strideai_hydration'
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
          age: profile.age,
          pace: profile.pace,
          preferred_time: profile.preferred_time,
          distance_preference: profile.distance_preference,
          share_live_location: profile.share_live_location,
          is_ghost_mode: profile.is_ghost_mode
      });
  }
};

export const getProfile = (): UserProfile | null => {
  const p = localStorage.getItem(KEYS.PROFILE);
  return p ? JSON.parse(p) : null;
};

export const saveSettings = async (userId: string | undefined, settings: UserSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  if (isCloudUser(userId)) {
      await supabase.from('profiles').update({ settings }).eq('id', userId);
  }
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
  if (history.length > 30) history = history.slice(-30);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));

  if (isCloudUser(userId)) {
      if (steps > 0) {
          await supabase.rpc('increment_daily_steps', { 
              u_id: userId, 
              d_date: today, 
              s_inc: steps,
              c_inc: Math.round(steps * 0.04),
              dist_inc: 0 
          });
      }
      if (session) {
          await supabase.from('walking_sessions').insert({
              id: session.id,
              user_id: userId,
              start_time: new Date(session.startTime).toISOString(),
              steps: session.steps,
              duration_seconds: session.durationSeconds,
              distance_meters: session.distanceMeters,
              route_data: session.route ? JSON.stringify(session.route) : null,
              activity_type: session.activityType || 'walking'
          });
      }
  }
  return history;
};

export const fetchCloudHistory = async (userId: string): Promise<DailyHistory[]> => {
    const { data: logs, error: lErr } = await supabase.from('daily_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30);
    const { data: sess, error: sErr } = await supabase.from('walking_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }).limit(50);
    
    if (lErr || sErr) return getHistory();

    const history: DailyHistory[] = (logs || []).map(log => ({
        date: log.date,
        steps: log.steps,
        sessions: (sess || [])
            .filter(s => s.start_time.startsWith(log.date))
            .map(s => ({
                id: s.id,
                startTime: new Date(s.start_time).getTime(),
                steps: s.steps,
                durationSeconds: s.duration_seconds,
                distanceMeters: s.distance_meters,
                calories: Math.round(s.steps * 0.04),
                route: s.route_data ? (typeof s.route_data === 'string' ? JSON.parse(s.route_data) : s.route_data) : undefined,
                activityType: s.activity_type || 'walking',
                avgSpeed: (s.distance_meters / (s.duration_seconds || 1)) * 3.6
            }))
    }));
    
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    return history;
};

export const getHistory = (): DailyHistory[] => {
  const historyStr = localStorage.getItem(KEYS.HISTORY);
  return historyStr ? JSON.parse(historyStr) : [];
};

export const saveHydration = async (userId: string | undefined, log: HydrationLog) => {
    localStorage.setItem(KEYS.HYDRATION, JSON.stringify(log));
    if (isCloudUser(userId)) {
        await supabase.from('hydration_logs').upsert({
            user_id: userId,
            date: log.date,
            current_ml: log.currentMl,
            goal_ml: log.goalMl
        }, { onConflict: 'user_id, date' });
    }
};

export const fetchCloudHydration = async (userId: string): Promise<HydrationLog> => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('hydration_logs').select('*').eq('user_id', userId).eq('date', today).maybeSingle();
    
    if (data && !error) {
        const log = { date: data.date, currentMl: data.current_ml, goalMl: data.goal_ml };
        localStorage.setItem(KEYS.HYDRATION, JSON.stringify(log));
        return log;
    }
    return getHydration();
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

export const saveBadges = (badges: Badge[]) => {
  localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
};

export const getBadges = (): Badge[] => {
  const b = localStorage.getItem(KEYS.BADGES);
  return b ? JSON.parse(b) : [];
};

export const saveActivePlan = (plan: WeeklyPlan | null) => {
  if (plan) localStorage.setItem(KEYS.ACTIVE_PLAN, JSON.stringify(plan));
  else localStorage.removeItem(KEYS.ACTIVE_PLAN);
};

export const getActivePlan = (): WeeklyPlan | null => {
  const p = localStorage.getItem(KEYS.ACTIVE_PLAN);
  return p ? JSON.parse(p) : null;
};

export const fetchAllUsersAdmin = async (): Promise<AdminUserView[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      full_name,
      email,
      avatar_url,
      last_lat,
      last_lng,
      last_location_update,
      daily_logs(steps)
    `)
    .eq('daily_logs.date', today);

  if (error) throw error;

  return (data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    email: u.email,
    avatar_url: u.avatar_url,
    last_location: u.last_lat ? `${u.last_lat.toFixed(4)}, ${u.last_lng.toFixed(4)}` : undefined,
    last_active: u.last_location_update,
    today_steps: u.daily_logs?.[0]?.steps || 0
  }));
};

export const fetchUserSessionsAdmin = async (userId: string): Promise<WalkSession[]> => {
  const { data, error } = await supabase
    .from('walking_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map((s: any) => ({
    id: s.id,
    startTime: new Date(s.start_time).getTime(),
    steps: s.steps,
    durationSeconds: s.duration_seconds,
    distanceMeters: s.distance_meters,
    calories: Math.round(s.steps * 0.04),
    route: s.route_data ? (typeof s.route_data === 'string' ? JSON.parse(s.route_data) : s.route_data) : undefined,
    avgSpeed: (s.distance_meters / (s.duration_seconds || 1)) * 3.6,
    activityType: s.activity_type || 'walking'
  }));
};

export const fetchUserHistoryAdmin = async (userId: string): Promise<DailyHistory[]> => {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data || []).map(log => ({
    date: log.date,
    steps: log.steps
  }));
};
