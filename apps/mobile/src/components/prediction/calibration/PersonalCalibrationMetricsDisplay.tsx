import React, { useMemo } from 'react';
import { YStack, XStack, Text, View, ScrollView, Progress } from '@tamagui/core';
import {
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Tooltip,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { Target, TrendingUp, Award, AlertTriangle, CheckCircle, Info } from '@tamagui/lucide-icons';
import type { ModelCalibration, CalibrationPoint } from '@aura/shared-types';

interface PersonalCalibrationMetricsDisplayProps {
  calibration: ModelCalibration;
  historicalCalibrationData: CalibrationHistoryPoint[];
  improvementRecommendations: CalibrationRecommendation[];
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
}

interface CalibrationHistoryPoint {
  date: string;
  calibrationError: number;
  isWellCalibrated: boolean;
  sampleSize: number;
  confidenceLevel: number;
}

interface CalibrationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  stealthTitle: string;
  description: string;
  stealthDescription: string;
  expectedImprovement: number; // Percentage improvement expected
  timeToSeeResults: string;
  actionItems: string[];
}

interface CalibrationAnalysis {
  overallCalibrationGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  calibrationTrend: 'improving' | 'stable' | 'declining';
  reliabilityScore: number; // 0-100
  predictionConsistency: number; // 0-100
  underconfidenceLevel: number; // How much user underestimates (negative = overconfident)
  optimalConfidenceRange: [number, number];
  keyStrengths: string[];
  improvementAreas: string[];
}

/**
 * Personal Calibration Metrics Display Component
 * Shows user's personal prediction accuracy calibration
 */
export const PersonalCalibrationMetricsDisplay: React.FC<
  PersonalCalibrationMetricsDisplayProps
> = ({
  calibration,
  historicalCalibrationData,
  improvementRecommendations,
  stealthMode = false,
  culturalTheme = 'modern',
}) => {
  // Analyze calibration performance
  const calibrationAnalysis = useMemo((): CalibrationAnalysis => {
    // Calculate overall grade based on calibration error
    let overallCalibrationGrade: CalibrationAnalysis['overallCalibrationGrade'];
    if (calibration.calibrationError <= 0.02) overallCalibrationGrade = 'A';
    else if (calibration.calibrationError <= 0.05) overallCalibrationGrade = 'B';
    else if (calibration.calibrationError <= 0.1) overallCalibrationGrade = 'C';
    else if (calibration.calibrationError <= 0.2) overallCalibrationGrade = 'D';
    else overallCalibrationGrade = 'F';

    // Calculate calibration trend
    let calibrationTrend: CalibrationAnalysis['calibrationTrend'] = 'stable';
    if (historicalCalibrationData.length >= 4) {
      const recent = historicalCalibrationData.slice(-2);
      const older = historicalCalibrationData.slice(-4, -2);
      const recentAvg = recent.reduce((sum, d) => sum + d.calibrationError, 0) / recent.length;
      const olderAvg = older.reduce((sum, d) => sum + d.calibrationError, 0) / older.length;

      if (recentAvg < olderAvg * 0.9) calibrationTrend = 'improving';
      else if (recentAvg > olderAvg * 1.1) calibrationTrend = 'declining';
    }

    // Calculate reliability score
    const reliabilityScore = Math.max(0, (1 - calibration.calibrationError) * 100);

    // Calculate prediction consistency
    const avgDeviation =
      calibration.calibrationCurve.reduce((sum, point) => {
        return sum + Math.abs(point.predictedProbability - point.observedFrequency);
      }, 0) / calibration.calibrationCurve.length;
    const predictionConsistency = Math.max(0, (1 - avgDeviation) * 100);

    // Calculate under/overconfidence level
    const totalPredicted = calibration.calibrationCurve.reduce(
      (sum, point) => sum + point.predictedProbability * point.sampleSize,
      0
    );
    const totalObserved = calibration.calibrationCurve.reduce(
      (sum, point) => sum + point.observedFrequency * point.sampleSize,
      0
    );
    const totalSamples = calibration.calibrationCurve.reduce(
      (sum, point) => sum + point.sampleSize,
      0
    );
    const avgPredicted = totalPredicted / totalSamples;
    const avgObserved = totalObserved / totalSamples;
    const underconfidenceLevel = ((avgPredicted - avgObserved) / avgObserved) * 100;

    // Determine optimal confidence range
    const wellCalibratedPoints = calibration.calibrationCurve.filter(
      point => Math.abs(point.predictedProbability - point.observedFrequency) <= 0.05
    );
    const optimalConfidenceRange: [number, number] =
      wellCalibratedPoints.length > 0
        ? [
            Math.min(...wellCalibratedPoints.map(p => p.predictedProbability)),
            Math.max(...wellCalibratedPoints.map(p => p.predictedProbability)),
          ]
        : [0.4, 0.8];

    // Identify key strengths and improvement areas
    const keyStrengths: string[] = [];
    const improvementAreas: string[] = [];

    if (reliabilityScore >= 85) {
      keyStrengths.push(stealthMode ? 'Yüksek güvenilirlik' : 'Mükemmel kalibrasyon güvenilirliği');
    } else if (reliabilityScore < 60) {
      improvementAreas.push(
        stealthMode ? 'Güvenilirlik artırılmalı' : 'Kalibrasyon güvenilirliği iyileştirilmeli'
      );
    }

    if (predictionConsistency >= 80) {
      keyStrengths.push(stealthMode ? 'Tutarlı tahminler' : 'Yüksek tahmin tutarlılığı');
    } else if (predictionConsistency < 60) {
      improvementAreas.push(
        stealthMode ? 'Tahmin tutarlılığı artırılmalı' : 'Tahmin tutarlılığında iyileştirme gerekli'
      );
    }

    if (Math.abs(underconfidenceLevel) <= 10) {
      keyStrengths.push(
        stealthMode ? 'Dengeli güven seviyesi' : 'İyi kalibre edilmiş güven seviyeleri'
      );
    } else if (underconfidenceLevel > 15) {
      improvementAreas.push(stealthMode ? 'Çok temkinli yaklaşım' : 'Aşırı temkinli tahminler');
    } else if (underconfidenceLevel < -15) {
      improvementAreas.push(stealthMode ? 'Çok iyimser yaklaşım' : 'Aşırı iyimser tahminler');
    }

    return {
      overallCalibrationGrade,
      calibrationTrend,
      reliabilityScore,
      predictionConsistency,
      underconfidenceLevel,
      optimalConfidenceRange,
      keyStrengths,
      improvementAreas,
    };
  }, [calibration, historicalCalibrationData, stealthMode]);

  // Prepare calibration curve data for visualization
  const calibrationCurveData = useMemo(() => {
    return calibration.calibrationCurve
      .map(point => ({
        predicted: Math.round(point.predictedProbability * 100),
        observed: Math.round(point.observedFrequency * 100),
        sampleSize: point.sampleSize,
        perfect: Math.round(point.predictedProbability * 100), // Perfect calibration line
      }))
      .sort((a, b) => a.predicted - b.predicted);
  }, [calibration.calibrationCurve]);

  // Prepare historical trend data
  const historicalTrendData = useMemo(() => {
    return historicalCalibrationData.map(point => ({
      date: new Date(point.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      error: Math.round(point.calibrationError * 100),
      isWellCalibrated: point.isWellCalibrated,
      sampleSize: point.sampleSize,
    }));
  }, [historicalCalibrationData]);

  const getThemeColors = () => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        background: '#f8f9fa',
        cardBg: '#ffffff',
      };
    }

    switch (culturalTheme) {
      case 'traditional':
        return {
          primary: '#8B4513',
          secondary: '#CD853F',
          success: '#228B22',
          warning: '#DAA520',
          danger: '#B22222',
          info: '#4682B4',
          background: '#FDF5E6',
          cardBg: '#FFFEF7',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
          info: '#3498DB',
          background: '#FFFFFF',
          cardBg: '#F8F9FA',
        };
      default:
        return {
          primary: '#3B82F6',
          secondary: '#6B7280',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#06B6D4',
          background: '#F8FAFC',
          cardBg: '#FFFFFF',
        };
    }
  };

  const colors = getThemeColors();

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return colors.success;
      case 'B':
        return colors.info;
      case 'C':
        return colors.warning;
      case 'D':
        return colors.warning;
      case 'F':
        return colors.danger;
      default:
        return colors.secondary;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return TrendingUp;
      case 'declining':
        return AlertTriangle;
      default:
        return Target;
    }
  };

  const TrendIcon = getTrendIcon(calibrationAnalysis.calibrationTrend);

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background}>
        {/* Header */}
        <YStack space="$2">
          <Text fontSize="$6" fontWeight="700" color={colors.primary}>
            {stealthMode ? 'Kişisel Doğruluk Metrikleri' : 'Kişisel Kalibrasyon Metrikleri'}
          </Text>
          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Tahmin doğruluğunun kişisel analizi ve iyileştirme önerileri'
              : 'Tahmin kalibrasyon performansınızın detaylı analizi'}
          </Text>
        </YStack>

        {/* Overall Performance Cards */}
        <XStack space="$3" justifyContent="space-around">
          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={2}
            borderColor={getGradeColor(calibrationAnalysis.overallCalibrationGrade)}
          >
            <Award size={24} color={getGradeColor(calibrationAnalysis.overallCalibrationGrade)} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Genel Not' : 'Kalibrasyon Notu'}
            </Text>
            <Text
              fontSize="$6"
              fontWeight="700"
              color={getGradeColor(calibrationAnalysis.overallCalibrationGrade)}
            >
              {calibrationAnalysis.overallCalibrationGrade}
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.secondary}
          >
            <TrendIcon
              size={24}
              color={
                calibrationAnalysis.calibrationTrend === 'improving'
                  ? colors.success
                  : calibrationAnalysis.calibrationTrend === 'declining'
                    ? colors.danger
                    : colors.info
              }
            />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              Trend
            </Text>
            <Text
              fontSize="$4"
              fontWeight="600"
              color={
                calibrationAnalysis.calibrationTrend === 'improving'
                  ? colors.success
                  : calibrationAnalysis.calibrationTrend === 'declining'
                    ? colors.danger
                    : colors.info
              }
            >
              {calibrationAnalysis.calibrationTrend === 'improving'
                ? 'İyileşiyor'
                : calibrationAnalysis.calibrationTrend === 'declining'
                  ? 'Kötüleşiyor'
                  : 'Sabit'}
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.info}
          >
            <Target size={24} color={colors.info} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              Güvenilirlik
            </Text>
            <Text fontSize="$5" fontWeight="700" color={colors.info}>
              {Math.round(calibrationAnalysis.reliabilityScore)}%
            </Text>
          </View>
        </XStack>

        {/* Summary Insights */}
        <View
          backgroundColor={`${colors.primary}10`}
          borderRadius="$4"
          padding="$3"
          borderLeftWidth={4}
          borderLeftColor={colors.primary}
        >
          <Text fontSize="$3" color={colors.primary} fontWeight="500" marginBottom="$2">
            {stealthMode ? 'Kalibrasyon Özeti' : 'Kişisel Kalibrasyon Özeti'}
          </Text>
          <Text fontSize="$3" color={colors.primary}>
            {calibrationAnalysis.overallCalibrationGrade} notu ile genel kalibrasyonunuz{' '}
            {calibrationAnalysis.overallCalibrationGrade === 'A'
              ? 'mükemmel'
              : calibrationAnalysis.overallCalibrationGrade === 'B'
                ? 'iyi'
                : calibrationAnalysis.overallCalibrationGrade === 'C'
                  ? 'orta'
                  : 'geliştirilmeli'}
            . Optimal güven aralığınız %
            {Math.round(calibrationAnalysis.optimalConfidenceRange[0] * 100)}-
            {Math.round(calibrationAnalysis.optimalConfidenceRange[1] * 100)} arasında.
          </Text>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default PersonalCalibrationMetricsDisplay;
