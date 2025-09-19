import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStealthNavigation, CulturalPreset } from './StealthNavigationWrapper';

interface PrivacyModeState {
  isPrivacyModeActive: boolean;
  backgroundTimeoutDuration: number; // milliseconds
  shouldActivateOnAppBackground: boolean;
  emergencyActivationEnabled: boolean;
  lastActiveTime: number;
}

interface PrivacyModeContextType {
  privacyState: PrivacyModeState;
  activatePrivacyMode: () => void;
  deactivatePrivacyMode: () => void;
  updatePrivacySettings: (settings: Partial<PrivacyModeState>) => void;
  isInSecureMode: boolean;
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined);

export const usePrivacyMode = () => {
  const context = useContext(PrivacyModeContext);
  if (!context) {
    throw new Error('usePrivacyMode must be used within PrivacyModeProvider');
  }
  return context;
};

interface PrivacyModeProviderProps {
  children: ReactNode;
}

export const PrivacyModeProvider: React.FC<PrivacyModeProviderProps> = ({ children }) => {
  const { culturalPreset, activateEmergencyStealth } = useStealthNavigation();

  const [privacyState, setPrivacyState] = useState<PrivacyModeState>({
    isPrivacyModeActive: false,
    backgroundTimeoutDuration: 30000, // 30 seconds default
    shouldActivateOnAppBackground: true,
    emergencyActivationEnabled: true,
    lastActiveTime: Date.now(),
  });

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [backgroundTimer, setBackgroundTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const currentTime = Date.now();

      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          setBackgroundTimer(null);
        }

        // Check if we should activate privacy mode based on time away
        const timeAway = currentTime - privacyState.lastActiveTime;
        if (
          timeAway > privacyState.backgroundTimeoutDuration &&
          privacyState.shouldActivateOnAppBackground
        ) {
          activatePrivacyMode();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        setPrivacyState(prev => ({ ...prev, lastActiveTime: currentTime }));

        if (privacyState.shouldActivateOnAppBackground) {
          const timer = setTimeout(() => {
            activatePrivacyMode();
          }, privacyState.backgroundTimeoutDuration);
          setBackgroundTimer(timer);
        }
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
    };
  }, [appState, privacyState, backgroundTimer]);

  // Auto-adjust privacy settings based on cultural preset
  useEffect(() => {
    updatePrivacySettingsForCulturalPreset(culturalPreset);
  }, [culturalPreset]);

  const updatePrivacySettingsForCulturalPreset = (preset: CulturalPreset) => {
    switch (preset) {
      case 'stealth':
      case 'invisible':
        setPrivacyState(prev => ({
          ...prev,
          backgroundTimeoutDuration: 5000, // 5 seconds for high-risk environments
          shouldActivateOnAppBackground: true,
          emergencyActivationEnabled: true,
        }));
        break;
      case 'discrete':
        setPrivacyState(prev => ({
          ...prev,
          backgroundTimeoutDuration: 15000, // 15 seconds for medium-risk
          shouldActivateOnAppBackground: true,
          emergencyActivationEnabled: true,
        }));
        break;
      case 'open':
        setPrivacyState(prev => ({
          ...prev,
          backgroundTimeoutDuration: 60000, // 60 seconds for low-risk
          shouldActivateOnAppBackground: false,
          emergencyActivationEnabled: false,
        }));
        break;
    }
  };

  const activatePrivacyMode = () => {
    setPrivacyState(prev => ({ ...prev, isPrivacyModeActive: true }));
    activateEmergencyStealth();
  };

  const deactivatePrivacyMode = () => {
    setPrivacyState(prev => ({ ...prev, isPrivacyModeActive: false }));
  };

  const updatePrivacySettings = (settings: Partial<PrivacyModeState>) => {
    setPrivacyState(prev => ({ ...prev, ...settings }));
  };

  const isInSecureMode =
    culturalPreset === 'stealth' ||
    culturalPreset === 'invisible' ||
    privacyState.isPrivacyModeActive;

  const value: PrivacyModeContextType = {
    privacyState,
    activatePrivacyMode,
    deactivatePrivacyMode,
    updatePrivacySettings,
    isInSecureMode,
  };

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
};
