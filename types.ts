
export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number;
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
  avgSpeed?: number;
  maxSpeed?: number;
}

// --- GPS Tracking Persistence ---
export interface SavedWalk {
    id: string;
    user_id: string;
    route_name: string;
    distance_meters: number;
    duration_seconds: number;
    start_time: string;
    end_time: string;
    avg_speed: number;
    max_speed: number;
    calories_burned: number;
    steps_count: number;
    is_favorite: boolean;
    path?: any; // GeoJSON
}

export interface UserProfile {
  name: string;
  username?: string; // New: Unique short ID
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
  is_ghost_mode?: boolean; // New: Privacy toggle
  is_verified?: boolean;
  public_key?: string;
}

export interface DuelConfig {
  target_steps: number;
  status: 'pending' | 'active' | 'finished' | 'declined';
  start_steps_sender: number;
  start_steps_receiver: number;
  winner_id?: string;
  current_steps_sender?: number;
  current_steps_receiver?: number;
}

export interface BuddyRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  sender_profile?: {
    username: string; // Use username instead of name
    avatar_url: string;
  };
}

export interface BuddyMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  is_encrypted?: boolean;
  audio_url?: string;
  duel_config?: DuelConfig;
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
  username: string; // Updated
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
    username: string; // Use username
    avatar_url: string;
  }
}

export interface GroupMemberStats extends GroupMember {
  today_steps: number;
}

export interface GroupPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string; // Use username
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
    username: string; // Use username
    avatar_url: string;
  }
}

/**
 * Interface representing a park or green space.
 */
export interface Park {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  photo_url?: string;
  rating_avg: number;
  facilities: {
    washroom?: boolean;
    trail?: boolean;
    water?: boolean;
    lighting?: boolean;
    bench?: boolean;
    [key: string]: boolean | undefined;
  };
  visitor_count?: number;
  distance?: number;
}

/**
 * Interface representing a user review for a park.
 */
export interface ParkReview {
  id: string;
  park_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  profile?: {
    username: string; // Use username
    avatar_url: string;
  };
}
