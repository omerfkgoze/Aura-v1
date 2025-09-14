import React, { useState, useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  Progress,
  LinearGradient,
  Circle,
} from '@tamagui/core';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from '@tamagui/lucide-icons';
import type { Symptom, SymptomCategory } from '@aura/shared-types';
import { useAccessibility } from '../../utils/accessibility';

interface SymptomTrend {
  symptomId: string;
  symptomName: string;
  category: SymptomCategory;
  currentSeverity: number;
  previousSeverity?: number;
  trend: 'up' | 'down' | 'stable' | 'new';
  changePercent: number;
}

interface DailySymptomData {
  date: string;
  symptoms: Symptom[];
}

interface SymptomIntensityTrackerProps {
  currentSymptoms: Symptom[];
  historicalData?: DailySymptomData[];
  stealthMode?: boolean;
  showTrends?: boolean;
  testID?: string;
}

export const SymptomIntensityTracker: React.FC<SymptomIntensityTrackerProps> = ({
  currentSymptoms,
  historicalData = [],
  stealthMode = false,
  showTrends = true,
  testID = 'symptom-intensity-tracker',
}) => {
  const { getAccessibilityLabel, getAccessibilityHint } = useAccessibility();

  const symptomTrends = useMemo(() => {
    if (!historicalData.length) return [];

    const trends: SymptomTrend[] = [];
    const recentData = historicalData.slice(-7); // Last 7 days
    const previousPeriod = historicalData.slice(-14, -7); // Previous 7 days

    currentSymptoms.forEach(symptom => {
      const recentAvg =
        recentData.reduce((sum, day) => {
          const daySymptom = day.symptoms.find(s => s.id === symptom.id);
          return sum + (daySymptom?.severity || 0);
        }, 0) / recentData.length;

      const previousAvg =
        previousPeriod.reduce((sum, day) => {
          const daySymptom = day.symptoms.find(s => s.id === symptom.id);
          return sum + (daySymptom?.severity || 0);
        }, 0) / previousPeriod.length;

      let trend: 'up' | 'down' | 'stable' | 'new' = 'new';
      let changePercent = 0;

      if (previousAvg > 0) {
        const change = recentAvg - previousAvg;
        changePercent = Math.round((change / previousAvg) * 100);

        if (Math.abs(changePercent) < 10) {
          trend = 'stable';
        } else if (changePercent > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }
      }

      trends.push({
        symptomId: symptom.id,
        symptomName: symptom.name,
        category: symptom.category,
        currentSeverity: symptom.severity || 3,
        previousSeverity: previousAvg > 0 ? Math.round(previousAvg) : undefined,
        trend,
        changePercent: Math.abs(changePercent),
      });
    });

    return trends.sort((a, b) => b.currentSeverity - a.currentSeverity);
  }, [currentSymptoms, historicalData]);

  const categoryStats = useMemo(() => {
    const stats = new Map<
      SymptomCategory,
      { count: number; avgSeverity: number; maxSeverity: number }
    >();

    currentSymptoms.forEach(symptom => {
      const current = stats.get(symptom.category) || { count: 0, avgSeverity: 0, maxSeverity: 0 };
      const severity = symptom.severity || 3;

      stats.set(symptom.category, {
        count: current.count + 1,
        avgSeverity: (current.avgSeverity * current.count + severity) / (current.count + 1),
        maxSeverity: Math.max(current.maxSeverity, severity),
      });
    });

    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      ...data,
      avgSeverity: Math.round(data.avgSeverity * 10) / 10,
    }));
  }, [currentSymptoms]);

  const getSeverityColor = (severity: number) => {
    if (stealthMode) return '#6B7280';

    const colors = [
      '#10B981', // 1 - Green (mild)
      '#22C55E', // 2 - Light green
      '#F59E0B', // 3 - Amber (moderate)
      '#EF4444', // 4 - Red
      '#DC2626', // 5 - Dark red (severe)
    ];

    return colors[Math.max(0, Math.min(4, severity - 1))];
  };

  const getCategoryColor = (category: SymptomCategory) => {
    if (stealthMode) return '#6B7280';

    const colors = {
      mood: '#EC4899',
      physical: '#EF4444',
      energy: '#F59E0B',
      sleep: '#8B5CF6',
      skin: '#06B6D4',
      digestive: '#10B981',
      custom: '#6366F1',
    };

    return colors[category];
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size="$1" color="$red10" />;
      case 'down':
        return <TrendingDown size="$1" color="$green10" />;
      case 'stable':
        return <Minus size="$1" color="$gray10" />;
      default:
        return <BarChart3 size="$1" color="$blue10" />;
    }
  };

  const getSeverityLabel = (severity: number) => {
    const labels = ['', 'Mild', 'Light', 'Moderate', 'Strong', 'Severe'];
    return labels[severity] || 'Moderate';
  };

  if (currentSymptoms.length === 0) {
    return (
      <Card padding="$4" testID={testID}>
        <YStack alignItems="center" space="$3">
          <Circle size={60} backgroundColor="$gray3">
            <BarChart3 size="$2" color="$gray8" />
          </Circle>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            No symptoms selected for tracking
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <YStack space="$4" testID={testID}>
      {/* Overall Intensity Summary */}
      <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$background'}>
        <YStack space="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$5" fontWeight="600">
              Symptom Intensity
            </Text>
            <Text fontSize="$3" color="$gray10">
              {currentSymptoms.length} symptoms tracked
            </Text>
          </XStack>

          <YStack space="$2">
            {currentSymptoms.map(symptom => {
              const trend = symptomTrends.find(t => t.symptomId === symptom.id);
              const severity = symptom.severity || 3;

              return (
                <YStack key={symptom.id} space="$2">
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" space="$3" flex={1}>
                      <YStack
                        width={12}
                        height={12}
                        backgroundColor={getCategoryColor(symptom.category)}
                        borderRadius="$1"
                      />
                      <Text fontSize="$4" flex={1}>
                        {symptom.name}
                      </Text>

                      {showTrends && trend && (
                        <XStack alignItems="center" space="$1">
                          {getTrendIcon(trend.trend)}
                          {trend.changePercent > 0 && (
                            <Text
                              fontSize="$2"
                              color={
                                trend.trend === 'up'
                                  ? '$red10'
                                  : trend.trend === 'down'
                                    ? '$green10'
                                    : '$gray10'
                              }
                            >
                              {trend.changePercent}%
                            </Text>
                          )}
                        </XStack>
                      )}
                    </XStack>

                    <XStack alignItems="center" space="$2">
                      <Text fontSize="$3" fontWeight="500">
                        {severity}/5
                      </Text>
                      <Text fontSize="$2" color="$gray8">
                        {getSeverityLabel(severity)}
                      </Text>
                    </XStack>
                  </XStack>

                  <Progress
                    value={(severity / 5) * 100}
                    backgroundColor="$gray4"
                    testID={`${testID}-progress-${symptom.id}`}
                    accessibilityLabel={getAccessibilityLabel(
                      `${symptom.name} severity: ${getSeverityLabel(severity)}`
                    )}
                  >
                    <Progress.Indicator
                      backgroundColor={getSeverityColor(severity)}
                      animation="bouncy"
                    />
                  </Progress>
                </YStack>
              );
            })}
          </YStack>
        </YStack>
      </Card>

      {/* Category Statistics */}
      {categoryStats.length > 0 && (
        <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$blue1'}>
          <YStack space="$3">
            <Text fontSize="$5" fontWeight="600">
              Category Overview
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack space="$3">
                {categoryStats.map(({ category, count, avgSeverity, maxSeverity }) => (
                  <Card
                    key={category}
                    padding="$3"
                    minWidth={140}
                    backgroundColor={stealthMode ? '$gray3' : '$background'}
                    borderColor={getCategoryColor(category)}
                    borderWidth={1}
                    testID={`${testID}-category-${category}`}
                  >
                    <YStack space="$2" alignItems="center">
                      <YStack
                        width={20}
                        height={20}
                        backgroundColor={getCategoryColor(category)}
                        borderRadius="$2"
                      />
                      <Text
                        fontSize="$4"
                        fontWeight="500"
                        textAlign="center"
                        textTransform="capitalize"
                      >
                        {category}
                      </Text>
                      <YStack alignItems="center" space="$1">
                        <Text fontSize="$2" color="$gray10">
                          {count} symptom{count !== 1 ? 's' : ''}
                        </Text>
                        <Text fontSize="$3" fontWeight="600">
                          Avg: {avgSeverity}/5
                        </Text>
                        <Text fontSize="$2" color="$gray8">
                          Max: {maxSeverity}/5
                        </Text>
                      </YStack>
                    </YStack>
                  </Card>
                ))}
              </XStack>
            </ScrollView>
          </YStack>
        </Card>
      )}

      {/* Trend Analysis */}
      {showTrends && symptomTrends.length > 0 && historicalData.length > 0 && (
        <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$green1'}>
          <YStack space="$3">
            <Text fontSize="$5" fontWeight="600">
              Trend Analysis
            </Text>
            <Text fontSize="$3" color="$gray10">
              Based on last 7 days vs. previous 7 days
            </Text>

            <YStack space="$2">
              {symptomTrends
                .filter(trend => trend.trend !== 'new')
                .slice(0, 5) // Show top 5 trends
                .map(trend => (
                  <XStack
                    key={trend.symptomId}
                    alignItems="center"
                    justifyContent="space-between"
                    padding="$2"
                    backgroundColor={stealthMode ? '$gray3' : '$background'}
                    borderRadius="$2"
                    testID={`${testID}-trend-${trend.symptomId}`}
                  >
                    <XStack alignItems="center" space="$2" flex={1}>
                      {getTrendIcon(trend.trend)}
                      <Text fontSize="$3">{trend.symptomName}</Text>
                    </XStack>

                    <XStack alignItems="center" space="$2">
                      {trend.previousSeverity && (
                        <Text fontSize="$2" color="$gray8">
                          {trend.previousSeverity} → {trend.currentSeverity}
                        </Text>
                      )}
                      <Text
                        fontSize="$2"
                        fontWeight="500"
                        color={
                          trend.trend === 'up'
                            ? '$red10'
                            : trend.trend === 'down'
                              ? '$green10'
                              : '$gray10'
                        }
                      >
                        {trend.trend === 'stable' ? 'Stable' : `${trend.changePercent}%`}
                      </Text>
                    </XStack>
                  </XStack>
                ))}
            </YStack>
          </YStack>
        </Card>
      )}
    </YStack>
  );
};
