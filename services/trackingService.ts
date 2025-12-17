
import { supabase } from './supabaseClient';
import { RoutePoint, WalkSession, SavedWalk } from '../types';

export const calculateDistance = (p1: RoutePoint, p2: RoutePoint): number => {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

export const saveWalkToCloud = async (userId: string, session: WalkSession) => {
    if (!session.route || session.route.length < 2) return;

    // 1. Prepare LineString WKT format
    const pointsStr = session.route.map(p => `${p.lng} ${p.lat}`).join(', ');
    const lineStringWkt = `LINESTRING(${pointsStr})`;

    const { data: walkData, error: walkError } = await supabase
        .from('walks')
        .insert([{
            user_id: userId,
            route_name: `Walk on ${new Date(session.startTime).toLocaleDateString()}`,
            path: lineStringWkt,
            distance_meters: session.distanceMeters,
            duration_seconds: session.durationSeconds,
            start_time: new Date(session.startTime).toISOString(),
            end_time: new Date().toISOString(),
            avg_speed: session.avgSpeed || 0,
            max_speed: session.maxSpeed || 0,
            calories_burned: session.calories,
            steps_count: session.steps
        }])
        .select()
        .single();

    if (walkError) throw walkError;

    // 2. Batch insert points for granular tracking (optional optimization)
    if (walkData && session.route.length > 0) {
        const batch = session.route.map(p => ({
            walk_id: walkData.id,
            location: `POINT(${p.lng} ${p.lat})`,
            speed: p.speed || 0,
            recorded_at: new Date(p.timestamp).toISOString()
        }));
        await supabase.from('walk_points').insert(batch);
    }

    return walkData;
};

export const fetchWalkHistory = async (userId: string): Promise<SavedWalk[]> => {
    const { data, error } = await supabase
        .from('walks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const exportToGPX = (walk: SavedWalk, points: any[]) => {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ApnaWalk">
  <trk>
    <name>${walk.route_name}</name>
    <trkseg>`;

    points.forEach(p => {
        const coords = p.location.coordinates;
        gpx += `
      <trkpt lat="${coords[1]}" lon="${coords[0]}">
        <time>${p.recorded_at}</time>
        <speed>${p.speed}</speed>
      </trkpt>`;
    });

    gpx += `
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${walk.route_name.replace(/\s+/g, '_')}.gpx`;
    a.click();
};
