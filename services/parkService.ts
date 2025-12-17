
import { supabase } from './supabaseClient';
import { Park, ParkReview } from '../types';

export const fetchNearbyParks = async (lat: number, lng: number, radius: number = 10000): Promise<Park[]> => {
    const { data, error } = await supabase.rpc('find_nearby_parks', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: radius
    });

    if (error) throw error;

    return data.map((p: any) => ({
        ...p,
        coordinates: {
            lat: p.coordinates.coordinates[1],
            lng: p.coordinates.coordinates[0]
        }
    }));
};

export const checkInToPark = async (parkId: string, userId: string) => {
    const { error } = await supabase
        .from('park_checkins')
        .insert([{ park_id: parkId, user_id: userId }]);
    if (error) throw error;
};

export const fetchParkReviews = async (parkId: string): Promise<ParkReview[]> => {
    const { data, error } = await supabase
        .from('park_reviews')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('park_id', parkId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
};

export const submitParkReview = async (parkId: string, userId: string, rating: number, text: string) => {
    const { error } = await supabase
        .from('park_reviews')
        .insert([{ park_id: parkId, user_id: userId, rating, review_text: text }]);
    if (error) throw error;
};

export const toggleFavoritePark = async (parkId: string, userId: string, isFavorite: boolean) => {
    if (isFavorite) {
        await supabase.from('favorite_parks').delete().match({ park_id: parkId, user_id: userId });
    } else {
        await supabase.from('favorite_parks').insert([{ park_id: parkId, user_id: userId }]);
    }
};

export const checkIsFavorite = async (parkId: string, userId: string): Promise<boolean> => {
    const { data } = await supabase
        .from('favorite_parks')
        .select('id')
        .match({ park_id: parkId, user_id: userId })
        .maybeSingle();
    return !!data;
};
