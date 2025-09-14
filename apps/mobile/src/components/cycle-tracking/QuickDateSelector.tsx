import React from 'react';
import { Button, XStack, YStack, Text } from '@tamagui/core';

export interface QuickDateSelectorProps {
  onDateSelect: (date: string, label: string) => void;
  stealthMode?: boolean;
  disabled?: boolean;
}

export const QuickDateSelector: React.FC<QuickDateSelectorProps> = ({
  onDateSelect,
  stealthMode = false,
  disabled = false,
}) => {
  const getQuickDates = () => {
    const today = new Date();
    const dates = [];

    // Today
    dates.push({
      date: today.toISOString().split('T')[0],
      label: 'Today',
      relativeLabel: 'Today',
    });

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    dates.push({
      date: yesterday.toISOString().split('T')[0],
      label: 'Yesterday',
      relativeLabel: '1 day ago',
    });

    // 2 days ago
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    dates.push({
      date: twoDaysAgo.toISOString().split('T')[0],
      label: '2 days ago',
      relativeLabel: '2 days ago',
    });

    // 3 days ago
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    dates.push({
      date: threeDaysAgo.toISOString().split('T')[0],
      label: '3 days ago',
      relativeLabel: '3 days ago',
    });

    // 1 week ago
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    dates.push({
      date: oneWeekAgo.toISOString().split('T')[0],
      label: '1 week ago',
      relativeLabel: '1 week ago',
    });

    return dates;
  };

  const quickDates = getQuickDates();

  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <YStack space="$3">
      <Text fontWeight="bold" color={stealthMode ? '#666666' : '#2D3748'} fontSize="$4">
        Quick Select
      </Text>

      <YStack space="$2">
        {quickDates.map(item => (
          <Button
            key={item.date}
            size="$4"
            variant="outlined"
            disabled={disabled}
            onPress={() => onDateSelect(item.date, item.label)}
            backgroundColor={stealthMode ? '#F5F5F5' : '#FFFFFF'}
            borderColor={stealthMode ? '#BDBDBD' : '#E2E8F0'}
            color={stealthMode ? '#333333' : '#2D3748'}
            hoverStyle={{
              backgroundColor: stealthMode ? '#EEEEEE' : '#F7FAFC',
              borderColor: stealthMode ? '#9E9E9E' : '#CBD5E0',
            }}
            pressStyle={{
              backgroundColor: stealthMode ? '#E0E0E0' : '#EDF2F7',
            }}
          >
            <XStack space="$2" alignItems="center" justifyContent="space-between" width="100%">
              <Text fontSize="$3" fontWeight="500">
                {item.label}
              </Text>
              <Text fontSize="$2" color={stealthMode ? '#666666' : '#718096'}>
                {formatDisplayDate(item.date)}
              </Text>
            </XStack>
          </Button>
        ))}
      </YStack>

      {/* Custom date option */}
      <Button
        size="$4"
        variant="outlined"
        disabled={disabled}
        onPress={() => {
          // This could trigger a date picker modal
          // For now, we'll use today as fallback
          const today = new Date().toISOString().split('T')[0];
          onDateSelect(today, 'Custom Date');
        }}
        backgroundColor={stealthMode ? '#F5F5F5' : '#FFFFFF'}
        borderColor={stealthMode ? '#BDBDBD' : '#E2E8F0'}
        color={stealthMode ? '#333333' : '#2D3748'}
        borderStyle="dashed"
      >
        <Text fontSize="$3">Choose Custom Date...</Text>
      </Button>
    </YStack>
  );
};
