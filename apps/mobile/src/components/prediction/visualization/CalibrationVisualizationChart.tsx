import React, { useMemo } from 'react';
import { YStack, XStack, Text, View, Card } from '@tamagui/core';
import {
  LineChart,
  ScatterChart,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Scatter,
  Area,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { CalibrationReport, CalibrationMetrics } from '../models/CalibrationMetricsCalculator';
import type { ModelCalibration } from '@aura/shared-types';

interface CalibrationVisualizationProps {
  calibrationData: ModelCalibration;
  metricsReport: CalibrationReport;
  predictionType: 'period' | 'ovulation';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  showTechnicalDetails?: boolean;
}

export const CalibrationVisualizationChart: React.FC<CalibrationVisualizationProps> = ({
  calibrationData,
  metricsReport,
  predictionType,
  stealthMode = false,
  culturalTheme = 'modern',
  showTechnicalDetails = false,
}) => {
  // Color scheme based on stealth mode and cultural theme
  const colorScheme = useMemo(() => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        background: '#f5f5f5',
        cardBackground: '#ffffff',
        text: '#333333',
        perfect: '#888888',
        actual: '#555555',
        grid: '#dddddd',
      };
    }

    switch (culturalTheme) {
      case 'traditional':
        return {
          primary: '#8B4513',
          secondary: '#CD853F',
          background: '#FDF5E6',
          cardBackground: '#FFFAF0',
          text: '#654321',
          perfect: '#DEB887',
          actual: '#8B4513',
          grid: '#F0E68C',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          background: '#FFFFFF',
          cardBackground: '#F8F9FA',
          text: '#2C3E50',
          perfect: '#BDC3C7',
          actual: '#2C3E50',
          grid: '#ECF0F1',
        };
      default:
        return {
          primary: '#3498DB',
          secondary: '#2980B9',
          background: '#F8F9FA',
          cardBackground: '#FFFFFF',
          text: '#2C3E50',
          perfect: '#95A5A6',
          actual: '#3498DB',
          grid: '#E8F4F8',
        };
    }
  }, [stealthMode, culturalTheme]);

  // Transform calibration data for visualization
  const calibrationChartData = useMemo(() => {
    return calibrationData.calibrationCurve.map(point => ({
      predicted: point.predictedProbability,
      observed: point.observedFrequency,
      sampleSize: point.sampleSize,
      perfect: point.predictedProbability, // Perfect calibration line
      error: Math.abs(point.predictedProbability - point.observedFrequency),
    }));
  }, [calibrationData.calibrationCurve]);

  // Transform reliability diagram data
  const reliabilityData = useMemo(() => {
    return calibrationData.reliabilityDiagram.map(([predicted, observed, count]) => ({
      predicted,
      observed,
      count,
      perfect: predicted,
    }));
  }, [calibrationData.reliabilityDiagram]);

  // Performance by confidence level data
  const performanceData = useMemo(() => {
    return metricsReport.performanceByConfidenceLevel.map(level => ({
      confidenceLevel: level.confidenceLevel * 100,
      accuracy: level.accuracy * 100,
      sampleSize: level.sampleSize,
      calibrationError: level.calibrationError * 100,
      perfect: level.confidenceLevel * 100,
    }));
  }, [metricsReport.performanceByConfidenceLevel]);

  const title = stealthMode
    ? 'Prediction Accuracy Analysis'
    : `${predictionType === 'period' ? 'Period' : 'Ovulation'} Prediction Calibration`;

  const getQualityColor = (score: number) => {
    if (score >= 80) return '#27AE60';
    if (score >= 60) return '#F39C12';
    if (score >= 40) return '#E67E22';
    return '#E74C3C';
  };

  return (
    <YStack space="$4" padding="$3" backgroundColor={colorScheme.background}>
      {/* Header with quality score */}
      <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
          <Text fontSize="$5" fontWeight="600" color={colorScheme.text}>
            {title}
          </Text>
          <XStack space="$2" alignItems="center">
            <Text fontSize="$3" color={colorScheme.secondary}>
              Quality Score:
            </Text>
            <Text
              fontSize="$4"
              fontWeight="600"
              color={getQualityColor(metricsReport.qualityScore)}
            >
              {metricsReport.qualityScore}/100
            </Text>
          </XStack>
        </XStack>

        {/* Key metrics summary */}
        <XStack justifyContent="space-around" flexWrap="wrap" space="$2">
          <YStack alignItems="center" minWidth="$8">
            <Text fontSize="$2" color={colorScheme.secondary}>
              {stealthMode ? 'Error Rate' : 'Calibration Error'}
            </Text>
            <Text fontSize="$3" fontWeight="600" color={colorScheme.text}>
              {(metricsReport.currentMetrics.expectedCalibrationError * 100).toFixed(1)}%
            </Text>
          </YStack>

          <YStack alignItems="center" minWidth="$8">
            <Text fontSize="$2" color={colorScheme.secondary}>
              {stealthMode ? 'Accuracy Score' : 'Brier Score'}
            </Text>
            <Text fontSize="$3" fontWeight="600" color={colorScheme.text}>
              {metricsReport.currentMetrics.brierScore.toFixed(3)}
            </Text>
          </YStack>

          <YStack alignItems="center" minWidth="$8">
            <Text fontSize="$2" color={colorScheme.secondary}>
              {stealthMode ? 'Skill Level' : 'Skill Score'}
            </Text>
            <Text fontSize="$3" fontWeight="600" color={colorScheme.text}>
              {metricsReport.currentMetrics.brierSkillScore.toFixed(2)}
            </Text>
          </YStack>
        </XStack>
      </Card>

      {/* Main calibration plot */}
      <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
        <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
          {stealthMode ? 'Accuracy vs Confidence' : 'Calibration Plot'}
        </Text>

        <View height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={calibrationChartData}>
              <XAxis
                dataKey="predicted"
                domain={[0, 1]}
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
                label={{
                  value: stealthMode ? 'Confidence Level' : 'Predicted Probability',
                  position: 'insideBottom',
                  offset: -5,
                }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
                label={{
                  value: stealthMode ? 'Actual Accuracy' : 'Observed Frequency',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colorScheme.cardBackground,
                  border: `1px solid ${colorScheme.secondary}`,
                  borderRadius: '8px',
                }}
                labelStyle={{ color: colorScheme.text }}
                formatter={(value: any, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  name === 'observed' ? 'Actual' : name === 'predicted' ? 'Predicted' : name,
                ]}
              />

              {/* Perfect calibration line */}
              <Line
                type="monotone"
                dataKey="perfect"
                stroke={colorScheme.perfect}
                strokeDasharray="5 5"
                dot={false}
                name="Perfect Calibration"
              />

              {/* Actual calibration points */}
              <Scatter dataKey="observed" fill={colorScheme.actual} name="Actual Calibration" />
            </ScatterChart>
          </ResponsiveContainer>
        </View>

        <Text fontSize="$2" color={colorScheme.secondary} textAlign="center" marginTop="$2">
          {stealthMode
            ? 'Points on dashed line = perfect accuracy'
            : 'Points on dashed line indicate perfect calibration'}
        </Text>
      </Card>

      {/* Reliability diagram */}
      <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
        <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
          {stealthMode ? 'Confidence Band Performance' : 'Reliability Diagram'}
        </Text>

        <View height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reliabilityData}>
              <XAxis
                dataKey="predicted"
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colorScheme.cardBackground,
                  border: `1px solid ${colorScheme.secondary}`,
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  name === 'observed' ? 'Observed' : 'Expected',
                ]}
              />

              <Area
                dataKey="observed"
                stroke={colorScheme.actual}
                fill={colorScheme.actual}
                fillOpacity={0.3}
                name="Observed Frequency"
              />

              <Line
                type="monotone"
                dataKey="perfect"
                stroke={colorScheme.perfect}
                strokeDasharray="3 3"
                dot={false}
                name="Expected"
              />
            </AreaChart>
          </ResponsiveContainer>
        </View>
      </Card>

      {/* Performance by confidence level */}
      <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
        <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
          {stealthMode ? 'Performance by Confidence' : 'Performance by Confidence Level'}
        </Text>

        <View height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <XAxis
                dataKey="confidenceLevel"
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
                label={{ value: 'Confidence Level (%)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colorScheme.text }}
                axisLine={{ stroke: colorScheme.secondary }}
                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colorScheme.cardBackground,
                  border: `1px solid ${colorScheme.secondary}`,
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === 'accuracy' ? 'Actual Accuracy' : 'Expected Accuracy',
                ]}
              />
              <Legend />

              <Line
                type="monotone"
                dataKey="perfect"
                stroke={colorScheme.perfect}
                strokeDasharray="5 5"
                dot={false}
                name="Expected Accuracy"
              />

              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={colorScheme.actual}
                strokeWidth={3}
                dot={{ fill: colorScheme.actual, strokeWidth: 2, r: 4 }}
                name="Actual Accuracy"
              />
            </LineChart>
          </ResponsiveContainer>
        </View>
      </Card>

      {/* Technical details (if enabled) */}
      {showTechnicalDetails && (
        <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
          <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
            Technical Metrics
          </Text>

          <YStack space="$2">
            <XStack justifyContent="space-between">
              <Text fontSize="$3" color={colorScheme.secondary}>
                Expected Calibration Error:
              </Text>
              <Text fontSize="$3" color={colorScheme.text}>
                {(metricsReport.currentMetrics.expectedCalibrationError * 100).toFixed(2)}%
              </Text>
            </XStack>

            <XStack justifyContent="space-between">
              <Text fontSize="$3" color={colorScheme.secondary}>
                Maximum Calibration Error:
              </Text>
              <Text fontSize="$3" color={colorScheme.text}>
                {(metricsReport.currentMetrics.maximumCalibrationError * 100).toFixed(2)}%
              </Text>
            </XStack>

            <XStack justifyContent="space-between">
              <Text fontSize="$3" color={colorScheme.secondary}>
                Calibration Slope:
              </Text>
              <Text fontSize="$3" color={colorScheme.text}>
                {metricsReport.currentMetrics.calibrationSlope.toFixed(3)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between">
              <Text fontSize="$3" color={colorScheme.secondary}>
                Reliability Index:
              </Text>
              <Text fontSize="$3" color={colorScheme.text}>
                {metricsReport.currentMetrics.reliabilityIndex.toFixed(4)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between">
              <Text fontSize="$3" color={colorScheme.secondary}>
                Sharpness:
              </Text>
              <Text fontSize="$3" color={colorScheme.text}>
                {metricsReport.currentMetrics.sharpness.toFixed(4)}
              </Text>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Recommendations */}
      {metricsReport.recommendations.length > 0 && (
        <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
          <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
            {stealthMode ? 'Improvement Areas' : 'Calibration Recommendations'}
          </Text>

          <YStack space="$2">
            {metricsReport.recommendations.map((recommendation, index) => (
              <XStack key={index} space="$2" alignItems="flex-start">
                <Text fontSize="$3" color={colorScheme.primary} marginTop="$0.5">
                  •
                </Text>
                <Text fontSize="$3" color={colorScheme.text} flex={1} lineHeight="$1">
                  {recommendation}
                </Text>
              </XStack>
            ))}
          </YStack>
        </Card>
      )}

      {/* Trend information */}
      {metricsReport.historicalTrend.significantChange && (
        <Card backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
          <XStack space="$3" alignItems="center">
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color={colorScheme.text}>
                {stealthMode ? 'Performance Trend' : 'Calibration Trend'}
              </Text>
              <Text fontSize="$3" color={colorScheme.secondary}>
                {metricsReport.historicalTrend.direction === 'improving'
                  ? '↗️ Improving'
                  : metricsReport.historicalTrend.direction === 'declining'
                    ? '↘️ Declining'
                    : '→ Stable'}{' '}
                over {metricsReport.historicalTrend.timeHorizon.replace('_', ' ')} term
              </Text>
            </YStack>
            <Text fontSize="$3" fontWeight="600" color={colorScheme.primary}>
              {(metricsReport.historicalTrend.confidenceInTrend * 100).toFixed(0)}% confidence
            </Text>
          </XStack>
        </Card>
      )}
    </YStack>
  );
};

export default CalibrationVisualizationChart;
