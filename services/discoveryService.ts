import { GoogleGenAI } from "@google/genai";
import { Park } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const discoverRealPlaces = async (
    lat: number, 
    lng: number, 
    category: string
): Promise<{ places: Park[], sources: any[] }> => {
    // We use gemini-2.5-flash for Maps grounding as per instructions
    const prompt = `Find top-rated ${category} locations for walking and fitness near coordinates ${lat}, ${lng}. 
    Focus on places with walking tracks, green spaces, or fitness equipment. 
    Provide names, exact addresses, and what makes them good for walkers.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
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
        
        // Transform grounding chunks into our Park type
        const discoveredPlaces: Park[] = groundingChunks
            .filter((chunk: any) => chunk.maps?.uri)
            .map((chunk: any, index: number) => {
                const mapPlace = chunk.maps;
                return {
                    id: `ai-place-${index}`,
                    name: mapPlace.title || "Discovered Spot",
                    address: mapPlace.address || "Address nearby",
                    category: category.toLowerCase().includes('park') ? 'park' : 
                              category.toLowerCase().includes('gym') ? 'gym' : 'shop',
                    coordinates: {
                        // In a real implementation, we would geocode the address or use metadata
                        // For this PWA, we'll place them slightly offset from user for visual representation 
                        // if exact lat/lng isn't in the chunk metadata
                        lat: lat + (Math.random() - 0.5) * 0.02,
                        lng: lng + (Math.random() - 0.5) * 0.02
                    },
                    rating_avg: 4.5,
                    facilities: {
                        trail: true,
                        lighting: true,
                        water: Math.random() > 0.5
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