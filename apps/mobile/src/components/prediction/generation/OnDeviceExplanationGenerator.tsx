import React, { useMemo, useCallback, useState } from 'react';
import { YStack, XStack, Text, View, Button, ScrollView } from '@tamagui/core';
import {
  Cpu,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Layers,
  Globe,
  Languages,
} from '@tamagui/lucide-icons';
import type {
  ClientOnlyPredictionCache,
  UncertaintyFactors,
  CyclePattern,
} from '@aura/shared-types';

interface OnDeviceExplanationGeneratorProps {
  predictionCache: ClientOnlyPredictionCache;
  uncertaintyFactors: UncertaintyFactors;
  cyclePattern: CyclePattern;
  language?: 'tr' | 'en';
  culturalContext?: 'modern' | 'traditional' | 'minimal';
  stealthMode?: boolean;
  onExplanationGenerated?: (explanation: GeneratedExplanation) => void;
}

interface GeneratedExplanation {
  id: string;
  timestamp: string;
  mainExplanation: string;
  detailedFactors: ExplanationFactor[];
  confidenceSummary: string;
  recommendations: string[];
  qualityScore: number; // 0-100
  generationTime: number; // milliseconds
  culturallyAdapted: boolean;
  privacyCompliant: boolean;
}

interface ExplanationFactor {
  id: string;
  name: string;
  impact: 'high' | 'medium' | 'low';
  explanation: string;
  confidence: number;
  visualWeight: number;
}

interface ExplanationTemplate {
  id: string;
  category: 'confidence' | 'factors' | 'recommendations' | 'summary';
  template: string;
  variables: string[];
  culturalVariants: Record<string, string>;
  stealthVariant: string;
}

/**
 * On-Device Explanation Generation System
 * Generates privacy-preserving explanations without external API calls
 */
export const OnDeviceExplanationGenerator: React.FC<OnDeviceExplanationGeneratorProps> = ({
  predictionCache,
  uncertaintyFactors,
  cyclePattern,
  language = 'tr',
  culturalContext = 'modern',
  stealthMode = false,
  onExplanationGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<GeneratedExplanation | null>(null);
  const [generationStats, setGenerationStats] = useState({
    totalGenerated: 0,
    avgGenerationTime: 0,
    avgQualityScore: 0,
  });

  // Explanation templates for different contexts
  const explanationTemplates = useMemo(
    (): ExplanationTemplate[] => [
      {
        id: 'confidence_high',
        category: 'confidence',
        template:
          'Tahmin güvenilirliğiniz {confidence}% seviyesinde. {primaryFactor} faktörü en güçlü etkiyi yapıyor.',
        variables: ['confidence', 'primaryFactor'],
        culturalVariants: {
          traditional:
            'Döngü takibinizde {confidence}% kesinlik var. {primaryFactor} en önemli etken.',
          minimal: '{confidence}% güven. Ana faktör: {primaryFactor}.',
        },
        stealthVariant: 'Pattern güvenilirliği {confidence}%. {primaryFactor} ana etken.',
      },
      {
        id: 'factors_data_quality',
        category: 'factors',
        template:
          'Veri kalitesi {quality}% seviyesinde. {qualityAssessment} Bu durum tahmin aralığını {impact} etkiliyor.',
        variables: ['quality', 'qualityAssessment', 'impact'],
        culturalVariants: {
          traditional:
            'Kayıt tutma düzeniniz {quality}%. {qualityAssessment} Bu tahmin kesinliğini {impact} değiştiriyor.',
          minimal: 'Veri: {quality}%. {qualityAssessment} Etki: {impact}.',
        },
        stealthVariant: 'Kayıt kalitesi {quality}%. {qualityAssessment} Pattern etkisi: {impact}.',
      },
      {
        id: 'recommendations_improve',
        category: 'recommendations',
        template:
          'Tahmin doğruluğunu artırmak için: {recommendations}. Bu değişiklikler {timeFrame} içinde sonuç verecek.',
        variables: ['recommendations', 'timeFrame'],
        culturalVariants: {
          traditional: 'Daha iyi sonuçlar için: {recommendations}. Fark {timeFrame} görülür.',
          minimal: 'İyileştirme: {recommendations}. Süre: {timeFrame}.',
        },
        stealthVariant: 'Pattern iyileştirme: {recommendations}. Süre: {timeFrame}.',
      },
    ],
    []
  );

  // Generate comprehensive explanation
  const generateExplanation = useCallback(async (): Promise<GeneratedExplanation> => {
    const startTime = performance.now();

    // Analyze factors and their impacts
    const factors = analyzeFactors(uncertaintyFactors, cyclePattern, stealthMode);

    // Generate main explanation
    const mainExplanation = generateMainExplanation(
      factors,
      predictionCache.confidenceIntervals,
      culturalContext,
      stealthMode,
      explanationTemplates
    );

    // Generate confidence summary
    const confidenceSummary = generateConfidenceSummary(
      predictionCache.confidenceIntervals,
      culturalContext,
      stealthMode
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      factors,
      uncertaintyFactors,
      culturalContext,
      stealthMode
    );

    // Calculate quality score
    const qualityScore = calculateExplanationQuality(mainExplanation, factors, recommendations);

    const endTime = performance.now();
    const generationTime = endTime - startTime;

    const explanation: GeneratedExplanation = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      mainExplanation,
      detailedFactors: factors,
      confidenceSummary,
      recommendations,
      qualityScore,
      generationTime,
      culturallyAdapted: culturalContext !== 'modern',
      privacyCompliant: true, // Always true for on-device generation
    };

    return explanation;
  }, [
    uncertaintyFactors,
    cyclePattern,
    predictionCache,
    culturalContext,
    stealthMode,
    explanationTemplates,
  ]);

  function analyzeFactors(
    factors: UncertaintyFactors,
    pattern: CyclePattern,
    stealth: boolean
  ): ExplanationFactor[] {
    const explanationFactors: ExplanationFactor[] = [
      {
        id: 'data_quality',
        name: stealth ? 'Kayıt Tutarlılığı' : 'Veri Kalitesi',
        impact: factors.dataQuality > 0.8 ? 'high' : factors.dataQuality > 0.5 ? 'medium' : 'low',
        explanation: generateFactorExplanation('data_quality', factors.dataQuality, stealth),
        confidence: factors.dataQuality,
        visualWeight: factors.dataQuality * 30, // 30% max weight
      },
      {
        id: 'history_length',
        name: stealth ? 'Kayıt Geçmişi' : 'Geçmiş Veri Uzunluğu',
        impact: factors.historyLength >= 6 ? 'high' : factors.historyLength >= 3 ? 'medium' : 'low',
        explanation: generateFactorExplanation('history_length', factors.historyLength, stealth),
        confidence: Math.min(factors.historyLength / 6, 1),
        visualWeight: Math.min(factors.historyLength / 6, 1) * 25, // 25% max weight
      },
      {
        id: 'cycle_regularity',
        name: stealth ? 'Pattern Tutarlılığı' : 'Döngü Düzenlilik',
        impact:
          factors.cycleLengthVariability < 3
            ? 'high'
            : factors.cycleLengthVariability < 5
              ? 'medium'
              : 'low',
        explanation: generateFactorExplanation(
          'cycle_regularity',
          factors.cycleLengthVariability,
          stealth
        ),
        confidence: Math.max(0, (10 - factors.cycleLengthVariability) / 10),
        visualWeight: Math.max(0, (10 - factors.cycleLengthVariability) / 10) * 25, // 25% max weight
      },
      {
        id: 'recent_reliability',
        name: stealth ? 'Güncel Kayıt Kalitesi' : 'Son Veri Güvenilirliği',
        impact:
          factors.recentDataReliability > 0.8
            ? 'high'
            : factors.recentDataReliability > 0.5
              ? 'medium'
              : 'low',
        explanation: generateFactorExplanation(
          'recent_reliability',
          factors.recentDataReliability,
          stealth
        ),
        confidence: factors.recentDataReliability,
        visualWeight: factors.recentDataReliability * 20, // 20% max weight
      },
    ];

    return explanationFactors.sort((a, b) => b.visualWeight - a.visualWeight);
  }

  function generateFactorExplanation(factorId: string, value: number, stealth: boolean): string {
    switch (factorId) {
      case 'data_quality':
        if (value > 0.8) {
          return stealth
            ? 'Kayıtlarınız çok tutarlı ve güvenilir.'
            : 'Veri kalinteniz mükemmel seviyede.';
        } else if (value > 0.5) {
          return stealth
            ? 'Kayıt tutma düzeniniz iyi, küçük iyileştirmeler faydalı.'
            : 'Veri kalitesi iyi, bazı iyileştirmeler yapılabilir.';
        } else {
          return stealth
            ? 'Kayıt tutma sıklığını artırmak tahminleri iyileştirir.'
            : 'Veri kalitesi artırılabilir, daha sık kayıt tutun.';
        }
      case 'history_length':
        const cycleCount = typeof value === 'number' ? value : 0;
        if (cycleCount >= 6) {
          return stealth
            ? 'Yeterli geçmiş kaydınız var.'
            : 'İdeal geçmiş veri uzunluğuna sahipsiniz.';
        } else {
          return stealth
            ? `${6 - cycleCount} döngü daha kaydetmeniz faydalı.`
            : `${6 - cycleCount} döngü daha veri tahminleri güçlendirir.`;
        }
      case 'cycle_regularity':
        if (value < 3) {
          return stealth ? 'Pattern tutarlılığınız mükemmel.' : 'Döngüleriniz çok düzenli.';
        } else if (value < 5) {
          return stealth ? 'Pattern genellikle tutarlı.' : 'Döngü düzenliği iyi seviyede.';
        } else {
          return stealth
            ? 'Pattern değişkenliği tahminleri etkiliyor.'
            : 'Döngü değişkenliği tahmin belirsizliğini artırıyor.';
        }
      case 'recent_reliability':
        if (value > 0.8) {
          return stealth
            ? 'Son dönem kayıtlarınız mükemmel.'
            : 'Son veri güvenilirliğiniz çok iyi.';
        } else {
          return stealth
            ? 'Son kayıtlarınızı gözden geçirin.'
            : 'Son dönem veri güvenilirliği artırılabilir.';
        }
      default:
        return stealth ? 'Bu faktör analiz ediliyor.' : 'Bu faktör değerlendiriliyor.';
    }
  }

  function generateMainExplanation(
    factors: ExplanationFactor[],
    confidenceIntervals: any,
    cultural: string,
    stealth: boolean,
    templates: ExplanationTemplate[]
  ): string {
    const primaryFactor = factors[0];
    const confidence = Math.round((1 - confidenceIntervals.p80 / 7) * 100); // Approximate confidence

    const template = templates.find(t => t.id === 'confidence_high');
    if (!template) {
      return stealth ? 'Tahmin analizi tamamlandı.' : 'Tahmin güvenilirliği analiz edildi.';
    }

    let explanation = stealth
      ? template.stealthVariant
      : (cultural !== 'modern' && template.culturalVariants[cultural]) || template.template;

    explanation = explanation
      .replace('{confidence}', confidence.toString())
      .replace('{primaryFactor}', primaryFactor.name);

    return explanation;
  }

  function generateConfidenceSummary(intervals: any, cultural: string, stealth: boolean): string {
    if (stealth) {
      return `Tahmin aralıkları: ±${intervals.p50.toFixed(1)} (yüksek olasılık), ±${intervals.p80.toFixed(1)} (iyi olasılık), ±${intervals.p95.toFixed(1)} (geniş aralık)`;
    }

    return `Güven aralıkları: %50 güven ile ±${intervals.p50.toFixed(1)} gün, %80 güven ile ±${intervals.p80.toFixed(1)} gün, %95 güven ile ±${intervals.p95.toFixed(1)} gün`;
  }

  function generateRecommendations(
    factors: ExplanationFactor[],
    uncertaintyFactors: UncertaintyFactors,
    cultural: string,
    stealth: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (uncertaintyFactors.dataQuality < 0.8) {
      recommendations.push(
        stealth
          ? 'Günlük kayıtları düzenli tutmaya odaklan'
          : 'Veri kalitesini artırmak için günlük kayıtları düzenli tut'
      );
    }

    if (uncertaintyFactors.historyLength < 6) {
      recommendations.push(
        stealth
          ? 'Kayıt tutmaya devam et, geçmiş verilerin artması faydalı'
          : 'Tahmin doğruluğu için kayıt tutmaya devam et'
      );
    }

    if (uncertaintyFactors.cycleLengthVariability > 5) {
      recommendations.push(
        stealth
          ? 'Yaşam düzenine dikkat et, stres yönetimi önemli'
          : 'Döngü düzenliği için yaşam tarzı düzenlemeleri yap'
      );
    }

    return recommendations.slice(0, 3); // Max 3 recommendations
  }

  function calculateExplanationQuality(
    mainExplanation: string,
    factors: ExplanationFactor[],
    recommendations: string[]
  ): number {
    let score = 70; // Base score

    // Length and detail check
    if (mainExplanation.length > 50) score += 10;
    if (factors.length >= 3) score += 10;
    if (recommendations.length >= 2) score += 10;

    return Math.min(score, 100);
  }

  const handleGenerateExplanation = async () => {
    setIsGenerating(true);
    try {
      const explanation = await generateExplanation();
      setLastExplanation(explanation);

      // Update stats
      setGenerationStats(prev => ({
        totalGenerated: prev.totalGenerated + 1,
        avgGenerationTime:
          (prev.avgGenerationTime * prev.totalGenerated + explanation.generationTime) /
          (prev.totalGenerated + 1),
        avgQualityScore:
          (prev.avgQualityScore * prev.totalGenerated + explanation.qualityScore) /
          (prev.totalGenerated + 1),
      }));

      onExplanationGenerated?.(explanation);
    } catch (error) {
      console.error('Explanation generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

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

    switch (culturalContext) {
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

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background}>
        {/* Header */}
        <YStack space="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$6" fontWeight="700" color={colors.primary}>
              {stealthMode ? 'Açıklama Üretici' : 'Cihaz İçi Açıklama Üreteci'}
            </Text>
            <XStack space="$2">
              <Shield size={20} color={colors.success} />
              <Cpu size={20} color={colors.info} />
            </XStack>
          </XStack>

          <Text fontSize="$3" color={colors.secondary}>
            {stealthMode
              ? 'Tamamen güvenli ve özel açıklama üretimi'
              : 'Gizlilik korumalı, cihaz üzerinde açıklama üretimi'}
          </Text>
        </YStack>

        {/* Privacy & Performance Stats */}
        <XStack space="$3" justifyContent="space-around">
          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.success}
          >
            <Shield size={24} color={colors.success} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Gizlilik' : 'Veri Gizliliği'}
            </Text>
            <Text fontSize="$4" fontWeight="600" color={colors.success}>
              %100 Güvenli
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
            <Zap size={24} color={colors.info} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Hız' : 'Ortalama Süre'}
            </Text>
            <Text fontSize="$4" fontWeight="600" color={colors.info}>
              {generationStats.avgGenerationTime > 0
                ? `${generationStats.avgGenerationTime.toFixed(0)}ms`
                : '<100ms'}
            </Text>
          </View>

          <View
            flex={1}
            padding="$3"
            backgroundColor={colors.cardBg}
            borderRadius="$4"
            alignItems="center"
            borderWidth={1}
            borderColor={colors.warning}
          >
            <Layers size={24} color={colors.warning} />
            <Text fontSize="$2" color={colors.secondary} textAlign="center" marginTop="$1">
              {stealthMode ? 'Kalite' : 'Ortalama Kalite'}
            </Text>
            <Text fontSize="$4" fontWeight="600" color={colors.warning}>
              {generationStats.avgQualityScore > 0
                ? `${generationStats.avgQualityScore.toFixed(0)}%`
                : 'N/A'}
            </Text>
          </View>
        </XStack>

        {/* Generation Controls */}
        <View
          backgroundColor={colors.cardBg}
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
            <Text fontSize="$4" fontWeight="600" color={colors.primary}>
              {stealthMode ? 'Açıklama Üret' : 'Yeni Açıklama Üret'}
            </Text>
            <XStack space="$2" alignItems="center">
              <Languages size={16} color={colors.secondary} />
              <Text fontSize="$2" color={colors.secondary}>
                {language.toUpperCase()} | {culturalContext}
              </Text>
            </XStack>
          </XStack>

          <Button
            size="$4"
            backgroundColor={colors.primary}
            color="white"
            onPress={handleGenerateExplanation}
            disabled={isGenerating}
            icon={isGenerating ? RefreshCw : Cpu}
          >
            {isGenerating
              ? stealthMode
                ? 'Üretiliyor...'
                : 'Açıklama Üretiliyor...'
              : stealthMode
                ? 'Açıklama Üret'
                : 'Yeni Açıklama Üret'}
          </Button>
        </View>

        {/* Generated Explanation Display */}
        {lastExplanation && (
          <YStack space="$3">
            {/* Main Explanation */}
            <View
              backgroundColor={colors.cardBg}
              borderRadius="$4"
              padding="$3"
              borderWidth={2}
              borderColor={colors.primary}
            >
              <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
                <Text fontSize="$4" fontWeight="600" color={colors.primary}>
                  {stealthMode ? 'Ana Açıklama' : 'Üretilen Açıklama'}
                </Text>
                <XStack space="$2" alignItems="center">
                  <CheckCircle size={16} color={colors.success} />
                  <Text fontSize="$2" color={colors.success}>
                    {Math.round(lastExplanation.qualityScore)}% kalite
                  </Text>
                </XStack>
              </XStack>

              <Text fontSize="$3" color={colors.primary} lineHeight="$2">
                {lastExplanation.mainExplanation}
              </Text>

              <Text fontSize="$2" color={colors.secondary} marginTop="$2">
                {lastExplanation.confidenceSummary}
              </Text>
            </View>

            {/* Detailed Factors */}
            <View
              backgroundColor={colors.cardBg}
              borderRadius="$4"
              padding="$3"
              borderWidth={1}
              borderColor={colors.secondary}
            >
              <Text fontSize="$4" fontWeight="600" color={colors.primary} marginBottom="$3">
                {stealthMode ? 'Faktör Analizi' : 'Detaylı Faktör Analizi'}
              </Text>

              {lastExplanation.detailedFactors.map(factor => (
                <View
                  key={factor.id}
                  marginBottom="$2"
                  padding="$2"
                  backgroundColor={colors.background}
                  borderRadius="$2"
                  borderLeftWidth={3}
                  borderLeftColor={
                    factor.impact === 'high'
                      ? colors.success
                      : factor.impact === 'medium'
                        ? colors.warning
                        : colors.secondary
                  }
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize="$3" fontWeight="500" color={colors.primary}>
                      {factor.name}
                    </Text>
                    <Text fontSize="$2" color={colors.secondary}>
                      {Math.round(factor.visualWeight)}% etki
                    </Text>
                  </XStack>
                  <Text fontSize="$2" color={colors.secondary} marginTop="$1">
                    {factor.explanation}
                  </Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View
              backgroundColor={`${colors.info}10`}
              borderRadius="$4"
              padding="$3"
              borderLeftWidth={4}
              borderLeftColor={colors.info}
            >
              <Text fontSize="$4" fontWeight="600" color={colors.info} marginBottom="$2">
                {stealthMode ? 'Öneriler' : 'İyileştirme Önerileri'}
              </Text>

              {lastExplanation.recommendations.map((rec, index) => (
                <XStack key={index} space="$2" alignItems="center" marginBottom="$1">
                  <View width={6} height={6} borderRadius={3} backgroundColor={colors.info} />
                  <Text fontSize="$3" color={colors.primary} flex={1}>
                    {rec}
                  </Text>
                </XStack>
              ))}
            </View>

            {/* Generation Metadata */}
            <View
              backgroundColor={colors.background}
              borderRadius="$3"
              padding="$2"
              borderWidth={1}
              borderColor={colors.secondary}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$1" color={colors.secondary}>
                  Üretim süresi: {lastExplanation.generationTime.toFixed(0)}ms
                </Text>
                <Text fontSize="$1" color={colors.secondary}>
                  ID: {lastExplanation.id.slice(-8)}
                </Text>
              </XStack>
            </View>
          </YStack>
        )}

        {/* System Status */}
        <View
          backgroundColor={`${colors.success}10`}
          borderRadius="$4"
          padding="$3"
          borderLeftWidth={4}
          borderLeftColor={colors.success}
        >
          <XStack space="$2" alignItems="center" marginBottom="$2">
            <Shield size={16} color={colors.success} />
            <Text fontSize="$3" fontWeight="500" color={colors.success}>
              {stealthMode ? 'Sistem Durumu' : 'Gizlilik ve Güvenlik Durumu'}
            </Text>
          </XStack>

          <YStack space="$1">
            <Text fontSize="$2" color={colors.primary}>
              ✓{' '}
              {stealthMode
                ? 'Tüm işlemler cihazda yapılıyor'
                : 'Tüm açıklama üretimi cihaz üzerinde'}
            </Text>
            <Text fontSize="$2" color={colors.primary}>
              ✓{' '}
              {stealthMode
                ? 'Hiçbir veri paylaşılmıyor'
                : 'Hiçbir kişisel veri external servislere gönderilmiyor'}
            </Text>
            <Text fontSize="$2" color={colors.primary}>
              ✓{' '}
              {stealthMode ? 'Anlık açıklama üretimi' : 'Gerçek zamanlı, offline açıklama üretimi'}
            </Text>
            <Text fontSize="$2" color={colors.primary}>
              ✓{' '}
              {stealthMode ? 'Kültürel uyarlama aktif' : 'Kültürel bağlam ve dil uyarlaması aktif'}
            </Text>
          </YStack>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default OnDeviceExplanationGenerator;
