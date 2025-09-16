import React, { useState, useMemo, useCallback } from 'react';
import { YStack, XStack, Text, View, Button, ScrollView, Slider } from '@tamagui/core';
import {
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Area,
  AreaChart,
  ReferenceLine,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Sliders,
  RotateCcw,
  Play,
  Pause,
  TrendingUp,
  Target,
  AlertTriangle,
  Zap,
} from '@tamagui/lucide-icons';
import type {
  ConfidenceInterval,
  UncertaintyFactors,
  PredictionVisualization,
} from '@aura/shared-types';

interface InteractiveUncertaintyExplorerProps {
  baseFactors: UncertaintyFactors;
  baseConfidenceIntervals: ConfidenceInterval;
  baseVisualization: PredictionVisualization;
  predictionType: 'period' | 'ovulation';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onScenarioChange?: (scenario: ScenarioAdjustments, results: ScenarioResults) => void;
}

interface ScenarioAdjustments {
  dataQualityChange: number; // -0.5 to +0.5
  historyLengthChange: number; // -6 to +6 cycles
  cycleLengthVariabilityChange: number; // -5 to +5 days
  recentDataReliabilityChange: number; // -0.5 to +0.5
}

interface ScenarioResults {
  adjustedFactors: UncertaintyFactors;
  adjustedConfidenceIntervals: ConfidenceInterval;
  predictionRobustnessScore: number; // 0-100
  confidenceImpact: {
    p50Change: number;
    p80Change: number;
    p95Change: number;
  };
  scenarioAnalysis: {
    overallImpact: 'positive' | 'negative' | 'neutral';
    mostSensitiveFactor: string;
    robustnessRating: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
}

/**
 * Interactive Uncertainty Explorer Component
 * Allows users to explore prediction sensitivity with "what if" scenarios
 */
export const InteractiveUncertaintyExplorer: React.FC<InteractiveUncertaintyExplorerProps> = ({
  baseFactors,
  baseConfidenceIntervals,
  baseVisualization,
  predictionType,
  stealthMode = false,
  culturalTheme = 'modern',
  onScenarioChange,
}) => {
  const [adjustments, setAdjustments] = useState<ScenarioAdjustments>({
    dataQualityChange: 0,
    historyLengthChange: 0,
    cycleLengthVariabilityChange: 0,
    recentDataReliabilityChange: 0,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<
    'best' | 'worst' | 'realistic' | 'custom'
  >('custom');

  // Calculate scenario results based on adjustments
  const scenarioResults = useMemo((): ScenarioResults => {
    // Calculate adjusted factors
    const adjustedFactors: UncertaintyFactors = {
      dataQuality: Math.max(
        0,
        Math.min(1, baseFactors.dataQuality + adjustments.dataQualityChange)
      ),
      historyLength: Math.max(0, baseFactors.historyLength + adjustments.historyLengthChange),
      cycleLengthVariability: Math.max(
        0.5,
        baseFactors.cycleLengthVariability + adjustments.cycleLengthVariabilityChange
      ),
      recentDataReliability: Math.max(
        0,
        Math.min(1, baseFactors.recentDataReliability + adjustments.recentDataReliabilityChange)
      ),
      seasonalPatterns: baseFactors.seasonalPatterns,
    };

    // Calculate impact on confidence intervals
    const qualityImpact = (adjustedFactors.dataQuality - baseFactors.dataQuality) * -0.5; // Better quality = narrower intervals
    const historyImpact = (adjustedFactors.historyLength - baseFactors.historyLength) * -0.1;
    const variabilityImpact =
      (adjustedFactors.cycleLengthVariability - baseFactors.cycleLengthVariability) * 0.2; // More variability = wider intervals
    const reliabilityImpact =
      (adjustedFactors.recentDataReliability - baseFactors.recentDataReliability) * -0.3;

    const totalImpact = qualityImpact + historyImpact + variabilityImpact + reliabilityImpact;

    const adjustedConfidenceIntervals: ConfidenceInterval = {
      p50: Math.max(0.5, baseConfidenceIntervals.p50 + totalImpact * 0.5),
      p80: Math.max(1.0, baseConfidenceIntervals.p80 + totalImpact * 0.8),
      p95: Math.max(2.0, baseConfidenceIntervals.p95 + totalImpact * 1.2),
    };

    // Calculate prediction robustness score
    const robustnessFactors = [
      adjustedFactors.dataQuality,
      Math.min(adjustedFactors.historyLength / 6, 1), // Normalize to 6 cycles
      Math.max(0, (10 - adjustedFactors.cycleLengthVariability) / 10), // Invert variability
      adjustedFactors.recentDataReliability,
    ];
    const predictionRobustnessScore =
      (robustnessFactors.reduce((sum, factor) => sum + factor, 0) / robustnessFactors.length) * 100;

    // Calculate confidence changes
    const confidenceImpact = {
      p50Change:
        ((baseConfidenceIntervals.p50 - adjustedConfidenceIntervals.p50) /
          baseConfidenceIntervals.p50) *
        100,
      p80Change:
        ((baseConfidenceIntervals.p80 - adjustedConfidenceIntervals.p80) /
          baseConfidenceIntervals.p80) *
        100,
      p95Change:
        ((baseConfidenceIntervals.p95 - adjustedConfidenceIntervals.p95) /
          baseConfidenceIntervals.p95) *
        100,
    };

    // Analyze scenario
    const avgConfidenceChange =
      (confidenceImpact.p50Change + confidenceImpact.p80Change + confidenceImpact.p95Change) / 3;
    const overallImpact: 'positive' | 'negative' | 'neutral' =
      avgConfidenceChange > 5 ? 'positive' : avgConfidenceChange < -5 ? 'negative' : 'neutral';

    // Find most sensitive factor
    const factorSensitivities = {
      'Veri Kalitesi': Math.abs(adjustments.dataQualityChange * 20),
      'Geçmiş Uzunluk': Math.abs(adjustments.historyLengthChange * 2),
      'Döngü Düzenlilik': Math.abs(adjustments.cycleLengthVariabilityChange * 3),
      'Son Güvenilirlik': Math.abs(adjustments.recentDataReliabilityChange * 15),
    };
    const mostSensitiveFactor = Object.keys(factorSensitivities).reduce((a, b) =>
      factorSensitivities[a] > factorSensitivities[b] ? a : b
    );

    // Determine robustness rating
    let robustnessRating: 'excellent' | 'good' | 'fair' | 'poor';
    if (predictionRobustnessScore >= 85) robustnessRating = 'excellent';
    else if (predictionRobustnessScore >= 70) robustnessRating = 'good';
    else if (predictionRobustnessScore >= 55) robustnessRating = 'fair';
    else robustnessRating = 'poor';

    // Generate recommendations
    const recommendations = generateRecommendations(
      adjustedFactors,
      overallImpact,
      mostSensitiveFactor,
      stealthMode
    );

    return {
      adjustedFactors,
      adjustedConfidenceIntervals,
      predictionRobustnessScore,
      confidenceImpact,
      scenarioAnalysis: {
        overallImpact,
        mostSensitiveFactor,
        robustnessRating,
        recommendations,
      },
    };
  }, [baseFactors, baseConfidenceIntervals, adjustments, stealthMode]);

  function generateRecommendations(
    factors: UncertaintyFactors,
    impact: 'positive' | 'negative' | 'neutral',
    sensitiveFactor: string,
    stealth: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (impact === 'negative') {
      if (stealth) {
        recommendations.push('Bu senaryo tahmin aralığını genişletiyor');
        recommendations.push(`${sensitiveFactor} faktörü en fazla etki yapıyor`);
      } else {
        recommendations.push('Bu değişiklikler tahmin belirsizliğini artırıyor');
        recommendations.push(`${sensitiveFactor} en hassas faktör olarak görünüyor`);
      }
    } else if (impact === 'positive') {
      if (stealth) {
        recommendations.push('Bu senaryo tahmin doğruluğunu artırıyor');
        recommendations.push('Bu iyileştirmelere odaklan');
      } else {
        recommendations.push('Bu değişiklikler tahmin güvenilirliğini artırıyor');
        recommendations.push('Bu faktörleri iyileştirmeye odaklan');
      }
    }

    if (factors.dataQuality < 0.6) {
      recommendations.push(stealth ? 'Kayıt kalitesini artır' : 'Veri kalitesini iyileştir');
    }

    if (factors.historyLength < 4) {
      recommendations.push(stealth ? 'Daha fazla kayıt tut' : 'Geçmiş veri uzunluğunu artır');
    }

    return recommendations.slice(0, 4); // Limit to 4 recommendations
  }

  const handleAdjustmentChange = useCallback(
    (key: keyof ScenarioAdjustments, value: number) => {
      const newAdjustments = { ...adjustments, [key]: value };
      setAdjustments(newAdjustments);
      onScenarioChange?.(newAdjustments, scenarioResults);
    },
    [adjustments, scenarioResults, onScenarioChange]
  );

  const resetAdjustments = () => {
    const resetAdjustments: ScenarioAdjustments = {
      dataQualityChange: 0,
      historyLengthChange: 0,
      cycleLengthVariabilityChange: 0,
      recentDataReliabilityChange: 0,
    };
    setAdjustments(resetAdjustments);
  };

  const loadPresetScenario = (scenario: 'best' | 'worst' | 'realistic') => {
    let newAdjustments: ScenarioAdjustments;

    switch (scenario) {
      case 'best':
        newAdjustments = {
          dataQualityChange: 0.2,
          historyLengthChange: 3,
          cycleLengthVariabilityChange: -2,
          recentDataReliabilityChange: 0.2,
        };
        break;
      case 'worst':
        newAdjustments = {
          dataQualityChange: -0.3,
          historyLengthChange: -2,
          cycleLengthVariabilityChange: 3,
          recentDataReliabilityChange: -0.3,
        };
        break;
      case 'realistic':
        newAdjustments = {
          dataQualityChange: 0.1,
          historyLengthChange: 1,
          cycleLengthVariabilityChange: 0,
          recentDataReliabilityChange: 0.05,
        };
        break;
    }

    setAdjustments(newAdjustments);
    setSelectedScenario(scenario);
  };

  // Prepare comparison chart data
  const comparisonData = useMemo(() => {
    const data = [
      {
        name: 'Mevcut',
        p50: baseConfidenceIntervals.p50,
        p80: baseConfidenceIntervals.p80,
        p95: baseConfidenceIntervals.p95,
        robustness:
          (baseFactors.dataQuality * 100 +
            Math.min(baseFactors.historyLength / 6, 1) * 100 +
            Math.max(0, (10 - baseFactors.cycleLengthVariability) / 10) * 100 +
            baseFactors.recentDataReliability * 100) /
          4,
      },
      {
        name: 'Senaryo',
        p50: scenarioResults.adjustedConfidenceIntervals.p50,
        p80: scenarioResults.adjustedConfidenceIntervals.p80,
        p95: scenarioResults.adjustedConfidenceIntervals.p95,
        robustness: scenarioResults.predictionRobustnessScore,
      },
    ];

    return data;
  }, [baseFactors, baseConfidenceIntervals, scenarioResults]);

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

  const getImpactColor = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return colors.success;
      case 'negative':
        return colors.danger;
      default:
        return colors.info;
    }
  };

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background}>
        {/* Header */}
        <YStack space="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$6" fontWeight="700" color={colors.primary}>
              {stealthMode ? 'Belirsizlik Keşif Aracı' : 'İnteraktif Belirsizlik Keşfi'}
            </Text>
            <XStack space="$2">
              <Button
                size="$3"
                variant="outlined"
                borderColor={colors.primary}
                color={colors.primary}
                onPress={resetAdjustments}
                icon={RotateCcw}
              >
                Sıfırla
              </Button>
              <Button
                size="$3"
                backgroundColor={colors.primary}
                onPress={() => setIsPlaying(!isPlaying)}
                icon={isPlaying ? Pause : Play}
              >
                {isPlaying ? 'Durdur' : 'Oyna'}
              </Button>
            </XStack>
          </XStack>

          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Farklı senaryoları keşfederek tahmin hassasiyetini analiz et'
              : '"Ne olur eğer?" senaryolarıyla tahmin hassasiyetini keşfet'}
          </Text>
        </YStack>

        {/* Preset Scenarios */}
        <XStack space="$2" justifyContent="center">
          {(['best', 'realistic', 'worst'] as const).map(scenario => (
            <Button
              key={scenario}
              size="$2"
              variant={selectedScenario === scenario ? 'solid' : 'outlined'}
              backgroundColor={selectedScenario === scenario ? colors.primary : 'transparent'}
              borderColor={colors.primary}
              color={selectedScenario === scenario ? 'white' : colors.primary}
              onPress={() => loadPresetScenario(scenario)}
            >
              {scenario === 'best' ? 'En İyi' : scenario === 'realistic' ? 'Gerçekçi' : 'En Kötü'}
            </Button>
          ))}
        </XStack>

        {/* Interactive Controls */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Senaryo Ayarları' : 'Hassasiyet Analiz Kontrolleri'}
          </Text>

          <YStack space="$4">
            {/* Data Quality Adjustment */}
            <YStack space="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                  {stealthMode ? 'Kayıt Kalitesi' : 'Veri Kalitesi Değişimi'}
                </Text>
                <Text fontSize="$3" color={colors.secondary}>
                  {adjustments.dataQualityChange > 0 ? '+' : ''}
                  {(adjustments.dataQualityChange * 100).toFixed(0)}%
                </Text>
              </XStack>
              <Slider
                value={[adjustments.dataQualityChange]}
                onValueChange={values => handleAdjustmentChange('dataQualityChange', values[0])}
                min={-0.5}
                max={0.5}
                step={0.05}
              >
                <Slider.Track backgroundColor={`${colors.primary}20`}>
                  <Slider.TrackActive backgroundColor={colors.primary} />
                </Slider.Track>
                <Slider.Thumb backgroundColor={colors.primary} />
              </Slider>
            </YStack>

            {/* History Length Adjustment */}
            <YStack space="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                  {stealthMode ? 'Kayıt Geçmişi' : 'Geçmiş Veri Uzunluğu'}
                </Text>
                <Text fontSize="$3" color={colors.secondary}>
                  {adjustments.historyLengthChange > 0 ? '+' : ''}
                  {adjustments.historyLengthChange} döngü
                </Text>
              </XStack>
              <Slider
                value={[adjustments.historyLengthChange]}
                onValueChange={values => handleAdjustmentChange('historyLengthChange', values[0])}
                min={-6}
                max={6}
                step={1}
              >
                <Slider.Track backgroundColor={`${colors.info}20`}>
                  <Slider.TrackActive backgroundColor={colors.info} />
                </Slider.Track>
                <Slider.Thumb backgroundColor={colors.info} />
              </Slider>
            </YStack>

            {/* Cycle Variability Adjustment */}
            <YStack space="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                  {stealthMode ? 'Pattern Değişkenliği' : 'Döngü Düzenlilik Değişimi'}
                </Text>
                <Text fontSize="$3" color={colors.secondary}>
                  {adjustments.cycleLengthVariabilityChange > 0 ? '+' : ''}
                  {adjustments.cycleLengthVariabilityChange.toFixed(1)} gün
                </Text>
              </XStack>
              <Slider
                value={[adjustments.cycleLengthVariabilityChange]}
                onValueChange={values =>
                  handleAdjustmentChange('cycleLengthVariabilityChange', values[0])
                }
                min={-5}
                max={5}
                step={0.5}
              >
                <Slider.Track backgroundColor={`${colors.warning}20`}>
                  <Slider.TrackActive backgroundColor={colors.warning} />
                </Slider.Track>
                <Slider.Thumb backgroundColor={colors.warning} />
              </Slider>
            </YStack>

            {/* Recent Reliability Adjustment */}
            <YStack space="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                  {stealthMode ? 'Güncel Kayıt Kalitesi' : 'Son Veri Güvenilirliği'}
                </Text>
                <Text fontSize="$3" color={colors.secondary}>
                  {adjustments.recentDataReliabilityChange > 0 ? '+' : ''}
                  {(adjustments.recentDataReliabilityChange * 100).toFixed(0)}%
                </Text>
              </XStack>
              <Slider
                value={[adjustments.recentDataReliabilityChange]}
                onValueChange={values =>
                  handleAdjustmentChange('recentDataReliabilityChange', values[0])
                }
                min={-0.5}
                max={0.5}
                step={0.05}
              >
                <Slider.Track backgroundColor={`${colors.success}20`}>
                  <Slider.TrackActive backgroundColor={colors.success} />
                </Slider.Track>
                <Slider.Thumb backgroundColor={colors.success} />
              </Slider>
            </YStack>
          </YStack>
        </View>

        {/* Results Visualization */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
            {stealthMode ? 'Senaryo Karşılaştırması' : 'Güven Aralığı Karşılaştırması'}
          </Text>

          <View height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: colors.secondary }} />
                <YAxis tick={{ fontSize: 12, fill: colors.secondary }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.cardBg,
                    border: `1px solid ${colors.secondary}`,
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke={colors.success}
                  strokeWidth={3}
                  name="50% Güven"
                />
                <Line
                  type="monotone"
                  dataKey="p80"
                  stroke={colors.warning}
                  strokeWidth={3}
                  name="80% Güven"
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  stroke={colors.danger}
                  strokeWidth={3}
                  name="95% Güven"
                />
              </LineChart>
            </ResponsiveContainer>
          </View>
        </View>

        {/* Scenario Analysis */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={2}
          borderColor={getImpactColor(scenarioResults.scenarioAnalysis.overallImpact)}
        >
          <YStack space="$3">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize="$4" fontWeight="600" color={colors.primary}>
                {stealthMode ? 'Senaryo Analizi' : 'Hassasiyet Analiz Sonuçları'}
              </Text>
              <View
                padding="$2"
                backgroundColor={getImpactColor(scenarioResults.scenarioAnalysis.overallImpact)}
                borderRadius="$2"
              >
                {scenarioResults.scenarioAnalysis.overallImpact === 'positive' ? (
                  <TrendingUp size={16} color="white" />
                ) : scenarioResults.scenarioAnalysis.overallImpact === 'negative' ? (
                  <AlertTriangle size={16} color="white" />
                ) : (
                  <Target size={16} color="white" />
                )}
              </View>
            </XStack>

            {/* Key Metrics */}
            <XStack space="$4" justifyContent="space-around">
              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  {stealthMode ? 'Sağlamlık Skoru' : 'Tahmin Sağlamlığı'}
                </Text>
                <Text fontSize="$5" fontWeight="700" color={colors.primary}>
                  {Math.round(scenarioResults.predictionRobustnessScore)}%
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  En Hassas Faktör
                </Text>
                <Text fontSize="$3" fontWeight="600" color={colors.warning}>
                  {scenarioResults.scenarioAnalysis.mostSensitiveFactor}
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  Güven Değişimi
                </Text>
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={getImpactColor(scenarioResults.scenarioAnalysis.overallImpact)}
                >
                  {scenarioResults.scenarioAnalysis.overallImpact === 'positive'
                    ? '↑ Daha İyi'
                    : scenarioResults.scenarioAnalysis.overallImpact === 'negative'
                      ? '↓ Daha Kötü'
                      : '→ Sabit'}
                </Text>
              </YStack>
            </XStack>

            {/* Confidence Changes */}
            <YStack space="$2">
              <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                {stealthMode ? 'Güven Aralığı Değişimleri:' : 'Güven Aralığı Etkileri:'}
              </Text>
              {[
                {
                  level: '50%',
                  change: scenarioResults.confidenceImpact.p50Change,
                  color: colors.success,
                },
                {
                  level: '80%',
                  change: scenarioResults.confidenceImpact.p80Change,
                  color: colors.warning,
                },
                {
                  level: '95%',
                  change: scenarioResults.confidenceImpact.p95Change,
                  color: colors.danger,
                },
              ].map(({ level, change, color }) => (
                <XStack key={level} alignItems="center" justifyContent="space-between">
                  <Text fontSize="$3" color={color}>
                    {level} Güven Aralığı
                  </Text>
                  <Text
                    fontSize="$3"
                    fontWeight="600"
                    color={
                      change > 0 ? colors.success : change < 0 ? colors.danger : colors.secondary
                    }
                  >
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </Text>
                </XStack>
              ))}
            </YStack>

            {/* Recommendations */}
            <YStack space="$2">
              <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                {stealthMode ? 'Öneriler:' : 'Senaryo Önerileri:'}
              </Text>
              {scenarioResults.scenarioAnalysis.recommendations.map((rec, index) => (
                <XStack key={index} space="$2" alignItems="center">
                  <Zap size={14} color={colors.info} />
                  <Text fontSize="$3" color={colors.primary} flex={1}>
                    {rec}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>
        </View>

        {/* Summary */}
        <View
          backgroundColor={`${colors.primary}10`}
          borderRadius="$4"
          padding="$3"
          borderLeftWidth={4}
          borderLeftColor={colors.primary}
        >
          <Text fontSize="$3" color={colors.primary} fontWeight="500" marginBottom="$2">
            {stealthMode ? 'Keşif Özeti' : 'Hassasiyet Keşif Özeti'}
          </Text>
          <Text fontSize="$3" color={colors.primary}>
            Bu senaryo altında tahminleriniz {Math.round(scenarioResults.predictionRobustnessScore)}
            % sağlamlık skoruna sahip.
            {scenarioResults.scenarioAnalysis.mostSensitiveFactor} faktörü en yüksek hassasiyeti
            gösteriyor ve genel etki{' '}
            {scenarioResults.scenarioAnalysis.overallImpact === 'positive'
              ? 'olumlu'
              : scenarioResults.scenarioAnalysis.overallImpact === 'negative'
                ? 'olumsuz'
                : 'nötr'}
            .
          </Text>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default InteractiveUncertaintyExplorer;
