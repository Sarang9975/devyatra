import { create } from 'zustand';
import { stopSOSBeacon } from '../services/BeaconService';
import { voiceAssistant } from '../services/VoiceAssistant';

export type EmergencyState = 'idle' | 'warning' | 'escalated';
export type EmergencyScenario = 'none' | 'medical' | 'threat' | 'disaster' | 'accident';

export interface IncidentLog {
  id: string;
  timestamp: number;
  triggerReason: string;
  confidence: number;
  geminiVerdict: string;
  status: 'Escalated' | 'Dismissed';
}

interface EmergencyStore {
  isMonitoring: boolean;
  isGuardianMode: boolean;
  emergencyState: EmergencyState;
  confidence: number;
  triggerTime: number | null; 
  triggerReason: string | null;
  currentMagnitude: number;
  liveGeminiVerdict: string | null;
  isGeminiEvaluating: boolean;
  isBeaconActive: boolean;
  isTimerPaused: boolean;
  emergencyScenario: EmergencyScenario;
  triageAdvice: string | null;
  incidentHistory: IncidentLog[];
  
  // SITUATIONAL STATES
  isFakeCallActive: boolean;
  isStealthModeActive: boolean;
  medicalId: { bloodType: string; allergies: string; medications: string } | null;
  nearbyPlaces: any[]; 

  setMonitoring: (status: boolean) => void;
  setGuardianMode: (status: boolean) => void;
  setEmergencyState: (state: EmergencyState) => void;
  setConfidence: (score: number) => void;
  setTriggerTime: (time: number | null) => void;
  setTriggerReason: (reason: string | null) => void;
  setCurrentMagnitude: (mag: number) => void;
  setLiveGeminiVerdict: (verdict: string | null) => void;
  setIsGeminiEvaluating: (status: boolean) => void;
  setBeaconActive: (status: boolean) => void;
  setTimerPaused: (status: boolean) => void;
  setEmergencyScenario: (scenario: EmergencyScenario) => void;
  setTriageAdvice: (advice: string | null) => void;
  setFakeCallActive: (status: boolean) => void;
  setStealthModeActive: (status: boolean) => void;
  setMedicalId: (id: { bloodType: string; allergies: string; medications: string } | null) => void;
  setNearbyPlaces: (places: any[]) => void;
  addIncident: (log: Omit<IncidentLog, 'id'>) => void;
  resetAll: () => void;
}

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  isMonitoring: false,
  isGuardianMode: false,
  emergencyState: 'idle',
  confidence: 0,
  triggerTime: null,
  triggerReason: null,
  currentMagnitude: 0,
  liveGeminiVerdict: null,
  isGeminiEvaluating: false,
  isBeaconActive: false,
  isTimerPaused: false,
  emergencyScenario: 'none',
  triageAdvice: null,
  incidentHistory: [],

  isFakeCallActive: false,
  isStealthModeActive: false,
  medicalId: { bloodType: "Unknown", allergies: "None reported", medications: "None" },
  nearbyPlaces: [],
  
  setMonitoring: (status) => set({ isMonitoring: status }),
  setGuardianMode: (status) => set({ isGuardianMode: status }),
  setEmergencyState: (state) => set({ emergencyState: state }),
  setConfidence: (score) => set({ confidence: score }),
  setTriggerTime: (time) => set({ triggerTime: time }),
  setTriggerReason: (reason) => set({ triggerReason: reason }),
  setCurrentMagnitude: (mag) => set({ currentMagnitude: mag }),
  setLiveGeminiVerdict: (verdict) => set({ liveGeminiVerdict: verdict }),
  setIsGeminiEvaluating: (status) => set({ isGeminiEvaluating: status }),
  setBeaconActive: (status) => set({ isBeaconActive: status }),
  setTimerPaused: (status) => set({ isTimerPaused: status }),
  setEmergencyScenario: (scenario) => set({ emergencyScenario: scenario }),
  setTriageAdvice: (advice) => set({ triageAdvice: advice }),
  setFakeCallActive: (status) => set({ isFakeCallActive: status }),
  setStealthModeActive: (status) => set({ isStealthModeActive: status }),
  setMedicalId: (id) => set({ medicalId: id }),
  setNearbyPlaces: (places) => set({ nearbyPlaces: places }),

  addIncident: (log) => set((state) => ({
    incidentHistory: [{ ...log, id: Date.now().toString() }, ...state.incidentHistory]
  })),
  
  resetAll: () => {
    // FORCE KILL ALL FEEDBACK
    require('react-native').Vibration.cancel();
    stopSOSBeacon();
    voiceAssistant.stopAssistant();
    
    set({
      emergencyState: 'idle',
      confidence: 0,
      triggerTime: null,
      triggerReason: null,
      liveGeminiVerdict: null,
      isGeminiEvaluating: false,
      isBeaconActive: false,
      isTimerPaused: false,
      emergencyScenario: 'none',
      triageAdvice: null,
      isFakeCallActive: false,
      isStealthModeActive: false,
      nearbyPlaces: [],
    });
  }
}));
