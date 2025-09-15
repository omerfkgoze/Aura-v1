import type {
  PredictionVisualization,
  UncertaintyFactors,
  ConfidenceInterval,
  PredictionAccuracy,
  CyclePattern,
} from '@aura/shared-types';
import UncertaintyExplanationEngine, {
  type UncertaintyExplanation,
} from './UncertaintyExplanationEngine';

export interface CommunicationStyle {
  style: 'technical' | 'conversational' | 'minimal' | 'stealth';
  culturalAdaptation: 'modern' | 'traditional' | 'universal';
  confidenceDisplay: 'percentage' | 'descriptive' | 'visual' | 'hidden';
  uncertaintyEmphasis: 'high' | 'medium' | 'low';
}

export interface UncertaintyMessage {
  primary: string;
  secondary?: string;
  explanation?: string;
  actionable?: string;
  tone: 'confident' | 'cautious' | 'educational' | 'supportive';
}

export interface VisualizationConfig {
  showConfidenceBands: boolean;
  showProbabilityDistribution: boolean;
  showUncertaintyFactors: boolean;
  showRecommendations: boolean;
  colorScheme: 'default' | 'colorblind' | 'minimal' | 'stealth';
  interactivityLevel: 'basic' | 'full' | 'educational';
}

export class UncertaintyCommunicationSystem {
  private explanationEngine: UncertaintyExplanationEngine;

  constructor() {
    this.explanationEngine = new UncertaintyExplanationEngine();
  }

  /**
   * Generate comprehensive uncertainty communication package
   */
  generateUncertaintyCommunication(
    uncertaintyFactors: UncertaintyFactors,
    accuracy: PredictionAccuracy,
    cyclePattern: CyclePattern,
    confidenceIntervals: ConfidenceInterval,
    communicationStyle: CommunicationStyle,
    predictionType: 'period' | 'ovulation'
  ): {
    message: UncertaintyMessage;
    visualization: PredictionVisualization;
    config: VisualizationConfig;
    explanation: UncertaintyExplanation;
  } {
    const explanation = this.explanationEngine.generateUncertaintyExplanation(
      uncertaintyFactors,
      accuracy,
      cyclePattern,
      {
        // Mock model params for this example
        cycleLengthMean: 28,
        cycleLengthVariance: 4,
        periodLengthMean: 5,
        periodLengthVariance: 1,
        seasonalVariation: 0.1,
        personalHistoryWeight: 0.7,
        adaptiveLearningRate: 0.2,
      },
      communicationStyle.style === 'stealth'
    );

    const message = this.generateUncertaintyMessage(
      explanation,
      communicationStyle,
      predictionType
    );

    const visualization = this.generateVisualizationData(
      confidenceIntervals,
      explanation,
      predictionType
    );

    const config = this.generateVisualizationConfig(
      communicationStyle,
      explanation.uncertaintyLevel
    );

    return {
      message,
      visualization,
      config,
      explanation,
    };
  }

  /**
   * Generate user-appropriate uncertainty message
   */
  private generateUncertaintyMessage(
    explanation: UncertaintyExplanation,
    style: CommunicationStyle,
    predictionType: 'period' | 'ovulation'
  ): UncertaintyMessage {
    const predictionLabel =
      style.style === 'stealth'
        ? predictionType === 'period'
          ? 'cycle'
          : 'fertility window'
        : predictionType;

    switch (style.style) {
      case 'technical':
        return this.generateTechnicalMessage(explanation, predictionLabel);
      case 'conversational':
        return this.generateConversationalMessage(
          explanation,
          predictionLabel,
          style.culturalAdaptation
        );
      case 'minimal':
        return this.generateMinimalMessage(explanation, predictionLabel);
      case 'stealth':
        return this.generateStealthMessage(explanation, predictionLabel);
      default:
        return this.generateConversationalMessage(
          explanation,
          predictionLabel,
          style.culturalAdaptation
        );
    }
  }

  private generateTechnicalMessage(
    explanation: UncertaintyExplanation,
    predictionLabel: string
  ): UncertaintyMessage {
    const confidence = Math.round(explanation.confidenceRecommendation * 100);

    return {
      primary: `${predictionLabel} prediction confidence: ${100 - confidence}% uncertainty`,
      secondary: `Recommended confidence interval: ${confidence}%`,
      explanation: `Uncertainty primarily driven by ${explanation.primaryFactors[0]?.factor.replace('_', ' ') || 'data limitations'}`,
      actionable: `Use ${confidence}% confidence bands for planning decisions`,
      tone: 'confident',
    };
  }

  private generateConversationalMessage(
    explanation: UncertaintyExplanation,
    predictionLabel: string,
    culturalAdaptation: string
  ): UncertaintyMessage {
    const uncertaintyDescriptions = {
      low: { desc: 'quite reliable', tone: 'confident' as const },
      medium: { desc: 'moderately uncertain', tone: 'cautious' as const },
      high: { desc: 'somewhat uncertain', tone: 'cautious' as const },
      very_high: { desc: 'quite uncertain', tone: 'supportive' as const },
    };

    const { desc, tone } = uncertaintyDescriptions[explanation.uncertaintyLevel];
    const culturalPrefix =
      culturalAdaptation === 'traditional' ? 'Based on your cycle patterns, ' : '';

    let primary: string;
    let actionable: string;

    switch (explanation.uncertaintyLevel) {
      case 'low':
        primary = `${culturalPrefix}Your ${predictionLabel} predictions are ${desc} and great for planning.`;
        actionable = 'Feel confident using these predictions for important decisions.';
        break;
      case 'medium':
        primary = `${culturalPrefix}Your ${predictionLabel} predictions are ${desc}, so consider some flexibility in your planning.`;
        actionable = 'Use wider time windows for important events.';
        break;
      case 'high':
        primary = `${culturalPrefix}Your ${predictionLabel} predictions are ${desc}, so plan with extra buffer time.`;
        actionable = 'Focus on improving tracking consistency for better predictions.';
        break;
      case 'very_high':
        primary = `${culturalPrefix}Your ${predictionLabel} predictions are ${desc} right now, but will improve with more tracking.`;
        actionable = 'Use broad planning windows and focus on consistent daily tracking.';
        break;
    }

    return {
      primary,
      secondary: explanation.primaryFactors[0]?.description,
      explanation: explanation.recommendations[0],
      actionable,
      tone,
    };
  }

  private generateMinimalMessage(
    explanation: UncertaintyExplanation,
    predictionLabel: string
  ): UncertaintyMessage {
    const confidence = Math.round(
      (1 -
        (explanation.uncertaintyLevel === 'low'
          ? 0.1
          : explanation.uncertaintyLevel === 'medium'
            ? 0.3
            : explanation.uncertaintyLevel === 'high'
              ? 0.5
              : 0.7)) *
        100
    );

    return {
      primary: `${confidence}% confidence`,
      secondary: `±${Math.round(explanation.confidenceRecommendation * 14)} days`,
      tone: 'confident',
    };
  }

  private generateStealthMessage(
    explanation: UncertaintyExplanation,
    predictionLabel: string
  ): UncertaintyMessage {
    const reliabilityDescriptions = {
      low: 'High reliability',
      medium: 'Good reliability',
      high: 'Moderate reliability',
      very_high: 'Lower reliability',
    };

    return {
      primary: `${reliabilityDescriptions[explanation.uncertaintyLevel]} for planning`,
      secondary: `Buffer: ±${Math.round(explanation.confidenceRecommendation * 7)} days`,
      explanation: 'Based on tracking patterns',
      tone: 'confident',
    };
  }

  /**
   * Generate visualization data for uncertainty communication
   */
  private generateVisualizationData(
    confidenceIntervals: ConfidenceInterval,
    explanation: UncertaintyExplanation,
    predictionType: 'period' | 'ovulation'
  ): PredictionVisualization {
    // Generate synthetic data for demonstration
    const days = 14;
    const dates: string[] = [];
    const probabilities: number[] = [];
    const p50Band: number[] = [];
    const p80Band: number[] = [];
    const p95Band: number[] = [];

    const today = new Date();
    const peakDay = Math.floor(days / 2);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString());

      // Generate probability distribution (normal-like curve)
      const distance = Math.abs(i - peakDay);
      const probability = Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(3, 2)));
      probabilities.push(probability);

      // Generate confidence bands
      p50Band.push(probability * 0.5);
      p80Band.push(probability * 0.8);
      p95Band.push(probability * 0.95);
    }

    const confidenceVisualization = [
      {
        level: '50%',
        description: 'Most likely range',
        color: predictionType === 'period' ? '#E74C3C' : '#3498DB',
        opacity: 0.7,
      },
      {
        level: '80%',
        description: 'Very likely range',
        color: predictionType === 'period' ? '#F1948A' : '#85C1E9',
        opacity: 0.5,
      },
      {
        level: '95%',
        description: 'Almost certain range',
        color: predictionType === 'period' ? '#FADBD8' : '#D6EAF8',
        opacity: 0.3,
      },
    ];

    return {
      uncertaintyBands: {
        dates,
        p50Band,
        p80Band,
        p95Band,
      },
      probabilityChart: {
        dates,
        probabilities,
      },
      confidenceVisualization,
    };
  }

  /**
   * Generate visualization configuration based on style and uncertainty
   */
  private generateVisualizationConfig(
    style: CommunicationStyle,
    uncertaintyLevel: 'low' | 'medium' | 'high' | 'very_high'
  ): VisualizationConfig {
    const isStealthMode = style.style === 'stealth';
    const isMinimal = style.style === 'minimal';
    const highUncertainty = uncertaintyLevel === 'high' || uncertaintyLevel === 'very_high';

    return {
      showConfidenceBands: !isMinimal,
      showProbabilityDistribution: style.style === 'technical' || style.style === 'conversational',
      showUncertaintyFactors: !isMinimal && !isStealthMode && highUncertainty,
      showRecommendations: style.uncertaintyEmphasis !== 'low',
      colorScheme: isStealthMode
        ? 'stealth'
        : style.culturalAdaptation === 'minimal'
          ? 'minimal'
          : 'default',
      interactivityLevel: isMinimal
        ? 'basic'
        : style.style === 'technical'
          ? 'educational'
          : 'full',
    };
  }

  /**
   * Adapt message for cultural context
   */
  adaptForCulturalContext(
    message: UncertaintyMessage,
    culturalContext: {
      language: string;
      region: string;
      planningCulture: 'precise' | 'flexible' | 'event_driven';
      uncertaintyTolerance: 'low' | 'medium' | 'high';
    }
  ): UncertaintyMessage {
    const adaptedMessage = { ...message };

    // Adjust tone based on uncertainty tolerance
    if (culturalContext.uncertaintyTolerance === 'low' && message.tone === 'cautious') {
      adaptedMessage.primary = adaptedMessage.primary?.replace('uncertain', 'variable');
      adaptedMessage.tone = 'supportive';
    }

    // Adjust language for planning culture
    if (culturalContext.planningCulture === 'precise') {
      adaptedMessage.actionable = adaptedMessage.actionable?.replace(
        'flexibility',
        'careful timing'
      );
    } else if (culturalContext.planningCulture === 'flexible') {
      adaptedMessage.primary = adaptedMessage.primary?.replace('plan with', 'stay flexible with');
    }

    return adaptedMessage;
  }

  /**
   * Generate progressive disclosure content for uncertainty education
   */
  generateEducationalContent(
    explanation: UncertaintyExplanation,
    userExperienceLevel: 'beginner' | 'intermediate' | 'advanced'
  ): {
    basicExplanation: string;
    detailedExplanation?: string;
    expertInsights?: string;
    interactiveTips: string[];
  } {
    const basicExplanation = this.explanationEngine.generateSimpleExplanation(
      explanation.uncertaintyLevel,
      explanation.primaryFactors
    );

    let detailedExplanation: string | undefined;
    let expertInsights: string | undefined;

    if (userExperienceLevel !== 'beginner') {
      detailedExplanation = `Prediction uncertainty comes from multiple factors: ${explanation.primaryFactors
        .map(f => f.factor)
        .join(
          ', '
        )}. Your data quality score is ${Math.round(explanation.dataQualityAssessment.overallScore * 100)}%, and we recommend using ${Math.round(explanation.confidenceRecommendation * 100)}% confidence intervals for decisions.`;
    }

    if (userExperienceLevel === 'advanced') {
      expertInsights = `Calibration analysis shows ${Math.round(Math.abs(explanation.dataQualityAssessment.overallScore - 0.5) * 100)}% deviation from ideal. Key improvement areas: ${explanation.recommendations.slice(0, 2).join(', ')}.`;
    }

    const interactiveTips = [
      'Tap confidence bands to see what they mean',
      'Explore uncertainty factors to understand your predictions',
      'Track consistently to improve prediction accuracy',
      'Use wider planning windows for high uncertainty periods',
    ].slice(0, userExperienceLevel === 'beginner' ? 2 : 4);

    return {
      basicExplanation,
      detailedExplanation,
      expertInsights,
      interactiveTips,
    };
  }
}

export default UncertaintyCommunicationSystem;
