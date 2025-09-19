import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { CulturalPreset } from './StealthNavigationWrapper';

interface CulturalPresetDetectorProps {
  onPresetDetected: (preset: CulturalPreset) => void;
}

interface CulturalContext {
  locale: string;
  region: string;
  language: string;
  timezone: string;
}

export const CulturalPresetDetector: React.FC<CulturalPresetDetectorProps> = ({
  onPresetDetected,
}) => {
  const [culturalContext, setCulturalContext] = useState<CulturalContext | null>(null);

  useEffect(() => {
    detectCulturalContext();
  }, []);

  const detectCulturalContext = async () => {
    try {
      // Get device locale and region information
      const locale =
        Platform.OS === 'ios'
          ? require('react-native').NativeModules.SettingsManager?.settings?.AppleLocale ||
            require('react-native').NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
            'en-US'
          : require('react-native').NativeModules.I18nManager?.localeIdentifier || 'en-US';

      const [language, region] = locale.split('-');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const context: CulturalContext = {
        locale,
        region: region || 'US',
        language: language || 'en',
        timezone,
      };

      setCulturalContext(context);

      // Determine cultural preset based on detected context
      const preset = determineCulturalPreset(context);
      onPresetDetected(preset);
    } catch (error) {
      console.warn('Failed to detect cultural context:', error);
      // Default to open mode if detection fails
      onPresetDetected('open');
    }
  };

  const determineCulturalPreset = (context: CulturalContext): CulturalPreset => {
    // High menstrual stigma regions - require stealth mode
    const highStigmaRegions = [
      'AF',
      'BD',
      'BT',
      'IN',
      'ID',
      'IR',
      'IQ',
      'JO',
      'KZ',
      'KW',
      'KG',
      'LB',
      'MY',
      'MV',
      'MN',
      'MM',
      'NP',
      'OM',
      'PK',
      'PS',
      'QA',
      'SA',
      'LK',
      'SY',
      'TJ',
      'TH',
      'TR',
      'TM',
      'AE',
      'UZ',
      'YE',
    ];

    // Medium stigma regions - discrete mode
    const mediumStigmaRegions = [
      'DZ',
      'BH',
      'EG',
      'LY',
      'MA',
      'SD',
      'TN',
      'BR',
      'CL',
      'CO',
      'CR',
      'DO',
      'EC',
      'SV',
      'GT',
      'HN',
      'MX',
      'NI',
      'PA',
      'PE',
      'UY',
      'VE',
      'AL',
      'BY',
      'BG',
      'HR',
      'CZ',
      'EE',
      'GE',
      'HU',
      'LV',
      'LT',
      'MD',
      'PL',
      'RO',
      'RU',
      'SK',
      'SI',
      'UA',
      'KE',
      'NG',
      'ZA',
      'TZ',
      'UG',
      'ZM',
      'ZW',
    ];

    // Check region-based cultural context
    if (highStigmaRegions.includes(context.region.toUpperCase())) {
      return 'stealth';
    }

    if (mediumStigmaRegions.includes(context.region.toUpperCase())) {
      return 'discrete';
    }

    // Language-based additional detection
    if (context.language === 'ar' || context.language === 'fa' || context.language === 'ur') {
      return 'stealth';
    }

    if (context.language === 'es' || context.language === 'pt' || context.language === 'ru') {
      return 'discrete';
    }

    // Low stigma regions - open mode (default)
    return 'open';
  };

  // This component doesn't render anything, it's just for detection
  return null;
};

export default CulturalPresetDetector;
