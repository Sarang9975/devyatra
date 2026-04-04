import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, PermissionsAndroid } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { startBackgroundMonitor, stopBackgroundMonitor } from '../services/BackgroundMonitor';
import { triggerEscalation } from '../services/Escalation';
import { analyzeTelemetryWithGemini } from '../services/GeminiAI';
import { stopSOSBeacon, startSOSBeacon } from '../services/BeaconService';

export const DashboardScreen = ({ navigation }: any) => {
    const { 
        isMonitoring, 
        isGuardianMode, 
        setGuardianMode, 
        emergencyState, 
        currentMagnitude,
        isGeminiEvaluating,
        isBeaconActive
    } = useEmergencyStore();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const stealthTapCount = useRef(0);
    const stealthTapTimer = useRef<NodeJS.Timeout | null>(null);

    // Initial permissions request
    useEffect(() => {
        const checkPerms = async () => {
            if (Platform.OS === 'android') {
                if (Platform.Version >= 33) {
                    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                }
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.SEND_SMS,
                ]);
            }
        };
        checkPerms();
    }, []);

    // Pulse animation logic
    useEffect(() => {
        if (isMonitoring) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            pulseAnim.stopAnimation();
        }
    }, [isMonitoring, pulseAnim]);

    // Emergency UI Interruption Listener
    useEffect(() => {
        if (emergencyState === 'warning') {
            navigation.navigate('CountdownAlert');
        }
    }, [emergencyState, navigation]);

    const toggleMonitoring = async () => {
        if (isMonitoring) {
            await stopBackgroundMonitor();
        } else {
            await startBackgroundMonitor();
        }
    };

    const handleStealthSOS = () => {
        stealthTapCount.current += 1;
        
        if (stealthTapTimer.current) clearTimeout(stealthTapTimer.current);
        
        // 5 taps within 2 seconds triggers stealth SOS
        if (stealthTapCount.current >= 5) {
            stealthTapCount.current = 0;
            useEmergencyStore.getState().setTriggerReason("Harassment/Threat (Stealth SOS Invoked)");
            
            // Send synthetic data to Gemini to prove pipeline 
            useEmergencyStore.getState().setLiveGeminiVerdict('Connecting to Gemini 2.5 Flash Telemetry Node...');
            analyzeTelemetryWithGemini([0,0,0], [9,9,9], 100).then(verdict => {
                 useEmergencyStore.getState().setLiveGeminiVerdict(`[Manual Trigger Audit] ${verdict}`);
            });

            triggerEscalation(); // Immediate escalation, no countdown for stealth
            navigation.navigate('CountdownAlert'); 
        }

        stealthTapTimer.current = setTimeout(() => {
            stealthTapCount.current = 0;
        }, 2000);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.stealthArea} 
                activeOpacity={1} 
                onPress={handleStealthSOS}
            >
                {/* Invisible area for stealth tapping 5 times fast */}
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>Safety Portal</Text>
                <Text style={styles.subtitle}>Autonomous Emergency Response</Text>
            </View>

            <View style={styles.statusContainer}>
                <Animated.View style={[styles.statusIndicator, { 
                    backgroundColor: isMonitoring ? '#10b981' : '#ef4444', 
                    transform: [{ scale: pulseAnim }],
                    shadowColor: isMonitoring ? '#10b981' : '#ef4444'
                }]} />
                <Text style={styles.statusText}>
                    {isMonitoring ? "System Arming Active" : "System Offline"}
                </Text>
            </View>

            <View style={styles.sensorDebugContainer}>
                <Text style={styles.sensorDebugTitle}>Live Hardware Sensor Frame</Text>
                <Text style={styles.sensorDebugValue}>
                    {isMonitoring ? currentMagnitude.toFixed(2) + ' m/s²' : 'OFFLINE'}
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity 
                    style={[styles.btn, isMonitoring ? styles.btnStop : styles.btnStart]}
                    onPress={toggleMonitoring}
                >
                    <Text style={styles.btnText}>{isMonitoring ? 'STOP MONITORING' : 'START BACKGROUND MONITORING'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btnGuardian, isGuardianMode ? styles.btnGuardianActive : null]}
                    onPress={() => setGuardianMode(!isGuardianMode)}
                >
                    <Text style={styles.btnGuardianText}>
                        GUARDIAN MODE: {isGuardianMode ? 'ON' : 'OFF'}
                    </Text>
                    <Text style={styles.guardianDesc}>
                        {isGuardianMode ? 'Highly sensitive algorithms engaged.' : 'Standard detection active.'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.btnForceTest}
                    onPress={() => {
                        useEmergencyStore.getState().setTriggerReason('Manual Developer Test Trigger');
                        
                        useEmergencyStore.getState().setLiveGeminiVerdict('Connecting to Gemini 2.5 Flash Telemetry Node...');
                        analyzeTelemetryWithGemini([9.8, 9.8], [0.1, 0.1], 50).then(verdict => {
                            useEmergencyStore.getState().setLiveGeminiVerdict(`[Test Audit] ${verdict}`);
                        });
                        
                        useEmergencyStore.getState().setEmergencyState('warning');
                    }}
                >
                    <Text style={styles.btnForceTestText}>FORCE TEST ALERT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btnForceTest, { backgroundColor: '#1e40af' }]}
                    onPress={startSOSBeacon}
                >
                    <Text style={styles.btnForceTestText}>TEST RESCUE BEACON</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.btnHistory}
                    onPress={() => navigation.navigate('IncidentHistory')}
                >
                    <Text style={styles.btnHistoryText}>VIEW INCIDENT LEDGER</Text>
                </TouchableOpacity>

                {isBeaconActive && (
                    <TouchableOpacity 
                        style={styles.btnStopBeacon}
                        onPress={stopSOSBeacon}
                    >
                        <Text style={styles.btnStopBeaconText}>📡 STOP RESCUE BEACON</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isGeminiEvaluating && (
                <View style={styles.evaluatingOverlay}>
                    <Animated.View style={[styles.evaluatingPill, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.evaluatingTitle}>✦ Gemini 2.5 Flash Node ✦</Text>
                        <Text style={styles.evaluatingText}>Analyzing physics telemetry...</Text>
                    </Animated.View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 24,
    },
    stealthArea: {
        position: 'absolute',
        top: 0,
        right: 0,
        height: 100,
        width: 100,
        zIndex: 10,
    },
    header: {
        marginTop: 60,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 40,
    },
    statusIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 16,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    statusText: {
        fontSize: 18,
        color: '#f8fafc',
        fontWeight: '600'
    },
    actions: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    btn: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    btnStart: {
        backgroundColor: '#3b82f6',
    },
    btnStop: {
        backgroundColor: '#ef4444',
    },
    btnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    btnGuardian: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
    },
    btnGuardianActive: {
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf620',
    },
    btnGuardianText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    guardianDesc: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 8,
    },
    btnForceTest: {
        marginTop: 20,
        padding: 15,
        borderRadius: 16,
        backgroundColor: '#475569',
        alignItems: 'center',
    },
    btnForceTestText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    btnHistory: {
        marginTop: 10,
        padding: 15,
        borderRadius: 16,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center',
    },
    btnHistoryText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 'bold',
    },
    btnStopBeacon: {
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#f8fafc',
        alignItems: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    btnStopBeaconText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    sensorDebugContainer: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 40,
        alignItems: 'center',
    },
    sensorDebugTitle: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 8,
    },
    sensorDebugValue: {
        color: '#f8fafc',
        fontSize: 28,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    evaluatingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    evaluatingPill: {
        backgroundColor: '#1e3a8a',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3b82f6',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    evaluatingTitle: {
        color: '#93c5fd',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    evaluatingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    }
});
