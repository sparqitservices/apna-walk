
export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface WalkSession {
  id: string;
  startTime: number;
  endTime?: number;
  steps: number;
  distanceMeters: number;
  calories: number;
  durationSeconds: number;
  route?: RoutePoint[];
  type?: 'Normal Walk' | 'Brisk Walk' | 'Power Walk' | 'Long Walk';
}

export interface UserProfile {
  name: string;
  email: string;
  isLoggedIn: boolean;
  isGuest?: boolean;
  avatar?: string; // Base64 image string
  id?: string; // Supabase Auth ID
  role?: 'user' | 'admin';
}

export interface UserSettings {
  weightKg: number;
  heightCm: number;
  strideLengthCm: number;
  stepGoal: number;
  sensitivity: number; // 1 to 5, default 3
  enableLocation: boolean;
  notifications: {
      water: boolean;
      walk: boolean;
      breath: boolean;
  };
  theme: 'green' | 'blue' | 'orange' | 'purple' | 'pink';
}

export interface DailyHistory {
  date: string; // YYYY-MM-DD
  steps: number;
  sessions?: WalkSession[];
}

export interface HydrationLog {
    date: string;
    currentMl: number;
    goalMl: number;
}

export interface AIInsight {
  summary: string;
  motivation: string;
  tips: string[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // FontAwesome class
  color: string; // Tailwind color class
  isAiGenerated?: boolean;
  dateEarned: string;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  windDirection?: number;
  aqi?: number;
}

export interface DailyWorkoutPlan {
  day: string; // "Day 1", "Day 2"
  title: string;
  description: string;
  durationMinutes: number;
  intensity: 'Low' | 'Medium' | 'High';
  type: 'Interval' | 'Endurance' | 'Recovery' | 'Power';
}

export interface WeeklyPlan {
  id: string;
  goal: string;
  createdAt: string;
  schedule: DailyWorkoutPlan[];
}

export interface FitnessEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'Marathon' | 'Yoga' | 'Walk' | 'Cycling' | 'Zumba';
  attendees: number;
  distanceKm: number; // distance from user
  description: string;
  image?: string;
  link: string; // URL to external event page
  isJoined?: boolean;
}

// --- Admin Types ---
export interface AdminUserView {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  last_location?: string;
  last_active?: string;
  total_steps?: number; // Calculated field
  today_steps?: number; // Calculated field
}