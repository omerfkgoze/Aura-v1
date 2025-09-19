import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CulturalPreset = 'open' | 'discrete' | 'stealth' | 'invisible';

interface StealthNavigationContextType {
  culturalPreset: CulturalPreset;
  setCulturalPreset: (preset: CulturalPreset) => void;
  isStealthModeActive: boolean;
  activateEmergencyStealth: () => void;
  deactivateEmergencyStealth: () => void;
}

const StealthNavigationContext = createContext<StealthNavigationContextType | undefined>(undefined);

export const useStealthNavigation = () => {
  const context = useContext(StealthNavigationContext);
  if (!context) {
    throw new Error('useStealthNavigation must be used within StealthNavigationProvider');
  }
  return context;
};

interface StealthNavigationProviderProps {
  children: ReactNode;
}

export const StealthNavigationProvider: React.FC<StealthNavigationProviderProps> = ({
  children,
}) => {
  const [culturalPreset, setCulturalPreset] = useState<CulturalPreset>('open');
  const [isStealthModeActive, setIsStealthModeActive] = useState(false);

  const activateEmergencyStealth = () => {
    setIsStealthModeActive(true);
    setCulturalPreset('invisible');
  };

  const deactivateEmergencyStealth = () => {
    setIsStealthModeActive(false);
    setCulturalPreset('open');
  };

  const value: StealthNavigationContextType = {
    culturalPreset,
    setCulturalPreset,
    isStealthModeActive,
    activateEmergencyStealth,
    deactivateEmergencyStealth,
  };

  return (
    <StealthNavigationContext.Provider value={value}>{children}</StealthNavigationContext.Provider>
  );
};
