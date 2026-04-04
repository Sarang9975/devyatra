import { Vibration } from 'react-native';
import Torch from 'react-native-torch';
import SoundPlayer from 'react-native-sound-player';
import { useEmergencyStore } from '../store/useEmergencyStore';

const DOT = 200;
const DASH = 600;
const SPACE = 200;

let beaconInterval: any = null;
let isBeaconRunning = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(() => resolve(null), ms));

const playSignal = async (duration: number) => {
    if (!isBeaconRunning) return;
    
    // Toggle Hardware
    Torch.switchState(true);
    Vibration.vibrate(duration);
    
    await sleep(duration);
    
    Torch.switchState(false);
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

    // Start High-Frequency Audio Looping
    try {
        // Using a high-pitched frequency chirp (16kHz approximate)
        // Public domain emergency chirp URL
        SoundPlayer.playUrl('https://www.soundjay.com/buttons/beep-01a.mp3'); 
        // Note: In a real production app, we would bundle a 16kHz .wav file in assets
    } catch (e) {
        console.error("Failed to play beacon sound", e);
    }

    const runBeaconLoop = async () => {
        while (isBeaconRunning) {
            await playLetterS();
            await sleep(DASH); // Letter space
            await playLetterO();
            await sleep(DASH); // Letter space
            await playLetterS();
            await sleep(2000); // Loop space
        }
    };

    runBeaconLoop();
};

export const stopSOSBeacon = () => {
    isBeaconRunning = false;
    useEmergencyStore.getState().setBeaconActive(false);
    Torch.switchState(false);
    Vibration.cancel();
    SoundPlayer.stop();
};
