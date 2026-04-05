import { NativeModules, DeviceEventEmitter } from 'react-native';
import Tts from 'react-native-tts';
import { analyzeVoiceCommand, VoiceAction } from './GeminiAI';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { triggerEscalation, buildEscalationSummary, placeEmergencyCall } from './Escalation';
import { Linking } from 'react-native';

const SpeechEngine = NativeModules.EmergencySpeech;

class VoiceAssistantService {
    private isListening = false;
    private isSpeaking = false;
    private isShuttingDown = false;
    private silenceTimeout: any = null;
    private retryCount = 0;
    private lastSpeechTime = 0;
    private conversationTurns = 0;
    private hasEscalated = false;        // Track if we already escalated this session
    private readonly MAX_RETRIES = 3;
    private readonly SILENCE_ESCALATION_MS = 15000;

    constructor() {
        DeviceEventEmitter.addListener('EmergencySpeechResults', this.onSpeechResults.bind(this));
        DeviceEventEmitter.addListener('EmergencySpeechError', this.onSpeechError.bind(this));

        Tts.addEventListener('tts-start', () => {
            this.isSpeaking = true;
            if (!this.isShuttingDown) {
                useEmergencyStore.getState().setTimerPaused(true);
            }
        });
        Tts.addEventListener('tts-finish', () => {
            this.isSpeaking = false;
            if (this.isShuttingDown) return;
            if (!this.isListening) {
                setTimeout(() => {
                    if (!this.isShuttingDown) this.startListening();
                }, 600);
            }
        });
    }

    async speakAndListen(message: string) {
        if (this.isSpeaking) return;
        this.isShuttingDown = false;
        this.retryCount = 0;
        this.conversationTurns = 0;
        this.hasEscalated = false;
        this.lastSpeechTime = Date.now();
        console.log("[VA] Speaking: ", message);
        useEmergencyStore.getState().setTimerPaused(true);
        Tts.stop();
        Tts.speak(message);
    }

    private async startListening() {
        if (this.isListening || this.isShuttingDown) return;

        if (!SpeechEngine || typeof SpeechEngine.startListening !== 'function') {
            console.warn("[VA] SpeechEngine not available.");
            useEmergencyStore.getState().setTimerPaused(false);
            return;
        }

        try {
            console.log("[VA] Listening...");
            this.isListening = true;
            useEmergencyStore.getState().setTimerPaused(true);
            await SpeechEngine.startListening();

            if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
            this.silenceTimeout = setTimeout(() => {
                if (this.isShuttingDown) return;
                const silenceDuration = Date.now() - this.lastSpeechTime;
                if (silenceDuration >= this.SILENCE_ESCALATION_MS) {
                    this.handleSilenceAutoEscalate();
                }
            }, this.SILENCE_ESCALATION_MS);
        } catch (e) {
            console.error("[VA] Start listening failed", e);
            this.isListening = false;
            useEmergencyStore.getState().setTimerPaused(false);
        }
    }

    private async onSpeechResults(e: any) {
        if (this.isShuttingDown) return;
        console.log("[VA] Speech Results: ", e.value);
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        this.isListening = false;
        this.retryCount = 0;
        this.lastSpeechTime = Date.now();
        this.conversationTurns++;

        if (e.value && e.value.length > 0) {
            const transcript = e.value[0];
            console.log('[VA] Transcript:', transcript);
            const verdict = await analyzeVoiceCommand(transcript);
            this.executeAction(verdict);
        } else {
            Tts.speak("I could not hear you clearly. Please repeat.");
        }
    }

    private onSpeechError(e: any) {
        if (this.isShuttingDown) return;
        const errCode = e?.error ?? e;
        console.warn("[VA] Speech Error: ", errCode);
        this.isListening = false;

        const isRecoverable = errCode === 5 || errCode === 7 || errCode === 11;
        if (isRecoverable && this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            const delay = errCode === 11 ? 1000 : 600;
            console.log(`[VA] Recoverable error ${errCode}, retry ${this.retryCount}/${this.MAX_RETRIES} in ${delay}ms`);
            setTimeout(() => {
                if (!this.isShuttingDown) this.startListening();
            }, delay);
            return;
        }

        this.retryCount = 0;
        const silenceDuration = Date.now() - this.lastSpeechTime;

        if (silenceDuration < this.SILENCE_ESCALATION_MS) {
            console.log(`[VA] User spoke ${silenceDuration}ms ago — re-prompting.`);
            Tts.speak("Are you still there? Say something if you need help.");
        } else {
            // CRITICAL: If already escalated, don't restart the SOS flow.
            // Just keep the voice assistant in a monitoring loop.
            if (this.hasEscalated) {
                console.log('[VA] Already escalated — staying in monitoring loop.');
                setTimeout(() => {
                    if (!this.isShuttingDown) this.startListening();
                }, 1000);
            } else {
                this.handleSilenceAutoEscalate();
            }
        }
    }

    private async handleSilenceAutoEscalate() {
        console.log('[VA] Extended silence — auto-escalating in background.');
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        this.isListening = false;
        this.retryCount = 0;

        try { SpeechEngine?.stopListening?.(); } catch (_) {}
        try { SpeechEngine?.destroy?.(); } catch (_) {}
        try { Tts.stop(); } catch (_) {}

        // Narrate what's happening
        Tts.speak("No response detected. I am now sending emergency SOS messages and calling your contacts. Please hold on.");

        // Run escalation in background while TTS plays
        this.runEscalationInBackground();
    }

    /**
     * Runs escalation in background, then narrates the result.
     * The app stays open — conversation continues after summary.
     */
    private async runEscalationInBackground() {
        this.hasEscalated = true;
        this.isShuttingDown = false; // NO SHUTDOWN ALLOWED UNTIL 'SAFE'

        // Step 1: GPS Narration
        Tts.speak("Fetching your GPS location.");

        try {
            const report = await triggerEscalation();
            console.log('[VA] Escalation report:', report);

            // Step 2: Build SOS Summary
            const summary = buildEscalationSummary(report);
            console.log('[VA] Summary:', summary);

            // Fetch report, wait, then speak summary
            setTimeout(() => {
                Tts.speak(summary);

                // Step 3: Loop back to Monitoring
                setTimeout(() => {
                    if (!this.isShuttingDown) {
                        Tts.speak("Alerts sent. Monitoring active. Is there anything else you need?");
                        // tts-finish listener will trigger startListening()
                    }
                }, 5000);
            }, 3000);
        } catch (e) {
            console.error('[VA] Escalation failed entirely:', e);
            Tts.speak("I had trouble sending alerts, but I am still monitoring you. Please call for help manually.");
        }
    }

    private async executeAction(verdict: VoiceAction) {
        console.log("[VA] Gemini Action: ", verdict);
        const store = useEmergencyStore.getState();

        try {
            // SYNC SCENARIO TO UI
            if (verdict.scenario && verdict.scenario !== 'none') {
                store.setEmergencyScenario(verdict.scenario);
            }
            if (verdict.followUp) {
                store.setTriageAdvice(verdict.followUp);
            }

            switch (verdict.action) {
                case 'safe':
                    this.isShuttingDown = true;
                    Tts.speak("Glad you are safe. Cancelling the alert. Take care.");
                    setTimeout(() => {
                        store.resetAll();
                    }, 2500);
                    break;

                case 'clarify':
                    Tts.speak(verdict.followUp || "Could you repeat that?");
                    break;

                case 'distress':
                    if (this.hasEscalated) {
                        Tts.speak("I have already sent your emergency alerts. Help should be on the way. Is there anything else you need?");
                    } else {
                        // Context-Aware Responses
                        if (verdict.scenario === 'medical') {
                            Tts.speak("I detected a medical emergency. I am ready to alert doctors. Do you want me to send SOS now?");
                        } else if (verdict.scenario === 'threat') {
                            Tts.speak("I detected a potential threat. I am ready to alert security. Should I send SOS now?");
                        } else {
                            Tts.speak("I understand you need help. Should I call your emergency contacts, send an SOS message, or do both?");
                        }
                    }
                    break;

                case 'call':
                    const number = verdict.target || '112';
                    Tts.speak(`Understood. Dialing ${number} now.`);
                    setTimeout(async () => {
                        await placeEmergencyCall(number);
                    }, 2500);
                    break;

                case 'sms':
                    Tts.speak("Understood. I am sending SOS messages with your location now. Please hold on.");
                    this.runEscalationInBackground();
                    break;

                case 'unknown':
                default:
                    Tts.speak("I did not understand. You can say: I am safe, call someone, or help.");
                    break;
            }
        } catch (e) {
            console.error('[VA] executeAction crashed:', e);
            store.setTimerPaused(false);
        }
    }

    stopAssistant() {
        this.isShuttingDown = true;
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        try { SpeechEngine?.stopListening?.(); } catch (_) {}
        try { SpeechEngine?.destroy?.(); } catch (_) {}
        try { Tts.stop(); } catch (_) {}
        this.isListening = false;
        this.isSpeaking = false;
        this.retryCount = 0;
        useEmergencyStore.getState().setTimerPaused(false);
    }
}

export const voiceAssistant = new VoiceAssistantService();
