import React, { useMemo } from 'react';
import { View, YStack, XStack, Text } from '@tamagui/core';
import { ConfidenceInterval, PredictionVisualization } from '@shared-types/prediction';

interface ConfidenceIntervalChartProps {
  intervals: ConfidenceInterval;
  centerDate: string;
  visualization: PredictionVisualization;
  showLabels?: boolean;
  showProbabilities?: boolean;
  stealthMode?: boolean;
  onIntervalTap?: (level: 'p50' | 'p80' | 'p95') => void;
}

/**
 * Interactive confidence interval visualization component
 * Shows uncertainty bands with appropriate styling for different confidence levels
 */
export const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({
  intervals,
  centerDate,
  visualization,
  showLabels = true,
  showProbabilities = false,
  stealthMode = false,
  onIntervalTap,
}) => {
  // Calculate visual dimensions and positions
  const chartDimensions = useMemo(() => {
    const maxInterval = Math.max(intervals.p50, intervals.p80, intervals.p95);
    const scale = 280 / maxInterval; // Chart width of 280px

    return {
      scale,
      centerX: 150, // Center position
      chartWidth: 300,
      chartHeight: 120,
    };
  }, [intervals]);

  // Generate interval band data
  const intervalBands = useMemo(
    () => [
      {
        level: 'p95' as const,
        width: intervals.p95,
        confidence: '95%',
        color: stealthMode ? '#E5E7EB' : '#EF4444',
        opacity: 0.2,
        strokeColor: stealthMode ? '#9CA3AF' : '#DC2626',
        strokeWidth: 1,
      },
      {
        level: 'p80' as const,
        width: intervals.p80,
        confidence: '80%',
        color: stealthMode ? '#D1D5DB' : '#F59E0B',
        opacity: 0.3,
        strokeColor: stealthMode ? '#6B7280' : '#D97706',
        strokeWidth: 1.5,
      },
      {
        level: 'p50' as const,
        width: intervals.p50,
        confidence: '50%',
        color: stealthMode ? '#9CA3AF' : '#10B981',
        opacity: 0.4,
        strokeColor: stealthMode ? '#4B5563' : '#059669',
        strokeWidth: 2,
      },
    ],
    [intervals, stealthMode]
  );

  // Calculate date labels for interval edges
  const dateLabels = useMemo(() => {
    const centerDateObj = new Date(centerDate);

    return intervalBands.map(band => {
      const halfWidth = band.width / 2;
      const startDate = new Date(centerDateObj);
      const endDate = new Date(centerDateObj);

      startDate.setDate(startDate.getDate() - halfWidth);
      endDate.setDate(endDate.getDate() + halfWidth);

      return {
        level: band.level,
        startDate: startDate.toLocaleDateString('tr-TR', {
          month: 'short',
          day: 'numeric',
        }),
        endDate: endDate.toLocaleDateString('tr-TR', {
          month: 'short',
          day: 'numeric',
        }),
      };
    });
  }, [centerDate, intervalBands]);

  const formatConfidenceText = (confidence: string, level: string) => {
    if (stealthMode) {
      return level === 'p50' ? 'Muhtemel' : level === 'p80' ? 'Olası' : 'Geniş';
    }
    return `${confidence} Güven`;
  };

  return (
    <YStack space="$3" padding="$4">
      {/* Chart Title */}
      {showLabels && (
        <Text fontSize="$5" fontWeight="600" color="$color12" textAlign="center">
          {stealthMode ? 'Zaman Aralığı Tahminleri' : 'Güven Aralıkları'}
        </Text>
      )}

      {/* Main Chart Container */}
      <View
        width={chartDimensions.chartWidth}
        height={chartDimensions.chartHeight}
        backgroundColor="$background"
        borderRadius="$4"
        padding="$3"
        alignSelf="center"
        position="relative"
      >
        {/* Center line */}
        <View
          position="absolute"
          left={chartDimensions.centerX}
          top="$2"
          bottom="$2"
          width={2}
          backgroundColor="$color12"
          opacity={0.6}
        />

        {/* Interval bands - render from widest to narrowest */}
        {intervalBands.map((band, index) => {
          const bandWidth = band.width * chartDimensions.scale;
          const leftPosition = chartDimensions.centerX - bandWidth / 2;

          return (
            <View
              key={band.level}
              position="absolute"
              left={leftPosition}
              top={20 + index * 8}
              width={bandWidth}
              height={20}
              backgroundColor={band.color}
              opacity={band.opacity}
              borderColor={band.strokeColor}
              borderWidth={band.strokeWidth}
              borderRadius="$2"
              pressStyle={{ opacity: band.opacity + 0.1 }}
              onPress={() => onIntervalTap?.(band.level)}
            >
              {/* Confidence level label */}
              {showLabels && (
                <Text
                  position="absolute"
                  right="$2"
                  top="$1"
                  fontSize="$2"
                  color={band.strokeColor}
                  fontWeight="600"
                >
                  {formatConfidenceText(band.confidence, band.level)}
                </Text>
              )}
            </View>
          );
        })}

        {/* Center date marker */}
        <View
          position="absolute"
          left={chartDimensions.centerX - 20}
          bottom="$1"
          width={40}
          alignItems="center"
        >
          <View
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor="$color12"
            marginBottom="$1"
          />
          <Text fontSize="$1" color="$color11">
            {new Date(centerDate).toLocaleDateString('tr-TR', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* Probability Distribution Curve */}
      {showProbabilities && visualization.probabilityChart && (
        <View marginTop="$4">
          <ProbabilityDistributionCurve
            data={visualization.probabilityChart}
            stealthMode={stealthMode}
          />
        </View>
      )}

      {/* Interval Details */}
      {showLabels && (
        <YStack space="$2" marginTop="$3">
          <Text fontSize="$3" color="$color11" textAlign="center">
            {stealthMode ? 'Aralık Detayları' : 'Güven Aralığı Detayları'}
          </Text>

          {dateLabels.map(dateLabel => {
            const band = intervalBands.find(b => b.level === dateLabel.level);
            if (!band) return null;

            return (
              <XStack
                key={dateLabel.level}
                justifyContent="space-between"
                alignItems="center"
                paddingHorizontal="$3"
              >
                <Text fontSize="$3" color={band.strokeColor}>
                  {formatConfidenceText(band.confidence, band.level)}
                </Text>
                <Text fontSize="$3" color="$color11">
                  {dateLabel.startDate} - {dateLabel.endDate}
                </Text>
                <Text fontSize="$2" color="$color10">
                  ±{Math.floor(band.width / 2)} gün
                </Text>
              </XStack>
            );
          })}
        </YStack>
      )}

      {/* Interactive Legend */}
      <IntervalLegend
        intervals={intervals}
        stealthMode={stealthMode}
        onLevelSelect={onIntervalTap}
      />
    </YStack>
  );
};

/**
 * Probability distribution curve component
 */
const ProbabilityDistributionCurve: React.FC<{
  data: { dates: string[]; probabilities: number[] };
  stealthMode: boolean;
}> = ({ data, stealthMode }) => {
  const maxProbability = Math.max(...data.probabilities);
  const curveHeight = 60;

  return (
    <YStack space="$2">
      <Text fontSize="$3" color="$color11" textAlign="center">
        {stealthMode ? 'Olasılık Dağılımı' : 'Tahmin Olasılıkları'}
      </Text>

      <View
        height={curveHeight + 20}
        width="100%"
        backgroundColor="$background"
        borderRadius="$3"
        position="relative"
        overflow="hidden"
      >
        {/* Probability curve */}
        {data.probabilities.map((prob, index) => {
          const height = (prob / maxProbability) * curveHeight;
          const width = 100 / data.probabilities.length;

          return (
            <View
              key={index}
              position="absolute"
              left={`${index * width}%`}
              bottom={10}
              width={`${width}%`}
              height={height}
              backgroundColor={stealthMode ? '#9CA3AF' : '#3B82F6'}
              opacity={0.7}
            />
          );
        })}
      </View>
    </YStack>
  );
};

/**
 * Interactive legend component
 */
const IntervalLegend: React.FC<{
  intervals: ConfidenceInterval;
  stealthMode: boolean;
  onLevelSelect?: (level: 'p50' | 'p80' | 'p95') => void;
}> = ({ intervals, stealthMode, onLevelSelect }) => {
  const legendItems = [
    {
      level: 'p50' as const,
      label: stealthMode ? 'Yüksek Olasılık' : '%50 Güven',
      value: intervals.p50,
      color: stealthMode ? '#9CA3AF' : '#10B981',
    },
    {
      level: 'p80' as const,
      label: stealthMode ? 'İyi Olasılık' : '%80 Güven',
      value: intervals.p80,
      color: stealthMode ? '#D1D5DB' : '#F59E0B',
    },
    {
      level: 'p95' as const,
      label: stealthMode ? 'Geniş Aralık' : '%95 Güven',
      value: intervals.p95,
      color: stealthMode ? '#E5E7EB' : '#EF4444',
    },
  ];

  return (
    <YStack space="$2">
      <Text fontSize="$3" color="$color11" textAlign="center">
        Aralık Seviyeleri
      </Text>

      <XStack justifyContent="space-around" paddingHorizontal="$2">
        {legendItems.map(item => (
          <YStack
            key={item.level}
            alignItems="center"
            space="$1"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => onLevelSelect?.(item.level)}
          >
            <View
              width={16}
              height={16}
              backgroundColor={item.color}
              borderRadius="$1"
              borderWidth={1}
              borderColor="$borderColor"
            />
            <Text fontSize="$2" color="$color11" textAlign="center">
              {item.label}
            </Text>
            <Text fontSize="$1" color="$color10">
              ±{Math.floor(item.value / 2)}g
            </Text>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
};

export default ConfidenceIntervalChart;
