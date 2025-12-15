import React, { useEffect, useRef } from 'react';
import { RoutePoint } from '../types';

// Declare Leaflet global
declare const L: any;

interface RouteMapProps {
  route: RoutePoint[];
  className?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({ route, className = "h-64 w-full" }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || route.length === 0) return;

    // Cleanup existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    // Start centered on the first point
    const startPoint = route[0];
    const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false // Keep clean UI, though attribution is recommended
    }).setView([startPoint.lat, startPoint.lng], 16);

    mapInstanceRef.current = map;

    // Dark Mode Tile Layer (CartoDB Dark Matter)
    // This provides a sleek, high-contrast dark map suitable for the app's dark theme.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Convert route to Leaflet latLng array
    const latLngs = route.map(p => [p.lat, p.lng]);

    // Draw Polyline (Brand Color - roughly Emerald-500 #10b981)
    const polyline = L.polyline(latLngs, {
      color: '#10b981',
      weight: 4,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(map);

    // Add Start Marker
    const startIcon = L.divIcon({
      className: 'bg-transparent',
      html: '<div class="w-3 h-3 bg-white rounded-full border-2 border-brand-500 shadow-[0_0_10px_#10b981]"></div>',
      iconSize: [12, 12]
    });
    L.marker(latLngs[0], { icon: startIcon }).addTo(map);

    // Add End Marker
    const endIcon = L.divIcon({
      className: 'bg-transparent',
      html: '<div class="w-4 h-4 bg-brand-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
      iconSize: [16, 16]
    });
    L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(map);

    // Fit bounds to show whole route
    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [route]);

  if (route.length === 0) {
    return (
        <div className={`bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-xs ${className}`}>
            <div className="text-center">
                <i className="fa-solid fa-satellite-dish mb-2 text-xl"></i>
                <p>No GPS Data</p>
            </div>
        </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-700 shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-300 z-[400] border border-slate-700">
        <i className="fa-solid fa-location-arrow mr-1 text-brand-500"></i> Route
      </div>
    </div>
  );
};