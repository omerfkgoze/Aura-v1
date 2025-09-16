import React, { useMemo } from 'react';
import { YStack, XStack, Text, View } from '@tamagui/core';
import { Database, CheckCircle, AlertCircle, XCircle, Calendar } from '@tamagui/lucide-icons';
import type { UncertaintyFactors } from '@aura/shared-types';

interface DataCompletenessAnalyzerProps {
  uncertaintyFactors: UncertaintyFactors;
  missingDataPoints: {
    totalDays: number;
    recordedDays: number;
    missingDays: number;
    criticalMissingDays: number; // Days that significantly impact predictions
  };
  dataCategories: {
    category: string;
    stealthName: string;
    completeness: number; // 0-1
    importance: 'critical' | 'high' | 'medium' | 'low';
    missingCount: number;
    impactDescription: string;
    stealthDescription: string;
  }[];
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
}

interface CompletenessAnalysis {
  overallScore: number;
  level: 'excellent' | 'good' | 'adequate' | 'poor';
  confidenceImpact: number;
  priorityActions: string[];
  stealthActions: string[];
  detailedBreakdown: {
    category: string;
    score: number;
    impact: number;
    suggestions: string[];
  }[];
}

/**
 * Data Completeness Analyzer Component
 * Analyzes data completeness impact on prediction accuracy
 */
export const DataCompletenessAnalyzer: React.FC<DataCompletenessAnalyzerProps> = ({
  uncertaintyFactors,
  missingDataPoints,
  dataCategories,
  stealthMode = false,
  culturalTheme = 'modern',
}) => {
  const completenessAnalysis = useMemo((): CompletenessAnalysis => {
    // Calculate overall completeness score
    const weightedScore = dataCategories.reduce((sum, cat) => {
      const weight =
        cat.importance === 'critical'
          ? 3
          : cat.importance === 'high'
            ? 2
            : cat.importance === 'medium'
              ? 1.5
              : 1;
      return sum + cat.completeness * weight;
    }, 0);

    const totalWeight = dataCategories.reduce((sum, cat) => {
      return (
        sum +
        (cat.importance === 'critical'
          ? 3
          : cat.importance === 'high'
            ? 2
            : cat.importance === 'medium'
              ? 1.5
              : 1)
      );
    }, 0);

    const overallScore = weightedScore / totalWeight;

    // Determine completeness level
    let level: CompletenessAnalysis['level'];
    if (overallScore >= 0.9) level = 'excellent';
    else if (overallScore >= 0.75) level = 'good';
    else if (overallScore >= 0.6) level = 'adequate';
    else level = 'poor';

    // Calculate confidence impact (higher completeness = higher confidence)
    const confidenceImpact = Math.pow(overallScore, 1.5); // Non-linear relationship

    // Generate priority actions
    const criticalMissing = dataCategories.filter(
      cat => cat.importance === 'critical' && cat.completeness < 0.8
    );
    const highMissing = dataCategories.filter(
      cat => cat.importance === 'high' && cat.completeness < 0.7
    );

    const priorityActions: string[] = [];
    const stealthActions: string[] = [];

    if (criticalMissing.length > 0) {
      priorityActions.push(`${criticalMissing.length} kritik veri kategorisi eksik`);
      stealthActions.push(`${criticalMissing.length} önemli kayıt kategorisi tamamlanmalı`);
    }

    if (highMissing.length > 0) {
      priorityActions.push(`${highMissing.length} önemli veri kategorisi iyileştirilebilir`);
      stealthActions.push(`${highMissing.length} kayıt türü daha düzenli tutulabilir`);
    }

    if (missingDataPoints.criticalMissingDays > 5) {
      priorityActions.push('Son dönemde kritik günler eksik');
      stealthActions.push('Son günlerde önemli kayıtlar eksik');
    }

    // Generate detailed breakdown
    const detailedBreakdown = dataCategories.map(cat => ({
      category: cat.category,
      score: cat.completeness,
      impact: getImpactScore(cat.importance, cat.completeness),
      suggestions: getSuggestions(cat, stealthMode),
    }));

    return {
      overallScore,
      level,
      confidenceImpact,
      priorityActions,
      stealthActions,
      detailedBreakdown,
    };
  }, [uncertaintyFactors, missingDataPoints, dataCategories, stealthMode]);

  function getImpactScore(importance: string, completeness: number): number {
    const importanceMultiplier =
      importance === 'critical'
        ? 1.0
        : importance === 'high'
          ? 0.8
          : importance === 'medium'
            ? 0.6
            : 0.4;
    return (1 - completeness) * importanceMultiplier;
  }

  function getSuggestions(
    category: {
      category: string;
      completeness: number;
      importance: string;
      missingCount: number;
    },
    stealth: boolean
  ): string[] {
    const suggestions: string[] = [];

    if (category.completeness < 0.5) {
      suggestions.push(
        stealth
          ? 'Bu kategoriyi düzenli kaydet'
          : `${category.category} verilerini düzenli olarak kaydet`
      );
    } else if (category.completeness < 0.8) {
      suggestions.push(
        stealth
          ? 'Eksik günleri tamamla'
          : `${category.missingCount} eksik ${category.category} kaydını tamamla`
      );
    }

    if (category.importance === 'critical' && category.completeness < 0.9) {
      suggestions.push(
        stealth
          ? 'Bu kategori çok önemli, öncelik ver'
          : 'Kritik öncelik: bu veri tahminler için çok önemli'
      );
    }

    return suggestions;
  }

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
        };
    }
  };

  const colors = getThemeColors();

  const getLevelColor = (level: CompletenessAnalysis['level']) => {
    switch (level) {
      case 'excellent':
        return colors.success;
      case 'good':
        return colors.success;
      case 'adequate':
        return colors.warning;
      case 'poor':
        return colors.danger;
    }
  };

  const getLevelIcon = (level: CompletenessAnalysis['level']) => {
    switch (level) {
      case 'excellent':
        return CheckCircle;
      case 'good':
        return CheckCircle;
      case 'adequate':
        return AlertCircle;
      case 'poor':
        return XCircle;
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical':
        return colors.danger;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      case 'low':
        return colors.secondary;
      default:
        return colors.secondary;
    }
  };

  const levelColor = getLevelColor(completenessAnalysis.level);
  const LevelIcon = getLevelIcon(completenessAnalysis.level);

  return (
    <YStack space="$4" padding="$4" backgroundColor={colors.background} borderRadius="$4">
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <YStack>
          <Text fontSize="$5" fontWeight="600" color={colors.primary}>
            {stealthMode ? 'Veri Tamlık Analizi' : 'Veri Tamamlılık İncelemesi'}
          </Text>
          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Kayıt eksiğinin tahmin doğruluğuna etkisi'
              : 'Eksik verilerin tahmin güvenilirliğine etkisi'}
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

      {/* Overall Completeness Score */}
      <YStack space="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize="$4" fontWeight="500" color={colors.primary}>
            {stealthMode ? 'Genel Tamlık Skoru' : 'Genel Veri Tamamlılığı'}
          </Text>
          <Text fontSize="$4" fontWeight="600" color={levelColor}>
            {Math.round(completenessAnalysis.overallScore * 100)}%
          </Text>
        </XStack>

        <View height={12} backgroundColor={`${levelColor}20`} borderRadius={6}>
          <View
            width={`${completenessAnalysis.overallScore * 100}%`}
            height="100%"
            backgroundColor={levelColor}
            borderRadius={6}
          />
        </View>

        <Text fontSize="$2" color={colors.secondary} textAlign="center">
          {missingDataPoints.recordedDays} / {missingDataPoints.totalDays} gün kayıtlı
        </Text>
      </YStack>

      {/* Data Categories Breakdown */}
      <YStack space="$3">
        <Text fontSize="$4" fontWeight="500" color={colors.primary}>
          {stealthMode ? 'Kategori Detayları' : 'Veri Kategorileri'}
        </Text>

        {dataCategories.map((category, index) => {
          const importanceColor = getImportanceColor(category.importance);

          return (
            <XStack
              key={index}
              space="$3"
              alignItems="center"
              padding="$3"
              backgroundColor="$background"
              borderRadius="$3"
              borderLeftWidth={4}
              borderLeftColor={importanceColor}
            >
              <Database size={20} color={importanceColor} />

              <YStack flex={1} space="$1">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                    {stealthMode ? category.stealthName : category.category}
                  </Text>
                  <Text fontSize="$3" fontWeight="600" color={importanceColor}>
                    {Math.round(category.completeness * 100)}%
                  </Text>
                </XStack>

                <View height={6} backgroundColor={`${importanceColor}20`} borderRadius={3}>
                  <View
                    width={`${category.completeness * 100}%`}
                    height="100%"
                    backgroundColor={importanceColor}
                    borderRadius={3}
                  />
                </View>

                <Text fontSize="$2" color={colors.secondary}>
                  {stealthMode ? category.stealthDescription : category.impactDescription}
                </Text>
              </YStack>
            </XStack>
          );
        })}
      </YStack>

      {/* Confidence Impact */}
      <View
        padding="$3"
        backgroundColor={`${levelColor}10`}
        borderRadius="$3"
        borderWidth={1}
        borderColor={levelColor}
      >
        <YStack space="$2">
          <Text fontSize="$4" fontWeight="500" color={colors.primary}>
            {stealthMode ? 'Tahmin Güvenine Etkisi' : 'Tahmin Güvenilirliğine Etkisi'}
          </Text>

          <XStack space="$3" alignItems="center">
            <Text fontSize="$3" color={colors.secondary}>
              Düşük
            </Text>
            <View flex={1} height={8} backgroundColor={`${colors.primary}20`} borderRadius={4}>
              <View
                width={`${completenessAnalysis.confidenceImpact * 100}%`}
                height="100%"
                backgroundColor={levelColor}
                borderRadius={4}
              />
            </View>
            <Text fontSize="$3" color={colors.secondary}>
              Yüksek
            </Text>
          </XStack>

          <Text fontSize="$2" color={colors.secondary} textAlign="center">
            {Math.round(completenessAnalysis.confidenceImpact * 100)}% güven katkısı
          </Text>
        </YStack>
      </View>

      {/* Missing Data Impact */}
      {missingDataPoints.criticalMissingDays > 0 && (
        <View
          padding="$3"
          backgroundColor={`${colors.danger}10`}
          borderRadius="$3"
          borderLeftWidth={4}
          borderLeftColor={colors.danger}
        >
          <YStack space="$2">
            <XStack space="$2" alignItems="center">
              <Calendar size={16} color={colors.danger} />
              <Text fontSize="$3" fontWeight="500" color={colors.danger}>
                {stealthMode ? 'Kritik Eksik Günler' : 'Kritik Dönemde Eksik Veriler'}
              </Text>
            </XStack>
            <Text fontSize="$3" color={colors.primary}>
              {missingDataPoints.criticalMissingDays} kritik gün eksik. Bu günler tahmin doğruluğunu
              önemli ölçüde etkiliyor.
            </Text>
          </YStack>
        </View>
      )}

      {/* Priority Actions */}
      <YStack space="$2">
        <Text fontSize="$4" fontWeight="500" color={colors.primary}>
          {stealthMode ? 'Öncelikli İyileştirmeler' : 'Öncelikli Veri Tamamlama'}
        </Text>

        {(stealthMode
          ? completenessAnalysis.stealthActions
          : completenessAnalysis.priorityActions
        ).map((action, index) => (
          <XStack key={index} space="$2" alignItems="center">
            <View width={6} height={6} borderRadius={3} backgroundColor={levelColor} />
            <Text fontSize="$3" color={colors.primary} flex={1}>
              {action}
            </Text>
          </XStack>
        ))}

        {completenessAnalysis.priorityActions.length === 0 && (
          <Text fontSize="$3" color={colors.success}>
            {stealthMode
              ? '🎉 Tüm kategoriler yeterli seviyede!'
              : '🎉 Veri tamamlılığınız mükemmel!'}
          </Text>
        )}
      </YStack>

      {/* Statistics Summary */}
      <XStack space="$4" justifyContent="space-around" paddingTop="$2">
        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            Toplam
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.primary}>
            {missingDataPoints.totalDays}
          </Text>
          <Text fontSize="$1" color={colors.secondary}>
            gün
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            Kayıtlı
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.success}>
            {missingDataPoints.recordedDays}
          </Text>
          <Text fontSize="$1" color={colors.secondary}>
            gün
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            Eksik
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.warning}>
            {missingDataPoints.missingDays}
          </Text>
          <Text fontSize="$1" color={colors.secondary}>
            gün
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$2" color={colors.secondary}>
            Kritik Eksik
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colors.danger}>
            {missingDataPoints.criticalMissingDays}
          </Text>
          <Text fontSize="$1" color={colors.secondary}>
            gün
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
};

export default DataCompletenessAnalyzer;
