
import React, { useState, useEffect, useRef } from 'react';
import { Park, UserProfile } from '../types';
import { fetchNearbyParks, checkInToPark } from '../services/parkService';

declare const L: any; // Leaflet global

interface ParkFinderProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
}

export const ParkFinder: React.FC<ParkFinderProps> = ({ isOpen, onClose, profile }) => {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPark, setSelectedPark] = useState<Park | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadParks();
        } else {
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (viewMode === 'map' && isOpen) {
            setTimeout(initMap, 100);
        }
    }, [viewMode, parks]);

    const loadParks = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const results = await fetchNearbyParks(pos.coords.latitude, pos.coords.longitude);
                setParks(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, () => {
            alert("Location access needed to find parks nearby.");
            setLoading(false);
        });
    };

    const initMap = () => {
        if (!mapRef.current) return;
        if (leafletMap.current) return;

        navigator.geolocation.getCurrentPosition((pos) => {
            const map = L.map(mapRef.current!, { zoomControl: false }).setView([pos.coords.latitude, pos.coords.longitude], 14);
            leafletMap.current = map;

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

            // User Location Marker
            L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
                radius: 8,
                fillColor: "#3b82f6",
                color: "#fff",
                weight: 2,
                fillOpacity: 1
            }).addTo(map).bindPopup("You are here");

            // Park Markers
            parks.forEach(park => {
                const marker = L.marker([park.coordinates.lat, park.coordinates.lng], {
                    icon: L.divIcon({
                        className: 'bg-transparent',
                        html: `<div class="w-8 h-8 bg-brand-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg"><i class="fa-solid fa-tree text-xs"></i></div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    })
                }).addTo(map);
                
                marker.on('click', () => setSelectedPark(park));
                markersRef.current.push(marker);
            });
        });
    };

    const handleCheckIn = async (park: Park) => {
        if (profile.isGuest) return alert("Sign in to check-in!");
        try {
            await checkInToPark(park.id, profile.id!);
            alert(`Great! You checked into ${park.name}. Keep walking!`);
            loadParks(); // Refresh visitor count
        } catch (e) { alert("Check-in failed."); }
    };

    const filteredParks = parks.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
            <div className="bg-dark-card w-full max-w-4xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-message-pop">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-white font-black text-xl flex items-center gap-2">
                            <i className="fa-solid fa-map-location-dot text-brand-500"></i> Park Finder
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-slate-800 rounded-full p-1 border border-slate-700 flex">
                            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-brand-600 text-white shadow' : 'text-slate-500'}`}><i className="fa-solid fa-list mr-1"></i> List</button>
                            <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-brand-600 text-white shadow' : 'text-slate-500'}`}><i className="fa-solid fa-map mr-1"></i> Map</button>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Sub Header Search */}
                <div className="p-4 bg-slate-900/30 border-b border-slate-800 flex gap-4">
                    <div className="relative flex-1">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search parks or gardens..." 
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:border-brand-500 outline-none"
                        />
                    </div>
                    <button onClick={loadParks} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-500 border border-slate-700 transition-colors">
                        <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'list' ? (
                        <div className="h-full overflow-y-auto p-5 space-y-4 no-scrollbar">
                            {loading && <div className="text-center py-20 text-slate-500 font-bold animate-pulse"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Finding green spaces...</div>}
                            {!loading && filteredParks.length === 0 && <div className="text-center py-20 text-slate-600"><i className="fa-solid fa-seedling text-5xl mb-4 opacity-30"></i><p>No parks found in this area.</p></div>}
                            
                            {!loading && filteredParks.map(park => (
                                <div key={park.id} onClick={() => setSelectedPark(park)} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden flex flex-col sm:flex-row group hover:bg-slate-800/60 transition-all cursor-pointer">
                                    <div className="w-full sm:w-48 h-32 shrink-0 bg-slate-900 relative">
                                        {park.photo_url ? <img src={park.photo_url} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><i className="fa-solid fa-image text-3xl"></i></div>}
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                                            {(park.distance! / 1000).toFixed(1)} km
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-white font-black text-lg leading-tight truncate mr-2">{park.name}</h3>
                                                <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                                                    <i className="fa-solid fa-star text-xs"></i> {park.rating_avg.toFixed(1)}
                                                </div>
                                            </div>
                                            <p className="text-slate-500 text-xs truncate mt-1">{park.address}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex gap-1.5">
                                                {park.facilities.trail && <span title="Walking Trail" className="w-6 h-6 rounded bg-slate-900 text-brand-400 flex items-center justify-center text-[10px]"><i className="fa-solid fa-shoe-prints"></i></span>}
                                                {park.facilities.lighting && <span title="Evening Lights" className="w-6 h-6 rounded bg-slate-900 text-blue-400 flex items-center justify-center text-[10px]"><i className="fa-solid fa-lightbulb"></i></span>}
                                                {park.facilities.bench && <span title="Rest Areas" className="w-6 h-6 rounded bg-slate-900 text-orange-400 flex items-center justify-center text-[10px]"><i className="fa-solid fa-couch"></i></span>}
                                            </div>
                                            {park.visitor_count! > 0 && (
                                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-full animate-pulse">
                                                    {park.visitor_count} walking now
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div ref={mapRef} className="h-full w-full z-0" />
                    )}
                </div>

                {/* Park Details Overlay/Modal */}
                {selectedPark && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-end justify-center sm:items-center p-4" onClick={() => setSelectedPark(null)}>
                        <div className="bg-dark-card w-full max-w-lg rounded-3xl overflow-hidden border border-slate-700 shadow-2xl animate-message-pop" onClick={e => e.stopPropagation()}>
                            <div className="h-48 w-full relative bg-slate-900">
                                <img src={selectedPark.photo_url || 'https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&w=1000'} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-card to-transparent"></div>
                                <button onClick={() => setSelectedPark(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            <div className="p-6">
                                <h3 className="text-white font-black text-2xl mb-1">{selectedPark.name}</h3>
                                <p className="text-slate-400 text-sm mb-6"><i className="fa-solid fa-location-dot mr-1 text-brand-500"></i> {selectedPark.address}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 text-center">
                                        <div className="text-2xl font-black text-white">{selectedPark.rating_avg} <i className="fa-solid fa-star text-yellow-500 text-sm"></i></div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Community Rating</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 text-center">
                                        <div className="text-2xl font-black text-brand-400">{(selectedPark.distance! / 1000).toFixed(1)}</div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">KM from you</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Available Amenities</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedPark.facilities).map(([key, enabled]) => enabled && (
                                            <span key={key} className="bg-slate-800 text-slate-300 text-[10px] px-3 py-1.5 rounded-full border border-slate-700 font-bold uppercase">
                                                {key === 'washroom' && <i className="fa-solid fa-restroom mr-1.5"></i>}
                                                {key === 'trail' && <i className="fa-solid fa-route mr-1.5"></i>}
                                                {key === 'water' && <i className="fa-solid fa-faucet-drip mr-1.5"></i>}
                                                {key === 'lighting' && <i className="fa-solid fa-lightbulb mr-1.5"></i>}
                                                {key === 'bench' && <i className="fa-solid fa-couch mr-1.5"></i>}
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-4">
                                    <button 
                                        onClick={() => handleCheckIn(selectedPark)}
                                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
                                    >
                                        I'm here! Check-in
                                    </button>
                                    <button 
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPark.coordinates.lat},${selectedPark.coordinates.lng}`, '_blank')}
                                        className="w-16 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 flex items-center justify-center transition-colors"
                                    >
                                        <i className="fa-solid fa-diamond-turn-right text-xl"></i>
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
