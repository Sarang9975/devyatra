import notifee from '@notifee/react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import { startSOSBeacon } from './BeaconService';

const SpeechEngine = NativeModules.EmergencySpeech;

const PRIMARY = '+919175030524';
const SECONDARY = '+917387130524';
const EMERGENCY_CONTACTS = [PRIMARY, SECONDARY];

// ISOLATION FLAG: Set to false for production/real-world testing.
const DEBUG_SKIP_NATIVE = false;

export interface EscalationReport {
    smsSent: boolean;
    smsContacts: string[];
    callPlaced: boolean;
    callNumber: string;
    locationShared: boolean;
    beaconStarted: boolean;
    notificationSent: boolean;
    locationUrl: string;
}

export const triggerEscalation = async (): Promise<EscalationReport> => {
    console.log('[Escalation] --- Starting Escalation ---');
    
    const report: EscalationReport = {
        smsSent: false,
        smsContacts: [],
        callPlaced: false,
        callNumber: PRIMARY,
        locationShared: false,
        beaconStarted: false,
        notificationSent: false,
        locationUrl: '',
    };

    // 1. Update state
    console.log('[Escalation] 1. Setting state to escalated');
    useEmergencyStore.getState().setEmergencyState('escalated');

    if (DEBUG_SKIP_NATIVE) {
        console.log('[Escalation] DEBUG_SKIP_NATIVE is TRUE. Skipping all native calls.');
        return report;
    }

    // 2. Notification (TEMPORARILY DISABLED FOR STABILITY TEST)
    console.log('[Escalation] 2. Skipping Notifee (Stability Check)...');
    /*
    try {
        const channelId = await notifee.createChannel({
            id: 'emergency_alerts',
            name: 'Emergency Alerts',
            importance: 4, // Importance.HIGH
        });
        
        await notifee.displayNotification({
            title: '🚨 EMERGENCY ESCALATED 🚨',
            body: 'SOS messages sent. GPS tracking active.',
            android: {
                channelId,
                color: '#FF0000',
                smallIcon: 'ic_launcher',
            },
        });
        report.notificationSent = true;
        console.log('[Escalation] ✅ Notification engine response received');
    } catch (e: any) { 
        console.warn('[Escalation] ⚠️ Notification failed (but continuing SOS):', e?.message || e);
    }
    */

    // 3. Location (Native Fail-safe Driver)
    console.log('[Escalation] 3. Fetching location via Native Driver...');
    let locationPkt = 'Location Unavailable';
    
    try {
        if (SpeechEngine?.getCurrentLocation) {
            const position = await SpeechEngine.getCurrentLocation();
            if (position?.latitude && position?.longitude) {
                locationPkt = `https://maps.google.com/?q=${position.latitude},${position.longitude}`;
                report.locationShared = true;
                report.locationUrl = locationPkt;
                console.log('[Escalation] ✅ Native GPS success:', locationPkt);
            }
        } else {
            console.warn('[Escalation] ⚠️ Native GPS driver missing');
        }
    } catch (e: any) { 
        console.warn('[Escalation] ⚠️ GPS hardware failure (continuing SOS):', e?.message || e);
    }

    // 4. Build SOS message
    const store = useEmergencyStore.getState();
    const scenarioLabel = store.emergencyScenario !== 'none' 
        ? `MODE: ${store.emergencyScenario.toUpperCase()} ` 
        : '';
        
    const messageBody = `🚨 EMERGENCY ALERT 🚨\n${scenarioLabel}\nConfidence: ${store.confidence}%\nTracking: ${locationPkt}\nEnsure safety immediately.`;

    // 5. Send SMS silently via native SmsManager
    console.log('[Escalation] 5. Sending SMS to contacts...');
    for (const contact of EMERGENCY_CONTACTS) {
        try {
            if (SpeechEngine?.sendSilentSMS) {
                console.log(`[Escalation] Initiating silent SMS to: ${contact}...`);
                await SpeechEngine.sendSilentSMS(contact, messageBody);
                report.smsContacts.push(contact);
                console.log(`[Escalation] ✅ SMS success for: ${contact}`);
            } else {
                console.warn('[Escalation] ❌ sendSilentSMS native method missing');
            }
        } catch (e: any) {
            console.warn(`[Escalation] ❌ SMS to ${contact} failed:`, e?.message || e);
        }
    }
    report.smsSent = report.smsContacts.length > 0;

    // 6. Beacon
    console.log('[Escalation] 6. Starting SOS Beacon...');
    try { 
        await startSOSBeacon(); 
        report.beaconStarted = true; 
        console.log('[Escalation] ✅ Beacon active');
    } catch (e: any) { console.warn('[Escalation] ❌ Beacon failed:', e?.message || e); }

    // 7. Call Setup
    console.log('[Escalation] 7. Call ready (NOT auto-placed)');
    report.callPlaced = false;
    report.callNumber = PRIMARY;

    // 8. Live tracking
    console.log('[Escalation] 8. Starting live tracking...');
    try { 
        startLiveTracking(); 
        console.log('[Escalation] ✅ Tracking started');
    } catch (e: any) { console.warn('[Escalation] ❌ Tracking failed:', e?.message || e); }

    console.log('[Escalation] --- Escalation Complete ---');
    return report;
};

export const placeEmergencyCall = async (number?: string) => {
    const telNumber = number || PRIMARY;
    console.log(`[Escalation] Placing emergency call to: ${telNumber}`);
    try {
        if (SpeechEngine?.makeCall) {
            await SpeechEngine.makeCall(telNumber);
            return true;
        }
    } catch (e: any) { console.warn('[Escalation] ❌ Call failed:', e?.message || e); }
    return false;
};

export const buildEscalationSummary = (report: EscalationReport): string => {
    const actions: string[] = [];
    if (report.smsSent) actions.push(`sent SOS messages to ${report.smsContacts.length} contacts`);
    if (report.callPlaced) actions.push(`placed a call to ${report.callNumber}`);
    if (report.locationShared) actions.push('shared your GPS location');
    if (report.beaconStarted) actions.push('activated the rescue beacon');

    if (actions.length === 0) return 'I attempted alert escalation but native services failed to respond.';
    return `Done. I have ${actions.join(', and ')}. Help is on the way.`;
};

let trackingInterval: any = null;
const startLiveTracking = () => {
    if (trackingInterval) return;
    trackingInterval = setInterval(async () => {
        try {
            if (SpeechEngine?.getCurrentLocation) {
                const position = await SpeechEngine.getCurrentLocation();
                console.log("[LIVE TRACKING] ", position.latitude, position.longitude);
            }
        } catch (error: any) {
            console.warn("[LIVE TRACKING ERROR] ", error.message);
        }
    }, 3000);
};

export const stopLiveTracking = () => {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
};
