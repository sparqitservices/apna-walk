
import { supabase } from './supabaseClient';
import { Park, ParkReview } from '../types';

/**
 * Fetches the locality name from coordinates using OpenStreetMap Nominatim.
 */
export const getLocalityName = async (lat: number, lng: number): Promise<string> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        return data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || "Nearby Area";
    } catch (e) {
        return "Unknown Locality";
    }
};

export const fetchNearbyParks = async (lat: number, lng: number, radius: number = 10000): Promise<Park[]> => {
    // Calling our Supabase RPC for geo-spatial query
    const { data, error } = await supabase.rpc('find_nearby_parks', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: radius
    });

    if (error) throw error;

    return (data || []).map((p: any) => ({
        ...p,
        // Ensure category exists for UI filtering, defaulting to park if null
        category: p.category || 'park',
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
        .select('*, profile:profiles(username, avatar_url)')
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
