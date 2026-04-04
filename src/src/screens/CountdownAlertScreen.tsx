import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { triggerEscalation } from '../services/Escalation';
import { voiceAssistant } from '../services/VoiceAssistant';

export const CountdownAlertScreen = ({ navigation }: any) => {
    const { emergencyState, setEmergencyState, confidence, resetAll, triggerReason, addIncident, liveGeminiVerdict, isTimerPaused } = useEmergencyStore();
    const [timeLeft, setTimeLeft] = useState(10);
    const [geminiStatus, setGeminiStatus] = useState<string>('Initializing Visual/Audio Stream...');

    useEffect(() => {
        // Vibrate aggressively when this screen mounts
        const pattern = [0, 500, 200, 500];
        Vibration.vibrate(pattern, true);

        // Start High-Frequency Voice Triage
        setTimeout(() => {
            voiceAssistant.speakAndListen("Emergency detected. Are you in distress? I am listening for your status.");
        }, 1000);

        return () => {
            Vibration.cancel();
            voiceAssistant.stopAssistant();
        };
    }, []);

    useEffect(() => {
        if (timeLeft <= 0 && emergencyState !== 'escalated') {
            addIncident({
                timestamp: Date.now(),
                triggerReason: triggerReason || 'Unknown',
                confidence,
                geminiVerdict: liveGeminiVerdict || 'No AI Audit generated.',
                status: 'Escalated'
            });
            triggerEscalation();
            return;
        }

        if (isTimerPaused) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft]);

    useEffect(() => {
        if (emergencyState === 'escalated') {
            navigation.navigate('LiveMap'); // move to live tracking phase
        }
    }, [emergencyState, navigation]);

    const handleSafe = () => {
        Vibration.cancel();

        addIncident({
            timestamp: Date.now(),
            triggerReason: triggerReason || 'Unknown',
            confidence,
            geminiVerdict: liveGeminiVerdict || 'No AI Audit generated.',
            status: 'Dismissed'
        });

        resetAll();
        setTimeLeft(100); // Hack to prevent race conditions triggering escalation during unmount
        
        // Return to Dashboard cleanly
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Dashboard');
        }
    };

    const handleImmediateSOS = () => {
        Vibration.cancel();
        addIncident({
            timestamp: Date.now(),
            triggerReason: triggerReason || 'Manual Stealth/Immediate SOS',
            confidence: 100,
            geminiVerdict: liveGeminiVerdict || 'No AI Audit generated.',
            status: 'Escalated'
        });
        setTimeLeft(0); // Triggers escalation immediately
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.warningText}>POSSIBLE EMERGENCY DETECTED</Text>
                <Text style={styles.confidenceText}>Confidence Score: {confidence.toFixed(1)}%</Text>
                
                {triggerReason && (
                    <Text style={styles.reasonText}>TRIGGER CONTEXT: {triggerReason}</Text>
                )}
                
                <View style={styles.circle}>
                    <Text style={styles.timeText}>{isTimerPaused ? '...' : timeLeft}</Text>
                    {isTimerPaused && <Text style={styles.listeningText}>AI LISTENING...</Text>}
                </View>

                <View style={styles.geminiContainer}>
                    <Text style={styles.geminiTitle}>✦ Live Gemini 2.5 Audit Log</Text>
                    <Text style={styles.geminiLog}>
                        {liveGeminiVerdict || 'Waiting for sensor buffer flush...'}
                    </Text>
                </View>

                <Text style={styles.descText}>
                    If you do not respond, emergency contacts will be alerted and your location will be shared.
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.safeBtn} onPress={handleSafe}>
                    <Text style={styles.safeBtnText}>I AM SAFE (DISMISS)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sosBtn} onPress={handleImmediateSOS}>
                    <Text style={styles.sosBtnText}>SEND SOS NOW</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#7f1d1d', // Deep red
        padding: 24,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningText: {
        color: '#fef2f2',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    confidenceText: {
        color: '#fca5a5',
        fontSize: 16,
        marginBottom: 16,
    },
    reasonText: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        padding: 8,
        borderRadius: 8,
    },
    circle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 8,
        borderColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    timeText: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    listeningText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#3b82f6',
        marginTop: -10,
    },
    descText: {
        color: '#fecaca',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    actions: {
        gap: 16,
        marginBottom: 40,
    },
    safeBtn: {
        backgroundColor: '#10b981',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    safeBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sosBtn: {
        backgroundColor: '#000000',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    sosBtnText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
    geminiContainer: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    geminiTitle: {
        color: '#93c5fd',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    geminiLog: {
        color: '#ffffff',
        fontSize: 14,
        fontFamily: 'monospace',
    }
});
