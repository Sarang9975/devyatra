import { create } from 'zustand';

export type EmergencyState = 'idle' | 'warning' | 'escalated';

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
  incidentHistory: IncidentLog[];
  
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
  incidentHistory: [],
  
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

  addIncident: (log) => set((state) => ({
    incidentHistory: [{ ...log, id: Date.now().toString() }, ...state.incidentHistory]
  })),
  
  resetAll: () => set({
    emergencyState: 'idle',
    confidence: 0,
    triggerTime: null,
    triggerReason: null,
    liveGeminiVerdict: null,
    isGeminiEvaluating: false,
    isBeaconActive: false,
    isTimerPaused: false,
  })
}));
