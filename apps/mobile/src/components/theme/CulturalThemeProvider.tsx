import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStealthNavigation, CulturalPreset } from '../privacy/StealthNavigationWrapper';

interface CulturalTheme {
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: number;
      medium: number;
      large: number;
      xlarge: number;
    };
    fontWeight: {
      normal: string;
      medium: string;
      bold: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
}

interface CulturalThemeContextType {
  theme: CulturalTheme;
  currentPreset: CulturalPreset;
  updateTheme: (preset: CulturalPreset) => void;
}

const CulturalThemeContext = createContext<CulturalThemeContextType | undefined>(undefined);

export const useCulturalTheme = () => {
  const context = useContext(CulturalThemeContext);
  if (!context) {
    throw new Error('useCulturalTheme must be used within CulturalThemeProvider');
  }
  return context;
};

const getThemeForPreset = (preset: CulturalPreset): CulturalTheme => {
  const baseTheme: CulturalTheme = {
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#333333',
      textSecondary: '#666666',
      border: '#E0E0E0',
      accent: '#FF3B30',
    },
    typography: {
      fontFamily: 'System',
      fontSize: {
        small: 14,
        medium: 16,
        large: 18,
        xlarge: 24,
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700',
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
    },
  };

  switch (preset) {
    case 'open':
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: '#007AFF',
          accent: '#FF3B30',
          background: '#FFFFFF',
          surface: '#F8F9FA',
        },
      };

    case 'discrete':
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: '#6C757D',
          accent: '#495057',
          background: '#F8F9FA',
          surface: '#E9ECEF',
          text: '#495057',
          textSecondary: '#6C757D',
        },
        typography: {
          ...baseTheme.typography,
          fontSize: {
            small: 13,
            medium: 15,
            large: 17,
            xlarge: 22,
          },
        },
      };

    case 'stealth':
      return {
        ...baseTheme,
        colors: {
          primary: '#333333',
          background: '#000000',
          surface: '#1C1C1E',
          text: '#FFFFFF',
          textSecondary: '#8E8E93',
          border: '#48484A',
          accent: '#FF9500',
        },
        typography: {
          ...baseTheme.typography,
          fontFamily: 'Menlo',
          fontSize: {
            small: 12,
            medium: 14,
            large: 16,
            xlarge: 20,
          },
        },
        borderRadius: {
          small: 2,
          medium: 4,
          large: 6,
        },
      };

    case 'invisible':
      return {
        ...baseTheme,
        colors: {
          primary: '#000000',
          background: '#000000',
          surface: '#000000',
          text: '#FFFFFF',
          textSecondary: '#333333',
          border: '#333333',
          accent: '#000000',
        },
        typography: {
          ...baseTheme.typography,
          fontSize: {
            small: 10,
            medium: 12,
            large: 14,
            xlarge: 16,
          },
        },
        borderRadius: {
          small: 0,
          medium: 0,
          large: 0,
        },
      };

    default:
      return baseTheme;
  }
};

interface CulturalThemeProviderProps {
  children: ReactNode;
}

export const CulturalThemeProvider: React.FC<CulturalThemeProviderProps> = ({ children }) => {
  const { culturalPreset } = useStealthNavigation();
  const [theme, setTheme] = useState<CulturalTheme>(getThemeForPreset('open'));
  const [currentPreset, setCurrentPreset] = useState<CulturalPreset>('open');

  useEffect(() => {
    updateTheme(culturalPreset);
  }, [culturalPreset]);

  const updateTheme = (preset: CulturalPreset) => {
    const newTheme = getThemeForPreset(preset);
    setTheme(newTheme);
    setCurrentPreset(preset);
  };

  const value: CulturalThemeContextType = {
    theme,
    currentPreset,
    updateTheme,
  };

  return <CulturalThemeContext.Provider value={value}>{children}</CulturalThemeContext.Provider>;
};
