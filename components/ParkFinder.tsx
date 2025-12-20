import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Park, UserProfile } from '../types';
import { fetchNearbyParks, checkInToPark, getLocalityName } from '../services/parkService';
import { calculateDistance } from '../services/trackingService';

declare const L: any; 

interface ParkFinderProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
}

type CategoryFilter = 'all' | 'park' | 'gym' | 'shop' | 'health';

const MOCK_ROUTES = [
    { id: 'r1', name: 'Morning Loop', distance: '1.2km', pace: '6:30 min/km', difficulty: 'Easy', user: 'Sunil_82' },
    { id: 'r2', name: 'Power Straight', distance: '0.8km', pace: '5:10 min/km', difficulty: 'Medium', user: 'Priya_X' },
    { id: 'r3', name: 'Park Perimeter', distance: '2.5km', pace: '7:00 min/km', difficulty: 'Endurance', user: 'Coach_Afzal' }
];

export const ParkFinder: React.FC<ParkFinderProps> = ({ isOpen, onClose, profile }) => {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPark, setSelectedPark] = useState<Park | null>(null);
    const [liveNavMode, setLiveNavMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [locality, setLocality] = useState<string>('Detecting...');
    const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const navMapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const navMapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Start watching location for "Live" status
            const id = navigator.geolocation.watchPosition(
                (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(id);
        } else {
            cleanupMap();
        }
    }, [isOpen]);

    const cleanupMap = () => {
        if (leafletMap.current) {
            leafletMap.current.remove();
            leafletMap.current = null;
        }
        if (navMapInstance.current) {
            navMapInstance.current.remove();
            navMapInstance.current = null;
        }
        markersRef.current = [];
    };

    useEffect(() => {
        if (viewMode === 'map' && isOpen && parks.length > 0) {
            const timer = setTimeout(initMap, 200);
            return () => clearTimeout(timer);
        }
    }, [viewMode, activeCategory, parks]);

    useEffect(() => {
        if (liveNavMode && selectedPark) {
            const timer = setTimeout(initNavMap, 200);
            return () => clearTimeout(timer);
        }
    }, [liveNavMode, selectedPark]);

    const loadData = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                setUserCoords({ lat: latitude, lng: longitude });
                const locName = await getLocalityName(latitude, longitude);
                setLocality(locName);
                const results = await fetchNearbyParks(latitude, longitude);
                setParks(results);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }, () => {
            alert("Location access needed.");
            setLoading(false);
        }, { enableHighAccuracy: true });
    };

    const nearbyVibes = useMemo(() => {
        if (!selectedPark) return [];
        return parks
            .filter(p => p.id !== selectedPark.id)
            .map(p => ({
                ...p,
                relDist: calculateDistance(
                    { lat: selectedPark.coordinates.lat, lng: selectedPark.coordinates.lng, timestamp: 0 },
                    { lat: p.coordinates.lat, lng: p.coordinates.lng, timestamp: 0 }
                )
            }))
            .filter(p => p.relDist < 1500)
            .sort((a, b) => a.relDist - b.relDist)
            .slice(0, 5);
    }, [selectedPark, parks]);

    const initNavMap = () => {
        if (!navMapRef.current || !selectedPark || !userCoords) return;
        if (navMapInstance.current) navMapInstance.current.remove();

        const map = L.map(navMapRef.current!, { zoomControl: false });
        navMapInstance.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

        const userIcon = L.divIcon({
            className: 'bg-transparent',
            html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
            iconSize: [16, 16]
        });

        const destIcon = L.divIcon({
            className: 'bg-transparent',
            html: `<div class="w-8 h-8 bg-brand-500 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white"><i class="fa-solid fa-location-dot"></i></div>`,
            iconSize: [32, 32]
        });

        const userM = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
        const destM = L.marker([selectedPark.coordinates.lat, selectedPark.coordinates.lng], { icon: destIcon }).addTo(map);
        
        L.polyline([[userCoords.lat, userCoords.lng], [selectedPark.coordinates.lat, selectedPark.coordinates.lng]], {
            color: '#3b82f6', weight: 3, dashArray: '10, 10', opacity: 0.6
        }).addTo(map);

        const group = new L.featureGroup([userM, destM]);
        map.fitBounds(group.getBounds().pad(0.3));
    };

    const getMarkerIcon = (category: string) => {
        let color = 'bg-brand-500';
        let icon = 'fa-tree';
        if (category === 'gym') { color = 'bg-blue-600'; icon = 'fa-dumbbell'; }
        else if (category === 'shop') { color = 'bg-orange-500'; icon = 'fa-shopping-bag'; }
        else if (category === 'health') { color = 'bg-red-500'; icon = 'fa-heart-pulse'; }

        return L.divIcon({
            className: 'bg-transparent',
            html: `<div class="w-9 h-9 ${color} rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl transform hover:scale-110 transition-transform"><i class="fa-solid ${icon} text-sm"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36]
        });
    };

    const initMap = () => {
        if (!mapRef.current || !userCoords) return;
        cleanupMap();

        const map = L.map(mapRef.current!, { zoomControl: false }).setView([userCoords.lat, userCoords.lng], 15);
        leafletMap.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

        L.marker([userCoords.lat, userCoords.lng], {
            icon: L.divIcon({
                className: 'bg-transparent',
                html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
                iconSize: [20, 20]
            })
        }).addTo(map);

        const displayParks = activeCategory === 'all' ? filteredParks : filteredParks.filter(p => p.category === activeCategory);

        displayParks.forEach(park => {
            const marker = L.marker([park.coordinates.lat, park.coordinates.lng], {
                icon: getMarkerIcon(park.category)
            }).addTo(map);
            marker.on('click', () => setSelectedPark(park));
            markersRef.current.push(marker);
        });

        if (markersRef.current.length > 0) {
            const group = new L.featureGroup(markersRef.current);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    };

    const filteredParks = parks.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeList = activeCategory === 'all' ? filteredParks : filteredParks.filter(p => p.category === activeCategory);

    const categories: { id: CategoryFilter, label: string, icon: string }[] = [
        { id: 'all', label: 'All', icon: 'fa-layer-group' },
        { id: 'park', label: 'Parks', icon: 'fa-tree' },
        { id: 'gym', label: 'Gyms', icon: 'fa-dumbbell' },
        { id: 'shop', label: 'Shops', icon: 'fa-shopping-bag' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-0 sm:p-4">
            <div className="bg-[#1a2327] w-full max-w-5xl h-full sm:h-[92vh] sm:rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Header Section - Matched to Screenshot */}
                <div className="p-6 sm:p-8 border-b border-slate-800/50 bg-[#1a2327] shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tighter uppercase italic">Discovery Hub</h2>
                            </div>
                            <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[4px] flex items-center gap-2">
                                <i className="fa-solid fa-location-dot text-brand-500"></i> {locality}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <i className="fa-solid fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors"></i>
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for shops, gyms, or parks..." className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:border-brand-500 outline-none transition-all shadow-inner placeholder:text-slate-600" />
                        </div>
                        <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 shrink-0 shadow-inner">
                            <button onClick={() => setViewMode('list')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><i className="fa-solid fa-list-ul mr-2"></i> List</button>
                            <button onClick={() => setViewMode('map')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><i className="fa-solid fa-map-marked-alt mr-2"></i> Map</button>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="px-6 py-3 bg-[#1a2327] border-b border-slate-800/50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${activeCategory === cat.id ? 'bg-white text-slate-900 border-white shadow-xl' : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:border-slate-500'}`}><i className={`fa-solid ${cat.icon} text-[8px]`}></i>{cat.label}</button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative bg-[#1a2327]">
                    {viewMode === 'list' ? (
                        <div className="h-full overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 no-scrollbar pb-24">
                            {loading && <div className="col-span-full h-full flex flex-col items-center justify-center py-32"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div><p className="font-black text-slate-500 uppercase tracking-[6px] text-[10px]">Scanning Radar...</p></div>}
                            
                            {!loading && activeList.length === 0 && (
                                <div className="col-span-full py-40 text-center flex flex-col items-center opacity-30">
                                    <i className="fa-solid fa-map-location-dot text-6xl mb-6"></i>
                                    <p className="text-xl font-black uppercase tracking-[8px] text-white">No Results Found</p>
                                    <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Try adjusting filters or your search query</p>
                                </div>
                            )}

                            {!loading && activeList.map(park => (
                                <div key={park.id} onClick={() => setSelectedPark(park)} className="bg-slate-800/20 border border-slate-700/30 rounded-[2.5rem] overflow-hidden flex flex-col group hover:bg-slate-800/40 transition-all cursor-pointer hover:border-brand-500/20 shadow-lg">
                                    <div className="h-44 w-full relative bg-slate-900 overflow-hidden">
                                        <img src={park.photo_url || `https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&q=60&w=600`} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2327] via-transparent to-transparent"></div>
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-2"><i className="fa-solid fa-location-arrow text-brand-400"></i>{(park.distance! / 1000).toFixed(1)} km</span>
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-2 ${park.category === 'gym' ? 'bg-blue-600/60' : park.category === 'shop' ? 'bg-orange-600/60' : 'bg-brand-600/60'}`}>{park.category}</span>
                                        </div>
                                        {park.visitor_count && park.visitor_count > 0 && (
                                            <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                                {park.visitor_count} Live
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-black text-xl italic tracking-tighter truncate flex-1">{park.name}</h3>
                                            <div className="text-yellow-500 font-black text-xs bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20"><i className="fa-solid fa-star mr-1"></i>{park.rating_avg.toFixed(1)}</div>
                                        </div>
                                        <p className="text-slate-500 text-[10px] truncate mb-4 font-bold uppercase tracking-wider">{park.address}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                                            <div className="flex gap-2">
                                                {park.facilities?.trail && <i className="fa-solid fa-route text-slate-500 text-xs" title="Walking Trail"></i>}
                                                {park.facilities?.water && <i className="fa-solid fa-glass-water text-slate-500 text-xs" title="Water Station"></i>}
                                                {park.facilities?.lighting && <i className="fa-solid fa-lightbulb text-slate-500 text-xs" title="Well Lit"></i>}
                                            </div>
                                            <div className="text-[10px] font-black text-brand-400 uppercase tracking-[2px] flex items-center gap-2">View details <i className="fa-solid fa-arrow-right"></i></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative h-full w-full">
                            <div ref={mapRef} className="h-full w-full z-0" />
                        </div>
                    )}

                    {/* Active Locality Pill - Matched to Screenshot */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[20] pointer-events-none w-full px-6 flex justify-center">
                        <div className="bg-[#1a2327]/90 backdrop-blur-2xl border-2 border-white/10 px-8 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-message-pop">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white border border-slate-700 shadow-inner">
                                <i className="fa-solid fa-location-crosshairs text-xs"></i>
                            </div>
                            <div className="text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[4px]">Active Locality</p>
                                <p className="text-white font-black text-sm italic tracking-tight uppercase">{locality}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Detail Modal */}
                {selectedPark && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4" onClick={() => { setSelectedPark(null); setLiveNavMode(false); }}>
                        <div className="bg-[#1a2327] w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden border border-slate-700/50 shadow-2xl animate-message-pop relative flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                            
                            {/* Visual/Map Area */}
                            <div className="w-full md:w-[400px] h-64 md:h-auto relative bg-slate-900 overflow-hidden shrink-0">
                                {liveNavMode ? (
                                    <div ref={navMapRef} className="w-full h-full" />
                                ) : (
                                    <img src={selectedPark.photo_url || 'https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&w=1000'} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a2327] via-transparent to-transparent"></div>
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <span className="bg-brand-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">Verified Spot</span>
                                    {liveNavMode && <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg animate-pulse border border-white/20">Live Link</span>}
                                </div>
                                <button onClick={() => setSelectedPark(null)} className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-black/40 backdrop-blur text-white flex items-center justify-center transition-all md:hidden"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            
                            {/* Detailed Info */}
                            <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-white font-black text-3xl italic tracking-tighter mb-1 leading-none">{selectedPark.name}</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">{selectedPark.category} • {locality}</p>
                                            <div className="text-yellow-500 font-black text-xs flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 rounded-lg">
                                                <i className="fa-solid fa-star"></i> {selectedPark.rating_avg.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedPark(null); setLiveNavMode(false); }} className="hidden md:flex w-10 h-10 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white items-center justify-center transition-all border border-slate-700/50"><i className="fa-solid fa-xmark"></i></button>
                                </div>

                                {/* Amenities Grid */}
                                <div className="mb-8">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[4px] mb-4 border-b border-slate-800 pb-2">Amenities</h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {[
                                            { key: 'trail', label: 'Jog Path', icon: 'fa-route', color: 'text-brand-400' },
                                            { key: 'water', label: 'Hydration', icon: 'fa-faucet-drip', color: 'text-blue-400' },
                                            { key: 'washroom', label: 'Toilets', icon: 'fa-restroom', color: 'text-orange-400' },
                                            { key: 'lighting', label: 'Night Safe', icon: 'fa-lightbulb', color: 'text-yellow-400' }
                                        ].map(item => (
                                            <div key={item.key} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${selectedPark?.facilities?.[item.key] ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-900/30 border-transparent opacity-10'}`}>
                                                <i className={`fa-solid ${item.icon} text-lg mb-2 ${selectedPark?.facilities?.[item.key] ? item.color : 'text-slate-600'}`}></i>
                                                <span className="text-[8px] font-black text-white uppercase tracking-wider">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Nearby Vibes */}
                                {nearbyVibes.length > 0 && (
                                    <div className="mb-8">
                                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[4px] mb-4 border-b border-slate-800 pb-2">Nearby Vibes</h4>
                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                            {nearbyVibes.map(vibe => (
                                                <div key={vibe.id} onClick={() => setSelectedPark(vibe)} className="min-w-[160px] bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50 flex flex-col gap-2 hover:bg-slate-800 transition-all cursor-pointer">
                                                    <div className="flex items-center justify-between">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${vibe.category === 'gym' ? 'bg-blue-600/80' : vibe.category === 'shop' ? 'bg-orange-500/80' : 'bg-brand-600/80'}`}>
                                                            <i className={`fa-solid ${categories.find(c => c.id === vibe.category)?.icon} text-[10px]`}></i>
                                                        </div>
                                                        <span className="text-[8px] font-black text-slate-500 uppercase">{(vibe.relDist / 1000).toFixed(1)}km</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-white truncate italic tracking-tight uppercase">{vibe.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Main Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                    <button 
                                        onClick={() => setLiveNavMode(!liveNavMode)}
                                        className={`w-full font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-[4px] flex items-center justify-center gap-3 ${liveNavMode ? 'bg-blue-600 text-white' : 'bg-slate-800/50 text-blue-400 border border-blue-500/20'}`}
                                    >
                                        <i className={`fa-solid ${liveNavMode ? 'fa-eye-slash' : 'fa-location-crosshairs'}`}></i>
                                        {liveNavMode ? 'Hide Radar' : 'Live Radar'}
                                    </button>
                                    
                                    <div className="flex gap-4">
                                        <button onClick={() => checkInToPark(selectedPark!.id, profile.id!)} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-[4px]">Check-in</button>
                                        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPark!.coordinates.lat},${selectedPark!.coordinates.lng}`, '_blank')} className="w-16 bg-slate-800/50 hover:bg-slate-700 text-brand-400 rounded-3xl border border-slate-700/50 flex items-center justify-center transition-all shadow-xl active:scale-95"><i className="fa-solid fa-diamond-turn-right text-xl"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};