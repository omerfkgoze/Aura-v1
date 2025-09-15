import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text, Button, ScrollView, View } from '@tamagui/core';
import { ChevronDown, Info, TrendingUp, Calendar, AlertCircle } from '@tamagui/lucide-icons';
import type {
  UncertaintyFactors,
  PredictionAccuracy,
  CyclePattern,
  BayesianModelParameters,
} from '@aura/shared-types';
import UncertaintyExplanationEngine, {
  type UncertaintyExplanation,
} from '../models/UncertaintyExplanationEngine';

interface UncertaintyExplorerProps {
  uncertaintyFactors: UncertaintyFactors;
  accuracy: PredictionAccuracy;
  cyclePattern: CyclePattern;
  modelParams: BayesianModelParameters;
  predictionType: 'period' | 'ovulation';
  stealthMode?: boolean;
  culturalTheme?: 'modern' | 'traditional' | 'minimal';
  onFactorSelect?: (factor: string) => void;
}

export const UncertaintyExplorerComponent: React.FC<UncertaintyExplorerProps> = ({
  uncertaintyFactors,
  accuracy,
  cyclePattern,
  modelParams,
  predictionType,
  stealthMode = false,
  culturalTheme = 'modern',
  onFactorSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const explanationEngine = useMemo(() => new UncertaintyExplanationEngine(), []);

  // Generate uncertainty explanation
  const explanation = useMemo(() => {
    return explanationEngine.generateUncertaintyExplanation(
      uncertaintyFactors,
      accuracy,
      cyclePattern,
      modelParams,
      stealthMode
    );
  }, [explanationEngine, uncertaintyFactors, accuracy, cyclePattern, modelParams, stealthMode]);

  // Color scheme based on stealth mode and cultural theme
  const colorScheme = useMemo(() => {
    if (stealthMode) {
      return {
        primary: '#666666',
        secondary: '#999999',
        background: '#f5f5f5',
        cardBackground: '#ffffff',
        text: '#333333',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
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
          success: '#228B22',
          warning: '#DAA520',
          danger: '#B22222',
          info: '#4682B4',
        };
      case 'minimal':
        return {
          primary: '#2C3E50',
          secondary: '#34495E',
          background: '#FFFFFF',
          cardBackground: '#F8F9FA',
          text: '#2C3E50',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
          info: '#3498DB',
        };
      default:
        return {
          primary: '#3498DB',
          secondary: '#2980B9',
          background: '#F8F9FA',
          cardBackground: '#FFFFFF',
          text: '#2C3E50',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
          info: '#3498DB',
        };
    }
  }, [stealthMode, culturalTheme]);

  // Uncertainty level colors
  const uncertaintyLevelColor = useMemo(() => {
    switch (explanation.uncertaintyLevel) {
      case 'low':
        return colorScheme.success;
      case 'medium':
        return colorScheme.info;
      case 'high':
        return colorScheme.warning;
      case 'very_high':
        return colorScheme.danger;
    }
  }, [explanation.uncertaintyLevel, colorScheme]);

  // Factor impact icons
  const getFactorIcon = (impact: string) => {
    switch (impact) {
      case 'major':
        return AlertCircle;
      case 'moderate':
        return Info;
      case 'minor':
        return TrendingUp;
      default:
        return Info;
    }
  };

  // Factor impact colors
  const getFactorColor = (impact: string) => {
    switch (impact) {
      case 'major':
        return colorScheme.danger;
      case 'moderate':
        return colorScheme.warning;
      case 'minor':
        return colorScheme.info;
      default:
        return colorScheme.secondary;
    }
  };

  const title = stealthMode
    ? 'Prediction Reliability'
    : `${predictionType === 'period' ? 'Period' : 'Ovulation'} Prediction Uncertainty`;

  return (
    <YStack space="$2" padding="$3">
      {/* Main uncertainty summary */}
      <View backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <Text fontSize="$5" fontWeight="600" color={colorScheme.text}>
            {title}
          </Text>
          <Button
            size="$2"
            variant="ghost"
            icon={ChevronDown}
            rotation={isExpanded ? '180deg' : '0deg'}
            onPress={() => setIsExpanded(!isExpanded)}
            color={colorScheme.secondary}
          />
        </XStack>

        {/* Uncertainty level indicator */}
        <XStack space="$3" alignItems="center" marginBottom="$3">
          <YStack flex={1}>
            <Text fontSize="$3" color={colorScheme.secondary} marginBottom="$1">
              Uncertainty Level
            </Text>
            <View height={8} backgroundColor={colorScheme.background} borderRadius="$2">
              <View
                height="100%"
                width={`${
                  explanation.uncertaintyLevel === 'low'
                    ? 25
                    : explanation.uncertaintyLevel === 'medium'
                      ? 50
                      : explanation.uncertaintyLevel === 'high'
                        ? 75
                        : 100
                }%`}
                backgroundColor={uncertaintyLevelColor}
                borderRadius="$2"
              />
            </View>
          </YStack>
          <Text
            fontSize="$4"
            fontWeight="600"
            color={uncertaintyLevelColor}
            textTransform="capitalize"
          >
            {explanation.uncertaintyLevel.replace('_', ' ')}
          </Text>
        </XStack>

        {/* Simple explanation */}
        <Text fontSize="$3" color={colorScheme.text} lineHeight="$1">
          {explanationEngine.generateSimpleExplanation(
            explanation.uncertaintyLevel,
            explanation.primaryFactors,
            stealthMode
          )}
        </Text>

        {/* Recommended confidence level */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginTop="$3"
          padding="$2"
          backgroundColor={colorScheme.background}
          borderRadius="$3"
        >
          <Text fontSize="$3" color={colorScheme.secondary}>
            {stealthMode ? 'Recommended Buffer' : 'Recommended Confidence Level'}
          </Text>
          <Text fontSize="$4" fontWeight="600" color={colorScheme.primary}>
            {Math.round(explanation.confidenceRecommendation * 100)}%
          </Text>
        </XStack>
      </View>

      {/* Expanded details */}
      {isExpanded && (
        <YStack space="$3">
          {/* Data quality assessment */}
          <View backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
            <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
              {stealthMode ? 'Data Quality' : 'Tracking Data Quality'}
            </Text>

            <YStack space="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color={colorScheme.secondary}>
                  Overall Score
                </Text>
                <Text fontSize="$3" fontWeight="600" color={colorScheme.text}>
                  {Math.round(explanation.dataQualityAssessment.overallScore * 100)}%
                </Text>
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color={colorScheme.secondary}>
                  Completeness
                </Text>
                <Text fontSize="$3" color={colorScheme.text}>
                  {Math.round(explanation.dataQualityAssessment.completeness * 100)}%
                </Text>
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color={colorScheme.secondary}>
                  Consistency
                </Text>
                <Text fontSize="$3" color={colorScheme.text}>
                  {Math.round(explanation.dataQualityAssessment.consistency * 100)}%
                </Text>
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color={colorScheme.secondary}>
                  Recent Quality
                </Text>
                <Text fontSize="$3" color={colorScheme.text}>
                  {Math.round(explanation.dataQualityAssessment.recency * 100)}%
                </Text>
              </XStack>
            </YStack>
          </View>

          {/* Primary uncertainty factors */}
          {explanation.primaryFactors.length > 0 && (
            <View backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
                {stealthMode ? 'Main Factors' : 'Primary Uncertainty Factors'}
              </Text>

              <YStack space="$2">
                {explanation.primaryFactors.map((factor, index) => {
                  const FactorIcon = getFactorIcon(factor.impact);
                  const factorColor = getFactorColor(factor.impact);

                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      justifyContent="flex-start"
                      onPress={() => {
                        setSelectedFactor(factor.factor);
                        onFactorSelect?.(factor.factor);
                      }}
                      backgroundColor={
                        selectedFactor === factor.factor ? colorScheme.background : 'transparent'
                      }
                    >
                      <XStack space="$2" alignItems="center" flex={1}>
                        <FactorIcon size={16} color={factorColor} />
                        <YStack flex={1} alignItems="flex-start">
                          <Text fontSize="$3" fontWeight="600" color={colorScheme.text}>
                            {factor.factor.replace('_', ' ')}
                          </Text>
                          <Text fontSize="$2" color={colorScheme.secondary} numberOfLines={2}>
                            {factor.description}
                          </Text>
                        </YStack>
                        <Text fontSize="$2" color={factorColor} textTransform="capitalize">
                          {factor.impact}
                        </Text>
                      </XStack>
                    </Button>
                  );
                })}
              </YStack>
            </View>
          )}

          {/* Contributing factors */}
          {explanation.contributingFactors.length > 0 && (
            <View backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
                {stealthMode ? 'Other Factors' : 'Contributing Factors'}
              </Text>

              <YStack space="$1">
                {explanation.contributingFactors.slice(0, 3).map((factor, index) => {
                  const FactorIcon = getFactorIcon(factor.impact);
                  const factorColor = getFactorColor(factor.impact);

                  return (
                    <XStack key={index} space="$2" alignItems="center" padding="$1">
                      <FactorIcon size={14} color={factorColor} />
                      <Text fontSize="$3" color={colorScheme.text} flex={1}>
                        {factor.description}
                      </Text>
                      <Text fontSize="$2" color={factorColor} textTransform="capitalize">
                        {factor.impact}
                      </Text>
                    </XStack>
                  );
                })}
              </YStack>
            </View>
          )}

          {/* Recommendations */}
          {explanation.recommendations.length > 0 && (
            <View backgroundColor={colorScheme.cardBackground} padding="$3" borderRadius="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme.text} marginBottom="$3">
                {stealthMode ? 'Suggestions' : 'Improvement Recommendations'}
              </Text>

              <YStack space="$2">
                {explanation.recommendations.map((recommendation, index) => (
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
            </View>
          )}
        </YStack>
      )}

      {/* Selected factor detail - simplified without Sheet */}
      {selectedFactor && (
        <View padding="$4" backgroundColor={colorScheme.cardBackground} borderRadius="$4">
          <YStack space="$3">
            <Text fontSize="$5" fontWeight="600" color={colorScheme.text}>
              {selectedFactor.replace('_', ' ')}
            </Text>

            {/* Factor details would be rendered here */}
            <Text fontSize="$3" color={colorScheme.text}>
              Detailed information about this uncertainty factor and how it affects your
              predictions.
            </Text>
          </YStack>
        </View>
      )}
    </YStack>
  );
};

export default UncertaintyExplorerComponent;
