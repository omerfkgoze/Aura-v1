import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Button, Card, YStack, XStack, Circle, Progress } from '@tamagui/core';
import { FlowIntensity, PeriodDayData } from '@aura/shared-types';
import { FlowIntensitySelector } from './FlowIntensitySelector';
import { useAccessibility } from '../../utils/accessibility';
import { format, parseISO, differenceInDays } from 'date-fns';

interface FlowIntensityConfig {
  intensity: FlowIntensity;
  label: string;
  description: string;
  color: string;
  stealthColor: string;
  icon: string;
}

interface FlowChange {
  date: string;
  fromIntensity: FlowIntensity | null;
  toIntensity: FlowIntensity;
  timestamp: string;
}

interface FlowIntensityTrackerProps {
  selectedDate: string;
  currentPeriodData: PeriodDayData[];
  onFlowIntensityChange: (date: string, intensity: FlowIntensity) => void;
  flowConfig?: FlowIntensityConfig[];
  stealthMode?: boolean;
  disabled?: boolean;
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

export const FlowIntensityTracker: React.FC<FlowIntensityTrackerProps> = ({
  selectedDate,
  currentPeriodData,
  onFlowIntensityChange,
  flowConfig = DEFAULT_FLOW_CONFIG,
  stealthMode = false,
  disabled = false,
}) => {
  const { getAccessibilityLabel } = useAccessibility();
  const [flowChanges, setFlowChanges] = useState<FlowChange[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Get current intensity for selected date
  const getCurrentIntensity = (): FlowIntensity | undefined => {
    const dayData = currentPeriodData.find(day => day.date === selectedDate);
    return dayData?.flowIntensity;
  };

  // Calculate flow patterns and trends
  const calculateFlowPatterns = () => {
    if (currentPeriodData.length === 0) return null;

    const sortedData = [...currentPeriodData].sort((a, b) => a.date.localeCompare(b.date));
    const totalDays = sortedData.length;
    const intensityCounts = sortedData.reduce(
      (acc, day) => {
        acc[day.flowIntensity] = (acc[day.flowIntensity] || 0) + 1;
        return acc;
      },
      {} as Record<FlowIntensity, number>
    );

    const peakDay = sortedData.reduce((peak, current) => {
      const peakIndex = flowConfig.findIndex(c => c.intensity === peak.flowIntensity);
      const currentIndex = flowConfig.findIndex(c => c.intensity === current.flowIntensity);
      return currentIndex > peakIndex ? current : peak;
    });

    return {
      totalDays,
      intensityCounts,
      peakDay,
      peakIntensity: peakDay.flowIntensity,
      averageIntensity: calculateAverageIntensity(sortedData),
    };
  };

  const calculateAverageIntensity = (data: PeriodDayData[]): number => {
    const intensityValues = { none: 0, spotting: 1, light: 2, medium: 3, heavy: 4 };
    const total = data.reduce((sum, day) => sum + intensityValues[day.flowIntensity], 0);
    return Math.round((total / data.length) * 10) / 10;
  };

  const handleIntensityChange = (newIntensity: FlowIntensity) => {
    const currentIntensity = getCurrentIntensity();

    // Create flow change record
    const flowChange: FlowChange = {
      date: selectedDate,
      fromIntensity: currentIntensity || null,
      toIntensity: newIntensity,
      timestamp: new Date().toISOString(),
    };

    setFlowChanges(prev => [...prev, flowChange]);
    onFlowIntensityChange(selectedDate, newIntensity);

    // Provide feedback about the change
    if (currentIntensity && currentIntensity !== newIntensity) {
      const fromConfig = flowConfig.find(c => c.intensity === currentIntensity);
      const toConfig = flowConfig.find(c => c.intensity === newIntensity);

      if (fromConfig && toConfig) {
        setTimeout(() => {
          Alert.alert(
            stealthMode ? 'Level Updated' : 'Flow Updated',
            stealthMode
              ? `Changed from ${fromConfig.label} to ${toConfig.label}`
              : `Flow intensity changed from ${fromConfig.label} to ${toConfig.label}`,
            [{ text: 'OK' }]
          );
        }, 100);
      }
    }
  };

  const getFlowTrend = (): 'increasing' | 'decreasing' | 'stable' | 'unknown' => {
    if (currentPeriodData.length < 2) return 'unknown';

    const sortedData = [...currentPeriodData]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-3); // Look at last 3 days

    if (sortedData.length < 2) return 'unknown';

    const intensityValues = { none: 0, spotting: 1, light: 2, medium: 3, heavy: 4 };
    const values = sortedData.map(day => intensityValues[day.flowIntensity]);

    const trend = values[values.length - 1] - values[0];
    if (trend > 0) return 'increasing';
    if (trend < 0) return 'decreasing';
    return 'stable';
  };

  const renderFlowHistory = () => {
    if (!showHistory || currentPeriodData.length === 0) return null;

    const sortedData = [...currentPeriodData].sort((a, b) => b.date.localeCompare(a.date));

    return (
      <Card padding="$3" backgroundColor="$backgroundFocus" marginTop="$3">
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="bold">
            {stealthMode ? 'Recent Levels' : 'Flow History'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2">
              {sortedData.slice(0, 7).map(dayData => {
                const config = flowConfig.find(c => c.intensity === dayData.flowIntensity);
                const isToday = dayData.date === selectedDate;

                return (
                  <YStack key={dayData.date} alignItems="center" gap="$1">
                    <Text fontSize="$1" color="$color10">
                      {format(parseISO(dayData.date), 'MMM dd')}
                    </Text>
                    <Circle
                      size="$3"
                      backgroundColor={
                        config ? (stealthMode ? config.stealthColor : config.color) : '#E5E5E5'
                      }
                      borderWidth={isToday ? 2 : 1}
                      borderColor={isToday ? '$borderColorFocus' : '$borderColor'}
                    >
                      <Text fontSize="$3">{config?.icon || '?'}</Text>
                    </Circle>
                    <Text fontSize="$1">{config?.label || 'Unknown'}</Text>
                  </YStack>
                );
              })}
            </XStack>
          </ScrollView>
        </YStack>
      </Card>
    );
  };

  const renderFlowPatterns = () => {
    const patterns = calculateFlowPatterns();
    if (!patterns || currentPeriodData.length < 2) return null;

    const trend = getFlowTrend();
    const trendEmoji = {
      increasing: '📈',
      decreasing: '📉',
      stable: '📊',
      unknown: '❓',
    };

    return (
      <Card padding="$3" backgroundColor="$backgroundFocus" marginTop="$3">
        <YStack gap="$3">
          <Text fontSize="$4" fontWeight="bold">
            {stealthMode ? 'Pattern Analysis' : 'Flow Patterns'}
          </Text>

          <XStack gap="$4" flexWrap="wrap">
            <YStack alignItems="center" gap="$1">
              <Text fontSize="$5">{trendEmoji[trend]}</Text>
              <Text fontSize="$2" color="$color10">
                Trend
              </Text>
              <Text fontSize="$3" textTransform="capitalize">
                {trend}
              </Text>
            </YStack>

            <YStack alignItems="center" gap="$1">
              <Text fontSize="$5">{patterns.totalDays}</Text>
              <Text fontSize="$2" color="$color10">
                Days
              </Text>
              <Text fontSize="$3">Tracked</Text>
            </YStack>

            <YStack alignItems="center" gap="$1">
              <Circle
                size="$2"
                backgroundColor={
                  flowConfig.find(c => c.intensity === patterns.peakIntensity)?.color || '#E5E5E5'
                }
              >
                <Text fontSize="$1">
                  {flowConfig.find(c => c.intensity === patterns.peakIntensity)?.icon || '?'}
                </Text>
              </Circle>
              <Text fontSize="$2" color="$color10">
                Peak
              </Text>
              <Text fontSize="$3">
                {flowConfig.find(c => c.intensity === patterns.peakIntensity)?.label || 'Unknown'}
              </Text>
            </YStack>
          </XStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="bold">
              Intensity Distribution:
            </Text>
            {Object.entries(patterns.intensityCounts).map(([intensity, count]) => {
              const config = flowConfig.find(c => c.intensity === (intensity as FlowIntensity));
              const percentage = (count / patterns.totalDays) * 100;

              return (
                <XStack key={intensity} gap="$2" alignItems="center">
                  <Circle size="$2" backgroundColor={config?.color || '#E5E5E5'}>
                    <Text fontSize="$1">{config?.icon || '?'}</Text>
                  </Circle>
                  <Text fontSize="$3" flex={1}>
                    {config?.label || intensity}
                  </Text>
                  <Progress value={percentage} max={100} width={60} height={8} />
                  <Text fontSize="$2" width={40} textAlign="right">
                    {count} days
                  </Text>
                </XStack>
              );
            })}
          </YStack>
        </YStack>
      </Card>
    );
  };

  return (
    <YStack gap="$3">
      <FlowIntensitySelector
        selectedIntensity={getCurrentIntensity()}
        onIntensityChange={handleIntensityChange}
        customConfig={flowConfig}
        stealthMode={stealthMode}
        disabled={disabled}
      />

      <XStack gap="$2" justifyContent="center">
        <Button
          size="$3"
          variant="outlined"
          onPress={() => setShowHistory(!showHistory)}
          accessibilityLabel={`${showHistory ? 'Hide' : 'Show'} flow history`}
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </Button>

        {currentPeriodData.length > 0 && (
          <Button
            size="$3"
            variant="outlined"
            onPress={() => {
              // Show detailed analytics
              Alert.alert(
                stealthMode ? 'Level Analytics' : 'Flow Analytics',
                `Date: ${format(parseISO(selectedDate), 'MMMM dd, yyyy')}\n` +
                  `Current: ${flowConfig.find(c => c.intensity === getCurrentIntensity())?.label || 'None'}\n` +
                  `Trend: ${getFlowTrend()}\n` +
                  `Total tracked days: ${currentPeriodData.length}`,
                [{ text: 'OK' }]
              );
            }}
            accessibilityLabel="Show detailed flow analytics"
          >
            Analytics
          </Button>
        )}
      </XStack>

      {renderFlowHistory()}
      {renderFlowPatterns()}
    </YStack>
  );
};

export default FlowIntensityTracker;
