
import React, { useState, useEffect } from 'react';
import { FitnessEvent } from '../types';
import { findLocalEvents } from '../services/geminiService';

interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string; // e.g. "New Delhi"
}

export const EventsModal: React.FC<EventsModalProps> = ({ isOpen, onClose, locationName }) => {
  const [events, setEvents] = useState<FitnessEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Marathon' | 'Yoga' | 'Walk'>('All');
  const [groundingSources, setGroundingSources] = useState<any[]>([]); // Added for grounding compliance

  useEffect(() => {
    if (isOpen && locationName && events.length === 0) {
        setLoading(true);
        const cityQuery = locationName.includes(',') && !locationName.includes(' ') ? 'India' : locationName;
        
        // Updated to handle the new return object containing events and grounding sources
        findLocalEvents(cityQuery)
            .then(data => {
                setEvents(data.events);
                setGroundingSources(data.sources);
            })
            .finally(() => setLoading(false));
    }
  }, [isOpen, locationName]);

  const handleShare = (e: React.MouseEvent, event: FitnessEvent) => {
      e.stopPropagation();
      const text = `Check out this event: ${event.title} at ${event.location}!`;
      const url = event.link || window.location.href;
      
      if (navigator.share) {
          navigator.share({ title: event.title, text: text, url: url })
            .catch(err => console.log('Error sharing', err));
      } else {
          // Fallback copy
          navigator.clipboard.writeText(`${text} ${url}`);
          alert("Event link copied to clipboard!");
      }
  };
  
  const handleViewDetails = (link: string) => {
      window.open(link, '_blank');
  };

  const getEventImage = (type: string, manualImage?: string) => {
      // Return high quality Unsplash placeholders based on type
      if (manualImage && manualImage.length > 10) return manualImage; // If API returns a real URL (unlikely but possible)
      
      switch(type) {
          case 'Marathon': return 'https://images.unsplash.com/photo-1552674605-46d536d2e681?auto=format&fit=crop&q=80&w=800';
          case 'Yoga': return 'https://images.unsplash.com/photo-1544367563-12123d896889?auto=format&fit=crop&q=80&w=800';
          case 'Cycling': return 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=800';
          case 'Zumba': return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800';
          default: return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800'; // Walking/Hiking
      }
  };

  const filteredEvents = filter === 'All' ? events : events.filter(e => e.type === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col items-center justify-start pt-12 pb-4 px-4 overflow-hidden">
      
      <div className="w-full max-w-lg bg-dark-card rounded-3xl h-full flex flex-col border border-slate-700 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 backdrop-blur-md z-10">
            <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                    <i className="fa-solid fa-users-line text-brand-400"></i> Local Events
                </h2>
                <p className="text-slate-400 text-xs flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-brand-500"></i>
                    Found near {locationName}
                </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-700/50 bg-slate-800/30 shrink-0">
            {['All', 'Marathon', 'Yoga', 'Walk'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                        filter === f 
                        ? 'bg-brand-500 text-white border-brand-500' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                >
                    {f}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scroll-smooth relative no-scrollbar">
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-800/50 rounded-2xl p-4 h-48 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredEvents.length > 0 ? (
                <div className="space-y-6">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="bg-dark-card rounded-2xl border border-slate-700 overflow-hidden shadow-lg group relative">
                            
                            {/* Cover Image */}
                            <div className="h-32 w-full relative overflow-hidden">
                                <img 
                                    src={getEventImage(event.type, event.image)} 
                                    alt={event.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-card to-transparent"></div>
                                
                                {/* Share Button */}
                                <button 
                                    onClick={(e) => handleShare(e, event)}
                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white hover:bg-brand-500 flex items-center justify-center transition-colors"
                                    title="Share Event"
                                >
                                    <i className="fa-solid fa-share-nodes text-xs"></i>
                                </button>

                                {/* Date Badge */}
                                <div className="absolute bottom-2 left-3 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 flex flex-col items-center leading-none">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                    <span className="text-lg font-bold text-white">{new Date(event.date).getDate()}</span>
                                </div>
                            </div>

                            <div className="p-4 pt-2">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-white font-bold text-lg leading-tight flex-1 mr-2">{event.title}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                        event.type === 'Marathon' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                                        event.type === 'Yoga' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                                        'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                    }`}>
                                        {event.type}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                    <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock text-brand-500"></i> {event.time}</span>
                                    <span className="flex items-center gap-1.5"><i className="fa-solid fa-map-pin text-brand-500"></i> {event.location}</span>
                                </div>

                                <p className="text-slate-300 text-sm mb-4 leading-relaxed line-clamp-2">
                                    {event.description}
                                </p>
                                
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center -space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                                            <div className="w-6 h-6 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                                        </div>
                                        <span className="text-xs text-slate-400">+{event.attendees} interested</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleViewDetails(event.link)}
                                        className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-5 rounded-full text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 group-hover:shadow-brand-500/20"
                                    >
                                        Register <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Source compliance note - REQUIRED for Google Search Grounding */}
                    {groundingSources.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-slate-800 pb-10">
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                <i className="fa-solid fa-magnifying-glass text-[7px]"></i> Verified Search Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {groundingSources.map((s, i) => s.web && (
                                    <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="text-[8px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 hover:text-white transition-colors">
                                        {s.web.title || 'Source'}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-solid fa-calendar-xmark text-slate-500 text-2xl"></i>
                    </div>
                    <h3 className="text-white font-bold mb-1">No Events Found</h3>
                    <p className="text-slate-400 text-sm">Looks like a quiet week in {locationName}. Try changing filters or check back later.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
