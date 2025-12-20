
import React, { useState, useEffect, useRef } from 'react';
import { Park, UserProfile } from '../types';
import { fetchNearbyParks, checkInToPark, getLocalityName } from '../services/parkService';

declare const L: any; // Leaflet global

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
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [locality, setLocality] = useState<string>('Detecting locality...');
    
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadData();
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

    useEffect(() => {
        if (viewMode === 'map' && isOpen && parks.length > 0) {
            // Short delay to ensure DOM is ready for Leaflet
            const timer = setTimeout(initMap, 200);
            return () => clearTimeout(timer);
        }
    }, [viewMode, activeCategory, parks]);

    const loadData = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                
                // Fetch locality name for context
                getLocalityName(latitude, longitude).then(setLocality);

                const results = await fetchNearbyParks(latitude, longitude);
                setParks(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, () => {
            alert("Location access needed to find spots nearby.");
            setLoading(false);
        }, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0
        });
    };

    const getMarkerIcon = (category: string) => {
        let color = 'bg-brand-500';
        let icon = 'fa-tree';
        
        if (category === 'gym') {
            color = 'bg-blue-600';
            icon = 'fa-dumbbell';
        } else if (category === 'shop') {
            color = 'bg-orange-500';
            icon = 'fa-shopping-bag';
        } else if (category === 'health') {
            color = 'bg-red-500';
            icon = 'fa-heart-pulse';
        }

        return L.divIcon({
            className: 'bg-transparent',
            html: `<div class="w-9 h-9 ${color} rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl transform hover:scale-110 transition-transform"><i class="fa-solid ${icon} text-sm"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36]
        });
    };

    const initMap = () => {
        if (!mapRef.current) return;
        cleanupMap();

        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            const map = L.map(mapRef.current!, { zoomControl: false }).setView([latitude, longitude], 15);
            leafletMap.current = map;

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(map);

            // User Location Marker
            L.divIcon({
                className: 'bg-transparent',
                html: `<div class="relative w-8 h-8"><div class="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div><div class="absolute inset-2 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            L.marker([latitude, longitude], {
                icon: L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>`,
                    iconSize: [16, 16]
                })
            }).addTo(map).bindPopup("You are here");

            // Filtered Park Markers
            const displayParks = activeCategory === 'all' 
                ? filteredParks 
                : filteredParks.filter(p => p.category === activeCategory);

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
        });
    };

    const handleCheckIn = async (park: Park) => {
        if (profile.isGuest) return alert("Sign in to check-in!");
        try {
            await checkInToPark(park.id, profile.id!);
            alert(`Shabaash! You checked into ${park.name}.`);
            loadData(); 
        } catch (e) { alert("Check-in failed."); }
    };

    const filteredParks = parks.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeList = activeCategory === 'all' 
        ? filteredParks 
        : filteredParks.filter(p => p.category === activeCategory);

    const categories: { id: CategoryFilter, label: string, icon: string }[] = [
        { id: 'all', label: 'All', icon: 'fa-layer-group' },
        { id: 'park', label: 'Parks', icon: 'fa-tree' },
        { id: 'gym', label: 'Gyms', icon: 'fa-dumbbell' },
        { id: 'shop', label: 'Shops', icon: 'fa-shopping-bag' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-5xl h-[92vh] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Header Section */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic">Discovery Hub</h2>
                            </div>
                            <p className="text-brand-400 text-[10px] font-black uppercase tracking-[4px] flex items-center gap-2">
                                <i className="fa-solid fa-location-dot"></i> {locality}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-lg">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <i className="fa-solid fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors"></i>
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by area or spot name..." 
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:border-brand-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex bg-slate-800 rounded-2xl p-1 border border-slate-700 shrink-0 shadow-inner">
                            <button onClick={() => setViewMode('list')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><i className="fa-solid fa-list-ul mr-2"></i> List</button>
                            <button onClick={() => setViewMode('map')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><i className="fa-solid fa-map-marked-alt mr-2"></i> Map</button>
                        </div>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="px-6 py-3 bg-slate-900/30 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                                activeCategory === cat.id 
                                ? 'bg-white text-slate-900 border-white shadow-xl scale-105' 
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <i className={`fa-solid ${cat.icon}`}></i>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'list' ? (
                        <div className="h-full overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 no-scrollbar">
                            {loading && (
                                <div className="col-span-full h-full flex flex-col items-center justify-center py-32">
                                    <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-2xl animate-spin mb-6 shadow-2xl"></div>
                                    <p className="font-black text-slate-500 uppercase tracking-[6px] text-xs animate-pulse">Scanning Horizon...</p>
                                </div>
                            )}
                            {!loading && activeList.length === 0 && (
                                <div className="col-span-full py-40 text-center text-slate-600">
                                    <i className="fa-solid fa-compass text-6xl mb-6 opacity-10"></i>
                                    <p className="font-black text-xl uppercase tracking-widest mb-2">No spots found</p>
                                    <p className="text-xs">Try a different category or expand your search.</p>
                                </div>
                            )}
                            
                            {!loading && activeList.map(park => (
                                <div key={park.id} onClick={() => setSelectedPark(park)} className="bg-slate-800/30 border border-slate-700/50 rounded-[2.5rem] overflow-hidden flex flex-col group hover:bg-slate-800/60 transition-all cursor-pointer hover:border-brand-500/30 shadow-lg">
                                    <div className="h-44 w-full relative bg-slate-900 overflow-hidden">
                                        <img 
                                            src={park.photo_url || `https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&q=60&w=600`} 
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-1000" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <span className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-2">
                                                <i className="fa-solid fa-location-arrow text-brand-400"></i>
                                                {(park.distance! / 1000).toFixed(1)} km
                                            </span>
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-2 ${
                                                park.category === 'gym' ? 'bg-blue-600/80' : 
                                                park.category === 'shop' ? 'bg-orange-600/80' : 
                                                'bg-brand-600/80'
                                            }`}>
                                                <i className={`fa-solid ${categories.find(c => c.id === park.category)?.icon}`}></i>
                                                {park.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-black text-xl italic tracking-tighter truncate flex-1 mr-4">{park.name}</h3>
                                            <div className="flex items-center gap-1.5 text-yellow-500 font-black text-sm bg-yellow-500/10 px-2 py-1 rounded-lg">
                                                <i className="fa-solid fa-star"></i> {park.rating_avg.toFixed(1)}
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-xs truncate mb-6 flex items-center gap-2">
                                            <i className="fa-solid fa-map-pin text-[10px]"></i> {park.address}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700"></div>
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-600"></div>
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">+{park.visitor_count}</div>
                                            </div>
                                            <div className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                                                View Details <i className="fa-solid fa-arrow-right"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative h-full w-full">
                            <div ref={mapRef} className="h-full w-full z-0" />
                            {/* Map Floating locality Tag */}
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-brand-500/50 px-8 py-3 rounded-[2rem] shadow-2xl flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white">
                                        <i className="fa-solid fa-location-crosshairs text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Locality</p>
                                        <p className="text-white font-black text-sm italic tracking-tight">{locality}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Spot Overlay */}
                {selectedPark && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end justify-center sm:items-center p-4" onClick={() => setSelectedPark(null)}>
                        <div className="bg-dark-card w-full max-w-xl rounded-[3rem] overflow-hidden border border-slate-700 shadow-2xl animate-message-pop relative" onClick={e => e.stopPropagation()}>
                            <div className="h-64 w-full relative bg-slate-900 overflow-hidden">
                                <img src={selectedPark.photo_url || 'https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&w=1000'} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent"></div>
                                <button onClick={() => setSelectedPark(null)} className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-black/40 text-white flex items-center justify-center hover:bg-brand-500 transition-all border border-white/10 backdrop-blur shadow-xl"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-white font-black text-3xl italic tracking-tighter mb-2">{selectedPark.name}</h3>
                                        <p className="text-slate-400 text-sm flex items-center gap-3"><i className="fa-solid fa-location-dot text-brand-500"></i> {selectedPark.address}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-yellow-500 drop-shadow-lg">{selectedPark.rating_avg}</div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Rating</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700 text-center flex flex-col items-center">
                                        <i className="fa-solid fa-route text-blue-500 text-xl mb-2"></i>
                                        <div className="text-lg font-black text-white">{(selectedPark.distance! / 1000).toFixed(1)}</div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">KM Away</p>
                                    </div>
                                    <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700 text-center flex flex-col items-center">
                                        <i className="fa-solid fa-user-group text-brand-400 text-xl mb-2"></i>
                                        <div className="text-lg font-black text-white">{selectedPark.visitor_count}</div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Live Now</p>
                                    </div>
                                    <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700 text-center flex flex-col items-center">
                                        <i className="fa-solid fa-shield-heart text-red-400 text-xl mb-2"></i>
                                        <div className="text-lg font-black text-white">Safe</div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verified</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[4px] ml-1">Key Facilities</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedPark.facilities).map(([key, enabled]) => enabled && (
                                            <span key={key} className="bg-slate-800 text-slate-300 text-[9px] px-4 py-2 rounded-full border border-slate-700 font-black uppercase tracking-widest flex items-center gap-2">
                                                <i className={`fa-solid ${
                                                    key === 'washroom' ? 'fa-restroom' :
                                                    key === 'trail' ? 'fa-person-walking-arrow-right' :
                                                    key === 'water' ? 'fa-faucet-drip' :
                                                    key === 'lighting' ? 'fa-lightbulb' :
                                                    key === 'bench' ? 'fa-couch' : 'fa-check'
                                                } text-brand-500`}></i>
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => handleCheckIn(selectedPark)}
                                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-brand-900/20 active:scale-95 transition-all text-sm uppercase tracking-[4px]"
                                    >
                                        Check-in
                                    </button>
                                    <button 
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPark.coordinates.lat},${selectedPark.coordinates.lng}`, '_blank')}
                                        className="w-20 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-[1.5rem] border border-slate-700 flex items-center justify-center transition-all shadow-xl active:scale-95"
                                        title="Navigate via Google Maps"
                                    >
                                        <i className="fa-solid fa-diamond-turn-right text-2xl"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
