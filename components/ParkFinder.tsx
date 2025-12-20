import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Park, UserProfile } from '../types';
import { getLocalityName } from '../services/parkService';
import { discoverRealPlaces } from '../services/discoveryService';

declare const L: any; 

interface ParkFinderProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
}

type CategoryFilter = 'all' | 'park' | 'gym' | 'shop' | 'health';

export const ParkFinder: React.FC<ParkFinderProps> = ({ isOpen, onClose, profile }) => {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPark, setSelectedPark] = useState<Park | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('park');
    const [locality, setLocality] = useState<string>('Detecting...');
    const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
    const [groundingSources, setGroundingSources] = useState<any[]>([]);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const listScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            detectLocation();
        } else {
            cleanupMap();
        }
    }, [isOpen]);

    const cleanupMap = () => {
        if (leafletMap.current) {
            leafletMap.current.remove();
            leafletMap.current = null;
        }
        markersRef.current = [];
    };

    const detectLocation = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserCoords({ lat: latitude, lng: longitude });
            const locName = await getLocalityName(latitude, longitude);
            setLocality(locName);
            handleAiDiscovery(latitude, longitude, activeCategory);
        }, (err) => {
            console.error("Loc access denied", err);
            setLocality("Unknown Location");
        });
    };

    const handleAiDiscovery = async (lat: number, lng: number, category: string) => {
        setLoading(true);
        const { places, sources } = await discoverRealPlaces(lat, lng, category);
        setParks(places);
        setGroundingSources(sources);
        setLoading(false);
    };

    useEffect(() => {
        if (viewMode === 'map' && isOpen && userCoords) {
            const timer = setTimeout(initMap, 250);
            return () => clearTimeout(timer);
        }
    }, [viewMode, parks, isOpen]);

    const initMap = () => {
        if (!mapRef.current || !userCoords) return;
        if (leafletMap.current) {
            leafletMap.current.remove();
        }

        // Using high-fidelity tiles that feel like Google Maps
        const map = L.map(mapRef.current!, { zoomControl: false }).setView([userCoords.lat, userCoords.lng], 14);
        leafletMap.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // User Marker (The Blue Dot)
        L.marker([userCoords.lat, userCoords.lng], {
            icon: L.divIcon({
                className: 'bg-transparent',
                html: `<div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-xl animate-pulse"></div>`,
                iconSize: [20, 20]
            })
        }).addTo(map);

        markersRef.current = [];
        parks.forEach(park => {
            const iconColor = park.category === 'park' ? 'bg-emerald-500' : park.category === 'gym' ? 'bg-blue-600' : 'bg-orange-500';
            const iconName = park.category === 'park' ? 'fa-tree' : park.category === 'gym' ? 'fa-dumbbell' : 'fa-shopping-bag';

            const marker = L.marker([park.coordinates.lat, park.coordinates.lng], {
                icon: L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="w-10 h-10 ${iconColor} rounded-2xl flex items-center justify-center text-white shadow-2xl border-2 border-white transition-transform hover:scale-125">
                            <i class="fa-solid ${iconName}"></i>
                           </div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                })
            }).addTo(map);

            marker.on('click', () => {
                setSelectedPark(park);
                setViewMode('list');
                // Optional: Scroll list to this item
            });
            markersRef.current.push(marker);
        });

        if (markersRef.current.length > 0) {
            const group = new L.featureGroup(markersRef.current);
            map.fitBounds(group.getBounds().pad(0.2));
        }

        map.whenReady(() => {
            setTimeout(() => map.invalidateSize(), 300);
        });
    };

    const categories: { id: CategoryFilter, label: string, icon: string, color: string }[] = [
        { id: 'park', label: 'Parks', icon: 'fa-tree', color: 'text-emerald-400' },
        { id: 'gym', label: 'Gyms', icon: 'fa-dumbbell', color: 'text-blue-400' },
        { id: 'shop', label: 'Organics', icon: 'fa-carrot', color: 'text-orange-400' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-0 sm:p-4">
            <div className="bg-[#0f172a] w-full max-w-6xl h-full sm:h-[94vh] sm:rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Modern Search & Filter Header */}
                <div className="p-6 border-b border-slate-800/50 bg-[#0f172a] shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 border border-brand-500/20 shadow-inner">
                                <i className="fa-solid fa-map-location-dot text-xl"></i>
                            </div>
                            <div>
                                <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic">Fitness Explorer</h2>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] flex items-center gap-2">
                                    <i className="fa-solid fa-location-arrow text-brand-500"></i> {locality}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex bg-slate-800/50 rounded-2xl p-1.5 border border-slate-700/50 w-full sm:w-auto shadow-inner">
                            {categories.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => { setActiveCategory(cat.id); userCoords && handleAiDiscovery(userCoords.lat, userCoords.lng, cat.id); }} 
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeCategory === cat.id ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <i className={`fa-solid ${cat.icon} text-[10px]`}></i> {cat.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex bg-slate-800/50 rounded-2xl p-1.5 border border-slate-700/50 shadow-inner ml-auto">
                            <button onClick={() => setViewMode('list')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><i className="fa-solid fa-list-ul mr-2"></i> List</button>
                            <button onClick={() => setViewMode('map')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><i className="fa-solid fa-map-marked-alt mr-2"></i> Map</button>
                        </div>
                    </div>
                </div>

                {/* Main Content Viewport */}
                <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
                    
                    {/* Map View - Half or Full depending on mode */}
                    <div className={`relative bg-[#0b0f19] transition-all duration-500 ${viewMode === 'map' ? 'w-full h-full' : 'hidden md:block md:w-[400px] lg:w-[500px] border-r border-slate-800'}`}>
                        {loading && (
                            <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-white font-black uppercase tracking-[5px] text-xs">AI Scanning Region...</p>
                            </div>
                        )}
                        <div ref={mapRef} className="w-full h-full" />
                        
                        {/* Grounding Attribution */}
                        <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur p-2 rounded-lg flex items-center gap-2 shadow-xl border border-slate-200">
                            <img src="https://www.gstatic.com/images/branding/product/2x/maps_64dp.png" className="w-4 h-4" />
                            <span className="text-[9px] font-bold text-slate-700 uppercase">Powered by Google Maps</span>
                        </div>
                    </div>

                    {/* List View */}
                    <div className={`flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar transition-all duration-500 ${viewMode === 'map' ? 'hidden md:flex flex-col md:w-80 md:absolute md:right-6 md:top-6 md:bottom-6 md:bg-slate-900/80 md:backdrop-blur-xl md:rounded-3xl md:z-10 md:border md:border-white/10 md:shadow-2xl' : 'w-full'}`}>
                        
                        {loading ? (
                            <div className="space-y-6 py-10">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 bg-slate-800/50 rounded-3xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : parks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <i className="fa-solid fa-cloud-sun text-7xl mb-6"></i>
                                <p className="text-xl font-black uppercase tracking-[8px] text-white">No Spots Found</p>
                                <button onClick={detectLocation} className="mt-6 text-brand-400 font-bold uppercase tracking-widest text-xs border border-brand-400/30 px-6 py-2 rounded-full hover:bg-brand-400 hover:text-white transition-all">Try Refreshing</button>
                            </div>
                        ) : (
                            parks.map(park => (
                                <div 
                                    key={park.id} 
                                    className={`bg-slate-800/20 border border-slate-700/50 rounded-[2.5rem] overflow-hidden flex flex-col group hover:bg-slate-800/40 transition-all cursor-pointer hover:border-brand-500/20 shadow-lg ${selectedPark?.id === park.id ? 'ring-2 ring-brand-500 bg-slate-800/60' : ''}`}
                                    onClick={() => setSelectedPark(park)}
                                >
                                    <div className="h-40 w-full relative bg-slate-950 overflow-hidden">
                                        <img src={park.photo_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-1.5"><i className="fa-solid fa-star text-yellow-500"></i>{park.rating_avg}</span>
                                        </div>
                                        {park.google_maps_url && (
                                            <a 
                                                href={park.google_maps_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl shadow-xl transition-all active:scale-90"
                                            >
                                                <i className="fa-solid fa-diamond-turn-right text-sm"></i>
                                            </a>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-white font-black text-xl italic tracking-tighter truncate mb-1">{park.name}</h3>
                                        <p className="text-slate-500 text-[10px] truncate mb-4 font-bold uppercase tracking-wider">{park.address}</p>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                                            <div className="flex gap-4">
                                                {park.facilities.trail && <div className="flex flex-col items-center gap-1"><i className="fa-solid fa-person-walking text-slate-500 text-sm"></i><span className="text-[7px] font-black text-slate-600 uppercase">Path</span></div>}
                                                {park.facilities.lighting && <div className="flex flex-col items-center gap-1"><i className="fa-solid fa-lightbulb text-slate-500 text-sm"></i><span className="text-[7px] font-black text-slate-600 uppercase">Lit</span></div>}
                                                {park.facilities.water && <div className="flex flex-col items-center gap-1"><i className="fa-solid fa-faucet-drip text-slate-500 text-sm"></i><span className="text-[7px] font-black text-slate-600 uppercase">Water</span></div>}
                                            </div>
                                            
                                            {park.google_maps_url && (
                                                <a 
                                                    href={park.google_maps_url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-[9px] font-black text-brand-400 uppercase tracking-[2px] flex items-center gap-1.5 hover:text-white transition-colors"
                                                >
                                                    View Source <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {/* Source compliance note */}
                        {groundingSources.length > 0 && (
                            <div className="pt-4 border-t border-slate-800">
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-2">Discovery Sources</p>
                                <div className="flex flex-wrap gap-2">
                                    {groundingSources.slice(0, 3).map((s, i) => (
                                        <a key={i} href={s.maps.uri} target="_blank" rel="noreferrer" className="text-[8px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 hover:text-white">{s.maps.title}</a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Active Locality Pill - Matched to Screenshot */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[50] pointer-events-none w-full px-6 flex justify-center">
                    <div className="bg-[#0f172a]/95 backdrop-blur-2xl border-2 border-white/5 px-8 py-3.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 animate-message-pop pointer-events-auto group hover:scale-105 transition-transform cursor-pointer" onClick={detectLocation}>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white border border-slate-700 shadow-inner group-hover:text-brand-400 transition-colors">
                            <i className="fa-solid fa-location-crosshairs text-sm"></i>
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[5px]">Active Radar</p>
                            <p className="text-white font-black text-sm italic tracking-tighter uppercase">{locality}</p>
                        </div>
                        {loading && (
                            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin ml-2"></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};