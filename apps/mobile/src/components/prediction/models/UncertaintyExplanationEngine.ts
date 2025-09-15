import type {
  UncertaintyFactors,
  PredictionAccuracy,
  CyclePattern,
  BayesianModelParameters,
} from '@aura/shared-types';

export interface UncertaintyExplanation {
  primaryFactors: ExplanationFactor[];
  contributingFactors: ExplanationFactor[];
  recommendations: string[];
  dataQualityAssessment: DataQualityAssessment;
  uncertaintyLevel: 'low' | 'medium' | 'high' | 'very_high';
  confidenceRecommendation: number;
}

export interface ExplanationFactor {
  factor: string;
  impact: 'major' | 'moderate' | 'minor';
  description: string;
  improvementSuggestion?: string;
  weight: number; // 0-1
}

export interface DataQualityAssessment {
  overallScore: number; // 0-1
  completeness: number;
  consistency: number;
  recency: number;
  regularity: number;
  recommendations: string[];
}

export class UncertaintyExplanationEngine {
  /**
   * Generate comprehensive explanation for prediction uncertainty
   */
  generateUncertaintyExplanation(
    uncertaintyFactors: UncertaintyFactors,
    accuracy: PredictionAccuracy,
    cyclePattern: CyclePattern,
    modelParams: BayesianModelParameters,
    stealthMode: boolean = false
  ): UncertaintyExplanation {
    const explanationFactors = this.identifyUncertaintyFactors(
      uncertaintyFactors,
      accuracy,
      cyclePattern,
      modelParams
    );

    const dataQuality = this.assessDataQuality(uncertaintyFactors, cyclePattern);
    const uncertaintyLevel = this.calculateUncertaintyLevel(uncertaintyFactors, accuracy);
    const recommendations = this.generateRecommendations(
      explanationFactors,
      dataQuality,
      uncertaintyLevel,
      stealthMode
    );

    return {
      primaryFactors: explanationFactors.filter(f => f.impact === 'major'),
      contributingFactors: explanationFactors.filter(f => f.impact !== 'major'),
      recommendations,
      dataQualityAssessment: dataQuality,
      uncertaintyLevel,
      confidenceRecommendation: this.recommendConfidenceLevel(uncertaintyLevel, dataQuality),
    };
  }

  /**
   * Identify and weight uncertainty contributing factors
   */
  private identifyUncertaintyFactors(
    uncertaintyFactors: UncertaintyFactors,
    accuracy: PredictionAccuracy,
    cyclePattern: CyclePattern,
    modelParams: BayesianModelParameters
  ): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];

    // Data quality impact
    if (uncertaintyFactors.dataQuality < 0.7) {
      factors.push({
        factor: 'data_quality',
        impact: uncertaintyFactors.dataQuality < 0.5 ? 'major' : 'moderate',
        description: 'Limited or inconsistent cycle tracking data affects prediction accuracy',
        improvementSuggestion:
          'Track symptoms and period details consistently for better predictions',
        weight: 1 - uncertaintyFactors.dataQuality,
      });
    }

    // History length impact
    if (uncertaintyFactors.historyLength < 3) {
      factors.push({
        factor: 'history_length',
        impact: 'major',
        description: 'Few tracked cycles available for learning personal patterns',
        improvementSuggestion:
          'Continue tracking - predictions improve significantly after 3-6 cycles',
        weight: Math.max(0, (6 - uncertaintyFactors.historyLength) / 6),
      });
    } else if (uncertaintyFactors.historyLength < 6) {
      factors.push({
        factor: 'history_length',
        impact: 'moderate',
        description: 'Building cycle history - predictions will continue improving',
        improvementSuggestion: 'More tracking data will enhance prediction accuracy',
        weight: (6 - uncertaintyFactors.historyLength) / 6,
      });
    }

    // Cycle variability impact
    if (uncertaintyFactors.cycleLengthVariability > 7) {
      factors.push({
        factor: 'cycle_variability',
        impact: uncertaintyFactors.cycleLengthVariability > 14 ? 'major' : 'moderate',
        description: 'High cycle length variation makes predictions inherently less certain',
        improvementSuggestion: 'Track lifestyle factors that might influence cycle regularity',
        weight: Math.min(1, uncertaintyFactors.cycleLengthVariability / 21),
      });
    }

    // Recent data reliability
    if (uncertaintyFactors.recentDataReliability < 0.8) {
      factors.push({
        factor: 'recent_data',
        impact: uncertaintyFactors.recentDataReliability < 0.5 ? 'major' : 'moderate',
        description: 'Recent cycle data shows unusual patterns affecting current predictions',
        improvementSuggestion: 'Ensure recent tracking is accurate and complete',
        weight: 1 - uncertaintyFactors.recentDataReliability,
      });
    }

    // Model accuracy history
    if (accuracy.brierScore > 0.3) {
      factors.push({
        factor: 'model_accuracy',
        impact: accuracy.brierScore > 0.5 ? 'major' : 'moderate',
        description: 'Prediction model has shown variable accuracy for your cycles',
        improvementSuggestion: 'Model is still learning your unique patterns',
        weight: Math.min(1, accuracy.brierScore),
      });
    }

    // Calibration issues
    if (Math.abs(accuracy.calibrationScore) > 0.1) {
      factors.push({
        factor: 'calibration',
        impact: Math.abs(accuracy.calibrationScore) > 0.2 ? 'major' : 'moderate',
        description: 'Prediction confidence levels need adjustment for your personal patterns',
        improvementSuggestion: 'Model will auto-calibrate as more data becomes available',
        weight: Math.min(1, Math.abs(accuracy.calibrationScore) * 5),
      });
    }

    // Seasonal patterns
    if (uncertaintyFactors.seasonalPatterns && cyclePattern.seasonalPattern.reliability < 0.7) {
      factors.push({
        factor: 'seasonal_uncertainty',
        impact: 'minor',
        description: 'Seasonal cycle variations detected but patterns not yet clear',
        improvementSuggestion: 'Year-round tracking will help identify seasonal patterns',
        weight: 1 - cyclePattern.seasonalPattern.reliability,
      });
    }

    // Life changes or stress indicators
    if (modelParams.adaptiveLearningRate > 0.3) {
      factors.push({
        factor: 'pattern_changes',
        impact: 'moderate',
        description: 'Recent changes in cycle patterns detected',
        improvementSuggestion: 'Track any lifestyle changes that might affect your cycle',
        weight: modelParams.adaptiveLearningRate,
      });
    }

    return factors.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Assess overall data quality for predictions
   */
  private assessDataQuality(
    uncertaintyFactors: UncertaintyFactors,
    cyclePattern: CyclePattern
  ): DataQualityAssessment {
    const completeness = uncertaintyFactors.dataQuality;
    const consistency = 1 - uncertaintyFactors.cycleLengthVariability / 21;
    const recency = uncertaintyFactors.recentDataReliability;
    const regularity = cyclePattern.confidence;

    const overallScore = (completeness + consistency + recency + regularity) / 4;

    const recommendations: string[] = [];

    if (completeness < 0.7) {
      recommendations.push('Track period start/end dates consistently');
      recommendations.push('Add symptoms and flow details when possible');
    }

    if (consistency < 0.7) {
      recommendations.push('Monitor factors that might affect cycle regularity');
      recommendations.push('Consider tracking stress, sleep, and exercise');
    }

    if (recency < 0.8) {
      recommendations.push('Ensure recent cycle data is accurate and complete');
      recommendations.push('Update any missed or incorrect entries');
    }

    if (regularity < 0.7) {
      recommendations.push('Consider discussing cycle irregularity with healthcare provider');
      recommendations.push('Track additional symptoms to identify patterns');
    }

    return {
      overallScore,
      completeness,
      consistency,
      recency,
      regularity,
      recommendations,
    };
  }

  /**
   * Calculate overall uncertainty level
   */
  private calculateUncertaintyLevel(
    uncertaintyFactors: UncertaintyFactors,
    accuracy: PredictionAccuracy
  ): 'low' | 'medium' | 'high' | 'very_high' {
    // Weighted uncertainty score
    const uncertaintyScore =
      (1 - uncertaintyFactors.dataQuality) * 0.3 +
      Math.min(1, (6 - uncertaintyFactors.historyLength) / 6) * 0.25 +
      Math.min(1, uncertaintyFactors.cycleLengthVariability / 21) * 0.25 +
      (1 - uncertaintyFactors.recentDataReliability) * 0.1 +
      Math.min(1, accuracy.brierScore) * 0.1;

    if (uncertaintyScore < 0.2) return 'low';
    if (uncertaintyScore < 0.4) return 'medium';
    if (uncertaintyScore < 0.7) return 'high';
    return 'very_high';
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    factors: ExplanationFactor[],
    dataQuality: DataQualityAssessment,
    uncertaintyLevel: 'low' | 'medium' | 'high' | 'very_high',
    stealthMode: boolean
  ): string[] {
    const recommendations: string[] = [];

    // Base recommendations by uncertainty level
    switch (uncertaintyLevel) {
      case 'low':
        recommendations.push(
          stealthMode
            ? 'Predictions are highly reliable for planning'
            : 'Your cycle predictions are very reliable - confidence intervals reflect true uncertainty'
        );
        break;
      case 'medium':
        recommendations.push(
          stealthMode
            ? 'Use wider time windows for important planning'
            : 'Consider using 80% confidence intervals for important decisions'
        );
        break;
      case 'high':
        recommendations.push(
          stealthMode
            ? 'Plan with significant time buffers'
            : 'Use 95% confidence intervals and consider multiple scenarios'
        );
        break;
      case 'very_high':
        recommendations.push(
          stealthMode
            ? 'Predictions have high uncertainty - use broad planning windows'
            : 'Predictions are quite uncertain - focus on improving tracking consistency'
        );
        break;
    }

    // Factor-specific recommendations
    factors
      .filter(f => f.improvementSuggestion)
      .slice(0, 3) // Top 3 most impactful
      .forEach(factor => {
        if (factor.improvementSuggestion) {
          recommendations.push(factor.improvementSuggestion);
        }
      });

    // Data quality recommendations
    if (dataQuality.overallScore < 0.7) {
      recommendations.push(...dataQuality.recommendations.slice(0, 2));
    }

    // General tracking advice
    if (uncertaintyLevel === 'high' || uncertaintyLevel === 'very_high') {
      recommendations.push(
        stealthMode
          ? 'Consistent daily tracking improves accuracy significantly'
          : 'Focus on consistent tracking - even small improvements in data quality enhance predictions'
      );
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  /**
   * Recommend appropriate confidence level for decision making
   */
  private recommendConfidenceLevel(
    uncertaintyLevel: 'low' | 'medium' | 'high' | 'very_high',
    dataQuality: DataQualityAssessment
  ): number {
    const baseConfidence = {
      low: 0.5,
      medium: 0.8,
      high: 0.9,
      very_high: 0.95,
    };

    let recommendedLevel = baseConfidence[uncertaintyLevel];

    // Adjust based on data quality
    if (dataQuality.overallScore < 0.5) {
      recommendedLevel = Math.max(0.95, recommendedLevel);
    } else if (dataQuality.overallScore > 0.8) {
      recommendedLevel = Math.max(0.5, recommendedLevel - 0.1);
    }

    return recommendedLevel;
  }

  /**
   * Generate user-friendly uncertainty explanation
   */
  generateSimpleExplanation(
    uncertaintyLevel: 'low' | 'medium' | 'high' | 'very_high',
    primaryFactors: ExplanationFactor[],
    stealthMode: boolean = false
  ): string {
    const factorMessages = {
      data_quality: stealthMode ? 'tracking consistency' : 'incomplete tracking data',
      history_length: stealthMode ? 'learning period' : 'limited cycle history',
      cycle_variability: stealthMode ? 'natural variation' : 'irregular cycle patterns',
      recent_data: stealthMode ? 'recent changes' : 'recent data inconsistencies',
      model_accuracy: stealthMode ? 'personalization' : 'model calibration',
      calibration: stealthMode ? 'confidence adjustment' : 'calibration issues',
      seasonal_uncertainty: stealthMode ? 'seasonal factors' : 'seasonal pattern uncertainty',
      pattern_changes: stealthMode ? 'recent changes' : 'changing cycle patterns',
    };

    const baseMessage = {
      low: stealthMode
        ? 'Predictions are reliable for planning'
        : 'Your predictions are quite reliable',
      medium: stealthMode
        ? 'Predictions have moderate uncertainty'
        : 'Predictions have some uncertainty',
      high: stealthMode
        ? 'Predictions have significant uncertainty'
        : 'Predictions are somewhat uncertain',
      very_high: stealthMode
        ? 'Predictions have high uncertainty'
        : 'Predictions are quite uncertain',
    };

    let explanation = baseMessage[uncertaintyLevel];

    if (primaryFactors.length > 0) {
      const topFactor = primaryFactors[0];
      const factorDescription = factorMessages[topFactor.factor as keyof typeof factorMessages];

      if (factorDescription) {
        explanation += stealthMode
          ? ` mainly due to ${factorDescription}`
          : ` primarily due to ${factorDescription}`;
      }
    }

    return explanation + '.';
  }
}

export default UncertaintyExplanationEngine;
