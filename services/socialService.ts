
import { supabase } from './supabaseClient';
import { WalkingGroup, Challenge, GroupMember, GroupPost, ChallengeParticipant } from '../types';

// --- GROUPS ---

export const fetchGroups = async (): Promise<WalkingGroup[]> => {
    const { data, error } = await supabase
        .from('walking_groups')
        .select('*, group_members(count)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map count properly
    return data.map((g: any) => ({
        ...g,
        member_count: g.group_members[0]?.count || 0
    }));
};

export const createGroup = async (group: Partial<WalkingGroup>) => {
    const { data, error } = await supabase
        .from('walking_groups')
        .insert([group])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const joinGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: groupId, user_id: userId, role: 'member' }]);
    if (error) throw error;
};

export const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
        .from('group_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('group_id', groupId);
    if (error) throw error;
    return data.map((m: any) => ({
        ...m,
        profile: m.profile
    }));
};

export const fetchGroupPosts = async (groupId: string): Promise<GroupPost[]> => {
    const { data, error } = await supabase
        .from('group_posts')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((p: any) => ({
        ...p,
        profile: p.profile
    }));
};

export const createPost = async (groupId: string, userId: string, content: string) => {
    const { error } = await supabase
        .from('group_posts')
        .insert([{ group_id: groupId, user_id: userId, content }]);
    if (error) throw error;
};

// --- CHALLENGES ---

export const fetchChallenges = async (): Promise<Challenge[]> => {
    const { data, error } = await supabase
        .from('challenges')
        .select('*, challenge_participants(count)')
        .order('end_date', { ascending: true }); // Show ending soonest first

    if (error) throw error;
    return data.map((c: any) => ({
        ...c,
        participant_count: c.challenge_participants[0]?.count || 0
    }));
};

export const joinChallenge = async (challengeId: string, userId: string) => {
    // Check if daily_logs exist to sync immediately (handled by trigger, but we insert row)
    const { error } = await supabase
        .from('challenge_participants')
        .insert([{ challenge_id: challengeId, user_id: userId }]);
    if (error) throw error;
};

export const fetchLeaderboard = async (challengeId: string): Promise<ChallengeParticipant[]> => {
    const { data, error } = await supabase
        .from('challenge_participants')
        .select('current_steps, user_id, profile:profiles(full_name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('current_steps', { ascending: false })
        .limit(50);

    if (error) throw error;
    
    return data.map((row: any, index: number) => ({
        user_id: row.user_id,
        current_steps: row.current_steps,
        rank: index + 1,
        profile: row.profile
    }));
};

export const createSystemMonthlyChallenge = async () => {
    // This would typically be a cron job, but we can check/create on app load for demo
    const date = new Date();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const name = `${monthName} ${date.getFullYear()} Challenge`;
    
    // Check if exists
    const { data } = await supabase.from('challenges').select('id').eq('name', name).single();
    if (!data) {
        // Create it
        await supabase.from('challenges').insert([{
            name: name,
            description: `Walk 200,000 steps in ${monthName}!`,
            type: 'monthly',
            target_steps: 200000,
            start_date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
            end_date: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
        }]);
    }
};
