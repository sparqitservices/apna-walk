
import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and standard Node-style (process.env)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// If keys are missing, we export a mock-ish client or handle it in services
// but createClient requires strings. We provide empty strings to avoid crash on import.
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials missing. Cloud features (Login, Social, Leaderboards) will be disabled. Use 'Guest Mode' to test the app UI.");
}
