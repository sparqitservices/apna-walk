
import { GoogleGenAI, Type } from "@google/genai";
import { WalkSession, AIInsight, DailyHistory, Badge, WeeklyPlan, WeatherData, FitnessEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = "gemini-3-flash-preview";

// --- RATE LIMITING LOGIC (Abuse Prevention) ---
const USAGE_KEY = 'apnawalk_ai_usage';
const MAX_REQUESTS_PER_HOUR = 15;

export interface UsageStatus {
    allowed: boolean;
    remaining: number;
    resetInMinutes: number;
}

const checkUsageLimit = (): UsageStatus => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const usageStr = localStorage.getItem(USAGE_KEY);
    let timestamps: number[] = usageStr ? JSON.parse(usageStr) : [];

    // Filter out timestamps older than 1 hour
    timestamps = timestamps.filter(ts => now - ts < oneHour);

    if (timestamps.length >= MAX_REQUESTS_PER_HOUR) {
        const oldest = timestamps[0];
        const resetIn = Math.ceil((oneHour - (now - oldest)) / 60000);
        return { allowed: false, remaining: 0, resetInMinutes: resetIn };
    }

    return { 
        allowed: true, 
        remaining: MAX_REQUESTS_PER_HOUR - timestamps.length, 
        resetInMinutes: 0 
    };
};

const recordUsage = () => {
    const usageStr = localStorage.getItem(USAGE_KEY);
    let timestamps: number[] = usageStr ? JSON.parse(usageStr) : [];
    timestamps.push(Date.now());
    localStorage.setItem(USAGE_KEY, JSON.stringify(timestamps));
};

// --- AI SERVICES ---

export const getUsageStatus = (): UsageStatus => checkUsageLimit();

export const generatePersonalizedNudge = async (
    type: 'SEDENTARY' | 'GOAL_50' | 'GOAL_100' | 'HYDRATION' | 'MORNING',
    context: { locality: string, steps: number, goal: number, weather?: WeatherData | null, coachVibe?: string }
): Promise<{ title: string, body: string }> => {
    if (!checkUsageLimit().allowed) return { title: "", body: "" };

    const prompt = `Act as "Apna Coach", a high-energy Desi fitness mentor. Event: ${type}. User Context: ${context.locality}, Steps: ${context.steps}, Goal: ${context.goal}. Style: Hinglish, witty. JSON: {title, body}`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, body: { type: Type.STRING } },
                    required: ["title", "body"]
                }
            }
        });
        recordUsage();
        const text = response.text || '{"title":"","body":""}';
        return JSON.parse(text);
    } catch (e) { return { title: "", body: "" }; }
};

export const getWalkingInsight = async (session: WalkSession): Promise<AIInsight> => {
  if (!checkUsageLimit().allowed) throw new Error("LIMIT_REACHED");

  const prompt = `Analyze this walk: Steps ${session.steps}, Dist ${(session.distanceMeters/1000).toFixed(2)}km. Persona: Desi Coach. Hinglish. JSON with summary, motivation, tips.`;

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
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "motivation", "tips"]
        }
      }
    });
    recordUsage();
    const text = response.text || '{"summary":"Great walk!","motivation":"Keep it up!","tips":[]}';
    return JSON.parse(text);
  } catch (error) { throw error; }
};

export const chatWithCoach = async (history: {role: string, text: string}[], message: string, audioBase64?: string): Promise<string> => {
    if (!checkUsageLimit().allowed) return "REACHED_LIMIT";

    try {
        const contents = [
            ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
            { role: "user", parts: [{ text: message }, ...(audioBase64 ? [{ inlineData: { mimeType: "audio/wav", data: audioBase64 } }] : [])] }
        ];

        const response = await ai.models.generateContent({
            model: MODEL_ID,
            config: { systemInstruction: "You are 'Apna Coach', a witty, energetic, Desi fitness companion. Strictly Hinglish." },
            contents: contents
        });
        recordUsage();
        return response.text || "Arre, signal weak hai shayad.";
    } catch (error) { return "Arre dost! Server pe bheed bahut hai."; }
};

export const generateWeeklyPlan = async (goal: string, intensityLevel: string): Promise<WeeklyPlan> => {
    if (!checkUsageLimit().allowed) throw new Error("LIMIT_REACHED");
    const prompt = `Create 7-Day Walking Schedule for: "${goal}" at "${intensityLevel}" intensity. Return STRICT JSON.`;
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
                                  intensity: { type: Type.STRING },
                                  type: { type: Type.STRING }
                              }
                          }
                      }
                   }
                }
            }
        });
        recordUsage();
        const text = response.text || '{"schedule":[]}';
        const data = JSON.parse(text);
        return { id: `plan-${Date.now()}`, goal, createdAt: new Date().toISOString(), schedule: data.schedule };
    } catch (e) { throw e; }
};

export const getHydrationTip = async (c: number, g: number, s: number, w: any): Promise<string> => {
  if (!checkUsageLimit().allowed) return "Pani piyo stamina banega!";
  const prompt = `Coach advice: Hydration ${c}/${g}ml, Steps ${s}. Hinglish, max 10 words.`;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } }
    });
    recordUsage();
    return response.text?.trim() || "Pani piyo stamina banega!";
  } catch (error) { return "Pani piyo stamina banega!"; }
};

/**
 * findLocalEvents: Fetches local fitness events using Google Search grounding.
 */
export const findLocalEvents = async (location: string): Promise<{ events: FitnessEvent[], sources: any[] }> => {
    if (!checkUsageLimit().allowed) return { events: [], sources: [] };

    const prompt = `Find 5-10 upcoming fitness events like marathons, yoga sessions, or community walks in or near ${location}.
    Return ONLY a JSON array of objects with the following keys: 
    id (string), title (string), date (YYYY-MM-DD), time (string), location (string), 
    type (one of: 'Marathon', 'Yoga', 'Walk', 'Cycling', 'Zumba'), attendees (number), 
    distanceKm (number), description (string), link (string).`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        recordUsage();
        
        const text = response.text || "[]";
        // Extract JSON block safely
        const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : (text.startsWith('[') ? text : "[]");
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        try {
            return { events: JSON.parse(jsonStr), sources };
        } catch (e) {
            console.error("findLocalEvents JSON parse failed:", e);
            return { events: [], sources };
        }
    } catch (error) {
        console.error("findLocalEvents failed:", error);
        return { events: [], sources: [] };
    }
};
