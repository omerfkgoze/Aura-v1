'use client';

import { useState } from 'react';
import { Button } from '@tamagui/button';
import { Card } from '@tamagui/card';
import { H3 } from '@tamagui/text';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';

export type CulturalPreset = 'global' | 'high-privacy' | 'professional' | 'invisible';

interface CulturalPresetOption {
  id: CulturalPreset;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const presetOptions: CulturalPresetOption[] = [
  {
    id: 'global',
    name: 'Global Default',
    description: 'Standard privacy with full functionality',
    icon: '🌍',
    color: '#4A7C7E',
  },
  {
    id: 'high-privacy',
    name: 'High Privacy Mode',
    description: 'Enhanced stealth for sensitive environments',
    icon: '🔒',
    color: '#2E5266',
  },
  {
    id: 'professional',
    name: 'Professional Mode',
    description: 'Workplace-appropriate discrete interface',
    icon: '👔',
    color: '#E8B04B',
  },
  {
    id: 'invisible',
    name: 'Invisible Mode',
    description: 'Complete disguise as alternative app',
    icon: '👤',
    color: '#64748B',
  },
];

interface CulturalPresetToggleProps {
  currentPreset?: CulturalPreset;
  onPresetChange?: (preset: CulturalPreset) => void;
  disabled?: boolean;
}

export function CulturalPresetToggle({
  currentPreset = 'global',
  onPresetChange,
  disabled = false,
}: CulturalPresetToggleProps) {
  const [selectedPreset, setSelectedPreset] = useState<CulturalPreset>(currentPreset);

  const handlePresetSelect = (preset: CulturalPreset) => {
    if (disabled) return;

    setSelectedPreset(preset);
    onPresetChange?.(preset);
  };

  return (
    <Card backgroundColor="$background" borderColor="$borderColor" padding="$6" borderRadius="$4">
      <H3 fontSize="$7" fontWeight="600" color="$gray12" marginBottom="$4">
        Cultural Preset Selection
      </H3>

      <YStack space="$3">
        {presetOptions.map(option => {
          const isSelected = selectedPreset === option.id;

          return (
            <Button
              key={option.id}
              backgroundColor={isSelected ? '$gray2' : 'transparent'}
              borderColor={isSelected ? option.color : '$borderColor'}
              borderWidth={2}
              padding="$4"
              justifyContent="flex-start"
              alignItems="center"
              onPress={() => handlePresetSelect(option.id)}
              disabled={disabled}
              opacity={disabled ? 0.6 : 1}
              hoverStyle={{
                backgroundColor: isSelected ? '$gray3' : '$gray1',
                borderColor: option.color,
              }}
              pressStyle={{ backgroundColor: '$gray4' }}
            >
              <XStack alignItems="center" space="$3" width="100%">
                {/* Icon */}
                <YStack
                  width={48}
                  height={48}
                  borderRadius="$round"
                  backgroundColor={option.color}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontSize="$6">
                    {option.icon}
                  </Text>
                </YStack>

                {/* Content */}
                <YStack flex={1} alignItems="flex-start">
                  <Text
                    fontSize="$5"
                    fontWeight="600"
                    color={isSelected ? option.color : '$gray12'}
                  >
                    {option.name}
                  </Text>
                  <Text fontSize="$3" color="$gray10" marginTop="$1">
                    {option.description}
                  </Text>
                </YStack>

                {/* Selected Indicator */}
                {isSelected && (
                  <YStack
                    width={16}
                    height={16}
                    borderRadius="$round"
                    backgroundColor={option.color}
                    borderWidth={2}
                    borderColor="white"
                  />
                )}
              </XStack>
            </Button>
          );
        })}
      </YStack>

      {/* Current Status */}
      <YStack
        marginTop="$6"
        padding="$4"
        backgroundColor="$blue2"
        borderColor="$blue6"
        borderWidth={1}
        borderRadius="$4"
      >
        <XStack alignItems="center" space="$3">
          <Text fontSize="$2" color="$blue11" fontWeight="500">
            Active Mode: {presetOptions.find(p => p.id === selectedPreset)?.name}
          </Text>
          {disabled && (
            <Text fontSize="$2" color="$orange11">
              (Preview Mode - Changes not applied)
            </Text>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}
