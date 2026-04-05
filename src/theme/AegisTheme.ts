export const AegisTheme = {
  colors: {
    background: '#0f172a',      // Deep Space Blue
    surface: '#1e293b',         // Slate Surface
    surfaceLight: '#334155',    // Accented Surface
    primary: '#3b82f6',         // Neon Blue
    secondary: '#94a3b8',       // Mute Slate
    white: '#f8fafc',
    
    // Status Colors
    active: '#10b981',          // Guardian Green
    threat: '#ef4444',          // Danger Red
    medical: '#0ea5e9',         // Healing Blue
    disaster: '#f97316',        // Alert Orange
    accident: '#64748b',        // Neutral Slate
    hazard: '#f59e0b',          // Warning Amber
    
    // Glass Effects
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassBackground: 'rgba(30, 41, 59, 0.7)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  glass: {
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  }
};
