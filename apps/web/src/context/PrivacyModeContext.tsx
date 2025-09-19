'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CulturalPreset } from '../components/stealth/CulturalPresetToggle';

interface PrivacyModeContextType {
  isPrivacyModeActive: boolean;
  currentPreset: CulturalPreset;
  stealthLevel: number; // 0-3 (0=off, 1=basic, 2=moderate, 3=invisible)
  togglePrivacyMode: () => void;
  setPreset: (preset: CulturalPreset) => void;
  setStealthLevel: (level: number) => void;
  emergencyActivation: () => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined);

// Map presets to stealth levels
const presetToStealthLevel: Record<CulturalPreset, number> = {
  global: 0,
  professional: 1,
  'high-privacy': 2,
  invisible: 3,
};

interface PrivacyModeProviderProps {
  children: ReactNode;
}

export function PrivacyModeProvider({ children }: PrivacyModeProviderProps) {
  const [isPrivacyModeActive, setIsPrivacyModeActive] = useState(true);
  const [currentPreset, setCurrentPreset] = useState<CulturalPreset>('global');
  const [stealthLevel, setStealthLevelState] = useState(0);

  // Sync stealth level with preset
  useEffect(() => {
    const level = presetToStealthLevel[currentPreset];
    setStealthLevelState(level);
  }, [currentPreset]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('aura-privacy-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setIsPrivacyModeActive(settings.isPrivacyModeActive ?? true);
        setCurrentPreset(settings.currentPreset ?? 'global');
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    try {
      const settings = {
        isPrivacyModeActive,
        currentPreset,
        stealthLevel,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('aura-privacy-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }, [isPrivacyModeActive, currentPreset, stealthLevel]);

  const togglePrivacyMode = () => {
    setIsPrivacyModeActive(!isPrivacyModeActive);
  };

  const setPreset = (preset: CulturalPreset) => {
    setCurrentPreset(preset);
    // Auto-activate privacy mode when changing presets
    if (!isPrivacyModeActive) {
      setIsPrivacyModeActive(true);
    }
  };

  const setStealthLevel = (level: number) => {
    const clampedLevel = Math.max(0, Math.min(3, level));
    setStealthLevelState(clampedLevel);

    // Find matching preset for the level
    const matchingPreset = Object.entries(presetToStealthLevel).find(
      ([, presetLevel]) => presetLevel === clampedLevel
    )?.[0] as CulturalPreset;

    if (matchingPreset) {
      setCurrentPreset(matchingPreset);
    }
  };

  // Emergency activation for panic situations
  const emergencyActivation = () => {
    setCurrentPreset('invisible');
    setIsPrivacyModeActive(true);
    setStealthLevelState(3);

    // Optional: Add visual/haptic feedback here
    console.log('Emergency stealth mode activated');
  };

  const value: PrivacyModeContextType = {
    isPrivacyModeActive,
    currentPreset,
    stealthLevel,
    togglePrivacyMode,
    setPreset,
    setStealthLevel,
    emergencyActivation,
  };

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
}

export function usePrivacyMode() {
  const context = useContext(PrivacyModeContext);
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a PrivacyModeProvider');
  }
  return context;
}
