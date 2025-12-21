
import React, { useEffect, useRef, useState } from 'react';
import { LiveConnection } from '../types';

declare const L: any;

interface LiveBuddyMapProps {
    connections: LiveConnection[];
    userLat: number;
    userLng: number;
    onClose: () => void;
}

export const LiveBuddyMap: React.FC<LiveBuddyMapProps> = ({ connections, userLat, userLng, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersGroupRef = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, { zoomControl: false }).setView([userLat, userLng], 14);
        leafletMap.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(map);

        // User Marker
        const userIcon = L.divIcon({
            className: 'bg-transparent',
            html: `
                <div class="relative w-10 h-10 flex items-center justify-center">
                    <div class="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                    <div class="w-4 h-4 bg-white rounded-full border-2 border-brand-500 shadow-xl z-10"></div>
                </div>
            `,
            iconSize: [40, 40]
        });
        L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        updateMarkers();

        return () => {
            map.remove();
        };
    }, []);

    useEffect(() => {
        updateMarkers();
    }, [connections]);

    const updateMarkers = () => {
        if (!markersGroupRef.current) return;
        markersGroupRef.current.clearLayers();

        connections.forEach(conn => {
            const isDirect = conn.degree === 1;
            const glowColor = isDirect ? 'rgba(76, 175, 80, 0.4)' : 'rgba(59, 130, 246, 0.4)';
            const borderColor = isDirect ? '#4CAF50' : '#3B82F6';

            const icon = L.divIcon({
                className: 'bg-transparent',
                html: `
                    <div class="relative w-12 h-12 flex items-center justify-center group">
                        <div class="absolute inset-0 rounded-2xl animate-pulse" style="background: ${glowColor}"></div>
                        <div class="w-10 h-10 rounded-2xl border-2 overflow-hidden shadow-2xl z-10 bg-slate-800" style="border-color: ${borderColor}">
                            <img src="${conn.avatar_url || 'https://www.gravatar.com/avatar?d=mp'}" class="w-full h-full object-cover" />
                        </div>
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[8px] text-white font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/10 uppercase tracking-widest">
                            @${conn.username} ${!isDirect ? `via @${conn.bridge_username}` : ''}
                        </div>
                    </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });

            const marker = L.marker([conn.lat, conn.lng], { icon });
            
            marker.bindPopup(`
                <div class="p-2 text-center">
                    <p class="font-black text-xs uppercase tracking-widest text-slate-800">@${conn.username}</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase mt-1">
                        ${isDirect ? 'Direct Friend' : `Bridge: @${conn.bridge_username}`}
                    </p>
                </div>
            `);
            
            markersGroupRef.current.addLayer(marker);
        });

        if (connections.length > 0 && leafletMap.current) {
            const points = [[userLat, userLng], ...connections.map(c => [c.lat, c.lng])];
            leafletMap.current.fitBounds(points, { padding: [50, 50] });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-white text-[10px] font-black uppercase tracking-[3px]">Live Squad Radar</span>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-2xl pointer-events-auto active:scale-90 transition-all border border-slate-700">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div ref={mapRef} className="flex-1 w-full h-full" />

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Friends</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Squad-of-Squads</span>
                </div>
                <div className="text-[9px] font-black text-brand-500 uppercase tracking-widest border-l border-white/10 pl-6">
                    {connections.length} Live Peers
                </div>
            </div>
        </div>
    );
};
