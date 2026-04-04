import { NativeModules, DeviceEventEmitter } from 'react-native';
import Tts from 'react-native-tts';
import { analyzeVoiceCommand, VoiceAction } from './GeminiAI';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { triggerEscalation } from './Escalation';
import { Linking } from 'react-native';

// Our custom native module — works with React Native New Architecture (Fabric/Bridgeless)
const SpeechEngine = NativeModules.EmergencySpeech;

class VoiceAssistantService {
    private isListening = false;
    private isSpeaking = false;
    private silenceTimeout: any = null;
    private speechResultsSubscription: any = null;
    private speechErrorSubscription: any = null;

    constructor() {
        // Subscribe to custom native events
        this.speechResultsSubscription = DeviceEventEmitter.addListener(
            'EmergencySpeechResults',
            this.onSpeechResults.bind(this)
        );
        this.speechErrorSubscription = DeviceEventEmitter.addListener(
            'EmergencySpeechError',
            this.onSpeechError.bind(this)
        );

        Tts.addEventListener('tts-start', () => {
            this.isSpeaking = true;
            useEmergencyStore.getState().setTimerPaused(true);
        });
        Tts.addEventListener('tts-finish', () => {
            this.isSpeaking = false;
            if (!this.isListening) {
                // Wait 400ms for audio system to release speaker and switch to mic input
                // Calling SpeechRecognizer immediately after TTS causes ERROR_CLIENT (5)
                setTimeout(() => this.startListening(), 400);
            }
        });
    }

    async speakAndListen(message: string) {
        if (this.isSpeaking) return;
        console.log("[VoiceAssistant] Speaking: ", message);
        useEmergencyStore.getState().setTimerPaused(true);
        Tts.stop();
        Tts.speak(message);
    }

    private async startListening() {
        if (this.isListening) return;

        // Safety check: native module must be available
        if (!SpeechEngine || typeof SpeechEngine.startListening !== 'function') {
            console.warn("[VoiceAssistant] Custom SpeechEngine native module not found. Falling back to silence-escalation.");
            useEmergencyStore.getState().setTimerPaused(false);
            this.handleSilenceAutoEscalate();
            return;
        }

        try {
            console.log("[VoiceAssistant] Listening started...");
            this.isListening = true;
            useEmergencyStore.getState().setTimerPaused(true);
            await SpeechEngine.startListening();

            // Auto-escalate if no response in 8 seconds
            if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
            this.silenceTimeout = setTimeout(() => {
                if (this.isListening && useEmergencyStore.getState().emergencyState === 'warning') {
                    this.handleSilenceAutoEscalate();
                }
            }, 8000);
        } catch (e) {
            console.error("[VoiceAssistant] Start listening failed", e);
            this.isListening = false;
            useEmergencyStore.getState().setTimerPaused(false);
        }
    }

    private async onSpeechResults(e: any) {
        console.log("[VoiceAssistant] Speech Results: ", e.value);
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        this.isListening = false;
        SpeechEngine?.stopListening?.();

        if (e.value && e.value.length > 0) {
            const transcript = e.value[0];
            const verdict = await analyzeVoiceCommand(transcript);
            this.executeAction(verdict);
        } else {
            this.handleSilenceAutoEscalate();
        }
    }

    private onSpeechError(e: any) {
        console.error("[VoiceAssistant] Speech Error: ", e.error);
        this.isListening = false;
        if (useEmergencyStore.getState().emergencyState === 'warning') {
            this.handleSilenceAutoEscalate();
        } else {
            useEmergencyStore.getState().setTimerPaused(false);
        }
    }

    private async handleSilenceAutoEscalate() {
        this.stopAssistant();
        Tts.speak("No response detected. Automatically initiating emergency protocols now.");
        setTimeout(() => {
            triggerEscalation();
        }, 1500);
    }

    private async executeAction(verdict: VoiceAction) {
        console.log("[VoiceAssistant] Executing Gemini Action: ", verdict);

        switch (verdict.action) {
            case 'safe':
                Tts.speak("Glad you are safe. Cancelling alert.");
                useEmergencyStore.getState().resetAll();
                break;
            case 'clarify':
                Tts.speak(verdict.followUp || "Could you repeat that?");
                // tts-finish listener will automatically restart listening
                break;
            case 'call':
                const number = verdict.target || '911';
                Tts.speak(`I am initiating an emergency call to ${number}.`);
                setTimeout(() => {
                    Linking.openURL(`tel:${number}`);
                    triggerEscalation();
                }, 1500);
                break;
            case 'sms':
                Tts.speak("Sending your custom emergency message now.");
                triggerEscalation();
                break;
            case 'distress':
                Tts.speak("Emergency confirmed. Alerting help immediately.");
                triggerEscalation();
                break;
            case 'unknown':
            default:
                useEmergencyStore.getState().setTimerPaused(false);
                break;
        }
    }

    stopAssistant() {
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        try { SpeechEngine?.stopListening?.(); } catch (_) {}
        try { SpeechEngine?.destroy?.(); } catch (_) {}
        try { Tts.stop(); } catch (_) {}
        this.isListening = false;
        this.isSpeaking = false;
        useEmergencyStore.getState().setTimerPaused(false);
    }
}

export const voiceAssistant = new VoiceAssistantService();
