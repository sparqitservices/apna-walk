import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const signInWithGoogle = async () => {
  const redirectTo = window.location.origin;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

const generateRandomUsername = (email: string) => {
    const base = (email || 'walker').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 8);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${base}_${rand}`;
};

export const syncProfile = async (user: any): Promise<UserProfile> => {
    // 1. Check if profile exists in DB
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (existingProfile) {
        // Ensure even existing users have a username if they missed it
        const finalUsername = existingProfile.username || generateRandomUsername(existingProfile.email);
        
        if (!existingProfile.username) {
            await supabase.from('profiles').update({ username: finalUsername }).eq('id', user.id);
        }

        return {
            id: existingProfile.id,
            name: existingProfile.full_name,
            username: finalUsername,
            email: existingProfile.email,
            avatar: existingProfile.avatar_url,
            bio: existingProfile.bio,
            pace: existingProfile.pace,
            preferred_time: existingProfile.preferred_time,
            age: existingProfile.age,
            is_looking_for_buddy: existingProfile.is_looking_for_buddy,
            is_ghost_mode: existingProfile.is_ghost_mode,
            isLoggedIn: true,
            isGuest: false
        };
    }

    // 2. If not, create it with a unique username
    const username = generateRandomUsername(user.email);
    const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apna Walker',
        username: username,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        is_looking_for_buddy: true,
        is_ghost_mode: false
    };

    const { error } = await supabase
        .from('profiles')
        .insert([newProfile]);

    if (error) {
        console.error("Error creating profile:", error);
    }

    return {
        id: newProfile.id,
        name: newProfile.full_name,
        username: newProfile.username,
        email: newProfile.email,
        avatar: newProfile.avatar_url,
        isLoggedIn: true,
        isGuest: false
    };
};