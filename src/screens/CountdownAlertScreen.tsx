import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, ScrollView, StatusBar, Animated, Platform } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { triggerEscalation } from '../services/Escalation';
import { voiceAssistant } from '../services/VoiceAssistant';
import { ScenarioActions } from '../components/ScenarioActions';
import { AegisTheme } from '../theme/AegisTheme';

export const CountdownAlertScreen = ({ navigation }: any) => {
    const { 
        emergencyState, 
        confidence, 
        resetAll, 
        triggerReason, 
        addIncident, 
        liveGeminiVerdict, 
        isTimerPaused,
        emergencyScenario,
        triageAdvice,
        isStealthModeActive
    } = useEmergencyStore();
    const [timeLeft, setTimeLeft] = useState(10);
    const pulseAnim = new Animated.Value(1);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            resetAll();
        });

        Vibration.vibrate([0, 500, 200, 500], true);
        
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
            ])
        ).start();

        setTimeout(() => {
            voiceAssistant.speakAndListen("Emergency detected. Are you in distress? I am listening for your status.");
        }, 1000);

        return () => {
            unsubscribe();
            Vibration.cancel();
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
            navigation.navigate('LiveMap');
        }
    }, [emergencyState]);

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
        setTimeLeft(100);
        navigation.navigate('Dashboard');
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
        setTimeLeft(0);
    };

    const getScenarioConfig = () => {
        switch(emergencyScenario) {
            case 'medical': return { color: AegisTheme.colors.medical, icon: '🚑', label: 'MEDICAL EMERGENCY' };
            case 'threat': return { color: AegisTheme.colors.threat, icon: '🚨', label: 'PHYSICAL THREAT' };
            case 'disaster': return { color: AegisTheme.colors.disaster, icon: '🌪️', label: 'NATURAL DISASTER' };
            case 'accident': return { color: AegisTheme.colors.accident, icon: '🚗', label: 'ROAD ACCIDENT' };
            default: return { color: AegisTheme.colors.primary, icon: '🆘', label: 'EMERGENCY DETECTED' };
        }
    };

    const config = getScenarioConfig();

    return (
        <View style={[styles.container, { backgroundColor: config.color }]}>
            <StatusBar barStyle="light-content" backgroundColor={config.color} />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.brandTag}>AEGIS SENTINEL RESPONSE</Text>
                    <Text style={styles.warningTitle}>{config.icon} {config.label}</Text>
                    <Text style={styles.confidenceTag}>AI CONFIDENCE: {confidence.toFixed(1)}%</Text>
                </View>

                {triageAdvice && (
                    <View style={styles.glassTriage}>
                        <Text style={styles.triageTag}>✦ AEGIS TRIAGE ADVICE</Text>
                        <Text style={styles.triageText}>{triageAdvice}</Text>
                    </View>
                )}

                <View style={styles.timerContainer}>
                    <Animated.View style={[styles.timerRing, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.timerText}>{isTimerPaused ? '...' : timeLeft}</Text>
                        {isTimerPaused && <Text style={styles.listeningTag}>AI LISTENING...</Text>}
                    </Animated.View>
                </View>

                <View style={styles.auditFeed}>
                    <Text style={styles.auditTag}>✦ LIVE SENTINEL AUDIT</Text>
                    <Text style={styles.auditText}>{liveGeminiVerdict || 'Analyzing sensor patterns...'}</Text>
                </View>

                <View style={styles.hubWrapper}>
                    <ScenarioActions navigation={navigation} />
                </View>

                <View style={styles.actionBlock}>
                    <TouchableOpacity style={styles.safeBtn} onPress={handleSafe}>
                        <Text style={styles.safeText}>I AM SAFE (DISMISS)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.sosBtn} onPress={handleImmediateSOS}>
                        <Text style={styles.sosText}>SEND SOS NOW</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {isStealthModeActive && (
                <View style={styles.stealthOverlay}>
                    <StatusBar hidden />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    brandTag: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    warningTitle: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: '900',
        textAlign: 'center',
    },
    confidenceTag: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 6,
    },
    glassTriage: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 24,
        marginBottom: 30,
        ...AegisTheme.glass,
        borderColor: '#f59e0b',
        borderLeftWidth: 8,
    },
    triageTag: {
        color: '#92400e',
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
    },
    triageText: {
        color: '#0f172a',
        fontSize: 20,
        fontWeight: '900',
        lineHeight: 28,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    timerRing: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 8,
        borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    timerText: {
        fontSize: 80,
        fontWeight: '900',
        color: '#ffffff',
    },
    listeningTag: {
        fontSize: 10,
        fontWeight: '900',
        color: '#ffffff',
        marginTop: -10,
        letterSpacing: 1,
    },
    auditFeed: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 30,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    auditTag: {
        color: '#93c5fd',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    auditText: {
        color: '#ffffff',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    hubWrapper: {
        marginBottom: 30,
    },
    actionBlock: {
        gap: 16,
    },
    safeBtn: {
        backgroundColor: '#10b981',
        paddingVertical: 20,
        alignItems: 'center',
        ...AegisTheme.glass,
        borderWidth: 0,
    },
    safeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    },
    sosBtn: {
        backgroundColor: '#000000',
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    sosText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: '900',
    },
    stealthOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 9999,
    },
});
