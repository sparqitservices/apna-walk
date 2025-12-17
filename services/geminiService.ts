
import { GoogleGenAI, Type } from "@google/genai";
import { WalkSession, AIInsight, DailyHistory, Badge, WeeklyPlan, WeatherData, FitnessEvent } from "../types";

// Always use process.env.API_KEY for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
// Upgrade to the latest recommended model
const MODEL_ID = "gemini-3-flash-preview";

// --- FALLBACK DATA FOR OFFLINE/QUOTA LIMITS ---
const FALLBACK_INSIGHTS = [
    {
        summary: "Quota hit, but you crushed it! Great consistency today.",
        motivation: "Consistency is key, aur aaj tumne kamaal kar diya!",
        tips: ["Drink more water", "Stretch your calves", "Sleep early today"]
    },
    {
        summary: "Server is busy, but your legs aren't! Good walk.",
        motivation: "Rukna mana hai! Bas chalte raho.",
        tips: ["Check your posture", "Swing your arms", "Breath deeply"]
    }
];

const FALLBACK_TIPS = [
    "Bhai, server tired hai, par tu pani pee le!",
    "Signal weak hai, motivation strong rakho!",
    "Quota khatam, par stamina nahi! Pani piyo.",
    "Technical break chal raha hai, tab tak sip lelo."
];

const FALLBACK_HEALTH_TIPS = [
    "Walk more, worry less!",
    "Sehat hi wealth hai boss.",
    "Aaj lift nahi, seedhi use karo.",
    "Thoda aur chal lo, pizza burn hoga."
];

export const getWalkingInsight = async (session: WalkSession): Promise<AIInsight> => {
  const prompt = `
    I just finished a walking session. Here are my stats:
    - Steps: ${session.steps}
    - Distance: ${(session.distanceMeters / 1000).toFixed(2)} km
    - Duration: ${Math.floor(session.durationSeconds / 60)} minutes
    - Calories: ${session.calories} kcal
    - Average Speed: ${(session.distanceMeters / session.durationSeconds * 3.6).toFixed(1)} km/h

    Act as "Apna Coach", an enthusiastic Desi fitness coach from India.
    Your tone should be:
    - Highly energetic and dramatic (use Hinglish words like "Arre waah!", "Shabaash!", "Ek number boss!", "Chha gaye guru").
    - Relatable Indian Context: Mention things like burning off yesterday's Biryani, earning a chai break, or walking faster than a Bangalore auto in traffic.
    
    Provide a JSON response with:
    1. A brief 1-sentence summary of the workout (Desi style).
    2. A short motivational quote or phrase specific to this effort (Hinglish allowed).
    3. Three very short, actionable tips for my next walk (bullet points).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            motivation: { type: Type.STRING },
            tips: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "motivation", "tips"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIInsight;
    }
    throw new Error("No data returned");
  } catch (error: any) {
    console.error("❌ Gemini Insight Error:", error);
    return FALLBACK_INSIGHTS[Math.floor(Math.random() * FALLBACK_INSIGHTS.length)];
  }
};

export const chatWithCoach = async (history: {role: string, text: string}[], message: string, audioBase64?: string): Promise<string> => {
    try {
        const userParts: any[] = [{ text: message }];
        
        if (audioBase64) {
            userParts.push({
                inlineData: {
                    mimeType: "audio/wav", 
                    data: audioBase64
                }
            });
        }

        const contents = [
            ...history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            })),
            {
                role: "user",
                parts: userParts
            }
        ];

        const response = await ai.models.generateContent({
            model: MODEL_ID,
            config: {
                systemInstruction: `
                    You are "Apna Coach", a witty, energetic, and purely Desi fitness companion from India.
                    Persona: Strictly Hinglish. Enthusiastic. Encouraging but firm.
                `,
            },
            contents: contents
        });

        return response.text || "Arre, signal weak hai shayad. Phir se bolo?";
    } catch (error: any) {
        console.error("❌ Gemini Chat Error:", error);
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
             return "Arre dost! Server pe bheed bahut hai (Quota Limit). 2 min wait karo, tab tak stretch kar lo!";
        }
        throw error;
    }
};

export const generateBadges = async (
    session: WalkSession, 
    history: DailyHistory[], 
    existingBadges: Badge[]
): Promise<Badge | null> => {
    if (session.steps < 500) return null;

    const prompt = `
        Act as a gamification engine for a walking app with a Desi/Indian twist.
        Analyze the user's latest activity and history to see if they earned a NEW, creative badge.
        Current Session: Steps ${session.steps}, Duration ${session.durationSeconds}s.
        Return JSON with awarded: boolean and badge: object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        awarded: { type: Type.BOOLEAN },
                        badge: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                icon: { type: Type.STRING },
                                color: { type: Type.STRING }
                            },
                            nullable: true
                        }
                    }
                }
            }
        });

        if (response.text) {
            const result = JSON.parse(response.text);
            if (result.awarded && result.badge) {
                return {
                    id: `ai-${Date.now()}`,
                    title: result.badge.title,
                    description: result.badge.description,
                    icon: result.badge.icon,
                    color: result.badge.color,
                    isAiGenerated: true,
                    dateEarned: new Date().toISOString()
                };
            }
        }
        return null;
    } catch (e) {
        console.error("❌ Gemini Badge Error", e);
        return null;
    }
};

export const generateWeeklyPlan = async (goal: string, intensityLevel: string): Promise<WeeklyPlan> => {
    const prompt = `Create a 7-Day Walking Schedule for goal: "${goal}" and intensity: "${intensityLevel}". Return STRICT JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                   type: Type.OBJECT,
                   properties: {
                      schedule: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  day: { type: Type.STRING },
                                  title: { type: Type.STRING },
                                  description: { type: Type.STRING },
                                  durationMinutes: { type: Type.INTEGER },
                                  intensity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                                  type: { type: Type.STRING, enum: ["Interval", "Endurance", "Recovery", "Power"] }
                              }
                          }
                      }
                   }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return {
                id: `plan-${Date.now()}`,
                goal,
                createdAt: new Date().toISOString(),
                schedule: data.schedule
            };
        }
        throw new Error("Empty plan generated");
    } catch (e) {
        console.error("❌ Gemini Plan Error", e);
        throw e;
    }
};

export const getHydrationTip = async (
  currentMl: number, 
  goalMl: number, 
  steps: number, 
  weather: WeatherData | null
): Promise<string> => {
  const prompt = `Act as "Apna Coach". Hydration: ${currentMl}/${goalMl}ml, Steps: ${steps}. Short, witty Hinglish sentence (max 10 words). Output ONLY text.`;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { maxOutputTokens: 40, temperature: 1 }
    });
    return response.text?.trim() || "";
  } catch (error) {
    return FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
  }
};

export const findLocalEvents = async (city: string): Promise<FitnessEvent[]> => {
    const prompt = `Generate 5 realistic fitness events for "${city}". Return STRICT JSON.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            date: { type: Type.STRING },
                            time: { type: Type.STRING },
                            location: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Marathon', 'Yoga', 'Walk', 'Cycling', 'Zumba'] },
                            attendees: { type: Type.INTEGER },
                            distanceKm: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                            link: { type: Type.STRING },
                            image: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        if (response.text) {
            return JSON.parse(response.text).map((e: any) => ({ ...e, isJoined: false }));
        }
        return [];
    } catch (e) {
        return [];
    }
};
