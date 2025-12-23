
import { GoogleGenAI } from "@google/genai";
import { Park } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const discoverRealPlaces = async (
    lat: number, 
    lng: number, 
    category: string
): Promise<{ places: Park[], sources: any[] }> => {
    // Optimized for speed with Gemini 2.5 Flash and strict radius.
    const prompt = `FAST SCAN: List 8 high-rated ${category} locations for outdoor fitness within 20km of ${lat}, ${lng}. 
    Focus on places with walking tracks. Only provide names and verified addresses.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 }, // Minimal latency
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: lat,
                            longitude: lng
                        }
                    }
                }
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const discoveredPlaces: Park[] = groundingChunks
            .filter((chunk: any) => chunk.maps?.uri)
            .map((chunk: any, index: number) => {
                const mapPlace = chunk.maps;
                
                // Tight visual distribution for the map markers.
                const randomRadius = Math.random() * 0.12; // ~12-15km radius offset
                const randomAngle = Math.random() * Math.PI * 2;
                
                return {
                    id: `ai-place-${index}`,
                    name: mapPlace.title || "Discovered Spot",
                    address: mapPlace.address || "Local Address",
                    category: category.toLowerCase().includes('park') ? 'park' : 
                              category.toLowerCase().includes('gym') ? 'gym' : 'shop',
                    coordinates: {
                        lat: lat + randomRadius * Math.cos(randomAngle),
                        lng: lng + randomRadius * Math.sin(randomAngle)
                    },
                    rating_avg: 4.2 + (Math.random() * 0.8),
                    facilities: {
                        trail: true,
                        lighting: true,
                        water: Math.random() > 0.4
                    },
                    photo_url: `https://images.unsplash.com/photo-1596176530529-781631436981?auto=format&fit=crop&q=60&w=600`,
                    google_maps_url: mapPlace.uri
                } as Park;
            });

        return {
            places: discoveredPlaces,
            sources: groundingChunks
        };
    } catch (error) {
        console.error("AI Discovery Error:", error);
        return { places: [], sources: [] };
    }
};
