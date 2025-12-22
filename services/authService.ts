
import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

declare const google: any;

/**
 * Standard Google OAuth flow using Supabase.
 * This is the most reliable method as it handles the Client ID on the server side.
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  });

  if (error) throw error;
  return data;
};

export const signInWithGoogleOneTap = async (idToken: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    console.error("Supabase ID Token Auth Error:", error.message);
    throw error;
  }
  
  if (data.user) {
    await syncProfile(data.user);
  }
  
  return data;
};

// Fix: Added sendAdminOTP to support admin authentication via email OTP
export const sendAdminOTP = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });
  if (error) throw error;
};

// Fix: Added verifyAdminOTP to support admin authentication verification
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
    try {
        google.accounts.id.disableAutoSelect();
    } catch (e) {}
  }
  
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("Supabase SignOut failed, purging local state.");
  } finally {
    localStorage.clear();
    window.location.href = window.location.origin;
  }
};

const generateRandomUsername = (email: string) => {
    const base = (email || 'walker').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 8);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${base}_${rand}`;
};

export const syncProfile = async (user: any): Promise<UserProfile> => {
    if (!user?.id) throw new Error("Invalid user object");

    try {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        let finalProfile: UserProfile;

        if (existingProfile) {
            finalProfile = {
                id: existingProfile.id,
                name: existingProfile.full_name || user.user_metadata?.full_name,
                username: existingProfile.username || generateRandomUsername(user.email),
                email: existingProfile.email || user.email,
                avatar: existingProfile.avatar_url || user.user_metadata?.avatar_url,
                isLoggedIn: true,
                isGuest: false,
                pace: existingProfile.pace,
                preferred_time: existingProfile.preferred_time
            };
        } else {
            const username = generateRandomUsername(user.email);
            const newProfileData = {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apna Walker',
                username: username,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
            };

            await supabase.from('profiles').insert([newProfileData]);

            finalProfile = {
                id: newProfileData.id,
                name: newProfileData.full_name,
                username: newProfileData.username,
                email: newProfileData.email,
                avatar: newProfileData.avatar_url,
                isLoggedIn: true,
                isGuest: false
            };
        }

        localStorage.setItem('strideai_profile', JSON.stringify(finalProfile));
        return finalProfile;

    } catch (dbError) {
        const fallbackProfile: UserProfile = {
            id: user.id,
            name: user.user_metadata?.full_name || 'Apna Walker',
            email: user.email,
            avatar: user.user_metadata?.avatar_url,
            username: user.email?.split('@')[0] || 'walker',
            isLoggedIn: true,
            isGuest: false
        };
        localStorage.setItem('strideai_profile', JSON.stringify(fallbackProfile));
        return fallbackProfile;
    }
};
