import React, { useMemo, useState } from 'react';
import { YStack, XStack, Text, View, Button, ScrollView } from '@tamagui/core';
import {
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  Calendar,
  Database,
} from '@tamagui/lucide-icons';
import type {
  UncertaintyFactors,
  ClientOnlyPredictionCache,
  CyclePattern,
} from '@aura/shared-types';

interface SignalExplanationEngineProps {
  uncertaintyFactors: UncertaintyFactors;
  predictionCache: ClientOnlyPredictionCache;
  cyclePattern: CyclePattern;
  predictionType: 'period' | 'ovulation';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onFactorSelect?: (factor: string) => void;
}

interface FactorAnalysis {
  id: string;
  name: string;
  stealthName: string;
  value: number;
  impact: 'high' | 'medium' | 'low';
  description: string;
  stealthDescription: string;
  icon: React.ComponentType<any>;
  color: string;
  suggestions: string[];
}

/**
 * Signal Explanation Engine Component
 * Provides detailed explanations of prediction confidence factors
 */
export const SignalExplanationEngine: React.FC<SignalExplanationEngineProps> = ({
  uncertaintyFactors,
  predictionCache,
  cyclePattern,
  predictionType,
  stealthMode = false,
  culturalTheme = 'modern',
  onFactorSelect,
}) => {
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());

  // Analyze factors and generate explanations
  const factorAnalyses = useMemo(() => {
    const analyses: FactorAnalysis[] = [
      {
        id: 'data_quality',
        name: 'Veri Kalitesi',
        stealthName: 'Kayıt Tutarlılığı',
        value: uncertaintyFactors.dataQuality,
        impact:
          uncertaintyFactors.dataQuality > 0.8
            ? 'high'
            : uncertaintyFactors.dataQuality > 0.5
              ? 'medium'
              : 'low',
        description: `Veri kalitesi ${Math.round(uncertaintyFactors.dataQuality * 100)}%. ${
          uncertaintyFactors.dataQuality > 0.8
            ? 'Yüksek kaliteli veri, güvenilir tahminler sağlıyor.'
            : 'Veri kalitesi artırılarak tahmin güvenilirliği geliştirilebilir.'
        }`,
        stealthDescription: `Kayıt tutarlılığı ${Math.round(uncertaintyFactors.dataQuality * 100)}%. ${
          uncertaintyFactors.dataQuality > 0.8
            ? 'Düzenli kayıt tutma tahminleri güçlendiriyor.'
            : 'Daha düzenli kayıt tutarak sonuçlar iyileştirilebilir.'
        }`,
        icon: Database,
        color:
          uncertaintyFactors.dataQuality > 0.8
            ? '#10B981'
            : uncertaintyFactors.dataQuality > 0.5
              ? '#F59E0B'
              : '#EF4444',
        suggestions:
          uncertaintyFactors.dataQuality < 0.8
            ? [
                'Günlük kayıtları düzenli tut',
                'Semptomları detaylı kaydet',
                'Eksik günleri tamamla',
              ]
            : ['Mevcut veri kaliten mükemmel!'],
      },
      {
        id: 'history_length',
        name: 'Geçmiş Veri Uzunluğu',
        stealthName: 'Kayıt Geçmişi',
        value: Math.min(uncertaintyFactors.historyLength / 6, 1), // Normalize to 6 cycles
        impact:
          uncertaintyFactors.historyLength >= 6
            ? 'high'
            : uncertaintyFactors.historyLength >= 3
              ? 'medium'
              : 'low',
        description: `${uncertaintyFactors.historyLength} döngü verisi mevcut. ${
          uncertaintyFactors.historyLength >= 6
            ? 'Yeterli geçmiş veri, güçlü tahmin modeli oluşturuyor.'
            : `En az ${6 - uncertaintyFactors.historyLength} döngü daha veriye ihtiyaç var.`
        }`,
        stealthDescription: `${uncertaintyFactors.historyLength} aylık kayıt mevcut. ${
          uncertaintyFactors.historyLength >= 6
            ? 'Yeterli geçmiş, güvenilir pattern analizi yapılabiliyor.'
            : `${6 - uncertaintyFactors.historyLength} ay daha kayıt optimal sonuç için gerekli.`
        }`,
        icon: Calendar,
        color:
          uncertaintyFactors.historyLength >= 6
            ? '#10B981'
            : uncertaintyFactors.historyLength >= 3
              ? '#F59E0B'
              : '#EF4444',
        suggestions:
          uncertaintyFactors.historyLength < 6
            ? ['Günlük kayıtlarını sürdür', 'Her döngüyü kaydet', 'Geçmiş verilerini ekle']
            : ['Geçmiş verin tahminler için ideal!'],
      },
      {
        id: 'cycle_regularity',
        name: 'Döngü Düzenlilik',
        stealthName: 'Pattern Tutarlılığı',
        value: Math.max(0, 1 - uncertaintyFactors.cycleLengthVariability / 10), // Normalize
        impact:
          uncertaintyFactors.cycleLengthVariability < 3
            ? 'high'
            : uncertaintyFactors.cycleLengthVariability < 7
              ? 'medium'
              : 'low',
        description: `Döngü uzunluğu değişkenliği ${uncertaintyFactors.cycleLengthVariability.toFixed(1)} gün. ${
          uncertaintyFactors.cycleLengthVariability < 3
            ? 'Çok düzenli döngüler, yüksek tahmin doğruluğu.'
            : 'Döngü değişkenliği tahmin belirsizliğini artırıyor.'
        }`,
        stealthDescription: `Pattern değişkenliği ${uncertaintyFactors.cycleLengthVariability.toFixed(1)} gün. ${
          uncertaintyFactors.cycleLengthVariability < 3
            ? 'Çok tutarlı pattern, güvenilir tahminler.'
            : 'Pattern çeşitliliği tahmin aralığını genişletiyor.'
        }`,
        icon: TrendingUp,
        color:
          uncertaintyFactors.cycleLengthVariability < 3
            ? '#10B981'
            : uncertaintyFactors.cycleLengthVariability < 7
              ? '#F59E0B'
              : '#EF4444',
        suggestions:
          uncertaintyFactors.cycleLengthVariability >= 7
            ? ['Stres yönetimi önemli', 'Yaşam tarzı düzenlemeleri', 'Sağlık uzmanına danış']
            : ['Döngün çok düzenli!'],
      },
      {
        id: 'recent_reliability',
        name: 'Son Veri Güvenilirliği',
        stealthName: 'Güncel Kayıt Kalitesi',
        value: uncertaintyFactors.recentDataReliability,
        impact:
          uncertaintyFactors.recentDataReliability > 0.8
            ? 'high'
            : uncertaintyFactors.recentDataReliability > 0.5
              ? 'medium'
              : 'low',
        description: `Son dönemlerdeki veri güvenilirliği ${Math.round(uncertaintyFactors.recentDataReliability * 100)}%. ${
          uncertaintyFactors.recentDataReliability > 0.8
            ? 'Güncel veriler tahmin gücünü artırıyor.'
            : 'Son kayıtların kalitesi artırılabilir.'
        }`,
        stealthDescription: `Son dönemki kayıt kalitesi ${Math.round(uncertaintyFactors.recentDataReliability * 100)}%. ${
          uncertaintyFactors.recentDataReliability > 0.8
            ? 'Güncel kayıtlar pattern analizini güçlendiriyor.'
            : 'Son kayıtlarda iyileştirme yapılabilir.'
        }`,
        icon: Info,
        color:
          uncertaintyFactors.recentDataReliability > 0.8
            ? '#10B981'
            : uncertaintyFactors.recentDataReliability > 0.5
              ? '#F59E0B'
              : '#EF4444',
        suggestions:
          uncertaintyFactors.recentDataReliability < 0.8
            ? ['Son kayıtları gözden geçir', 'Güncel semptomları kaydet', 'Eksik günleri tamamla']
            : ['Son kayıtların mükemmel!'],
      },
    ];

    return analyses.sort((a, b) => b.value - a.value);
  }, [uncertaintyFactors]);

  // Generate overall confidence explanation
  const overallExplanation = useMemo(() => {
    const avgScore = factorAnalyses.reduce((sum, f) => sum + f.value, 0) / factorAnalyses.length;
    const highFactors = factorAnalyses.filter(f => f.impact === 'high').length;
    const lowFactors = factorAnalyses.filter(f => f.impact === 'low').length;

    if (stealthMode) {
      if (avgScore > 0.8 && lowFactors === 0) {
        return 'Tüm faktörler optimal seviyede. Pattern analizi çok güvenilir.';
      } else if (avgScore > 0.6) {
        return 'Çoğu faktör iyi durumda. Tahminler genellikle güvenilir.';
      } else {
        return 'Bazı faktörlerde iyileştirme gerekiyor. Tahmin aralığı daha geniş.';
      }
    }

    if (avgScore > 0.8 && lowFactors === 0) {
      return `${predictionType === 'period' ? 'Adet' : 'Ovulasyon'} tahmin güvenilirliği çok yüksek. Tüm faktörler optimal seviyede.`;
    } else if (avgScore > 0.6) {
      return `${predictionType === 'period' ? 'Adet' : 'Ovulasyon'} tahminleri genellikle güvenilir. ${highFactors} faktör güçlü, ${lowFactors} faktör geliştirilebilir.`;
    } else {
      return `${predictionType === 'period' ? 'Adet' : 'Ovulasyon'} tahmin belirsizliği orta seviyede. ${lowFactors} faktörde iyileştirme yapılabilir.`;
    }
  }, [factorAnalyses, predictionType, stealthMode]);

  const toggleFactorExpansion = (factorId: string) => {
    const newExpanded = new Set(expandedFactors);
    if (newExpanded.has(factorId)) {
      newExpanded.delete(factorId);
    } else {
      newExpanded.add(factorId);
    }
    setExpandedFactors(newExpanded);
  };

  const getThemeColors = () => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        background: '#f8f9fa',
        text: '#333333',
      };
    }

    switch (culturalTheme) {
      case 'traditional':
        return {
          primary: '#8B4513',
          secondary: '#CD853F',
          background: '#FDF5E6',
          text: '#654321',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          background: '#FFFFFF',
          text: '#2C3E50',
        };
      default:
        return {
          primary: '#3B82F6',
          secondary: '#6B7280',
          background: '#F8FAFC',
          text: '#1F2937',
        };
    }
  };

  const colors = getThemeColors();

  return (
    <ScrollView>
      <YStack space="$4" padding="$4" backgroundColor={colors.background} borderRadius="$4">
        {/* Header */}
        <YStack space="$2">
          <Text fontSize="$6" fontWeight="700" color={colors.primary}>
            {stealthMode ? 'Tahmin Analizi' : 'Neden Bu Sinyal?'}
          </Text>
          <Text fontSize="$4" color={colors.text} lineHeight="$1">
            {overallExplanation}
          </Text>
        </YStack>

        {/* Factor Analysis Cards */}
        <YStack space="$3">
          {factorAnalyses.map(factor => {
            const isExpanded = expandedFactors.has(factor.id);
            const IconComponent = factor.icon;

            return (
              <View
                key={factor.id}
                backgroundColor="$background"
                borderRadius="$4"
                borderWidth={1}
                borderColor={factor.color}
                overflow="hidden"
              >
                {/* Factor Header */}
                <XStack
                  padding="$3"
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor={`${factor.color}10`}
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => {
                    toggleFactorExpansion(factor.id);
                    onFactorSelect?.(factor.id);
                  }}
                >
                  <XStack space="$3" alignItems="center" flex={1}>
                    <View
                      width={40}
                      height={40}
                      backgroundColor={factor.color}
                      borderRadius={20}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconComponent size={20} color="white" />
                    </View>

                    <YStack flex={1}>
                      <Text fontSize="$4" fontWeight="600" color={colors.text}>
                        {stealthMode ? factor.stealthName : factor.name}
                      </Text>
                      <XStack space="$2" alignItems="center">
                        <View
                          width={`${factor.value * 100}%`}
                          height={4}
                          backgroundColor={factor.color}
                          borderRadius={2}
                        />
                        <Text fontSize="$2" color={colors.secondary}>
                          {Math.round(factor.value * 100)}%
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>

                  <View
                    padding="$1"
                    borderRadius="$2"
                    backgroundColor={isExpanded ? factor.color : 'transparent'}
                  >
                    {isExpanded ? (
                      <ChevronUp size={20} color="white" />
                    ) : (
                      <ChevronDown size={20} color={factor.color} />
                    )}
                  </View>
                </XStack>

                {/* Expanded Content */}
                {isExpanded && (
                  <YStack space="$3" padding="$3">
                    <Text fontSize="$3" color={colors.text} lineHeight="$2">
                      {stealthMode ? factor.stealthDescription : factor.description}
                    </Text>

                    {/* Suggestions */}
                    <YStack space="$2">
                      <Text fontSize="$3" fontWeight="600" color={factor.color}>
                        {stealthMode ? 'Öneriler:' : 'İyileştirme Önerileri:'}
                      </Text>
                      {factor.suggestions.map((suggestion, index) => (
                        <XStack key={index} space="$2" alignItems="center">
                          <View
                            width={6}
                            height={6}
                            borderRadius={3}
                            backgroundColor={factor.color}
                          />
                          <Text fontSize="$3" color={colors.text} flex={1}>
                            {suggestion}
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

        {/* Summary Actions */}
        <XStack space="$3" justifyContent="center" paddingTop="$2">
          <Button
            size="$3"
            theme={stealthMode ? 'gray' : 'blue'}
            backgroundColor={colors.primary}
            color="white"
            onPress={() => {
              // Expand all factors
              setExpandedFactors(new Set(factorAnalyses.map(f => f.id)));
            }}
          >
            {stealthMode ? 'Tümünü Göster' : 'Detaylı Analiz'}
          </Button>

          <Button
            size="$3"
            variant="outlined"
            borderColor={colors.primary}
            color={colors.primary}
            onPress={() => setExpandedFactors(new Set())}
          >
            {stealthMode ? 'Özet Görünüm' : 'Sadece Özet'}
          </Button>
        </XStack>

        {/* Prediction Confidence Summary */}
        <View
          backgroundColor="$background"
          borderRadius="$4"
          padding="$3"
          borderWidth={1}
          borderColor={colors.secondary}
        >
          <YStack space="$2" alignItems="center">
            <Text fontSize="$4" fontWeight="600" color={colors.text}>
              {stealthMode ? 'Tahmin Güven Seviyesi' : 'Genel Güven Değerlendirmesi'}
            </Text>

            <XStack space="$4" alignItems="center">
              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  50% Güven
                </Text>
                <Text fontSize="$5" fontWeight="700" color="#10B981">
                  ±{predictionCache.confidenceIntervals.p50.toFixed(1)} gün
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  80% Güven
                </Text>
                <Text fontSize="$5" fontWeight="700" color="#F59E0B">
                  ±{predictionCache.confidenceIntervals.p80.toFixed(1)} gün
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$2" color={colors.secondary}>
                  95% Güven
                </Text>
                <Text fontSize="$5" fontWeight="700" color="#EF4444">
                  ±{predictionCache.confidenceIntervals.p95.toFixed(1)} gün
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default SignalExplanationEngine;
