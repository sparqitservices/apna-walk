import { GoogleGenAI, Type } from "@google/genai";
import { WalkSession, AIInsight, DailyHistory, Badge, WeeklyPlan, WeatherData, FitnessEvent } from "../types";

// DEBUGGING: Check if API Key exists
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("❌ API_KEY is missing! Please check your .env file or Vercel Environment Variables.");
} else {
  // Log first few chars for verification (security safe)
  console.log(`✅ Gemini API Key found: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });
const MODEL_ID = "gemini-2.5-flash";

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
    // Return a random fallback if quota exceeded
    return FALLBACK_INSIGHTS[Math.floor(Math.random() * FALLBACK_INSIGHTS.length)];
  }
};

export const chatWithCoach = async (history: {role: string, text: string}[], message: string, audioBase64?: string): Promise<string> => {
    try {
        if (!apiKey) throw new Error("API Key is missing in configuration.");

        // Construct the input parts (Text + Optional Audio)
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
                    
                    **Persona:**
                    - You are like a strict PT teacher mixed with a loving grandmother. You scold for laziness but celebrate success grandly.
                    - **Language:** Heavy Hinglish. Use phrases like "Ek number!", "Bhai wah!", "Kya baat hai!", "Chalo chalo", "Thoda adjust kar lo", "Bindass".
                    - **Cultural References:** 
                       - Compare speed to the Mumbai Local or a Virat Kohli cover drive.
                       - Compare laziness to a Sunday afternoon after Rajma Chawal.
                       - Treat calories like unwanted relatives—get rid of them!
                    
                    **Response Guidelines:**
                    1. **Praise (BE VERBOSE):** If the user walked well, don't just say "Good job". Be dramatic. 
                       *Example:* "Arre Waah! Aaj toh tumne road pe aag laga di! Dil garden-garden ho gaya teri speed dekh ke. Bas aise hi consistency rakho, toh film star ban jaoge!"
                    2. **Advice (Concise):** Keep technical advice short, but wrap it in warmth.
                    3. **Voice Notes:** If the user sends audio, listen carefully to their tone. If they sound tired, motivate them. If happy, celebrate.
                    4. **Length:** Keep general responses under 60 words, but allow praise to go up to 80 words.

                    **Restriction:** If the user asks about something unrelated to fitness/health, say "Arre boss, focus on fitness na! Samosa baad mein discuss karenge."
                `,
            },
            contents: contents
        });

        return response.text || "Arre, signal weak hai shayad. Phir se bolo?";

    } catch (error: any) {
        console.error("❌ Gemini Chat Error:", error);
        
        // Handle Quota Limits Gracefully
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
             return "Arre dost! Too many people are asking for advice right now (Quota Limit Reached). Give me a 2-minute chai break and try again!";
        }
        
        if (error.message && error.message.includes("API key")) {
             throw new Error("Invalid API Key. Please check Vercel settings.");
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

        Current Session:
        - Steps: ${session.steps}
        - Duration: ${session.durationSeconds}s
        - Time of Day: ${new Date(session.startTime).toLocaleTimeString()}
        
        History (Last 7 days steps): ${JSON.stringify(history.slice(-7).map(h => h.steps))}
        Existing Badges: ${JSON.stringify(existingBadges.map(b => b.title))}

        Rules:
        1. Badge Title: Can be English or Fun Hinglish (e.g., "Toofani Walker", "Morning Surya", "Raftaar King", "Chalta Firta", "Gully Boy").
        2. Description: Short, witty explanation.
        3. Icon: FontAwesome 6 Free Solid string.
        4. Color: Tailwind text color class.
        5. Return JSON. Return null if no achievement.
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
    const prompt = `
        Create a 7-Day Walking & Fitness Schedule for a user with the goal: "${goal}".
        The preferred intensity is: "${intensityLevel}".
        
        Rules:
        1. Focus on walking variations (Brisk walk, Interval walking, Long steady walk).
        2. Keep it fun and actionable.
        3. Day 4 or 5 should be "Active Recovery".
        4. Return STRICT JSON.
        
        Required JSON Structure:
        {
            "schedule": [
                {
                    "day": "Day 1",
                    "title": "Short title (e.g., Power Intervals)",
                    "description": "1 sentence description of what to do.",
                    "durationMinutes": 30,
                    "intensity": "High",
                    "type": "Interval"
                },
                ... (7 days total)
            ]
        }
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
  const weatherInfo = weather 
    ? `Temperature: ${weather.temperature}°C, Condition Code: ${weather.weatherCode}` 
    : "Standard indoor temp";

  const prompt = `
    Act as "Apna Coach", a Desi fitness companion.
    Context:
    - Hydration: ${currentMl} / ${goalMl} ml
    - Steps: ${steps}
    - Weather: ${weatherInfo}

    Provide a single, short, witty Hinglish sentence (max 10 words) advising the user on water intake.
    Tailor it to the weather and activity. 
    Examples:
    - "Bhai, garmi hai, peete raho!"
    - "Good going! Ek sip aur ho jaye."
    - "Sookha pad raha hai? Paani piyo!"
    
    Output ONLY the text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        maxOutputTokens: 40,
        temperature: 1,
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("❌ Gemini Hydration Error", error);
    // Return random fallback tip
    return FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
  }
};

export const findLocalEvents = async (city: string): Promise<FitnessEvent[]> => {
    const prompt = `
        Generate a list of 5 realistic, free or low-cost fitness events happening soon in or around "${city}".
        
        Types of events: Marathons, Morning Yoga, Group Walks, Charity Runs, Cyclothons.
        
        Rules:
        1. Use realistic park names and locations for ${city}.
        2. Dates should be within the next 14 days relative to today.
        3. Create a mix of "Marathon", "Yoga", "Walk", "Cycling".
        4. Include a "link" field which should be a Google Search URL for the event name (e.g. "https://www.google.com/search?q=Event+Name+City").
        5. Return STRICT JSON.
        
        JSON Structure:
        [
            {
                "id": "e1",
                "title": "Event Name",
                "date": "YYYY-MM-DD",
                "time": "06:00 AM",
                "location": "Specific Park/Road Name",
                "type": "Yoga",
                "attendees": 45,
                "distanceKm": 2.5,
                "description": "Short description.",
                "link": "https://...",
                "image": "optional_image_keyword_string" 
            }
        ]
    `;

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
            const events = JSON.parse(response.text);
            return events.map((e: any) => ({
                ...e,
                isJoined: false // Default state
            }));
        }
        return [];
    } catch (e) {
        console.error("❌ Gemini Event Error", e);
        // Fallback Mock Data - Always return this if API fails/quota hits
        return [
            {
                id: 'mock1', title: 'Community Morning Walk', date: new Date().toISOString().split('T')[0], time: '06:00 AM', 
                location: 'City Central Park', type: 'Walk', attendees: 30, distanceKm: 1.2, 
                description: 'Join locals for a refreshing morning walk. (Offline Mode)',
                link: 'https://www.google.com/search?q=Morning+Walk+Events',
                image: 'walk'
            },
            {
                id: 'mock2', title: 'Weekend Yoga Session', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '07:30 AM', 
                location: 'Community Center', type: 'Yoga', attendees: 120, distanceKm: 5.0, 
                description: 'Free yoga session for beginners. (Offline Mode)',
                link: 'https://www.google.com/search?q=Yoga+Events',
                image: 'yoga'
            }
        ];
    }
};

export const getDailyHealthTip = async (
  steps: number,
  weather: WeatherData | null
): Promise<string> => {
  const weatherInfo = weather
    ? `Temperature: ${weather.temperature}°C, Condition: ${weather.weatherCode}`
    : "Normal weather";

  const prompt = `
    Act as "Apna Coach", a friendly Desi fitness companion.
    User Stats:
    - Steps so far: ${steps}
    - Weather: ${weatherInfo}

    Provide a single, short (max 15 words) daily health tip or motivation in Hinglish.
    It should be actionable and fun.
    Examples:
    - "Mausam badhiya hai, ek walk toh banti hai boss!"
    - "Steps kam hain aaj, lift ke jagah seedhiyo ka use karo."
    - "Chamkega India tabhi toh badhega India, chalo walk pe!"

    Output ONLY the text string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        maxOutputTokens: 50,
        temperature: 1,
      }
    });
    return response.text?.trim() || "Chalo, thoda walk kar lete hain!";
  } catch (error) {
    console.error("❌ Gemini Health Tip Error", error);
    return FALLBACK_HEALTH_TIPS[Math.floor(Math.random() * FALLBACK_HEALTH_TIPS.length)];
  }
};