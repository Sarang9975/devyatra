import { DeviceEventEmitter, Vibration } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { triggerEscalation, placeEmergencyCall } from './Escalation';

export const initHardwareTriggers = () => {
    console.log('[HardwareTrigger] Initializing Shadow-Link Monitor...');

    DeviceEventEmitter.addListener('HardwareKeyEvent', (event: { type: string }) => {
        const store = useEmergencyStore.getState();
        
        // If we are already escalated, ignore new triggers to avoid loops
        if (store.emergencyState === 'escalated') return;

        console.log(`[HardwareTrigger] Native Event: ${event.type}`);

        switch (event.type) {
            case 'hardware_sms_action':
                // ✉️ TACTICAL SMS - Immediate SOS with context
                Vibration.vibrate([0, 100, 100, 500]); // Strategic long pulse
                if (store.emergencyState === 'idle') {
                    store.setEmergencyState('warning'); // Start UI
                }
                triggerEscalation(); // FIRE SMS IMMEDIATELY
                break;

            case 'hardware_call_action':
                // 📞 TACTICAL CALL - Immediate Help
                Vibration.vibrate([0, 500, 100, 500]); // Strategic long pulse
                placeEmergencyCall("112"); // FIRE CALL IMMEDIATELY (or primary contact)
                break;

            case 'volume_up_hold':
                // MEDICAL - Easy access for incapacitated users
                Vibration.vibrate([0, 100, 50, 100]); // Pulse
                store.setEmergencyScenario('medical');
                store.setTriggerReason('Physical Hardware: Volume-Up Hold (Medical)');
                store.setEmergencyState('warning');
                break;

            case 'power_spam':
                // THREAT - Stealthy access in pocket
                Vibration.vibrate(200); // Sharp buzz
                store.setEmergencyScenario('threat');
                store.setTriggerReason('Physical Hardware: Power-Button Spam (Threat/Stealth)');
                store.setEmergencyState('warning');
                break;

            case 'volume_chord':
                // DISASTER - Firm, intentional squeeze
                Vibration.vibrate([0, 500]); // Long buzz
                store.setEmergencyScenario('disaster');
                store.setTriggerReason('Physical Hardware: Volume Chord (Disaster)');
                store.setEmergencyState('warning');
                break;

            case 'volume_down_hold':
                // ACCIDENT - Simple intentional hold
                Vibration.vibrate([0, 100, 100, 100, 100, 100]); // Triple buzz
                store.setEmergencyScenario('accident');
                store.setTriggerReason('Physical Hardware: Volume-Down Hold (Accident)');
                store.setEmergencyState('warning');
                break;

            default:
                break;
        }
    });

    return () => {
        DeviceEventEmitter.removeAllListeners('HardwareKeyEvent');
    };
};
