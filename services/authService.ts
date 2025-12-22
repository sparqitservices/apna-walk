
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

export const signInWithGoogleOneTap = async (idToken: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  
  if (data.user) {
    await syncProfile(data.user);
  }
  
  return data;
};

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

/**
 * Robust Sign Out
 * Force-clears local state to prevent "stuck" login sessions.
 */
export const signOut = async () => {
  console.log("Initiating global sign-out...");
  
  // 1. Attempt Google One Tap cleanup
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    try {
        google.accounts.id.disableAutoSelect();
    } catch (e) {
        console.warn("One Tap disable error", e);
    }
  }
  
  try {
    // 2. Attempt Supabase Cloud Sign Out
    // We set a small timeout so we don't hang if the network is flaky
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000));
    
    await Promise.race([signOutPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Supabase SignOut timed out or failed, proceeding with local purge.", error);
  } finally {
    // 3. NUCLEAR PURGE: Clear everything in local storage
    // This removes apnawalk keys AND internal supabase/google auth keys
    localStorage.clear();
    
    // 4. Force hard reload to home page to clear React state
    window.location.href = window.location.origin;
  }
};

const generateRandomUsername = (email: string) => {
    const base = (email || 'walker').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 8);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${base}_${rand}`;
};

export const syncProfile = async (user: any): Promise<UserProfile> => {
    if (!user?.id) throw new Error("Invalid user object for profile sync");

    try {
        // Attempt to fetch from cloud
        const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        let finalProfile: UserProfile;

        if (existingProfile) {
            const finalUsername = existingProfile.username || generateRandomUsername(existingProfile.email || user.email);
            
            // Background update if username was missing
            if (!existingProfile.username) {
                supabase.from('profiles').update({ username: finalUsername }).eq('id', user.id).then();
            }

            finalProfile = {
                id: existingProfile.id,
                name: existingProfile.full_name || user.user_metadata?.full_name,
                username: finalUsername,
                email: existingProfile.email || user.email,
                avatar: existingProfile.avatar_url || user.user_metadata?.avatar_url,
                bio: existingProfile.bio,
                pace: existingProfile.pace,
                preferred_time: existingProfile.preferred_time,
                age: existingProfile.age,
                is_looking_for_buddy: existingProfile.is_looking_for_buddy,
                is_ghost_mode: existingProfile.is_ghost_mode,
                isLoggedIn: true,
                isGuest: false,
                share_live_location: existingProfile.share_live_location
            };
        } else {
            const username = generateRandomUsername(user.email);
            const newProfileData = {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apna Walker',
                username: username,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
                is_looking_for_buddy: true,
                is_ghost_mode: false
            };

            // Standard Insert (Try)
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
        console.warn("Database Sync Failed. Using Local-Only Auth fallback.", dbError);
        // CRITICAL FALLBACK: If DB is broken/missing table, let them in with metadata
        const fallbackProfile: UserProfile = {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Apna Walker',
            email: user.email,
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            username: user.email?.split('@')[0] || 'walker',
            isLoggedIn: true,
            isGuest: false
        };
        localStorage.setItem('strideai_profile', JSON.stringify(fallbackProfile));
        return fallbackProfile;
    }
};
