
import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and standard Node-style (process.env)
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env?.[key] || process.env?.[key] || "";
  } catch {
    return "";
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

/**
 * Supabase createClient throws an error if the URL is empty or invalid.
 * To allow the app to load and function in 'Guest Mode' even without credentials,
 * we use placeholder strings if the environment variables are missing.
 */
const effectiveUrl = supabaseUrl || "https://placeholder-project.supabase.co";
const effectiveKey = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(effectiveUrl, effectiveKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. Cloud-based features like Login, Social Hub, and Leaderboards are disabled. Please use 'Guest Mode' to explore the application UI.");
}
