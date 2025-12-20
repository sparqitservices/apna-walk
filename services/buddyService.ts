
import { supabase } from './supabaseClient';
import { NearbyBuddy, BuddyRequest, BuddyMessage, UserProfile, DuelConfig } from '../types';

export const updateBuddyPreferences = async (userId: string, prefs: Partial<UserProfile>) => {
    const { error } = await supabase
        .from('profiles')
        .update(prefs)
        .eq('id', userId);
    if (error) throw error;
};

export const updateLocation = async (userId: string, lat: number, lng: number) => {
    const point = `POINT(${lng} ${lat})`;
    const { error } = await supabase
        .from('profiles')
        .update({ location: point })
        .eq('id', userId);
    if (error) throw error;
};

export const findNearbyBuddies = async (lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyBuddy[]> => {
    const { data, error } = await supabase.rpc('find_nearby_buddies', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: radiusMeters,
        requesting_user_id: userId
    });
    
    if (error) throw error;
    return data || [];
};

export const searchUsers = async (query: string, currentUserId: string): Promise<UserProfile[]> => {
    if (!query || query.length < 3) return [];
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
    
    if (error) throw error;
    
    return (data || []).map(p => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        avatar: p.avatar_url,
        isLoggedIn: true,
        is_verified: p.is_verified,
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
        if (error.code === '23505') throw new Error("Request already sent to this user!");
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
        // We use a more robust selector to handle potential naming mismatches in the schema
        const { data, error } = await supabase
            .from('buddy_requests')
            .select(`
                *,
                sender_profile:profiles!buddy_requests_sender_id_fkey (
                    full_name,
                    avatar_url
                )
            `)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase error fetching buddy requests:", error);
            // Fallback: try without the alias if the above fails due to relationship name
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('buddy_requests')
                .select('*, profiles (full_name, avatar_url)')
                .eq('receiver_id', userId)
                .eq('status', 'pending');
                
            if (fallbackError) throw fallbackError;
            
            return (fallbackData || []).map((req: any) => ({
                ...req,
                sender_profile: req.profiles ? {
                    full_name: req.profiles.full_name,
                    avatar_url: req.profiles.avatar_url
                } : undefined
            }));
        }
        
        return data || [];
    } catch (e) {
        console.error("fetchMyBuddyRequests critical error:", e);
        return [];
    }
};

export const respondToRequest = async (requestId: string, status: 'accepted' | 'declined', senderId: string, receiverId: string) => {
    // 1. Update the request status
    const { error: requestError } = await supabase
        .from('buddy_requests')
        .update({ status })
        .eq('id', requestId);
    
    if (requestError) throw requestError;

    // 2. If accepted, create the dual-sided buddy relationship
    if (status === 'accepted') {
        // We check if relationship already exists to prevent unique constraint errors
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
        .select('other:profiles!buddies_user2_id_fkey(*)')
        .eq('user1_id', userId);
    
    const { data: b2, error: e2 } = await supabase
        .from('buddies')
        .select('other:profiles!buddies_user1_id_fkey(*)')
        .eq('user2_id', userId);

    if (e1 || e2) throw (e1 || e2);
    
    const list1 = b1?.map((b: any) => ({
        id: b.other.id,
        name: b.other.full_name,
        email: b.other.email,
        avatar: b.other.avatar_url,
        isLoggedIn: true,
        public_key: b.other.public_key
    })) || [];

    const list2 = b2?.map((b: any) => ({
        id: b.other.id,
        name: b.other.full_name,
        email: b.other.email,
        avatar: b.other.avatar_url,
        isLoggedIn: true,
        public_key: b.other.public_key
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
        start_steps_receiver: 0 // Will be set on acceptance
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
    // 1. Fetch current duel config
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
        console.warn("Storage upload failed, using local blob URL for demo");
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
