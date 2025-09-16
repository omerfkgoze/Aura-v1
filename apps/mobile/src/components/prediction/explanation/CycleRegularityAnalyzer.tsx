import React, { useMemo } from 'react';
import { YStack, XStack, Text, View, Progress } from '@tamagui/core';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from '@tamagui/lucide-icons';
import type { CyclePattern, UncertaintyFactors } from '@aura/shared-types';

interface CycleRegularityAnalyzerProps {
  cyclePattern: CyclePattern;
  uncertaintyFactors: UncertaintyFactors;
  recentCycleLengths: number[]; // Last 6 cycles
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
}

interface RegularityAnalysis {
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'irregular';
  trend: 'stable' | 'improving' | 'declining';
  impactDescription: string;
  stealthDescription: string;
  recommendations: string[];
  confidenceImpact: number; // How much regularity affects confidence (0-1)
}

/**
 * Cycle Regularity Analyzer Component
 * Analyzes cycle regularity impact on prediction confidence
 */
export const CycleRegularityAnalyzer: React.FC<CycleRegularityAnalyzerProps> = ({
  cyclePattern,
  uncertaintyFactors,
  recentCycleLengths,
  stealthMode = false,
  culturalTheme = 'modern',
}) => {
  const regularityAnalysis = useMemo((): RegularityAnalysis => {
    const variance = cyclePattern.variance;
    const avgLength = cyclePattern.averageLength;
    const coefficient = Math.sqrt(variance) / avgLength; // Coefficient of variation

    // Calculate regularity score (0-1)
    let score: number;
    let level: RegularityAnalysis['level'];

    if (coefficient < 0.05) {
      // Very regular (less than 5% variation)
      score = 0.95;
      level = 'excellent';
    } else if (coefficient < 0.1) {
      // Good regularity (5-10% variation)
      score = 0.85;
      level = 'good';
    } else if (coefficient < 0.2) {
      // Moderate regularity (10-20% variation)
      score = 0.65;
      level = 'moderate';
    } else {
      // Irregular (over 20% variation)
      score = 0.4;
      level = 'irregular';
    }

    // Analyze trend from recent cycles
    let trend: RegularityAnalysis['trend'] = 'stable';
    if (recentCycleLengths.length >= 4) {
      const firstHalf = recentCycleLengths.slice(0, Math.floor(recentCycleLengths.length / 2));
      const secondHalf = recentCycleLengths.slice(Math.floor(recentCycleLengths.length / 2));

      const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      const firstHalfVar =
        firstHalf.reduce((sum, x) => sum + Math.pow(x - firstHalfAvg, 2), 0) / firstHalf.length;
      const secondHalfVar =
        secondHalf.reduce((sum, x) => sum + Math.pow(x - secondHalfAvg, 2), 0) / secondHalf.length;

      if (secondHalfVar < firstHalfVar * 0.8) {
        trend = 'improving';
      } else if (secondHalfVar > firstHalfVar * 1.2) {
        trend = 'declining';
      }
    }

    // Generate descriptions
    const impactDescription = getImpactDescription(level, coefficient, avgLength, false);
    const stealthDescription = getImpactDescription(level, coefficient, avgLength, true);

    // Generate recommendations
    const recommendations = getRecommendations(level, trend, stealthMode);

    // Calculate confidence impact (how much regularity affects prediction confidence)
    const confidenceImpact = Math.max(0, 1 - coefficient * 2); // More regular = higher confidence

    return {
      score,
      level,
      trend,
      impactDescription,
      stealthDescription,
      recommendations,
      confidenceImpact,
    };
  }, [cyclePattern, recentCycleLengths, stealthMode]);

  function getImpactDescription(
    level: RegularityAnalysis['level'],
    coefficient: number,
    avgLength: number,
    stealth: boolean
  ): string {
    const variation = Math.round(coefficient * avgLength * 100) / 100;

    if (stealth) {
      switch (level) {
        case 'excellent':
          return `Pattern çok tutarlı (±${variation} gün değişkenlik). Tahmin aralığı dar ve güvenilir.`;
        case 'good':
          return `Pattern genellikle tutarlı (±${variation} gün değişkenlik). İyi tahmin doğruluğu.`;
        case 'moderate':
          return `Pattern orta seviyede tutarlı (±${variation} gün değişkenlik). Tahmin aralığı biraz geniş.`;
        case 'irregular':
          return `Pattern değişken (±${variation} gün değişkenlik). Tahmin aralığı geniş tutulmalı.`;
      }
    } else {
      switch (level) {
        case 'excellent':
          return `Döngüleriniz çok düzenli (±${variation} gün değişkenlik). Bu, tahmin doğruluğunu maksimize ediyor ve güven aralıklarını daraltıyor.`;
        case 'good':
          return `Döngüleriniz genellikle düzenli (±${variation} gün değişkenlik). Tahminlerin güvenilirliği yüksek.`;
        case 'moderate':
          return `Döngü düzenliği orta seviyede (±${variation} gün değişkenlik). Tahminlerde orta seviyede belirsizlik var.`;
        case 'irregular':
          return `Döngüler değişken (±${variation} gün değişkenlik). Bu durum tahmin belirsizliğini artırıyor.`;
      }
    }
  }

  function getRecommendations(
    level: RegularityAnalysis['level'],
    trend: RegularityAnalysis['trend'],
    stealth: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'excellent') {
      recommendations.push(
        stealth ? 'Mevcut rutini sürdür' : 'Mükemmel düzenlilik! Mevcut yaşam tarzını sürdür'
      );
    } else {
      if (stealth) {
        recommendations.push('Günlük rutini daha düzenli hale getir');
        if (level === 'irregular') {
          recommendations.push('Stres yönetimi önemli');
          recommendations.push('Uyku düzenini iyileştir');
        }
      } else {
        recommendations.push('Uyku düzenini iyileştir (7-9 saat)');
        recommendations.push('Stres seviyelerini kontrol et');
        if (level === 'irregular') {
          recommendations.push('Sağlık uzmanına danış');
          recommendations.push('Beslenme düzenine dikkat et');
        }
      }
    }

    if (trend === 'declining') {
      recommendations.push(
        stealth ? 'Son değişiklikleri gözden geçir' : 'Son dönemki değişiklikleri değerlendir'
      );
    } else if (trend === 'improving') {
      recommendations.push(
        stealth ? 'İyileşme sürüyor, devam et' : 'Düzenlilik artıyor! Mevcut yaklaşımını sürdür'
      );
    }

    return recommendations;
  }

  const getThemeColors = () => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        background: '#f8f9fa',
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
          background: '#FDF5E6',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
          background: '#FFFFFF',
        };
      default:
        return {
          primary: '#3B82F6',
          secondary: '#6B7280',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          background: '#F8FAFC',
        };
    }
  };

  const colors = getThemeColors();

  const getLevelColor = (level: RegularityAnalysis['level']) => {
    switch (level) {
      case 'excellent':
        return colors.success;
      case 'good':
        return colors.success;
      case 'moderate':
        return colors.warning;
      case 'irregular':
        return colors.danger;
    }
  };

  const getLevelIcon = (level: RegularityAnalysis['level']) => {
    switch (level) {
      case 'excellent':
        return CheckCircle;
      case 'good':
        return CheckCircle;
      case 'moderate':
        return AlertTriangle;
      case 'irregular':
        return AlertTriangle;
    }
  };

  const getTrendIcon = (trend: RegularityAnalysis['trend']) => {
    switch (trend) {
      case 'improving':
        return TrendingUp;
      case 'declining':
        return TrendingDown;
      case 'stable':
        return Minus;
    }
  };

  const levelColor = getLevelColor(regularityAnalysis.level);
  const LevelIcon = getLevelIcon(regularityAnalysis.level);
  const TrendIcon = getTrendIcon(regularityAnalysis.trend);

  return (
    <YStack space="$4" padding="$4" backgroundColor={colors.background} borderRadius="$4">
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <YStack>
          <Text fontSize="$5" fontWeight="600" color={colors.primary}>
            {stealthMode ? 'Pattern Düzenlilik Analizi' : 'Döngü Düzenlilik İncelemesi'}
          </Text>
          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode ? 'Tahmin doğruluğuna etkisi' : 'Döngü düzenliğinin tahmin gücüne etkisi'}
          </Text>
        </YStack>
        <View
          width={50}
          height={50}
          backgroundColor={levelColor}
          borderRadius={25}
          alignItems="center"
          justifyContent="center"
        >
          <LevelIcon size={24} color="white" />
        </View>
      </XStack>

      {/* Regularity Score */}
      <YStack space="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize="$4" fontWeight="500" color={colors.primary}>
            {stealthMode ? 'Düzenlilik Skoru' : 'Döngü Düzenlilik Skoru'}
          </Text>
          <Text fontSize="$4" fontWeight="600" color={levelColor}>
            {Math.round(regularityAnalysis.score * 100)}/100
          </Text>
        </XStack>

        <Progress
          value={regularityAnalysis.score * 100}
          max={100}
          backgroundColor={`${levelColor}20`}
        >
          <Progress.Indicator backgroundColor={levelColor} />
        </Progress>
      </YStack>

      {/* Trend Analysis */}
      <XStack
        space="$3"
        alignItems="center"
        padding="$3"
        backgroundColor="$background"
        borderRadius="$3"
        borderWidth={1}
        borderColor={colors.secondary}
      >
        <TrendIcon
          size={20}
          color={
            regularityAnalysis.trend === 'improving'
              ? colors.success
              : regularityAnalysis.trend === 'declining'
                ? colors.danger
                : colors.secondary
          }
        />
        <YStack flex={1}>
          <Text fontSize="$3" fontWeight="500" color={colors.primary}>
            {stealthMode ? 'Trend Analizi' : 'Düzenlilik Eğilimi'}
          </Text>
          <Text fontSize="$3" color={colors.secondary}>
            {regularityAnalysis.trend === 'improving'
              ? stealthMode
                ? 'İyileşme eğiliminde'
                : 'Düzenlilik artışında'
              : regularityAnalysis.trend === 'declining'
                ? stealthMode
                  ? 'Azalma eğiliminde'
                  : 'Düzenlilik azalışında'
                : stealthMode
                  ? 'Stabil durum'
                  : 'Kararlı düzenlilik'}
          </Text>
        </YStack>
      </XStack>

      {/* Impact Description */}
      <View
        padding="$3"
        backgroundColor={`${levelColor}10`}
        borderRadius="$3"
        borderLeftWidth={4}
        borderLeftColor={levelColor}
      >
        <Text fontSize="$3" color={colors.primary} lineHeight="$2">
          {stealthMode
            ? regularityAnalysis.stealthDescription
            : regularityAnalysis.impactDescription}
        </Text>
      </View>

      {/* Confidence Impact Visualization */}
      <YStack space="$2">
        <Text fontSize="$4" fontWeight="500" color={colors.primary}>
          {stealthMode ? 'Tahmin Güvenine Katkısı' : 'Tahmin Güvenilirliğine Katkı'}
        </Text>

        <XStack space="$3" alignItems="center">
          <Text fontSize="$3" color={colors.secondary} width={60}>
            Düşük
          </Text>
          <View flex={1} height={8} backgroundColor={`${colors.primary}20`} borderRadius={4}>
            <View
              width={`${regularityAnalysis.confidenceImpact * 100}%`}
              height="100%"
              backgroundColor={levelColor}
              borderRadius={4}
            />
          </View>
          <Text fontSize="$3" color={colors.secondary} width={60} textAlign="right">
            Yüksek
          </Text>
        </XStack>

        <Text fontSize="$2" color={colors.secondary} textAlign="center">
          {Math.round(regularityAnalysis.confidenceImpact * 100)}% katkı
        </Text>
      </YStack>

      {/* Cycle Pattern Stats */}
      <XStack space="$4" justifyContent="space-around">
        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            {stealthMode ? 'Ortalama' : 'Ort. Uzunluk'}
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.primary}>
            {cyclePattern.averageLength.toFixed(1)} gün
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            {stealthMode ? 'Değişkenlik' : 'Varyasyon'}
          </Text>
          <Text fontSize="$4" fontWeight="600" color={levelColor}>
            ±{Math.sqrt(cyclePattern.variance).toFixed(1)} gün
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            Güven
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.primary}>
            {Math.round(cyclePattern.confidence * 100)}%
          </Text>
        </YStack>
      </XStack>

      {/* Recommendations */}
      <YStack space="$2">
        <Text fontSize="$4" fontWeight="500" color={colors.primary}>
          {stealthMode ? 'Öneriler' : 'İyileştirme Önerileri'}
        </Text>
        {regularityAnalysis.recommendations.map((rec, index) => (
          <XStack key={index} space="$2" alignItems="center">
            <View width={6} height={6} borderRadius={3} backgroundColor={levelColor} />
            <Text fontSize="$3" color={colors.primary} flex={1}>
              {rec}
            </Text>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
};

export default CycleRegularityAnalyzer;
