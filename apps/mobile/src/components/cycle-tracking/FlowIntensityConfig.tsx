import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Button, Card, YStack, XStack, Input, Circle } from '@tamagui/core';
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

interface FlowIntensityConfigProps {
  currentConfig: FlowIntensityConfig[];
  onConfigChange: (config: FlowIntensityConfig[]) => void;
  onSave: () => void;
  onCancel: () => void;
  stealthMode?: boolean;
}

const AVAILABLE_COLORS = [
  '#E5E5E5',
  '#FFB6C1',
  '#FF69B4',
  '#DC143C',
  '#8B0000',
  '#FFA500',
  '#32CD32',
  '#4169E1',
  '#9932CC',
  '#FF1493',
];

const STEALTH_COLORS = [
  '#F0F0F0',
  '#F5F5F5',
  '#E8E8E8',
  '#DCDCDC',
  '#D0D0D0',
  '#E0E0E0',
  '#D8D8D8',
  '#CCCCCC',
  '#C8C8C8',
  '#C0C0C0',
];

const AVAILABLE_ICONS = ['○', '·', '◦', '●', '⬤', '▲', '◆', '★', '♦', '■'];

export const FlowIntensityConfig: React.FC<FlowIntensityConfigProps> = ({
  currentConfig,
  onConfigChange,
  onSave,
  onCancel,
  stealthMode = false,
}) => {
  const { getAccessibilityLabel } = useAccessibility();
  const [config, setConfig] = useState<FlowIntensityConfig[]>(currentConfig);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const handleConfigUpdate = (index: number, field: keyof FlowIntensityConfig, value: string) => {
    const newConfig = [...config];
    newConfig[index] = { ...newConfig[index], [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
    onConfigChange(newConfig);
  };

  const handleColorSelect = (index: number, colorIndex: number) => {
    const colors = stealthMode ? STEALTH_COLORS : AVAILABLE_COLORS;
    const selectedColor = colors[colorIndex];
    const stealthColor = STEALTH_COLORS[colorIndex];

    const newConfig = [...config];
    newConfig[index] = {
      ...newConfig[index],
      color: selectedColor,
      stealthColor: stealthColor,
    };
    setConfig(newConfig);
    setHasChanges(true);
    onConfigChange(newConfig);
  };

  const handleIconSelect = (index: number, iconIndex: number) => {
    const selectedIcon = AVAILABLE_ICONS[iconIndex];
    handleConfigUpdate(index, 'icon', selectedIcon);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all intensity levels to default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultConfig: FlowIntensityConfig[] = [
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
            setConfig(defaultConfig);
            setHasChanges(true);
            onConfigChange(defaultConfig);
          },
        },
      ]
    );
  };

  const validateConfiguration = (): boolean => {
    // Check for duplicate labels
    const labels = config.map(c => c.label.toLowerCase());
    const uniqueLabels = new Set(labels);
    if (labels.length !== uniqueLabels.size) {
      Alert.alert('Validation Error', 'Intensity labels must be unique.');
      return false;
    }

    // Check for empty fields
    const hasEmptyFields = config.some(
      c => !c.label.trim() || !c.description.trim() || !c.color || !c.icon
    );
    if (hasEmptyFields) {
      Alert.alert('Validation Error', 'All fields must be filled out.');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (validateConfiguration()) {
      onSave();
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setConfig(currentConfig);
              setHasChanges(false);
              onCancel();
            },
          },
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <Card padding="$4" backgroundColor="$background">
        <YStack gap="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="bold" accessibilityRole="header">
              {stealthMode ? 'Scale Configuration' : 'Flow Intensity Configuration'}
            </Text>
            <Button
              size="$3"
              variant="outlined"
              onPress={resetToDefaults}
              accessibilityLabel="Reset to default configuration"
            >
              Reset Defaults
            </Button>
          </XStack>

          {config.map((item, index) => (
            <Card key={item.intensity} padding="$3" backgroundColor="$backgroundFocus">
              <YStack gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontWeight="bold" textTransform="capitalize">
                    {item.intensity}
                  </Text>
                  <Button
                    size="$2"
                    variant={editingIndex === index ? 'solid' : 'outlined'}
                    onPress={() => setEditingIndex(editingIndex === index ? null : index)}
                    accessibilityLabel={`${editingIndex === index ? 'Collapse' : 'Edit'} ${item.intensity} settings`}
                  >
                    {editingIndex === index ? 'Collapse' : 'Edit'}
                  </Button>
                </XStack>

                <XStack gap="$2" alignItems="center">
                  <Circle
                    size="$3"
                    backgroundColor={stealthMode ? item.stealthColor : item.color}
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Text fontSize="$4">{item.icon}</Text>
                  </Circle>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="bold">
                      {item.label}
                    </Text>
                    <Text fontSize="$3" color="$color10">
                      {item.description}
                    </Text>
                  </YStack>
                </XStack>

                {editingIndex === index && (
                  <YStack gap="$3" marginTop="$2">
                    <YStack gap="$2">
                      <Text fontSize="$3" fontWeight="bold">
                        Label:
                      </Text>
                      <Input
                        value={item.label}
                        onChangeText={text => handleConfigUpdate(index, 'label', text)}
                        placeholder="Enter intensity label"
                        accessibilityLabel={`Label for ${item.intensity} intensity`}
                      />
                    </YStack>

                    <YStack gap="$2">
                      <Text fontSize="$3" fontWeight="bold">
                        Description:
                      </Text>
                      <Input
                        value={item.description}
                        onChangeText={text => handleConfigUpdate(index, 'description', text)}
                        placeholder="Enter description"
                        accessibilityLabel={`Description for ${item.intensity} intensity`}
                      />
                    </YStack>

                    <YStack gap="$2">
                      <Text fontSize="$3" fontWeight="bold">
                        Color:
                      </Text>
                      <XStack gap="$1" flexWrap="wrap">
                        {(stealthMode ? STEALTH_COLORS : AVAILABLE_COLORS).map(
                          (color, colorIndex) => (
                            <Button
                              key={colorIndex}
                              size="$2"
                              style={{
                                backgroundColor: color,
                                borderWidth:
                                  (stealthMode ? item.stealthColor : item.color) === color ? 3 : 1,
                                borderColor:
                                  (stealthMode ? item.stealthColor : item.color) === color
                                    ? '#000'
                                    : '#CCC',
                              }}
                              onPress={() => handleColorSelect(index, colorIndex)}
                              accessibilityLabel={`Select color ${colorIndex + 1}`}
                            />
                          )
                        )}
                      </XStack>
                    </YStack>

                    <YStack gap="$2">
                      <Text fontSize="$3" fontWeight="bold">
                        Icon:
                      </Text>
                      <XStack gap="$1" flexWrap="wrap">
                        {AVAILABLE_ICONS.map((icon, iconIndex) => (
                          <Button
                            key={iconIndex}
                            size="$3"
                            variant={item.icon === icon ? 'solid' : 'outlined'}
                            onPress={() => handleIconSelect(index, iconIndex)}
                            accessibilityLabel={`Select icon ${icon}`}
                          >
                            <Text fontSize="$4">{icon}</Text>
                          </Button>
                        ))}
                      </XStack>
                    </YStack>
                  </YStack>
                )}
              </YStack>
            </Card>
          ))}

          <XStack gap="$3" justifyContent="center" marginTop="$4">
            <Button
              flex={1}
              variant="outlined"
              onPress={handleCancel}
              accessibilityLabel="Cancel configuration changes"
            >
              Cancel
            </Button>
            <Button
              flex={1}
              variant="solid"
              backgroundColor={hasChanges ? '$green10' : '$gray8'}
              disabled={!hasChanges}
              onPress={handleSave}
              accessibilityLabel="Save configuration changes"
            >
              Save Changes
            </Button>
          </XStack>
        </YStack>
      </Card>
    </ScrollView>
  );
};

export default FlowIntensityConfig;
