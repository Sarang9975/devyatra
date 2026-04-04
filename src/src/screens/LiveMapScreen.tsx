import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { stopLiveTracking } from '../services/Escalation';

export const LiveMapScreen = ({ navigation }: any) => {
    const { resetAll } = useEmergencyStore();
    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });

    useEffect(() => {
        // Mocking the live map to keep UI flowing
        const watchId = Geolocation.watchPosition(
            (position) => {
                setRegion({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            },
            (error) => console.log(error),
            { enableHighAccuracy: true, distanceFilter: 10 }
        );

        return () => Geolocation.clearWatch(watchId);
    }, []);

    const handleStandDown = () => {
        stopLiveTracking();
        resetAll();
        navigation.navigate('Dashboard');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>LIVE TRACKING ACTIVE</Text>
                <Text style={styles.subText}>Contacts have been notified</Text>
            </View>

            <MapView
                style={styles.map}
                region={region}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                <Marker coordinate={region} title="My Location" pinColor="red" />
            </MapView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.standDownBtn} onPress={handleStandDown}>
                    <Text style={styles.standDownText}>STAND DOWN EMERGENCY</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
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
    map: {
        flex: 1,
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
    }
});
