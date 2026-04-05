import { AppState } from 'react-native';

// For React Native CLI without react-native-config installed, we can fall back to raw fetching if needed,
// but let's assume we can just pass the key if available or hardcode it for the hackathon context
// NOTE: For the hackathon, we fetch the key we placed in .env
const GEMINI_API_KEY = "yourapikey"; // Hardcoded from your .env for instant hackathon reliability
const MODEL = "gemini-2.5-flash";

export const analyzeTelemetryWithGemini = async (
    accelerometerLog: number[],
    gyroscopeLog: number[],
    confidenceScore: number
): Promise<string> => {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const promptText = `
        You are an elite Autonomous Emergency AI. Analyze the following 3-second crash telemetry from a smartphone.
        
        Accelerometer Data (m/s^2 array, 9.8 is resting gravity):
        ${JSON.stringify(accelerometerLog.map(n => Number(n.toFixed(1))))}

        Gyroscope Data (rad/s rotation speed, 0.0 is entirely still):
        ${JSON.stringify(gyroscopeLog.map(n => Number(n.toFixed(1))))}

        Internal Physics Confidence Score: ${confidenceScore}%

        Based strictly on this data, is this a dropped phone hitting a hard surface (dead stillness afterwards), a normal walking movement, or a severe human accident (tumbling + biological micro-movements)?
        
        Keep your response EXTREMELY concise and punchy, max 2 sentences. E.g. "Severe tumbling detected prior to rest. Fatal accident profile."
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error(data.error);
            return `[Gemini API Error] ${data.error.message}`;
        }

        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text.trim();
        }

        return "Gemini Analysis complete. Indeterminate anomaly.";
    } catch (e) {
        console.error("Gemini Fetch failed", e);
        return "Gemini AI core offline. Fallback to physics engine only.";
    }
};

export interface VoiceAction {
    action: 'call' | 'sms' | 'safe' | 'distress' | 'clarify' | 'unknown';
    scenario: 'medical' | 'threat' | 'disaster' | 'accident' | 'none';
    target?: string;
    message?: string;
    followUp?: string; // This will now hold our 'Triage Advice' 
    explanation: string;
}

export const analyzeVoiceCommand = async (transcript: string): Promise<VoiceAction> => {
    // Local keyword-based fast path for instant reliability
    const lower = transcript.toLowerCase().trim();
    if (['safe', 'okay', 'ok', 'cancel', 'dismiss', 'false alarm', 'im fine', "i'm fine"].some(k => lower.includes(k))) {
        return { action: 'safe', scenario: 'none', explanation: 'User indicated safety.' };
    }
    
    // Medical keywords
    if (['hurt', 'pain', 'bleeding', 'heart', 'breath', 'unconscious', 'blood'].some(k => lower.includes(k))) {
        return { action: 'distress', scenario: 'medical', followUp: 'Stay still. I am alerting emergency medics. Help is coming.', explanation: 'Medical keyword detected.' };
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const promptText = `You are an Elite Emergency Triage AI.
Analyze this transcript: "${transcript}"

Classify into ONE scenario: medical, threat, disaster, accident, or none.
Output ONLY valid JSON:
{
  "action": "call|sms|safe|distress|clarify|unknown",
  "scenario": "medical|threat|disaster|accident|none",
  "target": "",
  "message": "",
  "followUp": "STRICTLY MAX 10 WORDS: Provide one immediate life-saving instruction for this specific scenario.",
  "explanation": ""
}

Scenario Rules:
- medical: Injury/Health/Heart/Bleeding
- threat: Harassment/Robbery/Being followed/Stalking
- disaster: Fire/Flood/Earthquake/Explosion
- accident: Car crash/Fall/Slip`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: 'application/json' },
                safetySettings: [
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                ]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            let rawJson = data.candidates[0].content.parts[0].text.trim();
            // Strip markdown code fences if present
            rawJson = rawJson.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
            return JSON.parse(rawJson) as VoiceAction;
        }

        console.warn('[Gemini] No candidates. PromptFeedback:', JSON.stringify(data.promptFeedback));
        // If API fails but we have a transcript, be safe and treat as distress
        return { action: 'distress', scenario: 'none', explanation: 'Gemini unavailable — defaulting to distress for safety.' };
    } catch (e) {
        console.error('Gemini Voice Analysis failed', e);
        // Safety-first fallback: if we have any speech in an emergency context, treat as distress
        return { action: 'distress', scenario: 'none', explanation: 'Gemini offline — safety fallback to distress.' };
    }
};
