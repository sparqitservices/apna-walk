
import { supabase } from './supabaseClient';
import { NearbyBuddy, BuddyRequest, BuddyMessage, UserProfile, DuelConfig, MutualFriend, LiveConnection } from '../types';

export const updateBuddyPreferences = async (userId: string, prefs: Partial<UserProfile>) => {
    const { error } = await supabase
        .from('profiles')
        .update(prefs)
        .eq('id', userId);
    if (error) throw error;
};

/**
 * Updates the user's actual GPS coordinates for live sharing.
 */
export const updateLiveLocation = async (userId: string, lat: number, lng: number) => {
    const { error } = await supabase
        .from('profiles')
        .update({ 
            last_lat: lat, 
            last_lng: lng,
            last_location_update: new Date().toISOString()
        })
        .eq('id', userId);
    if (error) throw error;
};

/**
 * Fetches real-time locations of direct friends and 2nd-degree connections (Friends of Friends).
 * Respects 'share_live_location' and 'share_fof_location' flags.
 */
export const fetchLiveConnections = async (userId: string): Promise<LiveConnection[]> => {
    const { data, error } = await supabase.rpc('get_live_squad_radar', {
        requesting_user_id: userId
    });
    
    if (error) {
        console.error("Radar Fetch Error:", error);
        return [];
    }
    
    return (data || []).map((c: any) => ({
        id: c.user_id,
        username: c.username,
        avatar_url: c.avatar_url,
        lat: c.lat,
        lng: c.lng,
        degree: c.connection_degree,
        bridge_username: c.mutual_friend_name,
        last_active: c.updated_at
    }));
};

export const findNearbyBuddies = async (lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyBuddy[]> => {
    const { data, error } = await supabase.rpc('find_nearby_buddies', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: radiusMeters,
        requesting_user_id: userId
    });
    
    if (error) throw error;
    
    return (data || []).map((p: any) => ({
        ...p,
        name: "[Hidden]", 
        email: "[Hidden]" 
    })).filter((p: any) => !p.is_ghost_mode);
};

export const fetchBuddyProfile = async (buddyId: string): Promise<UserProfile> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', buddyId)
        .single();
    
    if (error) throw error;
    return {
        id: data.id,
        name: data.full_name,
        username: data.username,
        email: data.email,
        avatar: data.avatar_url,
        isLoggedIn: true,
        bio: data.bio,
        pace: data.pace,
        preferred_time: data.preferred_time,
        is_stats_public: data.is_stats_public,
        is_mutuals_public: data.is_mutuals_public
    };
};

export const fetchMutualFriends = async (userId: string, buddyId: string): Promise<MutualFriend[]> => {
    try {
        const { data, error } = await supabase.rpc('get_mutual_friends', {
            user_a: userId,
            user_b: buddyId
        });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Mutual friends fetch error:", e);
        return [];
    }
};

export const removeBuddy = async (userId: string, buddyId: string) => {
    const { error } = await supabase
        .from('buddies')
        .delete()
        .or(`and(user1_id.eq.${userId},user2_id.eq.${buddyId}),and(user1_id.eq.${buddyId},user2_id.eq.${userId})`);
    if (error) throw error;
};

export const searchUsers = async (query: string, currentUserId: string): Promise<UserProfile[]> => {
    if (!query || query.length < 3) return [];
    
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, pace, preferred_time, public_key, is_ghost_mode')
        .neq('id', currentUserId)
        .eq('is_ghost_mode', false)
        .or(`username.ilike.%${query}%`)
        .limit(10);
    
    if (error) throw error;
    
    return (data || []).map(p => ({
        id: p.id,
        name: "[Hidden]", 
        username: p.username,
        email: "[Hidden]", 
        avatar: p.avatar_url,
        isLoggedIn: true,
        bio: p.bio,
        pace: p.pace,
        preferred_time: p.preferred_time,
        public_key: p.public_key
    }));
};

export const sendBuddyRequest = async (senderId: string, receiverId: string, message: string) => {
    const { error } = await supabase
        .from('buddy_requests')
        .insert([{ sender_id: senderId, receiver_id: receiverId, message, status: 'pending' }]);
    if (error) {
        if (error.code === '23505') throw new Error("Request already sent!");
        throw error;
    }
};

export const fetchPendingBuddyCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('buddy_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending');
    
    if (error) return 0;
    return count || 0;
};

export const fetchMyBuddyRequests = async (userId: string): Promise<BuddyRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('buddy_requests')
            .select(`
                *,
                sender_profile:profiles!buddy_requests_sender_id_fkey (
                    username,
                    avatar_url
                )
            `)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("fetchMyBuddyRequests error:", e);
        return [];
    }
};

export const respondToRequest = async (requestId: string, status: 'accepted' | 'declined', senderId: string, receiverId: string) => {
    const { error: requestError } = await supabase
        .from('buddy_requests')
        .update({ status })
        .eq('id', requestId);
    
    if (requestError) throw requestError;

    if (status === 'accepted') {
        const { data: existing } = await supabase
            .from('buddies')
            .select('id')
            .or(`and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`)
            .maybeSingle();

        if (!existing) {
            const { error: buddyError } = await supabase
                .from('buddies')
                .insert([{ user1_id: senderId, user2_id: receiverId }]);
            if (buddyError) throw buddyError;
        }
    }
};

export const fetchMyBuddies = async (userId: string): Promise<UserProfile[]> => {
    const { data: b1, error: e1 } = await supabase
        .from('buddies')
        .select('other:profiles!buddies_user2_id_fkey(id, username, full_name, email, avatar_url, public_key, bio, pace, preferred_time, is_stats_public, is_mutuals_public)')
        .eq('user1_id', userId);
    
    const { data: b2, error: e2 } = await supabase
        .from('buddies')
        .select('other:profiles!buddies_user1_id_fkey(id, username, full_name, email, avatar_url, public_key, bio, pace, preferred_time, is_stats_public, is_mutuals_public)')
        .eq('user2_id', userId);

    if (e1 || e2) throw (e1 || e2);
    
    const list1 = b1?.map((b: any) => ({
        id: b.other.id,
        username: b.other.username,
        name: b.other.full_name, 
        email: b.other.email,     
        avatar: b.other.avatar_url,
        isLoggedIn: true,
        public_key: b.other.public_key,
        bio: b.other.bio,
        pace: b.other.pace,
        preferred_time: b.other.preferred_time,
        is_stats_public: b.other.is_stats_public,
        is_mutuals_public: b.other.is_mutuals_public
    })) || [];

    const list2 = b2?.map((b: any) => ({
        id: b.other.id,
        username: b.other.username,
        name: b.other.full_name, 
        email: b.other.email,     
        avatar: b.other.avatar_url,
        isLoggedIn: true,
        public_key: b.other.public_key,
        bio: b.other.bio,
        pace: b.other.pace,
        preferred_time: b.other.preferred_time,
        is_stats_public: b.other.is_stats_public,
        is_mutuals_public: b.other.is_mutuals_public
    })) || [];
    
    return [...list1, ...list2];
};

export const sendMessage = async (senderId: string, receiverId: string, content: string, isEncrypted = false, audioUrl?: string) => {
    const { error } = await supabase
        .from('buddy_messages')
        .insert([{ 
            sender_id: senderId, 
            receiver_id: receiverId, 
            content, 
            is_encrypted: isEncrypted,
            audio_url: audioUrl
        }]);
    if (error) throw error;
};

export const sendDuel = async (senderId: string, receiverId: string, targetSteps: number, currentDailySteps: number) => {
    const duelConfig: DuelConfig = {
        target_steps: targetSteps,
        status: 'pending',
        start_steps_sender: currentDailySteps,
        start_steps_receiver: 0 
    };

    const { error } = await supabase
        .from('buddy_messages')
        .insert([{ 
            sender_id: senderId, 
            receiver_id: receiverId, 
            content: `Muqabla: ${targetSteps} Steps Challenge!`,
            duel_config: duelConfig
        }]);
    if (error) throw error;
};

export const respondToDuel = async (messageId: string, status: 'active' | 'declined', receiverStartSteps?: number) => {
    const { data } = await supabase.from('buddy_messages').select('duel_config').eq('id', messageId).single();
    if (!data) return;

    const newConfig = { 
        ...data.duel_config, 
        status,
        start_steps_receiver: receiverStartSteps || 0
    };

    const { error } = await supabase
        .from('buddy_messages')
        .update({ duel_config: newConfig })
        .eq('id', messageId);
    
    if (error) throw error;
};

export const uploadVoiceNote = async (blob: Blob, userId: string) => {
    const fileName = `voice_${userId}_${Date.now()}.wav`;
    const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, blob);
        
    if (error) {
        return URL.createObjectURL(blob);
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(fileName);
        
    return publicUrl;
};

export const fetchMessages = async (userId: string, buddyId: string): Promise<BuddyMessage[]> => {
    const { data, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const subscribeToMessages = (userId: string, buddyId: string, onMessage: (msg: BuddyMessage) => void) => {
    return supabase
        .channel(`chat_${userId}_${buddyId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'buddy_messages'
        }, payload => {
            if (payload.eventType === 'INSERT') {
                const msg = payload.new as BuddyMessage;
                if (msg.sender_id === buddyId || msg.sender_id === userId) {
                    onMessage(msg);
                }
            } else if (payload.eventType === 'UPDATE') {
                const msg = payload.new as BuddyMessage;
                onMessage(msg);
            }
        })
        .subscribe();
};

export const createSyncChannel = (userId: string, buddyId: string, onEvent: (event: string, payload: any) => void) => {
    const channel = supabase.channel(`sync_${buddyId}`);
    
    channel.on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.senderId === buddyId) {
            onEvent('typing', payload.payload.isTyping);
        }
    }).on('broadcast', { event: 'duel_progress' }, (payload) => {
        if (payload.payload.senderId === buddyId) {
            onEvent('duel_progress', payload.payload);
        }
    }).subscribe();

    return {
        sendTyping: (isTyping: boolean) => {
            channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { senderId: userId, isTyping }
            });
        },
        sendDuelProgress: (steps: number, duelId: string) => {
            channel.send({
                type: 'broadcast',
                event: 'duel_progress',
                payload: { senderId: userId, steps, duelId }
            });
        },
        unsubscribe: () => channel.unsubscribe()
    };
};
