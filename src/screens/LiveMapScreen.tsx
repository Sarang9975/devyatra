import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { stopLiveTracking } from '../services/Escalation';
import { stopSOSBeacon } from '../services/BeaconService';
import { NativeModules } from 'react-native';
import { voiceAssistant } from '../services/VoiceAssistant';
import { stopBackgroundMonitor } from '../services/BackgroundMonitor';

const SpeechEngine = NativeModules.EmergencySpeech;

import { ScenarioActions } from '../components/ScenarioActions';
import { StatusBar } from 'react-native';

export const LiveMapScreen = ({ navigation }: any) => {
    const { resetAll, liveGeminiVerdict, isStealthModeActive } = useEmergencyStore();
    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });

    useEffect(() => {
        // 🔒 STRICT STOP: Reset everything if we leave this screen
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            // Kill everything immediately
            Vibration.cancel();
            stopSOSBeacon();
            voiceAssistant.stopAssistant();
            stopLiveTracking();
            resetAll();
        });

        return () => unsubscribe();
    }, [navigation, resetAll]);

    useEffect(() => {
        // Safe Native Driver Polling
        const updateCoords = async () => {
            try {
                if (SpeechEngine?.getCurrentLocation) {
                    const pos = await SpeechEngine.getCurrentLocation();
                    if (pos?.latitude) {
                        setRegion({
                            latitude: pos.latitude,
                            longitude: pos.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                    }
                }
            } catch (e) {
                console.warn('[LiveMap] GPS Update failed:', e);
            }
        };

        const interval = setInterval(updateCoords, 4000);
        updateCoords();
        
        return () => {
            clearInterval(interval);
            // We only stop the assistant if we are actually leaving the emergency
            // This is handled in handleStandDown
        };
    }, []);

    const handleStandDown = () => {
        Alert.alert(
            "Stand Down",
            "This will end all tracking and alerts. Confirm you are safe?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "YES, I AM SAFE", 
                    onPress: async () => {
                        Vibration.cancel();
                        stopSOSBeacon(); // Kill the SOS loop (vibrations + sounds)
                        await stopBackgroundMonitor(); // Disarm sensor triggers
                        
                        stopLiveTracking();
                        voiceAssistant.stopAssistant();
                        
                        resetAll();
                        navigation.navigate('Dashboard');
                    }
                }
            ]
        );
    };

    const [mapError, setMapError] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>LIVE TRACKING ACTIVE</Text>
                <Text style={styles.subText}>Contacts have been notified</Text>
            </View>

            <View style={styles.mapContainer}>
                {mapError ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>🗺️ Map Initialization Failed</Text>
                        <Text style={styles.errorSubText}>Verify Google Maps API Key in Manifest</Text>
                    </View>
                ) : (
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        region={region}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                    >
                        <Marker coordinate={region} title="My Location" pinColor="red" />
                    </MapView>
                )}

                {/* Gemini AI Floating Transcript */}
                <View style={styles.geminiOverlay}>
                    <Text style={styles.geminiTitle}>✦ LIVE AI AUDIT</Text>
                    <Text style={styles.geminiText}>
                        {liveGeminiVerdict || 'AI is monitoring for further distress...'}
                    </Text>
                </View>

                {/* Scenario Action Hub */}
                <View style={styles.actionHubContainer}>
                    <ScenarioActions navigation={navigation} />
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.standDownBtn} onPress={handleStandDown}>
                    <Text style={styles.standDownText}>STAND DOWN EMERGENCY</Text>
                </TouchableOpacity>
            </View>

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
        backgroundColor: '#000000',
    },
    actionHubContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    stealthOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 9999,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    headerText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    subText: {
        color: '#fecaca',
        marginTop: 4,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    geminiOverlay: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
        maxHeight: 120,
    },
    geminiTitle: {
        color: '#93c5fd',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    geminiText: {
        color: '#ffffff',
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        padding: 24,
        backgroundColor: '#1e293b',
    },
    standDownBtn: {
        backgroundColor: '#3b82f6',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    standDownText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: 40,
    },
    errorText: {
        color: '#f8fafc',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    errorSubText: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
    }
});
