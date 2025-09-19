import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { YStack } from '@tamagui/stacks';
import { Text, Button } from '../ui';
import { BiometricAuthOverlay } from '../auth/BiometricAuthOverlay';
import { useStealthNavigation, CulturalPreset } from '../privacy/StealthNavigationWrapper';
import CulturalPresetDetector from '../privacy/CulturalPresetDetector';

interface AdaptiveLaunchInterfaceProps {
  onLaunchComplete: () => void;
}

export const AdaptiveLaunchInterface: React.FC<AdaptiveLaunchInterfaceProps> = ({
  onLaunchComplete,
}) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [detectedPreset, setDetectedPreset] = useState<CulturalPreset>('open');
  const { setCulturalPreset } = useStealthNavigation();

  const handleCulturalPresetDetected = (preset: CulturalPreset) => {
    setDetectedPreset(preset);
    setCulturalPreset(preset);
  };

  const handleLaunchApp = () => {
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
    onLaunchComplete();
  };

  const handleAuthCancel = () => {
    setShowAuth(false);
  };

  const getWelcomeMessage = () => {
    switch (detectedPreset) {
      case 'stealth':
        return 'Welcome to Calculator';
      case 'invisible':
        return 'Welcome';
      case 'discrete':
        return 'Welcome to Health Tracker';
      default:
        return 'Welcome to Aura';
    }
  };

  const getSubtitle = () => {
    switch (detectedPreset) {
      case 'stealth':
        return 'Professional calculator app';
      case 'invisible':
        return 'Your personal app';
      case 'discrete':
        return 'Personal wellness tracking';
      default:
        return 'Reproductive health tracking';
    }
  };

  const getIcon = () => {
    switch (detectedPreset) {
      case 'stealth':
        return '🧮';
      case 'invisible':
        return '📱';
      case 'discrete':
        return '📊';
      default:
        return '🌸';
    }
  };

  return (
    <View style={styles.container}>
      <CulturalPresetDetector onPresetDetected={handleCulturalPresetDetected} />

      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" space="$6">
        <YStack alignItems="center" space="$4">
          <Text variant="heading" size="xxl">
            {getIcon()}
          </Text>

          <YStack alignItems="center" space="$2">
            <Text variant="heading" size="xl" textAlign="center">
              {getWelcomeMessage()}
            </Text>
            <Text variant="caption" color="secondary" textAlign="center">
              {getSubtitle()}
            </Text>
          </YStack>
        </YStack>

        <YStack space="$3" width="100%" maxWidth={300}>
          <Button variant="primary" size="large" onPress={handleLaunchApp}>
            {detectedPreset === 'stealth' ? 'Open Calculator' : 'Launch App'}
          </Button>

          {detectedPreset !== 'stealth' && detectedPreset !== 'invisible' && (
            <Button variant="outline" size="medium" onPress={() => setCulturalPreset('stealth')}>
              Switch to Stealth Mode
            </Button>
          )}
        </YStack>

        <YStack alignItems="center" space="$2">
          <Text variant="caption" color="muted" textAlign="center">
            Cultural adaptation: {detectedPreset}
          </Text>
          <Text variant="caption" color="muted" textAlign="center" fontSize="$2">
            Privacy-first • Zero-knowledge • Secure
          </Text>
        </YStack>
      </YStack>

      <BiometricAuthOverlay
        visible={showAuth}
        onAuthenticated={handleAuthSuccess}
        onCancel={handleAuthCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
