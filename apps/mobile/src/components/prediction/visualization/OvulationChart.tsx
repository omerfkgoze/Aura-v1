import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, XStack, YStack, Button } from '@tamagui/core';
import { OvulationPrediction } from '@aura/shared-types';

interface OvulationChartProps {
  prediction: OvulationPrediction;
  showUncertainty?: boolean;
  stealthMode?: boolean;
  onExploreUncertainty?: () => void;
}

/**
 * Interactive ovulation prediction visualization with uncertainty bands
 * Supports stealth mode and cultural adaptations
 */
export const OvulationChart: React.FC<OvulationChartProps> = ({
  prediction,
  showUncertainty = true,
  stealthMode = false,
  onExploreUncertainty,
}) => {
  const chartData = useMemo(() => {
    return generateOvulationChartData(prediction);
  }, [prediction]);

  const colorScheme = useMemo(() => {
    return stealthMode ? getStealthColorScheme() : getDefaultColorScheme();
  }, [stealthMode]);

  return (
    <YStack padding="$4" backgroundColor={colorScheme.background}>
      {/* Chart Title */}
      <Text
        fontSize="$6"
        fontWeight="600"
        color={colorScheme.text}
        textAlign="center"
        marginBottom="$3"
      >
        {stealthMode ? 'Cycle Timing' : 'Ovulation Prediction'}
      </Text>

      {/* Fertility Window Visualization */}
      <View style={styles.chartContainer}>
        <FertilityWindowChart
          fertilityWindow={prediction.fertilityWindow}
          probabilityDistribution={prediction.probabilityDistribution}
          colorScheme={colorScheme}
          stealthMode={stealthMode}
        />
      </View>

      {/* Confidence Intervals Display */}
      {showUncertainty && (
        <ConfidenceIntervalsDisplay
          intervals={prediction.confidenceIntervals}
          colorScheme={colorScheme}
          stealthMode={stealthMode}
        />
      )}

      {/* Uncertainty Factors */}
      <UncertaintyFactorsDisplay
        factors={prediction.uncertaintyFactors}
        colorScheme={colorScheme}
        stealthMode={stealthMode}
      />

      {/* Prediction Explanation */}
      <View style={styles.explanationContainer}>
        <Text fontSize="$4" color={colorScheme.secondaryText} textAlign="center" marginTop="$3">
          {prediction.explanation}
        </Text>
      </View>

      {/* Explore Uncertainty Button */}
      {onExploreUncertainty && (
        <Button marginTop="$4" backgroundColor={colorScheme.accent} onPress={onExploreUncertainty}>
          <Text color={colorScheme.buttonText}>
            {stealthMode ? 'View Details' : 'Explore Uncertainty'}
          </Text>
        </Button>
      )}
    </YStack>
  );
};

/**
 * Fertility window chart component
 */
const FertilityWindowChart: React.FC<{
  fertilityWindow: OvulationPrediction['fertilityWindow'];
  probabilityDistribution: number[];
  colorScheme: ColorScheme;
  stealthMode: boolean;
}> = ({ fertilityWindow, probabilityDistribution, colorScheme, stealthMode }) => {
  const chartDays = useMemo(() => {
    return generateFertilityWindowDays(fertilityWindow, probabilityDistribution);
  }, [fertilityWindow, probabilityDistribution]);

  return (
    <View style={styles.fertilityChart}>
      <XStack justifyContent="space-between" marginBottom="$2">
        {chartDays.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <View
              style={[
                styles.probabilityBar,
                {
                  height: day.probability * 100,
                  backgroundColor: getFertilityColor(day.probability, colorScheme, stealthMode),
                },
              ]}
            />
            <Text fontSize="$2" color={colorScheme.secondaryText} textAlign="center" marginTop="$1">
              {day.dayLabel}
            </Text>
          </View>
        ))}
      </XStack>

      {/* Peak fertility indicator */}
      <View style={styles.peakIndicator}>
        <Text fontSize="$3" fontWeight="600" color={colorScheme.accent} textAlign="center">
          {stealthMode ? 'Peak Day' : 'Most Likely Ovulation'}
        </Text>
      </View>
    </View>
  );
};

/**
 * Confidence intervals display component
 */
const ConfidenceIntervalsDisplay: React.FC<{
  intervals: OvulationPrediction['confidenceIntervals'];
  colorScheme: ColorScheme;
  stealthMode: boolean;
}> = ({ intervals, colorScheme, stealthMode }) => {
  return (
    <YStack
      marginTop="$4"
      padding="$3"
      backgroundColor={colorScheme.cardBackground}
      borderRadius="$4"
    >
      <Text fontSize="$5" fontWeight="600" color={colorScheme.text} marginBottom="$2">
        {stealthMode ? 'Timing Confidence' : 'Prediction Confidence'}
      </Text>

      <ConfidenceBar
        level="50%"
        range={intervals.p50}
        color={colorScheme.confidence50}
        description={stealthMode ? 'Most likely range' : '50% confidence range'}
      />

      <ConfidenceBar
        level="80%"
        range={intervals.p80}
        color={colorScheme.confidence80}
        description={stealthMode ? 'Likely range' : '80% confidence range'}
      />

      <ConfidenceBar
        level="95%"
        range={intervals.p95}
        color={colorScheme.confidence95}
        description={stealthMode ? 'Possible range' : '95% confidence range'}
      />
    </YStack>
  );
};

/**
 * Individual confidence bar component
 */
const ConfidenceBar: React.FC<{
  level: string;
  range: number;
  color: string;
  description: string;
}> = ({ level, range, color, description }) => {
  return (
    <XStack alignItems="center" marginVertical="$1">
      <View style={[styles.confidenceIndicator, { backgroundColor: color }]} />
      <YStack flex={1} marginLeft="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$4" fontWeight="500">
            {level}
          </Text>
          <Text fontSize="$4">±{range} days</Text>
        </XStack>
        <Text fontSize="$3" color="$gray10" marginTop="$1">
          {description}
        </Text>
      </YStack>
    </XStack>
  );
};

/**
 * Uncertainty factors display component
 */
const UncertaintyFactorsDisplay: React.FC<{
  factors: OvulationPrediction['uncertaintyFactors'];
  colorScheme: ColorScheme;
  stealthMode: boolean;
}> = ({ factors, colorScheme, stealthMode }) => {
  const factorItems = useMemo(
    () => [
      {
        label: stealthMode ? 'Data Amount' : 'Data Quality',
        value: factors.dataQuality,
        description: getDataQualityDescription(factors.dataQuality, stealthMode),
      },
      {
        label: stealthMode ? 'History' : 'History Length',
        value: factors.historyLength / 12, // Normalize to years
        description: getHistoryDescription(factors.historyLength, stealthMode),
      },
      {
        label: stealthMode ? 'Regularity' : 'Cycle Regularity',
        value: 1 - factors.cycleLengthVariability, // Higher value = more regular
        description: getRegularityDescription(factors.cycleLengthVariability, stealthMode),
      },
    ],
    [factors, stealthMode]
  );

  return (
    <YStack
      marginTop="$4"
      padding="$3"
      backgroundColor={colorScheme.cardBackground}
      borderRadius="$4"
    >
      <Text fontSize="$5" fontWeight="600" color={colorScheme.text} marginBottom="$3">
        {stealthMode ? 'Prediction Factors' : 'Uncertainty Factors'}
      </Text>

      {factorItems.map((item, index) => (
        <UncertaintyFactorBar
          key={index}
          label={item.label}
          value={item.value}
          description={item.description}
          colorScheme={colorScheme}
        />
      ))}
    </YStack>
  );
};

/**
 * Individual uncertainty factor bar
 */
const UncertaintyFactorBar: React.FC<{
  label: string;
  value: number;
  description: string;
  colorScheme: ColorScheme;
}> = ({ label, value, description, colorScheme }) => {
  const normalizedValue = Math.max(0, Math.min(1, value));
  const barColor = getFactorColor(normalizedValue, colorScheme);

  return (
    <YStack marginVertical="$2">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
        <Text fontSize="$4" fontWeight="500" color={colorScheme.text}>
          {label}
        </Text>
        <Text fontSize="$4" color={colorScheme.secondaryText}>
          {Math.round(normalizedValue * 100)}%
        </Text>
      </XStack>

      <View style={[styles.factorBarBackground, { backgroundColor: colorScheme.barBackground }]}>
        <View
          style={[
            styles.factorBar,
            {
              width: `${normalizedValue * 100}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      <Text fontSize="$3" color={colorScheme.secondaryText} marginTop="$1">
        {description}
      </Text>
    </YStack>
  );
};

// Utility functions
function generateOvulationChartData(prediction: OvulationPrediction) {
  const ovulationDate = new Date(prediction.ovulationDate);
  const windowStart = new Date(prediction.fertilityWindow.start);
  const windowEnd = new Date(prediction.fertilityWindow.end);

  return {
    ovulationDate,
    windowStart,
    windowEnd,
    duration: Math.abs(windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24),
  };
}

function generateFertilityWindowDays(
  fertilityWindow: OvulationPrediction['fertilityWindow'],
  probabilityDistribution: number[]
) {
  const days = [];
  const startDate = new Date(fertilityWindow.start);
  const endDate = new Date(fertilityWindow.end);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i <= totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const probability = probabilityDistribution[i] || 0;

    days.push({
      date: currentDate,
      dayLabel: currentDate.getDate().toString(),
      probability: probability,
      isFertile: probability > 0.1,
    });
  }

  return days;
}

function getFertilityColor(
  probability: number,
  colorScheme: ColorScheme,
  stealthMode: boolean
): string {
  if (stealthMode) {
    if (probability > 0.7) return colorScheme.stealthHigh;
    if (probability > 0.4) return colorScheme.stealthMedium;
    return colorScheme.stealthLow;
  }

  if (probability > 0.7) return colorScheme.fertilityHigh;
  if (probability > 0.4) return colorScheme.fertilityMedium;
  return colorScheme.fertilityLow;
}

function getFactorColor(value: number, colorScheme: ColorScheme): string {
  if (value > 0.7) return colorScheme.factorGood;
  if (value > 0.4) return colorScheme.factorMedium;
  return colorScheme.factorPoor;
}

function getDataQualityDescription(quality: number, stealthMode: boolean): string {
  if (stealthMode) {
    if (quality > 0.8) return 'Complete information available';
    if (quality > 0.6) return 'Good information available';
    return 'Limited information available';
  }

  if (quality > 0.8) return 'High quality data improves accuracy';
  if (quality > 0.6) return 'Good data quality with some gaps';
  return 'Limited data affects prediction reliability';
}

function getHistoryDescription(cycles: number, stealthMode: boolean): string {
  if (stealthMode) {
    if (cycles >= 6) return `${cycles} cycles recorded`;
    return `${cycles} cycles (more data helpful)`;
  }

  if (cycles >= 6) return `${cycles} cycles provide reliable patterns`;
  return `${cycles} cycles - more history will improve accuracy`;
}

function getRegularityDescription(variability: number, stealthMode: boolean): string {
  if (stealthMode) {
    if (variability < 0.1) return 'Very consistent patterns';
    if (variability < 0.2) return 'Mostly consistent patterns';
    return 'Variable patterns';
  }

  if (variability < 0.1) return 'Very regular cycles enable accurate prediction';
  if (variability < 0.2) return 'Moderately regular with some variation';
  return 'Irregular cycles increase uncertainty';
}

// Color schemes
interface ColorScheme {
  background: string;
  cardBackground: string;
  text: string;
  secondaryText: string;
  accent: string;
  buttonText: string;
  confidence50: string;
  confidence80: string;
  confidence95: string;
  fertilityHigh: string;
  fertilityMedium: string;
  fertilityLow: string;
  stealthHigh: string;
  stealthMedium: string;
  stealthLow: string;
  factorGood: string;
  factorMedium: string;
  factorPoor: string;
  barBackground: string;
}

function getDefaultColorScheme(): ColorScheme {
  return {
    background: '#ffffff',
    cardBackground: '#f8f9fa',
    text: '#1a1a1a',
    secondaryText: '#6b7280',
    accent: '#ec4899',
    buttonText: '#ffffff',
    confidence50: '#fbbf24',
    confidence80: '#f59e0b',
    confidence95: '#d97706',
    fertilityHigh: '#10b981',
    fertilityMedium: '#34d399',
    fertilityLow: '#a7f3d0',
    stealthHigh: '#374151',
    stealthMedium: '#6b7280',
    stealthLow: '#9ca3af',
    factorGood: '#10b981',
    factorMedium: '#fbbf24',
    factorPoor: '#ef4444',
    barBackground: '#e5e7eb',
  };
}

function getStealthColorScheme(): ColorScheme {
  return {
    background: '#1f2937',
    cardBackground: '#374151',
    text: '#f9fafb',
    secondaryText: '#d1d5db',
    accent: '#6b7280',
    buttonText: '#f9fafb',
    confidence50: '#9ca3af',
    confidence80: '#6b7280',
    confidence95: '#4b5563',
    fertilityHigh: '#6b7280',
    fertilityMedium: '#9ca3af',
    fertilityLow: '#d1d5db',
    stealthHigh: '#4b5563',
    stealthMedium: '#6b7280',
    stealthLow: '#9ca3af',
    factorGood: '#6b7280',
    factorMedium: '#9ca3af',
    factorPoor: '#4b5563',
    barBackground: '#4b5563',
  };
}

const styles = StyleSheet.create({
  chartContainer: {
    height: 200,
    marginVertical: 16,
  },
  fertilityChart: {
    flex: 1,
    paddingHorizontal: 8,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  probabilityBar: {
    width: 24,
    borderRadius: 4,
    minHeight: 8,
  },
  peakIndicator: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  explanationContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  confidenceIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  factorBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  factorBar: {
    height: '100%',
    borderRadius: 4,
  },
});
