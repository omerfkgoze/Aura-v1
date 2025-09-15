import React, { useMemo } from 'react';
import { YStack, XStack, Text, View } from '@tamagui/core';
import {
  LineChart,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Area,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { PredictionVisualization, ConfidenceInterval } from '@aura/shared-types';

interface ProbabilityDistributionChartProps {
  data: PredictionVisualization;
  confidenceIntervals: ConfidenceInterval;
  predictionType: 'period' | 'ovulation';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onPointSelect?: (date: string, probability: number) => void;
}

export const ProbabilityDistributionChart: React.FC<ProbabilityDistributionChartProps> = ({
  data,
  confidenceIntervals,
  predictionType,
  stealthMode = false,
  culturalTheme = 'modern',
  onPointSelect,
}) => {
  // Transform data for visualization
  const chartData = useMemo(() => {
    return data.probabilityChart.dates.map((date, index) => ({
      date,
      probability: data.probabilityChart.probabilities[index],
      p50: data.uncertaintyBands.p50Band[index],
      p80: data.uncertaintyBands.p80Band[index],
      p95: data.uncertaintyBands.p95Band[index],
      formattedDate: new Date(date).toLocaleDateString(),
    }));
  }, [data]);

  // Color scheme based on stealth mode and cultural theme
  const colorScheme = useMemo(() => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        background: '#f5f5f5',
        text: '#333333',
        confidence95: '#e0e0e0',
        confidence80: '#cccccc',
        confidence50: '#999999',
      };
    }

    switch (culturalTheme) {
      case 'traditional':
        return {
          primary: '#8B4513',
          secondary: '#CD853F',
          background: '#FDF5E6',
          text: '#654321',
          confidence95: '#F4A460',
          confidence80: '#DEB887',
          confidence50: '#D2691E',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          background: '#FFFFFF',
          text: '#2C3E50',
          confidence95: '#ECF0F1',
          confidence80: '#D5DBDB',
          confidence50: '#AEB6BF',
        };
      default:
        return predictionType === 'period'
          ? {
              primary: '#E74C3C',
              secondary: '#C0392B',
              background: '#FADBD8',
              text: '#641E16',
              confidence95: '#FADBD8',
              confidence80: '#F1948A',
              confidence50: '#E74C3C',
            }
          : {
              primary: '#3498DB',
              secondary: '#2980B9',
              background: '#D6EAF8',
              text: '#1B4F72',
              confidence95: '#D6EAF8',
              confidence80: '#85C1E9',
              confidence50: '#3498DB',
            };
    }
  }, [stealthMode, culturalTheme, predictionType]);

  const title = useMemo(() => {
    if (stealthMode) {
      return predictionType === 'period' ? 'Cycle Prediction' : 'Fertility Window';
    }
    return predictionType === 'period'
      ? 'Period Probability Distribution'
      : 'Ovulation Probability Distribution';
  }, [stealthMode, predictionType]);

  const probabilityLabel = stealthMode ? 'Likelihood' : 'Probability';

  return (
    <YStack space="$3" padding="$3" backgroundColor={colorScheme.background} borderRadius="$4">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$5" fontWeight="600" color={colorScheme.text}>
          {title}
        </Text>
        <Text fontSize="$3" color={colorScheme.secondary}>
          {chartData.length} days shown
        </Text>
      </XStack>

      {/* Main probability distribution chart */}
      <View height={240}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: colorScheme.text }}
              axisLine={{ stroke: colorScheme.secondary }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: colorScheme.text }}
              axisLine={{ stroke: colorScheme.secondary }}
              label={{ value: probabilityLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colorScheme.background,
                border: `1px solid ${colorScheme.secondary}`,
                borderRadius: '8px',
              }}
              labelStyle={{ color: colorScheme.text }}
            />

            {/* 95% confidence band */}
            <Area
              dataKey="p95"
              stroke="none"
              fill={colorScheme.confidence95}
              fillOpacity={0.3}
              name="95% Confidence"
            />

            {/* 80% confidence band */}
            <Area
              dataKey="p80"
              stroke="none"
              fill={colorScheme.confidence80}
              fillOpacity={0.5}
              name="80% Confidence"
            />

            {/* 50% confidence band */}
            <Area
              dataKey="p50"
              stroke="none"
              fill={colorScheme.confidence50}
              fillOpacity={0.7}
              name="50% Confidence"
            />

            {/* Main probability line */}
            <Line
              type="monotone"
              dataKey="probability"
              stroke={colorScheme.primary}
              strokeWidth={3}
              dot={{ fill: colorScheme.primary, strokeWidth: 2, r: 4 }}
              name="Most Likely"
            />
          </AreaChart>
        </ResponsiveContainer>
      </View>

      {/* Confidence intervals legend */}
      <XStack space="$4" justifyContent="center" flexWrap="wrap">
        {data.confidenceVisualization.map((conf, index) => (
          <XStack key={index} space="$2" alignItems="center">
            <View
              width="$1"
              height="$1"
              backgroundColor={conf.color}
              borderRadius="$1"
              opacity={conf.opacity}
            />
            <Text fontSize="$3" color={colorScheme.text}>
              {conf.level}: {conf.description}
            </Text>
          </XStack>
        ))}
      </XStack>

      {/* Key statistics */}
      <XStack justifyContent="space-around" padding="$2">
        <YStack alignItems="center" space="$1">
          <Text fontSize="$2" color={colorScheme.secondary}>
            Most Likely
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colorScheme.primary}>
            {new Date(
              chartData.find(d => d.probability === Math.max(...chartData.map(c => c.probability)))
                ?.date || ''
            ).toLocaleDateString()}
          </Text>
        </YStack>

        <YStack alignItems="center" space="$1">
          <Text fontSize="$2" color={colorScheme.secondary}>
            95% Range
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colorScheme.primary}>
            ±{Math.round(confidenceIntervals.p95)} days
          </Text>
        </YStack>

        <YStack alignItems="center" space="$1">
          <Text fontSize="$2" color={colorScheme.secondary}>
            Certainty
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colorScheme.primary}>
            {Math.round((1 - confidenceIntervals.p95 / 14) * 100)}%
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
};

export default ProbabilityDistributionChart;
