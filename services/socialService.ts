
import { supabase } from './supabaseClient';
import { WalkingGroup, Challenge, GroupMember, GroupPost, ChallengeParticipant, GroupMemberStats } from '../types';

// --- GROUPS ---

export const fetchGroups = async (userId?: string): Promise<WalkingGroup[]> => {
    try {
        const { data, error } = await supabase
            .from('walking_groups')
            .select('*, group_members(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        let userMemberships: any[] = [];
        if (userId) {
            const { data: membershipData, error: mError } = await supabase
                .from('group_members')
                .select('group_id, status')
                .eq('user_id', userId);
            
            if (!mError) {
                userMemberships = membershipData || [];
            }
        }

        return data.map((g: any) => {
            const membership = userMemberships.find(m => m.group_id === g.id);
            return {
                ...g,
                member_count: g.group_members?.[0]?.count || 0,
                is_member: !!membership && membership.status === 'active',
                is_pending: !!membership && membership.status === 'pending'
            };
        });
    } catch (e) {
        console.error("fetchGroups error:", e);
        return [];
    }
};

export const createGroup = async (group: Partial<WalkingGroup>) => {
    const { data, error } = await supabase
        .from('walking_groups')
        .insert([group])
        .select()
        .single();
    if (error) throw error;
    
    // Auto-join creator as admin with active status
    if (data && group.created_by) {
        const { error: joinError } = await supabase
            .from('group_members')
            .insert([{ 
                group_id: data.id, 
                user_id: group.created_by, 
                role: 'admin',
                status: 'active' 
            }]);
        if (joinError) console.error("Error auto-joining creator", joinError);
    }
    
    return data;
};

export const updateGroup = async (groupId: string, updates: Partial<WalkingGroup>) => {
    const { data, error } = await supabase
        .from('walking_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteGroup = async (groupId: string) => {
    const { error } = await supabase
        .from('walking_groups')
        .delete()
        .eq('id', groupId);
    if (error) throw error;
};

export const requestJoinGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase
        .from('group_members')
        .insert({ 
            group_id: groupId, 
            user_id: userId, 
            role: 'member',
            status: 'pending' 
        });
        
    if (error) {
        if (error.code === '23505' || error.message.toLowerCase().includes('unique')) {
            const { error: updateError } = await supabase
                .from('group_members')
                .update({ status: 'pending' })
                .match({ group_id: groupId, user_id: userId });
            
            if (updateError) throw updateError;
            return;
        }
        throw error;
    }
};

export const fetchTotalPendingCount = async (userId: string): Promise<number> => {
    try {
        // 1. Get IDs of groups owned by this user
        const { data: myGroups, error: groupsError } = await supabase
            .from('walking_groups')
            .select('id')
            .eq('created_by', userId);
            
        if (groupsError || !myGroups || myGroups.length === 0) return 0;
        
        const groupIds = myGroups.map(g => g.id);
        
        // 2. Count pending members in those groups
        const { count, error: countError } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .in('group_id', groupIds);
            
        if (countError) throw countError;
        return count || 0;
    } catch (e) {
        console.error("Error fetching total pending count:", e);
        return 0;
    }
};

export const fetchPendingRequests = async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
        .from('group_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'pending');
    if (error) throw error;
    return data.map((m: any) => ({
        ...m,
        profile: m.profile
    }));
};

export const approveMember = async (memberRecordId: string) => {
    const { error } = await supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('id', memberRecordId);
    
    if (error) {
        console.error("Supabase Error in approveMember:", error);
        throw error;
    }
};

export const rejectMember = async (memberRecordId: string) => {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberRecordId);
    if (error) throw error;
};

export const kickMember = async (memberRecordId: string) => {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberRecordId);
    if (error) throw error;
};

export const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
        .from('group_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'active');
    if (error) throw error;
    return data.map((m: any) => ({
        ...m,
        profile: m.profile
    }));
};

export const fetchGroupMemberStats = async (groupId: string): Promise<GroupMemberStats[]> => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch active members
    const { data: members, error: mError } = await supabase
        .from('group_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'active');
        
    if (mError) throw mError;
    
    // 2. Fetch today's steps for these members
    const userIds = members.map((m: any) => m.user_id);
    const { data: logs, error: lError } = await supabase
        .from('daily_logs')
        .select('user_id, steps')
        .eq('date', today)
        .in('user_id', userIds);
        
    if (lError) throw lError;
    
    return members.map((m: any) => {
        const log = logs?.find(l => l.user_id === m.user_id);
        return {
            ...m,
            today_steps: log ? log.steps : 0
        };
    }).sort((a, b) => b.today_steps - a.today_steps);
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

export const fetchChallenges = async (userId?: string): Promise<Challenge[]> => {
    const { data, error } = await supabase
        .from('challenges')
        .select('*, challenge_participants(count)')
        .order('end_date', { ascending: true });

    if (error) throw error;

    let userChallengeIds: string[] = [];
    if (userId) {
        const { data: participationData } = await supabase
            .from('challenge_participants')
            .select('challenge_id')
            .eq('user_id', userId);
        userChallengeIds = participationData?.map(p => p.challenge_id) || [];
    }

    return data.map((c: any) => ({
        ...c,
        participant_count: c.challenge_participants[0]?.count || 0,
        is_joined: userChallengeIds.includes(c.id)
    }));
};

export const createCustomChallenge = async (challenge: Partial<Challenge>, creatorId: string, invitedIds: string[] = []) => {
    const { data, error } = await supabase
        .from('challenges')
        .insert([challenge])
        .select()
        .single();
    
    if (error) throw error;

    if (data) {
        await joinChallenge(data.id, creatorId);
        
        if (invitedIds.length > 0) {
            const invitations = invitedIds.map(id => ({
                challenge_id: data.id,
                user_id: id.trim()
            }));
            await supabase.from('challenge_participants').insert(invitations);
        }
    }
    
    return data;
};

export const joinChallenge = async (challengeId: string, userId: string) => {
    const { error } = await supabase
        .from('challenge_participants')
        .insert([{ challenge_id: challengeId, user_id: userId }]);
    if (error) throw error;
};

export const inviteToChallenge = async (challengeId: string, profileId: string) => {
    const { error } = await supabase
        .from('challenge_participants')
        .insert([{ challenge_id: challengeId, user_id: profileId.trim() }]);
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
    const date = new Date();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const name = `${monthName} ${date.getFullYear()} Challenge`;
    
    const { data } = await supabase.from('challenges').select('id').eq('name', name).maybeSingle();
    if (!data) {
        await supabase.from('challenges').insert([{
            name: name,
            description: `Walk 200,000 steps in ${monthName}! Chalo dikha do apna dum!`,
            type: 'monthly',
            target_steps: 200000,
            start_date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
            end_date: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
        }]);
    }
};
