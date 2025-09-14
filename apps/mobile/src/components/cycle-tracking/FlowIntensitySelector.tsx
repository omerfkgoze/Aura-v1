import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Button, Card, YStack, XStack, Circle } from '@tamagui/core';
import { FlowIntensity } from '@aura/shared-types';
import { useAccessibility } from '../../utils/accessibility';

interface FlowIntensityConfig {
  intensity: FlowIntensity;
  label: string;
  description: string;
  color: string;
  stealthColor: string;
  icon: string;
}

const DEFAULT_FLOW_CONFIG: FlowIntensityConfig[] = [
  {
    intensity: 'none',
    label: 'None',
    description: 'No flow',
    color: '#E5E5E5',
    stealthColor: '#F0F0F0',
    icon: '○',
  },
  {
    intensity: 'spotting',
    label: 'Spotting',
    description: 'Very light, occasional drops',
    color: '#FFB6C1',
    stealthColor: '#F5F5F5',
    icon: '·',
  },
  {
    intensity: 'light',
    label: 'Light',
    description: 'Light flow, few drops per hour',
    color: '#FF69B4',
    stealthColor: '#E8E8E8',
    icon: '◦',
  },
  {
    intensity: 'medium',
    label: 'Medium',
    description: 'Regular flow, changed every 3-4 hours',
    color: '#DC143C',
    stealthColor: '#DCDCDC',
    icon: '●',
  },
  {
    intensity: 'heavy',
    label: 'Heavy',
    description: 'Heavy flow, changed every 1-2 hours',
    color: '#8B0000',
    stealthColor: '#D0D0D0',
    icon: '⬤',
  },
];

interface FlowIntensitySelectorProps {
  selectedIntensity?: FlowIntensity;
  onIntensityChange: (intensity: FlowIntensity) => void;
  customConfig?: FlowIntensityConfig[];
  stealthMode?: boolean;
  disabled?: boolean;
}

export const FlowIntensitySelector: React.FC<FlowIntensitySelectorProps> = ({
  selectedIntensity,
  onIntensityChange,
  customConfig = DEFAULT_FLOW_CONFIG,
  stealthMode = false,
  disabled = false,
}) => {
  const { getAccessibilityLabel } = useAccessibility();
  const [showDescriptions, setShowDescriptions] = useState(false);

  const handleIntensitySelect = (intensity: FlowIntensity) => {
    if (disabled) return;

    onIntensityChange(intensity);

    // Accessibility announcement
    const config = customConfig.find(c => c.intensity === intensity);
    if (config) {
      // Announce selection for screen readers
      setTimeout(() => {
        Alert.alert('', `Selected ${config.label} flow intensity`, [{ text: 'OK' }]);
      }, 100);
    }
  };

  const getIntensityColor = (config: FlowIntensityConfig, isSelected: boolean) => {
    const baseColor = stealthMode ? config.stealthColor : config.color;
    return isSelected ? baseColor : `${baseColor}80`; // Add opacity for unselected
  };

  const getVisualFeedback = (intensity: FlowIntensity) => {
    const config = customConfig.find(c => c.intensity === intensity);
    if (!config) return {};

    const isSelected = selectedIntensity === intensity;
    return {
      backgroundColor: getIntensityColor(config, isSelected),
      borderWidth: isSelected ? 2 : 1,
      borderColor: isSelected ? (stealthMode ? '#666' : config.color) : '#CCC',
      opacity: disabled ? 0.5 : 1,
    };
  };

  return (
    <Card padding="$4" backgroundColor="$background">
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize="$6"
            fontWeight="bold"
            accessibilityRole="header"
            accessibilityLabel={getAccessibilityLabel(
              'flow-intensity-header',
              'Flow Intensity Selection'
            )}
          >
            {stealthMode ? 'Daily Scale' : 'Flow Intensity'}
          </Text>

          <Button
            size="$2"
            variant="outlined"
            onPress={() => setShowDescriptions(!showDescriptions)}
            accessibilityLabel="Toggle intensity descriptions"
          >
            {showDescriptions ? 'Hide Info' : 'Show Info'}
          </Button>
        </XStack>

        <XStack gap="$2" flexWrap="wrap" justifyContent="center">
          {customConfig.map(config => (
            <Button
              key={config.intensity}
              size="$4"
              variant="outlined"
              style={getVisualFeedback(config.intensity)}
              onPress={() => handleIntensitySelect(config.intensity)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{
                selected: selectedIntensity === config.intensity,
                disabled: disabled,
              }}
              accessibilityLabel={getAccessibilityLabel(
                `flow-${config.intensity}`,
                `${config.label} flow intensity. ${showDescriptions ? config.description : ''}`
              )}
              accessibilityHint="Tap to select this flow intensity level"
            >
              <YStack alignItems="center" gap="$1">
                <Circle size="$3" backgroundColor={config.color}>
                  <Text fontSize="$4">{config.icon}</Text>
                </Circle>
                <Text fontSize="$2" textAlign="center">
                  {config.label}
                </Text>
              </YStack>
            </Button>
          ))}
        </XStack>

        {showDescriptions && (
          <YStack gap="$2" marginTop="$3">
            <Text fontSize="$4" fontWeight="bold">
              Intensity Levels:
            </Text>
            {customConfig.map(config => (
              <XStack key={config.intensity} gap="$2" alignItems="center">
                <Circle
                  size="$2"
                  backgroundColor={stealthMode ? config.stealthColor : config.color}
                >
                  <Text fontSize="$1">{config.icon}</Text>
                </Circle>
                <Text fontSize="$3" flex={1}>
                  <Text fontWeight="bold">{config.label}:</Text> {config.description}
                </Text>
              </XStack>
            ))}
          </YStack>
        )}

        {selectedIntensity && (
          <Card padding="$3" backgroundColor="$backgroundFocus" marginTop="$2">
            <Text
              fontSize="$4"
              textAlign="center"
              accessibilityLabel={getAccessibilityLabel(
                'selected-intensity',
                `Currently selected: ${selectedIntensity}`
              )}
            >
              {stealthMode ? 'Selected Level' : 'Selected Intensity'}:{' '}
              <Text fontWeight="bold">
                {customConfig.find(c => c.intensity === selectedIntensity)?.label ||
                  selectedIntensity}
              </Text>
            </Text>
          </Card>
        )}
      </YStack>
    </Card>
  );
};

export default FlowIntensitySelector;
