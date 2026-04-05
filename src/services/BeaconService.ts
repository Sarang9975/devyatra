import { Vibration } from 'react-native';
import SoundPlayer from 'react-native-sound-player';
import { useEmergencyStore } from '../store/useEmergencyStore';

const DOT = 200;
const DASH = 600;
const SPACE = 200;

let isBeaconRunning = false;

// REMOVED LEGACY react-native-torch: it is incompatible with Bridgeless / New Arch (2026) 
// and was CAUSING THE APP TO QUIT (crash) during escalation.
// Native Flashlight on Android 14 requires a modern TurboModule or Camera2 API.
const setTorch = (_on: boolean) => {
    // Torch functionality disabled for stability
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(() => resolve(null), ms));

const playSignal = async (duration: number) => {
    if (!isBeaconRunning) return;
    setTorch(true);
    Vibration.vibrate(duration);
    await sleep(duration);
    setTorch(false);
    await sleep(SPACE);
};

const playLetterS = async () => {
    for (let i = 0; i < 3; i++) await playSignal(DOT);
};

const playLetterO = async () => {
    for (let i = 0; i < 3; i++) await playSignal(DASH);
};

export const startSOSBeacon = async () => {
    if (isBeaconRunning) return;
    isBeaconRunning = true;
    useEmergencyStore.getState().setBeaconActive(true);

    try {
        // Simple alarm sound
        SoundPlayer.playUrl('https://www.soundjay.com/buttons/beep-01a.mp3');
    } catch (e) {
        console.warn('[Beacon] Audio unavailable:', e);
    }

    const runBeaconLoop = async () => {
        while (isBeaconRunning) {
            await playLetterS();
            await sleep(DASH);
            await playLetterO();
            await sleep(DASH);
            await playLetterS();
            await sleep(2000);
        }
    };

    runBeaconLoop();
};

export const stopSOSBeacon = () => {
    isBeaconRunning = false;
    useEmergencyStore.getState().setBeaconActive(false);
    setTorch(false);
    Vibration.cancel();
    try { SoundPlayer.stop(); } catch (_) {}
};
