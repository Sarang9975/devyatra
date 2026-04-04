import Geolocation from 'react-native-geolocation-service';
import SendSMS from 'react-native-sms';
import notifee from '@notifee/react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import { startSOSBeacon } from './BeaconService';

const EMERGENCY_CONTACTS = ['+1234567890']; // In real app, load from secure storage

export const triggerEscalation = async () => {
    // 1. Move to escalated state
    useEmergencyStore.getState().setEmergencyState('escalated');

    // 2. Local high-priority persistent alert
    await notifee.displayNotification({
        title: '🚨 EMERGENCY ESCALATED 🚨',
        body: 'Alerts have been sent to your emergency contacts.',
        android: {
            channelId: 'emergency_alerts',
            color: '#FF0000',
            ongoing: true,
        },
    });

    // 3. Gather Geolocation for Intelligence Packet
    let locationPkt = 'Location Unavailable';
    
    // Quick permission check check on Android
    if (Platform.OS === 'android') {
       const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
       if (granted) {
          try {
             const position = await new Promise<Geolocation.GeoPosition>((resolve, reject) => {
                 Geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 });
             });
             const { latitude, longitude } = position.coords;
             locationPkt = `https://maps.google.com/?q=${latitude},${longitude}`;
          } catch (err) {
             console.error("Location error", err);
          }
       }
    }

    // 4. Construct Intelligence Packet
    const store = useEmergencyStore.getState();
    const packet = {
        location: locationPkt,
        timestamp: new Date().toISOString(),
        confidence: store.confidence,
        motion_state: 'stillness_detected',
        event: 'fall_or_stealth_sos',
        severity: 'critical'
    };

    const messageBody = `🚨 EMERGENCY ALERT 🚨\nPossible emergency detected.\nConfidence: ${packet.confidence}%\nTracking: ${packet.location}\nEnsure safety immediately.`;

    // 5. Send SMS
    SendSMS.send({
        body: messageBody,
        recipients: EMERGENCY_CONTACTS,
        successTypes: ['sent', 'queued'] as any,
        allowAndroidSendWithoutReadPermission: true
    }, (completed, cancelled, error) => {
        console.log('SMS Callback: completed: ' + completed + ' cancelled: ' + cancelled + 'error: ' + error);
    });

    // 6. Start Rescue Beacon (Flash + Sound + Haptic SOS)
    startSOSBeacon();

    // 7. Auto-Initiate Phone Call (No Response Case)
    // For production: this could be your main emergency contact or local police.
    const telNumber = EMERGENCY_CONTACTS[0] || '911'; 
    Linking.openURL(`tel:${telNumber}`);

    // 8. Future: Start 3-second live location ping loop to a backend
    startLiveTracking();
};

let trackingInterval: any = null;

const startLiveTracking = () => {
   if (trackingInterval) return;
   
   // Ping every 3 seconds to console or mock backend
   trackingInterval = setInterval(() => {
       Geolocation.getCurrentPosition(
           (position) => {
              console.log("[LIVE TRACKING UPDATE] ", position.coords.latitude, position.coords.longitude);
              // In production: await fetch('https://backend/update', { ... })
           },
           (error) => {
               console.log(error.code, error.message);
           },
           { enableHighAccuracy: true, timeout: 2000, maximumAge: 0 }
       );
   }, 3000);
};

export const stopLiveTracking = () => {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
};
