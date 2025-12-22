
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
  type?: 'Normal Walk' | 'Brisk Walk' | 'Power Walk' | 'Long Walk' | 'Hike Trail';
  activityType?: 'walking' | 'cycling' | 'driving' | 'stationary';
  avgSpeed?: number;
  maxSpeed?: number;
}

export interface UserProfile {
  name: string;
  username?: string; 
  email: string;
  isLoggedIn: boolean;
  isGuest?: boolean;
  avatar?: string; 
  id?: string; 
  role?: 'user' | 'admin';
  bio?: string;
  age?: number;
  gender?: string;
  preferred_time?: 'morning' | 'afternoon' | 'evening';
  pace?: 'slow' | 'moderate' | 'fast';
  distance_preference?: '1-3km' | '3-5km' | '5km+';
  interests?: string[];
  is_looking_for_buddy?: boolean;
  is_ghost_mode?: boolean; 
  is_verified?: boolean;
  public_key?: string;
  is_stats_public?: boolean;
  is_mutuals_public?: boolean;
  share_live_location?: boolean;
  share_fof_location?: boolean;
  last_lat?: number;
  last_lng?: number;
  last_location_update?: string;
}

export interface UserSettings {
  weightKg: number;
  heightCm: number;
  strideLengthCm: number;
  stepGoal: number;
  distanceGoal?: number;
  calorieGoal?: number;
  sensitivity: number;
  enableLocation: boolean;
  autoTravelHistory: boolean; 
  theme: 'green' | 'blue' | 'orange' | 'purple' | 'pink';
  coachVibe?: 'Energetic' | 'Strict' | 'Chill';
  coachVoiceEnabled: boolean;
  notifications: {
    water: boolean;
    walk: boolean;
    breath: boolean;
    achievements: boolean;
  };
}

export interface LiveConnection {
    id: string;
    username: string;
    avatar_url: string;
    lat: number;
    lng: number;
    degree: 1 | 2; 
    bridge_username?: string; 
    last_active: string;
}

export interface MutualFriend {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Park {
  id: string;
  name: string;
  category: 'park' | 'gym' | 'shop' | 'health';
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
    equipment?: boolean;
    [key: string]: boolean | undefined;
  };
  visitor_count?: number;
  distance?: number;
  google_maps_url?: string;
}

export interface ParkReview {
  id: string;
  park_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  profile?: {
    username: string; 
    avatar_url: string;
  };
}

export interface AIInsight {
  summary: string;
  motivation: string;
  tips: string[];
}

export interface DailyHistory {
  date: string;
  steps: number;
  sessions?: WalkSession[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  isAiGenerated: boolean;
  dateEarned: string;
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

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  windDirection?: number;
  aqi?: number;
}

export interface HydrationLog {
  date: string;
  currentMl: number;
  goalMl: number;
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
  link: string;
  image?: string;
  isJoined?: boolean;
}

export interface AdminUserView {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  last_location?: string;
  last_active?: string;
  today_steps?: number;
}

export interface WalkingGroup {
  id: string;
  name: string;
  location: string;
  created_by: string;
  description: string;
  privacy: 'public' | 'private';
  member_count?: number;
  is_member?: boolean;
  is_pending?: boolean;
  created_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'admin';
  status: 'pending' | 'active';
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export interface GroupMemberStats extends GroupMember {
  today_steps: number;
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
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
  rank: number;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export interface NearbyBuddy extends UserProfile {
  distance_meters: number;
  match_score?: number;
}

export interface BuddyRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender_profile?: {
    username: string;
    avatar_url: string;
  };
}

export interface DuelConfig {
  target_steps: number;
  status: 'pending' | 'active' | 'declined';
  start_steps_sender: number;
  start_steps_receiver: number;
}

export interface BuddyMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_encrypted: boolean;
  audio_url?: string;
  created_at: string;
  duel_config?: DuelConfig;
}

export interface SavedWalk {
  id: string;
  user_id: string;
  route_name: string;
  path: string;
  distance_meters: number;
  duration_seconds: number;
  start_time: string;
  end_time: string;
  avg_speed: number;
  max_speed: number;
  calories_burned: number;
  steps_count: number;
  created_at?: string;
}
