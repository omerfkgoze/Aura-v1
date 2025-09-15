import React, { useState, useMemo } from 'react';
import { View, YStack, XStack, Text, Button, Slider } from '@tamagui/core';
import {
  ConfidenceInterval,
  UncertaintyFactors,
  PredictionVisualization,
} from '@shared-types/prediction';

interface UncertaintyExplorerProps {
  uncertaintyFactors: UncertaintyFactors;
  visualization: PredictionVisualization;
  onFactorChange?: (factor: keyof UncertaintyFactors, value: number | boolean) => void;
  stealthMode?: boolean;
}

/**
 * Interactive uncertainty exploration component
 * Allows users to understand how different factors affect prediction uncertainty
 */
export const UncertaintyExplorer: React.FC<UncertaintyExplorerProps> = ({
  uncertaintyFactors,
  visualization,
  onFactorChange,
  stealthMode = false,
}) => {
  const [selectedFactor, setSelectedFactor] = useState<keyof UncertaintyFactors>('dataQuality');
  const [showExplanation, setShowExplanation] = useState(false);

  // Factor configuration for visualization
  const factorConfig = useMemo(
    () => ({
      dataQuality: {
        label: stealthMode ? 'Veri Kalitesi' : 'Veri Kalitesi',
        description: stealthMode
          ? 'Kaydettiğiniz bilgilerin tutarlılığı ve eksiksizliği'
          : 'Girilen cycle verilerinin kalitesi ve tutarlılığı',
        icon: '📊',
        color: '#3B82F6',
        min: 0,
        max: 1,
        step: 0.1,
        impact: 'high' as const,
      },
      historyLength: {
        label: stealthMode ? 'Geçmiş Veriler' : 'Geçmiş Cycle Sayısı',
        description: stealthMode
          ? 'Ne kadar uzun süre kayıt tuttuğunuz'
          : 'Kaydedilen menstrual cycle sayısı',
        icon: '📅',
        color: '#10B981',
        min: 0,
        max: 24,
        step: 1,
        impact: 'high' as const,
      },
      cycleLengthVariability: {
        label: stealthMode ? 'Düzenlilik' : 'Cycle Uzunluk Değişkenliği',
        description: stealthMode
          ? "Cycle'larınızın ne kadar düzenli olduğu"
          : 'Menstrual cycle uzunluklarındaki değişkenlik',
        icon: '📈',
        color: '#F59E0B',
        min: 0,
        max: 1,
        step: 0.05,
        impact: 'medium' as const,
      },
      recentDataReliability: {
        label: stealthMode ? 'Son Veriler' : 'Güncel Veri Güvenilirliği',
        description: stealthMode
          ? 'Son kayıtlarınızın doğruluğu'
          : 'Son dönem cycle verilerinin güvenilirliği',
        icon: '🔄',
        color: '#8B5CF6',
        min: 0,
        max: 1,
        step: 0.1,
        impact: 'medium' as const,
      },
    }),
    [stealthMode]
  );

  // Calculate uncertainty impact visualization
  const uncertaintyImpact = useMemo(() => {
    const baseUncertainty = 0.3;
    const factors = uncertaintyFactors;

    const impacts = {
      dataQuality: (1 - factors.dataQuality) * 0.4,
      historyLength: Math.max(0, ((6 - factors.historyLength) / 6) * 0.3),
      cycleLengthVariability: factors.cycleLengthVariability * 0.25,
      recentDataReliability: (1 - factors.recentDataReliability) * 0.2,
    };

    const totalUncertainty =
      baseUncertainty +
      impacts.dataQuality +
      impacts.historyLength +
      impacts.cycleLengthVariability +
      impacts.recentDataReliability;

    return {
      total: Math.min(1, totalUncertainty),
      components: impacts,
      baseUncertainty,
    };
  }, [uncertaintyFactors]);

  const getFactorValue = (factor: keyof UncertaintyFactors) => {
    const value = uncertaintyFactors[factor];
    return typeof value === 'boolean' ? (value ? 1 : 0) : value;
  };

  const getUncertaintyColor = (level: number) => {
    if (level < 0.3) return '#10B981'; // Low uncertainty - green
    if (level < 0.6) return '#F59E0B'; // Medium uncertainty - yellow
    return '#EF4444'; // High uncertainty - red
  };

  const getFactorImpactText = (factor: keyof UncertaintyFactors) => {
    const impact = uncertaintyImpact.components[factor];
    if (impact < 0.1) return 'Düşük etki';
    if (impact < 0.2) return 'Orta etki';
    return 'Yüksek etki';
  };

  return (
    <YStack space="$4" padding="$4">
      {/* Header */}
      <YStack space="$2">
        <Text fontSize="$6" fontWeight="700" color="$color12">
          {stealthMode ? 'Belirsizlik Analizi' : 'Prediction Uncertainty Explorer'}
        </Text>
        <Text fontSize="$3" color="$color11" lineHeight="$1">
          {stealthMode
            ? 'Tahminlerin belirsizliğini etkileyen faktörleri keşfedin'
            : 'Tahmin belirsizliğini etkileyen faktörleri interaktif olarak keşfedin'}
        </Text>
      </YStack>

      {/* Overall Uncertainty Indicator */}
      <View
        backgroundColor="$background"
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <Text fontSize="$4" fontWeight="600" color="$color12">
            {stealthMode ? 'Genel Belirsizlik' : 'Toplam Belirsizlik'}
          </Text>
          <View
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$3"
            backgroundColor={getUncertaintyColor(uncertaintyImpact.total)}
          >
            <Text fontSize="$3" color="white" fontWeight="600">
              {Math.round(uncertaintyImpact.total * 100)}%
            </Text>
          </View>
        </XStack>

        {/* Uncertainty breakdown bar */}
        <View height={20} backgroundColor="$background" borderRadius="$2" overflow="hidden">
          <XStack height="100%">
            <View flex={uncertaintyImpact.baseUncertainty} backgroundColor="#6B7280" />
            <View
              flex={uncertaintyImpact.components.dataQuality}
              backgroundColor={factorConfig.dataQuality.color}
            />
            <View
              flex={uncertaintyImpact.components.historyLength}
              backgroundColor={factorConfig.historyLength.color}
            />
            <View
              flex={uncertaintyImpact.components.cycleLengthVariability}
              backgroundColor={factorConfig.cycleLengthVariability.color}
            />
            <View
              flex={uncertaintyImpact.components.recentDataReliability}
              backgroundColor={factorConfig.recentDataReliability.color}
            />
          </XStack>
        </View>
      </View>

      {/* Factor Selection */}
      <YStack space="$3">
        <Text fontSize="$4" fontWeight="600" color="$color12">
          Faktör Seçin
        </Text>

        <XStack flexWrap="wrap" space="$2">
          {(Object.keys(factorConfig) as Array<keyof UncertaintyFactors>).map(factor => {
            const config = factorConfig[factor];
            const isSelected = selectedFactor === factor;

            return (
              <Button
                key={factor}
                size="$3"
                theme={isSelected ? 'active' : undefined}
                backgroundColor={isSelected ? config.color : '$background'}
                borderColor={config.color}
                borderWidth={1}
                onPress={() => setSelectedFactor(factor)}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text color={isSelected ? 'white' : config.color} fontSize="$3">
                  {config.icon} {config.label}
                </Text>
              </Button>
            );
          })}
        </XStack>
      </YStack>

      {/* Factor Details */}
      {selectedFactor && (
        <View
          backgroundColor="$background"
          borderRadius="$4"
          padding="$4"
          borderWidth={1}
          borderColor={factorConfig[selectedFactor].color}
        >
          <YStack space="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack flex={1}>
                <Text fontSize="$5" fontWeight="600" color="$color12">
                  {factorConfig[selectedFactor].icon} {factorConfig[selectedFactor].label}
                </Text>
                <Text fontSize="$3" color="$color11" marginTop="$1">
                  {getFactorImpactText(selectedFactor)}
                </Text>
              </YStack>

              <View
                backgroundColor={factorConfig[selectedFactor].color}
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$2"
              >
                <Text color="white" fontSize="$3" fontWeight="600">
                  {typeof uncertaintyFactors[selectedFactor] === 'boolean'
                    ? uncertaintyFactors[selectedFactor]
                      ? 'Var'
                      : 'Yok'
                    : Math.round(getFactorValue(selectedFactor) * 100) / 100}
                </Text>
              </View>
            </XStack>

            <Text fontSize="$3" color="$color11" lineHeight="$1">
              {factorConfig[selectedFactor].description}
            </Text>

            {/* Interactive slider for adjustable factors */}
            {typeof uncertaintyFactors[selectedFactor] === 'number' && onFactorChange && (
              <YStack space="$2">
                <Text fontSize="$3" color="$color12">
                  Değeri Ayarlayın:
                </Text>
                <Slider
                  value={[getFactorValue(selectedFactor)]}
                  onValueChange={([value]) => onFactorChange(selectedFactor, value)}
                  min={factorConfig[selectedFactor].min}
                  max={factorConfig[selectedFactor].max}
                  step={factorConfig[selectedFactor].step}
                >
                  <Slider.Track>
                    <Slider.TrackActive backgroundColor={factorConfig[selectedFactor].color} />
                  </Slider.Track>
                  <Slider.Thumb backgroundColor={factorConfig[selectedFactor].color} />
                </Slider>
              </YStack>
            )}

            {/* Impact visualization */}
            <YStack space="$2">
              <Text fontSize="$3" color="$color12">
                Belirsizliğe Etkisi:
              </Text>
              <View height={10} backgroundColor="$background" borderRadius="$2" overflow="hidden">
                <View
                  width={`${(uncertaintyImpact.components[selectedFactor] / 0.4) * 100}%`}
                  height="100%"
                  backgroundColor={factorConfig[selectedFactor].color}
                />
              </View>
              <Text fontSize="$2" color="$color10">
                +{Math.round(uncertaintyImpact.components[selectedFactor] * 100)}% belirsizlik
              </Text>
            </YStack>
          </YStack>
        </View>
      )}

      {/* Explanation Toggle */}
      <Button
        size="$3"
        backgroundColor="$backgroundTransparent"
        borderColor="$borderColor"
        borderWidth={1}
        onPress={() => setShowExplanation(!showExplanation)}
      >
        <Text color="$color11">{showExplanation ? 'Açıklamayı Gizle' : 'Detaylı Açıklama'}</Text>
      </Button>

      {/* Detailed Explanation */}
      {showExplanation && (
        <YStack space="$3" padding="$4" backgroundColor="$background" borderRadius="$4">
          <Text fontSize="$4" fontWeight="600" color="$color12">
            {stealthMode ? 'Belirsizlik Nasıl Hesaplanır?' : 'Uncertainty Calculation'}
          </Text>

          <YStack space="$2">
            {(Object.keys(factorConfig) as Array<keyof UncertaintyFactors>).map(factor => {
              const config = factorConfig[factor];
              return (
                <XStack key={factor} space="$2" alignItems="flex-start">
                  <Text fontSize="$3" color={config.color}>
                    {config.icon}
                  </Text>
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="500" color="$color12">
                      {config.label}:
                    </Text>
                    <Text fontSize="$2" color="$color11" lineHeight="$1">
                      {config.description}
                    </Text>
                  </YStack>
                </XStack>
              );
            })}
          </YStack>

          <View
            backgroundColor="$backgroundFocus"
            padding="$3"
            borderRadius="$3"
            borderLeftWidth={4}
            borderLeftColor="$blue10"
          >
            <Text fontSize="$2" color="$color11" lineHeight="$1">
              💡{' '}
              {stealthMode
                ? 'İpucu: Düzenli kayıt tutmak ve doğru bilgi girmek tahmin doğruluğunu artırır.'
                : 'Tip: Düzenli ve doğru veri girişi yaparak prediction doğruluğunu artırabilirsiniz.'}
            </Text>
          </View>
        </YStack>
      )}

      {/* Recommendations */}
      <ImprovementRecommendations
        uncertaintyFactors={uncertaintyFactors}
        stealthMode={stealthMode}
      />
    </YStack>
  );
};

/**
 * Improvement recommendations component
 */
const ImprovementRecommendations: React.FC<{
  uncertaintyFactors: UncertaintyFactors;
  stealthMode: boolean;
}> = ({ uncertaintyFactors, stealthMode }) => {
  const recommendations = useMemo(() => {
    const recs: {
      icon: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }[] = [];

    if (uncertaintyFactors.dataQuality < 0.7) {
      recs.push({
        icon: '📝',
        title: stealthMode ? 'Veri Kalitesini Artırın' : 'Improve Data Quality',
        description: stealthMode
          ? 'Günlük kayıtları daha düzenli ve eksiksiz tutun'
          : 'Daha tutarlı ve eksiksiz cycle data girişi yapın',
        priority: 'high',
      });
    }

    if (uncertaintyFactors.historyLength < 6) {
      recs.push({
        icon: '⏳',
        title: stealthMode ? 'Daha Uzun Kayıt' : 'Build History',
        description: stealthMode
          ? 'En az 6 ay düzenli kayıt tutarak tahmin doğruluğunu artırın'
          : "En az 6 cycle kaydı yaparak prediction accuracy'yi iyileştirin",
        priority: 'high',
      });
    }

    if (uncertaintyFactors.cycleLengthVariability > 0.3) {
      recs.push({
        icon: '🎯',
        title: stealthMode ? 'Düzenlilik' : 'Monitor Regularity',
        description: stealthMode
          ? 'Cycle düzenlilik faktörlerini takip edin'
          : 'Cycle irregularity nedenlerini analiz edin',
        priority: 'medium',
      });
    }

    if (uncertaintyFactors.recentDataReliability < 0.8) {
      recs.push({
        icon: '🔄',
        title: stealthMode ? 'Güncel Veriler' : 'Recent Data Focus',
        description: stealthMode
          ? 'Son dönem verilerinizin doğruluğunu kontrol edin'
          : 'Son cycle verilerini gözden geçirin ve düzeltin',
        priority: 'medium',
      });
    }

    return recs;
  }, [uncertaintyFactors, stealthMode]);

  if (recommendations.length === 0) {
    return (
      <View
        backgroundColor="$green2"
        padding="$4"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$green8"
      >
        <XStack space="$2" alignItems="center">
          <Text fontSize="$4">✅</Text>
          <Text fontSize="$4" fontWeight="600" color="$green11">
            {stealthMode ? 'Mükemmel!' : 'Excellent!'}
          </Text>
        </XStack>
        <Text fontSize="$3" color="$green11" marginTop="$2">
          {stealthMode
            ? 'Verileriniz tahminler için optimal durumda'
            : 'Verileriniz prediction accuracy için optimize edilmiş durumda'}
        </Text>
      </View>
    );
  }

  return (
    <YStack space="$3">
      <Text fontSize="$4" fontWeight="600" color="$color12">
        {stealthMode ? 'İyileştirme Önerileri' : 'Improvement Recommendations'}
      </Text>

      {recommendations.map((rec, index) => (
        <View
          key={index}
          backgroundColor="$background"
          padding="$3"
          borderRadius="$3"
          borderLeftWidth={4}
          borderLeftColor={rec.priority === 'high' ? '$red10' : '$yellow10'}
        >
          <XStack space="$3" alignItems="flex-start">
            <Text fontSize="$4">{rec.icon}</Text>
            <YStack flex={1} space="$1">
              <Text fontSize="$3" fontWeight="500" color="$color12">
                {rec.title}
              </Text>
              <Text fontSize="$2" color="$color11" lineHeight="$1">
                {rec.description}
              </Text>
            </YStack>
            <View
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              backgroundColor={rec.priority === 'high' ? '$red2' : '$yellow2'}
            >
              <Text
                fontSize="$1"
                color={rec.priority === 'high' ? '$red11' : '$yellow11'}
                fontWeight="600"
              >
                {rec.priority === 'high' ? 'Yüksek' : 'Orta'}
              </Text>
            </View>
          </XStack>
        </View>
      ))}
    </YStack>
  );
};

export default UncertaintyExplorer;
