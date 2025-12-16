import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
};

export const syncProfile = async (user: any): Promise<UserProfile> => {
    // 1. Check if profile exists in DB
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (existingProfile) {
        return {
            name: existingProfile.full_name,
            email: existingProfile.email,
            avatar: existingProfile.avatar_url,
            isLoggedIn: true,
            isGuest: false
        };
    }

    // 2. If not, create it
    const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
    };

    const { error } = await supabase
        .from('profiles')
        .insert([newProfile]);

    if (error) {
        console.error("Error creating profile:", error);
    }

    return {
        name: newProfile.full_name,
        email: newProfile.email,
        avatar: newProfile.avatar_url,
        isLoggedIn: true,
        isGuest: false
    };
};