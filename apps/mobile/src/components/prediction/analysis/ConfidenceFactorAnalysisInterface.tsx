import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text, View, Button, ScrollView, Slider } from '@tamagui/core';
import {
  BarChart,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Database,
  Calendar,
  Activity,
  Info,
  Eye,
  EyeOff,
  RotateCcw,
} from '@tamagui/lucide-icons';
import type { UncertaintyFactors, CyclePattern } from '@aura/shared-types';

interface ConfidenceFactorAnalysisInterfaceProps {
  uncertaintyFactors: UncertaintyFactors;
  cyclePattern: CyclePattern;
  historicalFactorData: HistoricalFactorData[];
  interactiveMode?: boolean;
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onFactorAdjustment?: (factor: string, value: number) => void;
  onAnalysisReset?: () => void;
}

interface HistoricalFactorData {
  date: string;
  dataQuality: number;
  historyLength: number;
  cycleLengthVariability: number;
  recentDataReliability: number;
  overallConfidence: number;
}

interface FactorAnalysisResult {
  id: string;
  name: string;
  stealthName: string;
  currentValue: number;
  normalizedScore: number; // 0-100
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidenceContribution: number; // Percentage contribution to overall confidence
  trendDirection: 'improving' | 'stable' | 'declining';
  optimalRange: [number, number];
  currentStatus: 'excellent' | 'good' | 'fair' | 'poor';
  improvementPotential: number; // How much confidence could improve if optimized
  recommendations: string[];
}

/**
 * Confidence Factor Analysis Interface Component
 * Interactive analysis of factors affecting prediction confidence
 */
export const ConfidenceFactorAnalysisInterface: React.FC<
  ConfidenceFactorAnalysisInterfaceProps
> = ({
  uncertaintyFactors,
  cyclePattern,
  historicalFactorData,
  interactiveMode = true,
  stealthMode = false,
  culturalTheme = 'modern',
  onFactorAdjustment,
  onAnalysisReset,
}) => {
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [adjustedFactors, setAdjustedFactors] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'chart' | 'radar' | 'detailed'>('chart');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Analyze confidence factors
  const factorAnalyses = useMemo((): FactorAnalysisResult[] => {
    const analyses: FactorAnalysisResult[] = [
      {
        id: 'data_quality',
        name: 'Veri Kalitesi',
        stealthName: 'Kayıt Tutarlılığı',
        currentValue: uncertaintyFactors.dataQuality,
        normalizedScore: uncertaintyFactors.dataQuality * 100,
        impact:
          uncertaintyFactors.dataQuality > 0.8
            ? 'critical'
            : uncertaintyFactors.dataQuality > 0.6
              ? 'high'
              : uncertaintyFactors.dataQuality > 0.4
                ? 'medium'
                : 'low',
        confidenceContribution: calculateContribution(
          'data_quality',
          uncertaintyFactors.dataQuality
        ),
        trendDirection: calculateTrend('dataQuality', historicalFactorData),
        optimalRange: [0.85, 1.0],
        currentStatus: getFactorStatus(uncertaintyFactors.dataQuality),
        improvementPotential: Math.max(0, 0.9 - uncertaintyFactors.dataQuality) * 20, // 20% per 0.1 improvement
        recommendations: getDataQualityRecommendations(uncertaintyFactors.dataQuality, stealthMode),
      },
      {
        id: 'history_length',
        name: 'Geçmiş Veri Uzunluğu',
        stealthName: 'Kayıt Geçmişi',
        currentValue: uncertaintyFactors.historyLength,
        normalizedScore: Math.min(uncertaintyFactors.historyLength / 6, 1) * 100, // Normalize to 6 cycles
        impact:
          uncertaintyFactors.historyLength >= 6
            ? 'high'
            : uncertaintyFactors.historyLength >= 3
              ? 'medium'
              : 'critical',
        confidenceContribution: calculateContribution(
          'history_length',
          Math.min(uncertaintyFactors.historyLength / 6, 1)
        ),
        trendDirection: calculateTrend('historyLength', historicalFactorData),
        optimalRange: [6, 12],
        currentStatus:
          uncertaintyFactors.historyLength >= 6
            ? 'excellent'
            : uncertaintyFactors.historyLength >= 4
              ? 'good'
              : uncertaintyFactors.historyLength >= 2
                ? 'fair'
                : 'poor',
        improvementPotential: Math.max(0, 6 - uncertaintyFactors.historyLength) * 5, // 5% per cycle
        recommendations: getHistoryLengthRecommendations(
          uncertaintyFactors.historyLength,
          stealthMode
        ),
      },
      {
        id: 'cycle_regularity',
        name: 'Döngü Düzenlilik',
        stealthName: 'Pattern Tutarlılığı',
        currentValue: uncertaintyFactors.cycleLengthVariability,
        normalizedScore: Math.max(0, (10 - uncertaintyFactors.cycleLengthVariability) / 10) * 100, // Invert - lower variability = higher score
        impact:
          uncertaintyFactors.cycleLengthVariability < 3
            ? 'high'
            : uncertaintyFactors.cycleLengthVariability < 5
              ? 'medium'
              : 'critical',
        confidenceContribution: calculateContribution(
          'cycle_regularity',
          Math.max(0, (10 - uncertaintyFactors.cycleLengthVariability) / 10)
        ),
        trendDirection: calculateTrend('cycleLengthVariability', historicalFactorData, true), // Inverted trend
        optimalRange: [1, 3],
        currentStatus:
          uncertaintyFactors.cycleLengthVariability < 2
            ? 'excellent'
            : uncertaintyFactors.cycleLengthVariability < 4
              ? 'good'
              : uncertaintyFactors.cycleLengthVariability < 6
                ? 'fair'
                : 'poor',
        improvementPotential: Math.max(0, uncertaintyFactors.cycleLengthVariability - 2) * 3, // 3% per day of variability
        recommendations: getCycleRegularityRecommendations(
          uncertaintyFactors.cycleLengthVariability,
          stealthMode
        ),
      },
      {
        id: 'recent_reliability',
        name: 'Son Veri Güvenilirliği',
        stealthName: 'Güncel Kayıt Kalitesi',
        currentValue: uncertaintyFactors.recentDataReliability,
        normalizedScore: uncertaintyFactors.recentDataReliability * 100,
        impact:
          uncertaintyFactors.recentDataReliability > 0.8
            ? 'high'
            : uncertaintyFactors.recentDataReliability > 0.6
              ? 'medium'
              : 'critical',
        confidenceContribution: calculateContribution(
          'recent_reliability',
          uncertaintyFactors.recentDataReliability
        ),
        trendDirection: calculateTrend('recentDataReliability', historicalFactorData),
        optimalRange: [0.85, 1.0],
        currentStatus: getFactorStatus(uncertaintyFactors.recentDataReliability),
        improvementPotential: Math.max(0, 0.9 - uncertaintyFactors.recentDataReliability) * 15, // 15% per 0.1 improvement
        recommendations: getRecentReliabilityRecommendations(
          uncertaintyFactors.recentDataReliability,
          stealthMode
        ),
      },
    ];

    // Sort by confidence contribution (most impactful first)
    return analyses.sort((a, b) => b.confidenceContribution - a.confidenceContribution);
  }, [uncertaintyFactors, cyclePattern, historicalFactorData, stealthMode]);

  function calculateContribution(factorId: string, value: number): number {
    // Calculate each factor's contribution to overall confidence
    const weights = {
      data_quality: 30,
      history_length: 25,
      cycle_regularity: 25,
      recent_reliability: 20,
    };

    const baseWeight = weights[factorId as keyof typeof weights] || 20;
    return (
      baseWeight *
      (factorId === 'cycle_regularity'
        ? Math.max(0, (10 - value) / 10) // Invert for variability
        : Math.min(value, 1))
    ); // Cap at 1.0
  }

  function calculateTrend(
    field: string,
    data: HistoricalFactorData[],
    inverted = false
  ): 'improving' | 'stable' | 'declining' {
    if (data.length < 4) return 'stable';

    const recent = data.slice(-3);
    const older = data.slice(-6, -3);

    if (older.length === 0) return 'stable';

    const recentAvg =
      recent.reduce((sum, d) => sum + (d[field as keyof HistoricalFactorData] as number), 0) /
      recent.length;
    const olderAvg =
      older.reduce((sum, d) => sum + (d[field as keyof HistoricalFactorData] as number), 0) /
      older.length;

    const improvement = recentAvg - olderAvg;
    const threshold = 0.05; // 5% change threshold

    if (inverted) {
      // For variability, lower is better
      if (improvement < -threshold) return 'improving';
      if (improvement > threshold) return 'declining';
    } else {
      if (improvement > threshold) return 'improving';
      if (improvement < -threshold) return 'declining';
    }

    return 'stable';
  }

  function getFactorStatus(value: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (value >= 0.85) return 'excellent';
    if (value >= 0.7) return 'good';
    if (value >= 0.5) return 'fair';
    return 'poor';
  }

  function getDataQualityRecommendations(value: number, stealth: boolean): string[] {
    if (value >= 0.85) {
      return [stealth ? 'Mevcut kaliteyi sürdür' : 'Mükemmel! Mevcut veri kalitesini sürdür'];
    }
    const recommendations = [];
    if (stealth) {
      recommendations.push('Günlük kayıtları düzenli tut');
      if (value < 0.6) {
        recommendations.push('Eksik günleri tamamla');
        recommendations.push('Kayıt hatırlatıcıları kur');
      }
    } else {
      recommendations.push('Günlük semptom kayıtlarını düzenli tut');
      if (value < 0.6) {
        recommendations.push('Geçmiş eksik kayıtları tamamla');
        recommendations.push('Hatırlatıcı bildirimlerini aktive et');
      }
    }
    return recommendations;
  }

  function getHistoryLengthRecommendations(length: number, stealth: boolean): string[] {
    if (length >= 6) {
      return [stealth ? 'Yeterli geçmiş var' : 'İdeal geçmiş veri uzunluğuna sahipsin'];
    }
    return [
      stealth
        ? `${6 - length} döngü daha kaydet`
        : `${6 - length} döngü daha kaydetmen tahmin doğruluğunu artıracak`,
      stealth ? 'Kayıtlarını sürdür' : 'Düzenli kayıt tutmaya devam et',
    ];
  }

  function getCycleRegularityRecommendations(variability: number, stealth: boolean): string[] {
    if (variability < 3) {
      return [stealth ? 'Döngün çok düzenli!' : 'Mükemmel döngü düzenliği!'];
    }
    const recommendations = [];
    if (stealth) {
      recommendations.push('Yaşam tarzını düzenle');
      if (variability > 6) {
        recommendations.push('Stres yönetimi önemli');
        recommendations.push('Uzman desteği al');
      }
    } else {
      recommendations.push('Uyku düzenini iyileştir');
      recommendations.push('Stresi azaltmaya çalış');
      if (variability > 6) {
        recommendations.push('Sağlık uzmanına danış');
        recommendations.push('Beslenme düzenine dikkat et');
      }
    }
    return recommendations;
  }

  function getRecentReliabilityRecommendations(value: number, stealth: boolean): string[] {
    if (value >= 0.85) {
      return [stealth ? 'Son kayıtların mükemmel' : 'Son dönem kayıtların mükemmel!'];
    }
    return [
      stealth ? 'Son günlerdeki kayıtları gözden geçir' : 'Son dönem kayıtlarını gözden geçir',
      stealth ? 'Güncel verileri kontrol et' : 'Son günlerin verilerini tamamla',
    ];
  }

  const handleFactorAdjustment = (factorId: string, newValue: number) => {
    setAdjustedFactors(prev => ({ ...prev, [factorId]: newValue }));
    onFactorAdjustment?.(factorId, newValue);
  };

  const toggleFactorSelection = (factorId: string) => {
    const newSelected = new Set(selectedFactors);
    if (newSelected.has(factorId)) {
      newSelected.delete(factorId);
    } else {
      newSelected.add(factorId);
    }
    setSelectedFactors(newSelected);
  };

  const toggleDetails = (factorId: string) => {
    setShowDetails(prev => ({ ...prev, [factorId]: !prev[factorId] }));
  };

  // Prepare chart data
  const factorChartData = factorAnalyses.map(factor => ({
    name: stealthMode ? factor.stealthName : factor.name,
    score: factor.normalizedScore,
    contribution: factor.confidenceContribution,
    potential: factor.improvementPotential,
  }));

  // Radar chart data
  const radarData = [
    {
      factor: 'Current',
      'Veri Kalitesi': uncertaintyFactors.dataQuality * 100,
      'Geçmiş Uzunluk': Math.min(uncertaintyFactors.historyLength / 6, 1) * 100,
      'Döngü Düzenlik': Math.max(0, (10 - uncertaintyFactors.cycleLengthVariability) / 10) * 100,
      'Son Güvenilirlik': uncertaintyFactors.recentDataReliability * 100,
    },
  ];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return colors.success;
      case 'good':
        return colors.info;
      case 'fair':
        return colors.warning;
      case 'poor':
        return colors.danger;
      default:
        return colors.secondary;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
        return Database;
      case 'high':
        return TrendingUp;
      case 'medium':
        return Activity;
      case 'low':
        return Calendar;
      default:
        return Info;
    }
  };

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background}>
        {/* Header */}
        <YStack space="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$6" fontWeight="700" color={colors.primary}>
              {stealthMode ? 'Güven Faktörü Analizi' : 'Güven Faktör Analiz Arayüzü'}
            </Text>
            <XStack space="$2">
              <Button
                size="$3"
                variant="outlined"
                borderColor={colors.primary}
                color={colors.primary}
                onPress={() =>
                  setViewMode(
                    viewMode === 'chart' ? 'radar' : viewMode === 'radar' ? 'detailed' : 'chart'
                  )
                }
                icon={BarChart3}
              >
                {viewMode === 'chart' ? 'Radar' : viewMode === 'radar' ? 'Detay' : 'Grafik'}
              </Button>
              {onAnalysisReset && (
                <Button
                  size="$3"
                  variant="outlined"
                  borderColor={colors.secondary}
                  color={colors.secondary}
                  onPress={onAnalysisReset}
                  icon={RotateCcw}
                >
                  Sıfırla
                </Button>
              )}
            </XStack>
          </XStack>

          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Tahmin güvenilirliğini etkileyen faktörlerin detaylı analizi'
              : 'Döngü tahmin güvenilirliğinizi etkileyen faktörlerin interaktif analizi'}
          </Text>
        </YStack>

        {/* View Mode Charts */}
        {viewMode === 'chart' && (
          <View
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            padding="$3"
            borderWidth={1}
            borderColor={colors.secondary}
          >
            <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
              {stealthMode ? 'Faktör Skorları' : 'Güven Faktörü Skorları'}
            </Text>

            <View height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={factorChartData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.secondary }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.secondary }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.secondary}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="score" fill={colors.primary} />
                  <Bar dataKey="contribution" fill={colors.info} />
                </BarChart>
              </ResponsiveContainer>
            </View>
          </View>
        )}

        {viewMode === 'radar' && (
          <View
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            padding="$3"
            borderWidth={1}
            borderColor={colors.secondary}
          >
            <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
              {stealthMode ? 'Radar Analizi' : 'Faktör Radar Analizi'}
            </Text>

            <View height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="factor"
                    tick={{ fontSize: 10, fill: colors.secondary }}
                  />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: colors.secondary }} />
                  <Radar
                    name="Current"
                    dataKey="Veri Kalitesi"
                    stroke={colors.primary}
                    fill={colors.primary}
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </View>
          </View>
        )}

        {/* Detailed Factor Analysis */}
        <YStack space="$3">
          <Text fontSize="$4" fontWeight="600" color={colors.primary}>
            {stealthMode ? 'Detaylı Faktör İncelemesi' : 'Detayli Güven Faktörü Analizi'}
          </Text>

          {factorAnalyses.map(factor => {
            const isExpanded = showDetails[factor.id];
            const statusColor = getStatusColor(factor.currentStatus);
            const ImpactIcon = getImpactIcon(factor.impact);
            const isSelected = selectedFactors.has(factor.id);

            return (
              <View
                key={factor.id}
                backgroundColor={colors.cardBg}
                borderRadius="$4"
                borderWidth={2}
                borderColor={isSelected ? colors.primary : colors.secondary}
                overflow="hidden"
              >
                {/* Factor Header */}
                <XStack
                  padding="$3"
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor={`${statusColor}10`}
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => toggleFactorSelection(factor.id)}
                >
                  <XStack space="$3" alignItems="center" flex={1}>
                    <View
                      width={40}
                      height={40}
                      backgroundColor={statusColor}
                      borderRadius={20}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <ImpactIcon size={20} color="white" />
                    </View>

                    <YStack flex={1}>
                      <Text fontSize="$4" fontWeight="600" color={colors.primary}>
                        {stealthMode ? factor.stealthName : factor.name}
                      </Text>
                      <XStack space="$2" alignItems="center">
                        <Text fontSize="$2" color={colors.secondary}>
                          Skor: {Math.round(factor.normalizedScore)}%
                        </Text>
                        <Text fontSize="$2" color={colors.secondary}>
                          Katkı: {Math.round(factor.confidenceContribution)}%
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>

                  <Button
                    size="$2"
                    variant="ghost"
                    onPress={() => toggleDetails(factor.id)}
                    icon={isExpanded ? EyeOff : Eye}
                  />
                </XStack>

                {/* Progress Bar */}
                <View padding="$3" paddingTop="$0">
                  <View height={8} backgroundColor={`${statusColor}20`} borderRadius={4}>
                    <View
                      width={`${factor.normalizedScore}%`}
                      height="100%"
                      backgroundColor={statusColor}
                      borderRadius={4}
                    />
                  </View>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <YStack space="$3" padding="$3" paddingTop="$0">
                    {/* Current Status */}
                    <XStack space="$4" justifyContent="space-around">
                      <YStack alignItems="center">
                        <Text fontSize="$2" color={colors.secondary}>
                          Durum
                        </Text>
                        <Text fontSize="$3" fontWeight="600" color={statusColor}>
                          {factor.currentStatus === 'excellent'
                            ? 'Mükemmel'
                            : factor.currentStatus === 'good'
                              ? 'İyi'
                              : factor.currentStatus === 'fair'
                                ? 'Orta'
                                : 'Zayıf'}
                        </Text>
                      </YStack>

                      <YStack alignItems="center">
                        <Text fontSize="$2" color={colors.secondary}>
                          Trend
                        </Text>
                        <Text
                          fontSize="$3"
                          fontWeight="600"
                          color={
                            factor.trendDirection === 'improving'
                              ? colors.success
                              : factor.trendDirection === 'declining'
                                ? colors.danger
                                : colors.info
                          }
                        >
                          {factor.trendDirection === 'improving'
                            ? 'İyileşiyor'
                            : factor.trendDirection === 'declining'
                              ? 'Kötüleşiyor'
                              : 'Sabit'}
                        </Text>
                      </YStack>

                      <YStack alignItems="center">
                        <Text fontSize="$2" color={colors.secondary}>
                          İyileşme Potansiyeli
                        </Text>
                        <Text fontSize="$3" fontWeight="600" color={colors.warning}>
                          +{Math.round(factor.improvementPotential)}%
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Interactive Adjustment Slider */}
                    {interactiveMode && (
                      <YStack space="$2">
                        <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                          {stealthMode ? 'Simülasyon Ayarı:' : 'Simülasyon Değeri:'}
                        </Text>
                        <Slider
                          value={[adjustedFactors[factor.id] || factor.currentValue]}
                          onValueChange={values => handleFactorAdjustment(factor.id, values[0])}
                          max={factor.id === 'cycle_regularity' ? 10 : 1}
                          min={0}
                          step={factor.id === 'history_length' ? 1 : 0.1}
                        >
                          <Slider.Track backgroundColor={`${colors.primary}20`}>
                            <Slider.TrackActive backgroundColor={colors.primary} />
                          </Slider.Track>
                          <Slider.Thumb backgroundColor={colors.primary} />
                        </Slider>
                        <Text fontSize="$2" color={colors.secondary} textAlign="center">
                          Güncel:{' '}
                          {adjustedFactors[factor.id]?.toFixed(1) || factor.currentValue.toFixed(1)}
                        </Text>
                      </YStack>
                    )}

                    {/* Recommendations */}
                    <YStack space="$2">
                      <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                        {stealthMode ? 'Öneriler:' : 'İyileştirme Önerileri:'}
                      </Text>
                      {factor.recommendations.map((rec, index) => (
                        <XStack key={index} space="$2" alignItems="center">
                          <View
                            width={6}
                            height={6}
                            borderRadius={3}
                            backgroundColor={statusColor}
                          />
                          <Text fontSize="$3" color={colors.primary} flex={1}>
                            {rec}
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  </YStack>
                )}
              </View>
            );
          })}
        </YStack>

        {/* Overall Analysis Summary */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.primary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Genel Değerlendirme' : 'Genel Güven Analizi'}
          </Text>

          <YStack space="$2">
            <Text fontSize="$3" color={colors.primary}>
              • En etkili faktör:{' '}
              {stealthMode ? factorAnalyses[0]?.stealthName : factorAnalyses[0]?.name}
              (%{Math.round(factorAnalyses[0]?.confidenceContribution || 0)} katkı)
            </Text>
            <Text fontSize="$3" color={colors.primary}>
              • Toplam iyileştirme potansiyeli: +
              {Math.round(factorAnalyses.reduce((sum, f) => sum + f.improvementPotential, 0))}%
            </Text>
            <Text fontSize="$3" color={colors.primary}>
              • Öncelikli iyileştirme alanı:{' '}
              {factorAnalyses
                .filter(f => f.currentStatus === 'poor' || f.currentStatus === 'fair')
                .sort((a, b) => b.improvementPotential - a.improvementPotential)[0]?.[
                stealthMode ? 'stealthName' : 'name'
              ] || 'Tüm faktörler iyi durumda'}
            </Text>
          </YStack>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default ConfidenceFactorAnalysisInterface;
