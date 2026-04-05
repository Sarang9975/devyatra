import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { searchNearbyCriticalFacilities, showMedicalIDOverlay } from '../services/PlacesService';
import { AegisTheme } from '../theme/AegisTheme';

export const ScenarioActions = ({ navigation }: any) => {
    const { 
        emergencyScenario, 
        setFakeCallActive, 
        setStealthModeActive, 
        isStealthModeActive,
    } = useEmergencyStore();

    const handleFakeCall = () => {
        setFakeCallActive(true);
        navigation.navigate('FakeCall');
    };

    const handleHospitalSearch = () => searchNearbyCriticalFacilities('hospital');
    const handleShelterSearch = () => searchNearbyCriticalFacilities('emergency_shelter');
    const handleMedicalID = () => showMedicalIDOverlay();
    const handleTowingSearch = () => searchNearbyCriticalFacilities('towing');

    const renderActions = () => {
        switch(emergencyScenario) {
            case 'medical':
                return (
                    <>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.medical }]} onPress={handleHospitalSearch}>
                            <Text style={styles.btnIcon}>🏥</Text>
                            <Text style={styles.btnText}>Find Hospital</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.primary }]} onPress={handleMedicalID}>
                            <Text style={styles.btnIcon}>🩺</Text>
                            <Text style={styles.btnText}>Medical ID</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'threat':
                return (
                    <>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.threat }]} onPress={handleFakeCall}>
                            <Text style={styles.btnIcon}>🎭</Text>
                            <Text style={styles.btnText}>Fake Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: isStealthModeActive ? AegisTheme.colors.white : AegisTheme.colors.secondary }]}
                            onPress={() => setStealthModeActive(!isStealthModeActive)}
                        >
                            <Text style={styles.btnIcon}>👣</Text>
                            <Text style={styles.btnText}>{isStealthModeActive ? "Exit Stealth" : "Stealth Mode"}</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'accident':
                return (
                    <>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.accident }]} onPress={() => Alert.alert("Roadside Support", "Ready to capture damage photos.")}>
                            <Text style={styles.btnIcon}>📸</Text>
                            <Text style={styles.btnText}>Insurance Docs</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.primary }]} onPress={handleTowingSearch}>
                            <Text style={styles.btnIcon}>🛠️</Text>
                            <Text style={styles.btnText}>Roadside Help</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'disaster':
                return (
                    <>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.disaster }]} onPress={handleShelterSearch}>
                            <Text style={styles.btnIcon}>🏕️</Text>
                            <Text style={styles.btnText}>Find Shelter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: AegisTheme.colors.hazard }]}>
                            <Text style={styles.btnIcon}>🔋</Text>
                            <Text style={styles.btnText}>Battery Saver</Text>
                        </TouchableOpacity>
                    </>
                );
            default:
                return null;
        }
    };

    if (emergencyScenario === 'none') return null;

    return (
        <View style={styles.container}>
            <View style={styles.glassHeader}>
                <Text style={styles.headerTitle}>SITUATIONAL SURVIVAL HUB</Text>
            </View>
            <View style={styles.actionRow}>
                {renderActions()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: AegisTheme.colors.glassBackground,
        padding: 16,
        ...AegisTheme.glass,
    },
    glassHeader: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: AegisTheme.colors.glassBorder,
    },
    headerTitle: {
        color: AegisTheme.colors.secondary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
    },
    btnIcon: {
        fontSize: 22,
        marginBottom: 4,
    },
    btnText: {
        color: AegisTheme.colors.white,
        fontSize: 11,
        fontWeight: 'bold',
    }
});
