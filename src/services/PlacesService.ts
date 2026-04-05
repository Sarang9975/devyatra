import { useEmergencyStore } from '../store/useEmergencyStore';
import { NativeModules, Alert, Linking } from 'react-native';

const SpeechEngine = NativeModules.EmergencySpeech;

export const searchNearbyCriticalFacilities = async (type: 'hospital' | 'emergency_shelter' | 'towing') => {
    try {
        const store = useEmergencyStore.getState();
        
        // 1. Get Current Location
        let lat = 37.78825; // Default/Simulator
        let lng = -122.4324;

        if (SpeechEngine?.getCurrentLocation) {
            const pos = await SpeechEngine.getCurrentLocation();
            if (pos?.latitude) {
                lat = pos.latitude;
                lng = pos.longitude;
            }
        }

        // 2. Build Search URL (Using Google Maps Intent for reliability)
        // This is the most reliable way to handle routing during an emergency
        const query = type === 'hospital' ? 'Emergency Room nearby' : 
                      type === 'emergency_shelter' ? 'Earthquake Shelter nearby' : 
                      'Towing Service nearby';
        
        const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z`;

        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert("Error", "Could not open map search.");
        }

    } catch (e) {
        console.error("[PlacesService] Search failed:", e);
        Alert.alert("Service Error", "Failed to identify nearby facilities.");
    }
};

export const showMedicalIDOverlay = () => {
    const store = useEmergencyStore.getState();
    const id = store.medicalId;

    if (!id) return;

    Alert.alert(
        "⚕️ EMERGENCY MEDICAL ID",
        `BLOOD TYPE: ${id.bloodType}\n\nALLERGIES: ${id.allergies}\n\nMEDICATIONS: ${id.medications}\n\nThis information is for first responders.`,
        [{ text: "CLOSE", style: "cancel" }]
    );
};
