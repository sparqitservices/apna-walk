import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

declare const google: any;

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

/**
 * Signs in using a Google ID Token (JWT) provided by Google One Tap.
 */
export const signInWithGoogleOneTap = async (idToken: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return data;
};

/**
 * Admin specific OTP login
 */
export const sendAdminOTP = async (email: string) => {
    if (email !== 'apnawalk@gmail.com') {
        throw new Error("Access Denied: Restricted to admin email only.");
    }
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin + '/admin',
        },
    });
    if (error) throw error;
};

export const verifyAdminOTP = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  localStorage.removeItem('strideai_profile');
};

const generateRandomUsername = (email: string) => {
    const base = (email || 'walker').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 8);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${base}_${rand}`;
};

export const syncProfile = async (user: any): Promise<UserProfile> => {
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (existingProfile) {
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