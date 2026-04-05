import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, PermissionsAndroid, ScrollView, StatusBar } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { startBackgroundMonitor, stopBackgroundMonitor } from '../services/BackgroundMonitor';
import { analyzeTelemetryWithGemini } from '../services/GeminiAI';
import { triggerEscalation } from '../services/Escalation';
import { AegisTheme } from '../theme/AegisTheme';

export const DashboardScreen = ({ navigation }: any) => {
    const { 
        isMonitoring, 
        isGuardianMode, 
        setGuardianMode, 
        emergencyState, 
        isGeminiEvaluating,
        liveGeminiVerdict
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
                const granted = await PermissionsAndroid.requestMultiple([
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
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
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

    const triggerScenario = (scenario: any, reason: string) => {
        const store = useEmergencyStore.getState();
        store.setEmergencyScenario(scenario);
        store.setTriggerReason(reason);
        store.setEmergencyState('warning');
    };

    const handleStealthSOS = () => {
        stealthTapCount.current += 1;
        if (stealthTapTimer.current) clearTimeout(stealthTapTimer.current);
        if (stealthTapCount.current >= 5) {
            stealthTapCount.current = 0;
            const store = useEmergencyStore.getState();
            store.setTriggerReason("Tactical: Stealth SOS Invoked");
            store.setLiveGeminiVerdict('Connecting to Aegis Intelligence Node...');
            triggerEscalation(); 
            navigation.navigate('CountdownAlert'); 
        }
        stealthTapTimer.current = setTimeout(() => { stealthTapCount.current = 0; }, 2000);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={AegisTheme.colors.background} />
            
            <TouchableOpacity 
                style={styles.stealthArea} 
                activeOpacity={1} 
                onPress={handleStealthSOS}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.brandTitle}>AEGIS SENTINEL</Text>
                    <Text style={styles.brandSub}>PROTECTIVE INTELLIGENCE ACTIVE</Text>
                </View>

                {/* THE PULSE CORE */}
                <View style={styles.pulseContainer}>
                    <Animated.View style={[
                        styles.pulseRing, 
                        { 
                            transform: [{ scale: pulseAnim }],
                            borderColor: isMonitoring ? AegisTheme.colors.active : AegisTheme.colors.surfaceLight,
                            shadowColor: isMonitoring ? AegisTheme.colors.active : '#000',
                        }
                    ]}>
                        <TouchableOpacity style={styles.pulseInner} onPress={toggleMonitoring}>
                            <Text style={styles.pulseIcon}>{isMonitoring ? '📡' : '🛡️'}</Text>
                            <Text style={styles.pulseText}>{isMonitoring ? 'MONITORING' : 'READY'}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.pulseStatus}>
                        {isMonitoring ? "GUARDIAN ACTIVE" : "SYSTEM STANDBY"}
                    </Text>
                </View>

                {/* MODE TILES */}
                <View style={styles.grid}>
                    <TouchableOpacity 
                        style={[styles.tile, { borderColor: AegisTheme.colors.medical }]} 
                        onPress={() => triggerScenario('medical', 'Tactical: Medical Trigger')}
                    >
                        <Text style={styles.tileEmoji}>🚑</Text>
                        <Text style={styles.tileTitle}>MEDICAL</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tile, { borderColor: AegisTheme.colors.threat }]} 
                        onPress={() => triggerScenario('threat', 'Tactical: Threat Trigger')}
                    >
                        <Text style={styles.tileEmoji}>🚨</Text>
                        <Text style={styles.tileTitle}>THREAT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tile, { borderColor: AegisTheme.colors.disaster }]} 
                        onPress={() => triggerScenario('disaster', 'Tactical: Disaster Trigger')}
                    >
                        <Text style={styles.tileEmoji}>🌪️</Text>
                        <Text style={styles.tileTitle}>DISASTER</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tile, { borderColor: AegisTheme.colors.accident }]} 
                        onPress={() => triggerScenario('accident', 'Tactical: accident Trigger')}
                    >
                        <Text style={styles.tileEmoji}>🚗</Text>
                        <Text style={styles.tileTitle}>ACCIDENT</Text>
                    </TouchableOpacity>
                </View>

                {/* TACTICAL AUDIT FEED */}
                <View style={styles.feedContainer}>
                    <Text style={styles.feedTitle}>✦ LIVE AEGIS AUDIT</Text>
                    <View style={styles.feedBox}>
                        <Text style={styles.feedText}>
                            {liveGeminiVerdict || `[SYS] Monitoring hardware sentinel...\n[SYS] No physics anomalies detected.`}
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.guardianBtn, isGuardianMode && styles.guardianBtnActive]}
                        onPress={() => setGuardianMode(!isGuardianMode)}
                    >
                        <Text style={styles.footerBtnText}>
                            {isGuardianMode ? '🛡️ GUARDIAN: ON' : '🛡️ GUARDIAN: OFF'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('IncidentHistory')}>
                        <Text style={styles.footerBtnText}>📊 SYSTEM LEDGER</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {isGeminiEvaluating && (
                <View style={styles.overlay}>
                    <Animated.View style={[styles.pill, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.pillTag}>✦ SENTINEL ANALYTICS ✦</Text>
                        <Text style={styles.pillText}>AUDITING TELEMETRY...</Text>
                    </Animated.View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AegisTheme.colors.background,
        paddingHorizontal: 24,
    },
    stealthArea: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 60,
        height: 60,
        zIndex: 100,
    },
    header: {
        marginTop: 60,
        marginBottom: 30,
        alignItems: 'center',
    },
    brandTitle: {
        color: AegisTheme.colors.white,
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 4,
    },
    brandSub: {
        color: AegisTheme.colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginTop: 4,
    },
    pulseContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    pulseRing: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AegisTheme.colors.glassBackground,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 15,
    },
    pulseInner: {
        alignItems: 'center',
    },
    pulseIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    pulseText: {
        color: AegisTheme.colors.white,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    pulseStatus: {
        color: AegisTheme.colors.secondary,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 16,
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 30,
    },
    tile: {
        width: '47%',
        aspectRatio: 1.2,
        backgroundColor: AegisTheme.colors.glassBackground,
        justifyContent: 'center',
        alignItems: 'center',
        ...AegisTheme.glass,
    },
    tileEmoji: {
        fontSize: 32,
        marginBottom: 10,
    },
    tileTitle: {
        color: AegisTheme.colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    feedContainer: {
        marginBottom: 30,
    },
    feedTitle: {
        color: AegisTheme.colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 10,
    },
    feedBox: {
        backgroundColor: '#020617',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AegisTheme.colors.surfaceLight,
    },
    feedText: {
        color: AegisTheme.colors.active,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
        lineHeight: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        gap: 12,
    },
    guardianBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: AegisTheme.colors.surface,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AegisTheme.colors.surfaceLight,
    },
    guardianBtnActive: {
        borderColor: AegisTheme.colors.primary,
        backgroundColor: '#1e3a8a30',
    },
    historyBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'transparent',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AegisTheme.colors.surfaceLight,
    },
    footerBtnText: {
        color: AegisTheme.colors.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 500,
    },
    pill: {
        backgroundColor: AegisTheme.colors.surface,
        paddingVertical: 30,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: AegisTheme.colors.primary,
        shadowColor: AegisTheme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
    },
    pillTag: {
        color: AegisTheme.colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    pillText: {
        color: AegisTheme.colors.white,
        fontSize: 20,
        fontWeight: '900',
    }
});
