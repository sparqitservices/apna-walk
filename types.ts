
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
  avatar?: string; 
  id?: string; 
  role?: 'user' | 'admin';
  // Buddy Preferences
  bio?: string;
  age?: number;
  gender?: string;
  preferred_time?: 'morning' | 'afternoon' | 'evening';
  pace?: 'slow' | 'moderate' | 'fast';
  distance_preference?: '1-3km' | '3-5km' | '5km+';
  interests?: string[];
  is_looking_for_buddy?: boolean;
  is_verified?: boolean;
}

export interface BuddyRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface BuddyMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NearbyBuddy extends UserProfile {
  distance: number;
  match_score?: number;
}

export interface UserSettings {
  weightKg: number;
  heightCm: number;
  strideLengthCm: number;
  stepGoal: number;
  sensitivity: number; 
  enableLocation: boolean;
  notifications: {
      water: boolean;
      walk: boolean;
      breath: boolean;
  };
  theme: 'green' | 'blue' | 'orange' | 'purple' | 'pink';
}

export interface DailyHistory {
  date: string; 
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
  icon: string; 
  color: string; 
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
  day: string; 
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
  distanceKm: number; 
  description: string;
  image?: string;
  link: string; 
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
  total_steps?: number; 
  today_steps?: number; 
}

// --- Social & Community Types ---

export interface WalkingGroup {
  id: string;
  name: string;
  description: string;
  location: string;
  privacy: 'public' | 'private';
  member_limit: number;
  created_by: string;
  member_count?: number; 
  is_member?: boolean;
  is_pending?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending';
  joined_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  }
}

export interface GroupPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  }
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'monthly' | 'custom';
  target_steps: number;
  start_date: string;
  end_date: string;
  participant_count?: number;
  is_joined?: boolean;
}

export interface ChallengeParticipant {
  user_id: string;
  current_steps: number;
  rank?: number;
  profile?: {
    full_name: string;
    avatar_url: string;
  }
}
