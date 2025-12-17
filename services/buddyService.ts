
import { supabase } from './supabaseClient';
import { NearbyBuddy, BuddyRequest, BuddyMessage, UserProfile } from '../types';

export const updateBuddyPreferences = async (userId: string, prefs: Partial<UserProfile>) => {
    const { error } = await supabase
        .from('profiles')
        .update(prefs)
        .eq('id', userId);
    if (error) throw error;
};

export const updateLocation = async (userId: string, lat: number, lng: number) => {
    // PostGIS point format: 'POINT(long lat)'
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

export const sendBuddyRequest = async (senderId: string, receiverId: string, message: string) => {
    const { error } = await supabase
        .from('buddy_requests')
        .insert([{ sender_id: senderId, receiver_id: receiverId, message, status: 'pending' }]);
    if (error) throw error;
};

export const fetchMyBuddyRequests = async (userId: string): Promise<BuddyRequest[]> => {
    const { data, error } = await supabase
        .from('buddy_requests')
        .select('*, sender_profile:profiles(full_name, avatar_url)')
        .eq('receiver_id', userId)
        .eq('status', 'pending');
    if (error) throw error;
    return data || [];
};

export const respondToRequest = async (requestId: string, status: 'accepted' | 'declined', senderId: string, receiverId: string) => {
    const { error: requestError } = await supabase
        .from('buddy_requests')
        .update({ status })
        .eq('id', requestId);
    
    if (requestError) throw requestError;

    if (status === 'accepted') {
        // Add to buddies table
        const { error: buddyError } = await supabase
            .from('buddies')
            .insert([{ user1_id: senderId, user2_id: receiverId }]);
        if (buddyError) throw buddyError;
    }
};

export const fetchMyBuddies = async (userId: string): Promise<UserProfile[]> => {
    // Complex query to get profile of the "other" person in the buddies table
    const { data: b1, error: e1 } = await supabase
        .from('buddies')
        .select('other:profiles!buddies_user2_id_fkey(*)')
        .eq('user1_id', userId);
    
    const { data: b2, error: e2 } = await supabase
        .from('buddies')
        .select('other:profiles!buddies_user1_id_fkey(*)')
        .eq('user2_id', userId);

    if (e1 || e2) throw (e1 || e2);
    
    const list1 = b1?.map((b: any) => b.other) || [];
    const list2 = b2?.map((b: any) => b.other) || [];
    
    return [...list1, ...list2];
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
    const { error } = await supabase
        .from('buddy_messages')
        .insert([{ sender_id: senderId, receiver_id: receiverId, content }]);
    if (error) throw error;
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
        .channel('buddy_chat')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'buddy_messages',
            filter: `receiver_id=eq.${userId}` 
        }, payload => {
            const msg = payload.new as BuddyMessage;
            if (msg.sender_id === buddyId) {
                onMessage(msg);
            }
        })
        .subscribe();
};
