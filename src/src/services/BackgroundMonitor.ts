import BackgroundService from 'react-native-background-actions';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { startFallDetection, stopFallDetection } from './FallDetection';
import { useEmergencyStore } from '../store/useEmergencyStore';

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const backgroundTask = async (taskDataArguments: any) => {
    const { delay } = taskDataArguments;

    // We start the fallback detection within the background thread loop if needed,
    // though starting it before might be enough if listeners persist.
    // We'll re-initialize just in case.
    startFallDetection();

    // Setup an aggressive loop to keep thread busy enough to not be dozed easily
    // Optional: could just run a simple heartbeat
    while (BackgroundService.isRunning()) {
        const state = useEmergencyStore.getState().emergencyState;
        
        // Example heartbeat update to notification
        if (state === 'warning') {
            await BackgroundService.updateNotification({
                taskDesc: 'Safety Monitoring Active - Potential Fall Detected!',
                progressBar: { max: 10, value: 5 }
            });
        } else if (state === 'idle') {
            await BackgroundService.updateNotification({
                taskDesc: 'The Emergency system is silently monitoring your safety.',
            });
        }

        await sleep(delay);
    }
    stopFallDetection();
};

const options = {
    taskName: 'EmergencyMonitor',
    taskTitle: 'Safety Monitoring Active',
    taskDesc: 'The Emergency system is silently monitoring your safety.',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff0000',
    linkingURI: 'emergencyapp://', // Could deep link back to app
    parameters: {
        delay: 2000,
    },
};

export const startBackgroundMonitor = async () => {
    // Requires Notifee channel for normal local notifications inside the app
    try {
        await notifee.createChannel({
            id: 'emergency_alerts',
            name: 'Emergency Alerts',
            importance: AndroidImportance.HIGH,
        });
    } catch (e) {
        console.error("Notifee channel creation failed", e);
    }

    if (!BackgroundService.isRunning()) {
        try {
            await BackgroundService.start(backgroundTask, options);
            useEmergencyStore.getState().setMonitoring(true);
        } catch (e) {
            console.error('Failed to start background monitor', e);
        }
    }
};

export const stopBackgroundMonitor = async () => {
    if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
        useEmergencyStore.getState().setMonitoring(false);
    }
};
