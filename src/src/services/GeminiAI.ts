import { AppState } from 'react-native';

// For React Native CLI without react-native-config installed, we can fall back to raw fetching if needed,
// but let's assume we can just pass the key if available or hardcode it for the hackathon context
// NOTE: For the hackathon, we fetch the key we placed in .env
const GEMINI_API_KEY = "AIzaSyAXOtsPjnPpa-Y4QNwUE6OVRyf1QFqz-9I"; // Hardcoded from your .env for instant hackathon reliability
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
    target?: string;
    message?: string;
    followUp?: string;
    explanation: string;
}

export const analyzeVoiceCommand = async (transcript: string): Promise<VoiceAction> => {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        
        const promptText = `
        You are the Voice Processing unit of an Autonomous Emergency System.
        Analyze this transcript from a person who may be in a critical accident: "${transcript}"

        Your goal is to decide the next action. Output ONLY a raw JSON object (no markdown) with these fields:
        {
          "action": "call" | "sms" | "safe" | "distress" | "clarify" | "unknown",
          "target": "phone number or name if mentioned for calling",
          "message": "custom SMS body if they specified what to say",
          "followUp": "Question to ask the user if clarify is needed",
          "explanation": "10-word max reason for your choice"
        }

        Rules:
        1. If they say they are safe, okay, or to stop: action="safe".
        2. If they ask to call someone or a number: action="call".
        3. If they ask to text/message someone: action="sms".
        4. If they scream, cry, or say they need help/emergency/doctor: action="distress".
        5. If the user's intent is ambiguous (e.g. they said "Call" but no name): action="clarify", followUp="Who should I call?".
        6. If the transcript is empty or just noise: action="unknown".
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const rawJson = data.candidates[0].content.parts[0].text.trim();
            return JSON.parse(rawJson) as VoiceAction;
        }

        throw new Error("No candidates from Gemini");
    } catch (e) {
        console.error("Gemini Voice Analysis failed", e);
        return { action: 'unknown', explanation: "Gemini voice core offline." };
    }
};
