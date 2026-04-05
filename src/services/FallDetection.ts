import { accelerometer, gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { analyzeTelemetryWithGemini } from './GeminiAI';

// 10 times a second
setUpdateIntervalForType(SensorTypes.accelerometer, 100);
setUpdateIntervalForType(SensorTypes.gyroscope, 100);

const BUFFER_SIZE = 50; 
const G_FORCE = 9.81;

// Phase 1: Impact
const SPIKE_THRESHOLD = G_FORCE * 1.8; // minimum 1.8g to trigger analysis

// Phase 2: Vitality Band (Variance in m/s² over 3 seconds)
const DEAD_STILL_THRESHOLD = 0.02 * G_FORCE; // < ~0.2 m/s² variance = inanimate surface
const RECOVERY_THRESHOLD = 5.0 * G_FORCE;    // Hackathon Loosened: Allow violent shaking to pass

let magnitudeBuffer: number[] = [];
let isDetectingFall = false;
let postImpactFrames: number[] = [];
let gyroBuffer: number[] = [];
let postImpactTumble: number[] = [];
let accSubscription: any = null;
let gyroSubscription: any = null;

const checkFallLogic = () => {
  const store = useEmergencyStore.getState();
  
  // Anti-Spam Lock: Do not evaluate overlaps if we are already in an emergency, or Gemini is parsing
  if (store.emergencyState !== 'idle' || store.isGeminiEvaluating) {
      if (isDetectingFall) {
          // Abort any ongoing vitality bands
          isDetectingFall = false;
          postImpactFrames = [];
          postImpactTumble = [];
      }
      return;
  }

  if (magnitudeBuffer.length < 5) return;

  const recentMagnitude = magnitudeBuffer[magnitudeBuffer.length - 1];

  if (!isDetectingFall && recentMagnitude > SPIKE_THRESHOLD) {
    // 1. Massive impact detected. Enter Phase 2 (Post-Impact Analysis).
    isDetectingFall = true;
    postImpactFrames = [];
    postImpactTumble = [];
    
  } else if (isDetectingFall) {
    // Collect 3 seconds (30 frames) of post-impact data
    postImpactFrames.push(recentMagnitude);
    
    // Grab the latest gyro tumbling value
    if (gyroBuffer.length > 0) {
        postImpactTumble.push(gyroBuffer[gyroBuffer.length - 1]);
    }

    if (postImpactFrames.length >= 30) {
      // Analysis Time!
      const averageVariance = postImpactFrames.reduce((acc, val) => {
          return acc + Math.abs(val - G_FORCE);
      }, 0) / postImpactFrames.length;

      console.log(`[Fall Detection] 3-Sec Post-Impact Variance: ${averageVariance.toFixed(3)}`);

      if (averageVariance < DEAD_STILL_THRESHOLD) {
          console.log("[Fall Detection] Rejected: Thrown device (Dead Still)");
      } else if (averageVariance > RECOVERY_THRESHOLD) {
          console.log("[Fall Detection] Rejected: User recovering/moving");
      } else {
          // Variance is within the Biological Vitality Band! Check tumbling!
          const averageTumble = postImpactTumble.reduce((acc, val) => acc + val, 0) / (postImpactTumble.length || 1);
          console.log(`[Fall Detection] Tumble Rad/s: ${averageTumble.toFixed(3)}`);
          
          let updatedConfidence = useEmergencyStore.getState().isGuardianMode ? 95 : 85;
          let triggerContext = 'Sensor-Detected Event (Impact + Biological Stillness)';
          if (averageTumble > 2.0) {
              console.log("[Fall Detection] Severe tumbling detected!");
              updatedConfidence = 99;
              triggerContext = 'Severe Accident (High Impact + Tumbling Rotation)';
          }
          
          console.log(`[Fall Detection] ESCALATION! Vitality Band Hit: ${averageVariance.toFixed(3)}`);
          
          // Pre-Alarm AI Evaluation! Hold the trigger and let Gemini decide!
          useEmergencyStore.getState().setTriggerReason(triggerContext);
          useEmergencyStore.getState().setConfidence(updatedConfidence);
          useEmergencyStore.getState().setLiveGeminiVerdict('Awaiting remote AI inference...');
          useEmergencyStore.getState().setIsGeminiEvaluating(true);
          
          const currentFrames = [...postImpactFrames];
          const currentTumble = [...postImpactTumble];
          
          analyzeTelemetryWithGemini(currentFrames, currentTumble, updatedConfidence).then(verdict => {
              console.log("[Gemini] Pre-Alarm Verdict arrived: ", verdict);
              useEmergencyStore.getState().setLiveGeminiVerdict(verdict);
              useEmergencyStore.getState().setIsGeminiEvaluating(false);
              
              // Only trigger the popup if Gemini doesn't explicitly dismiss it as a False Positive
              const verdictLower = verdict.toLowerCase();
              if (verdictLower.includes('false positive') || verdictLower.includes('normal walking')) {
                   console.log("[Fall Detection] Gemini rejected the escalation!");
                   // Do not trigger warning.
              } else {
                   // Gemini approved the crash telemetry. Trigger the Red Popup!
                   useEmergencyStore.getState().setEmergencyState('warning');
                   useEmergencyStore.getState().setTriggerTime(Date.now());
              }
          });
      }

      // Reset state machine for the next event
      isDetectingFall = false;
      postImpactFrames = [];
      postImpactTumble = [];
    }
  }
};

export const startFallDetection = () => {
  if (accSubscription) return;
  
  accSubscription = accelerometer.subscribe(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    useEmergencyStore.getState().setCurrentMagnitude(magnitude);
    
    magnitudeBuffer.push(magnitude);
    if (magnitudeBuffer.length > BUFFER_SIZE) magnitudeBuffer.shift();

    checkFallLogic();
  });

  gyroSubscription = gyroscope.subscribe(({ x, y, z }) => {
     // Magnitude of rotation (rad/s)
     const rotation = Math.sqrt(x * x + y * y + z * z);
     gyroBuffer.push(rotation);
     if (gyroBuffer.length > BUFFER_SIZE) gyroBuffer.shift();
  });
};

export const stopFallDetection = () => {
  if (accSubscription) accSubscription.unsubscribe();
  if (gyroSubscription) gyroSubscription.unsubscribe();
  
  accSubscription = null;
  gyroSubscription = null;
  magnitudeBuffer = [];
  gyroBuffer = [];
  isDetectingFall = false;
  postImpactFrames = [];
  postImpactTumble = [];
};
