import {
  UserDecision,
  DecisionSupport,
  RegretAnalysisInsights,
  PeriodPrediction,
  OvulationPrediction,
} from '@aura/shared-types/prediction';
import { DecisionRegretAnalyzer } from './DecisionRegretAnalyzer';
import { ConfidenceLevelRegretAnalyzer } from './ConfidenceLevelRegretAnalyzer';

/**
 * Decision Support Recommendation Engine
 *
 * Provides intelligent decision support recommendations based on prediction
 * uncertainty, user decision history, and regret analysis to help users
 * make better informed decisions.
 *
 * Features:
 * - Real-time decision support based on prediction confidence
 * - Personalized recommendations from historical decision patterns
 * - Context-aware decision guidance
 * - Risk-adjusted recommendation strategies
 */
export class DecisionSupportEngine {
  private readonly regretAnalyzer: DecisionRegretAnalyzer;
  private readonly confidenceAnalyzer: ConfidenceLevelRegretAnalyzer;

  constructor() {
    this.regretAnalyzer = new DecisionRegretAnalyzer();
    this.confidenceAnalyzer = new ConfidenceLevelRegretAnalyzer();
  }

  /**
   * Generate real-time decision support for a current prediction
   */
  generateDecisionSupport(
    prediction: PeriodPrediction | OvulationPrediction,
    decisionContext: {
      decisionType: 'planning' | 'protection' | 'fertility' | 'health';
      stakesLevel: 'low' | 'medium' | 'high';
      timeHorizon: number;
      alternativesAvailable: boolean;
      externalPressure: number;
    },
    userHistory: UserDecision[]
  ): DecisionSupportRecommendation {
    const baseRecommendations = this.generateBaseRecommendations(prediction, decisionContext);
    const personalizedRecommendations = this.generatePersonalizedRecommendations(
      decisionContext,
      userHistory
    );
    const riskAdjustedRecommendations = this.generateRiskAdjustedRecommendations(
      prediction,
      decisionContext,
      userHistory
    );

    return {
      primaryRecommendation: this.selectPrimaryRecommendation([
        ...baseRecommendations,
        ...personalizedRecommendations,
        ...riskAdjustedRecommendations,
      ]),
      alternativeStrategies: this.generateAlternativeStrategies(prediction, decisionContext),
      confidenceGuidance: this.generateConfidenceGuidance(prediction, userHistory),
      timingRecommendations: this.generateTimingRecommendations(prediction, decisionContext),
      bufferRecommendations: this.generateBufferRecommendations(prediction, decisionContext),
      contextualInsights: this.generateContextualInsights(decisionContext, userHistory),
      expectedOutcomes: this.predictDecisionOutcomes(prediction, decisionContext, userHistory),
    };
  }

  /**
   * Generate base recommendations based on prediction characteristics
   */
  private generateBaseRecommendations(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any
  ): DecisionSupport[] {
    const recommendations: DecisionSupport[] = [];
    const uncertaintyLevel = this.assessUncertaintyLevel(prediction);

    // High uncertainty recommendations
    if (uncertaintyLevel === 'high') {
      recommendations.push({
        recommendationType: 'confidence_adjustment',
        message: 'This prediction has high uncertainty. Consider using wider time buffers.',
        actionItems: [
          'Use the 80% confidence interval instead of the most likely date',
          'Plan for multiple scenarios',
          'Seek additional data if possible',
        ],
        confidenceThreshold: 0.6,
        expectedRegretReduction: 0.3,
        applicableScenarios: [context.decisionType],
      });
    }

    // High stakes recommendations
    if (context.stakesLevel === 'high') {
      recommendations.push({
        recommendationType: 'alternative_strategy',
        message: 'High-stakes decision detected. Consider backup plans and conservative approach.',
        actionItems: [
          'Develop contingency plans for different outcomes',
          'Use conservative confidence levels (50-70%)',
          'Consider delaying the decision if possible',
        ],
        confidenceThreshold: 0.7,
        expectedRegretReduction: 0.4,
        applicableScenarios: [context.decisionType],
      });
    }

    // Short time horizon recommendations
    if (context.timeHorizon < 3) {
      recommendations.push({
        recommendationType: 'timing_buffer',
        message: 'Short planning horizon increases uncertainty. Add extra buffer time.',
        actionItems: [
          'Add 1-2 days buffer to your plans',
          'Monitor for early signs if possible',
          'Have alternative options ready',
        ],
        confidenceThreshold: 0.5,
        expectedRegretReduction: 0.25,
        applicableScenarios: [context.decisionType],
      });
    }

    return recommendations;
  }

  /**
   * Generate personalized recommendations based on user history
   */
  private generatePersonalizedRecommendations(
    context: any,
    userHistory: UserDecision[]
  ): DecisionSupport[] {
    if (userHistory.length < 3) {
      return [];
    }

    const recommendations: DecisionSupport[] = [];
    const regretAnalysis = this.regretAnalyzer.analyzeDecisionHistory(userHistory);
    const confidenceAnalysis = this.confidenceAnalyzer.analyzeConfidenceRegretPatterns(userHistory);

    // Personal optimal confidence range
    const optimalRange = regretAnalysis.learningProgress.optimalConfidenceRange;
    recommendations.push({
      recommendationType: 'confidence_adjustment',
      message: `Based on your history, you perform best with ${(optimalRange[0] * 100).toFixed(0)}%-${(optimalRange[1] * 100).toFixed(0)}% confidence levels`,
      actionItems: [
        `Target confidence levels between ${(optimalRange[0] * 100).toFixed(0)}% and ${(optimalRange[1] * 100).toFixed(0)}%`,
        'Monitor your regret levels when outside this range',
      ],
      confidenceThreshold: optimalRange[1],
      expectedRegretReduction: 0.2,
      applicableScenarios: [context.decisionType],
    });

    // Decision type specific recommendations
    const typeSpecificRegret = regretAnalysis.regretTrends.byDecisionType[context.decisionType];
    if (typeSpecificRegret && typeSpecificRegret > 0.5) {
      recommendations.push({
        recommendationType: 'alternative_strategy',
        message: `You tend to experience regret with ${context.decisionType} decisions. Consider a more cautious approach.`,
        actionItems: [
          'Use lower confidence thresholds for this decision type',
          'Add extra buffer time',
          'Consider seeking additional information',
        ],
        confidenceThreshold: 0.6,
        expectedRegretReduction: 0.3,
        applicableScenarios: [context.decisionType],
      });
    }

    // Risk tolerance recommendations
    const riskTolerance = regretAnalysis.riskTolerance.estimatedLevel;
    if (riskTolerance === 'conservative' && context.stakesLevel === 'low') {
      recommendations.push({
        recommendationType: 'confidence_adjustment',
        message:
          'You tend to be conservative. You might be able to use slightly higher confidence for low-stakes decisions.',
        actionItems: [
          'Consider 70-80% confidence for low-stakes planning',
          'Track outcomes to build confidence',
        ],
        confidenceThreshold: 0.8,
        expectedRegretReduction: 0.1,
        applicableScenarios: [context.decisionType],
      });
    }

    return recommendations;
  }

  /**
   * Generate risk-adjusted recommendations
   */
  private generateRiskAdjustedRecommendations(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any,
    userHistory: UserDecision[]
  ): DecisionSupport[] {
    const recommendations: DecisionSupport[] = [];
    const riskScore = this.calculateDecisionRiskScore(prediction, context);

    if (riskScore > 0.7) {
      recommendations.push({
        recommendationType: 'alternative_strategy',
        message: 'This decision has high risk potential. Consider risk mitigation strategies.',
        actionItems: [
          'Develop multiple contingency plans',
          'Use conservative confidence levels (50-60%)',
          'Consider postponing if timing allows',
          'Seek additional data sources',
        ],
        confidenceThreshold: 0.6,
        expectedRegretReduction: 0.4,
        applicableScenarios: [context.decisionType],
      });
    } else if (riskScore < 0.3) {
      recommendations.push({
        recommendationType: 'confidence_adjustment',
        message: 'This appears to be a low-risk decision. You can use higher confidence levels.',
        actionItems: [
          'Use 80-90% confidence levels',
          'Plan with minimal buffer time',
          'Focus on other higher-risk decisions',
        ],
        confidenceThreshold: 0.9,
        expectedRegretReduction: 0.1,
        applicableScenarios: [context.decisionType],
      });
    }

    return recommendations;
  }

  /**
   * Calculate risk score for a decision
   */
  private calculateDecisionRiskScore(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any
  ): number {
    const uncertaintyScore =
      this.assessUncertaintyLevel(prediction) === 'high'
        ? 0.4
        : this.assessUncertaintyLevel(prediction) === 'medium'
          ? 0.2
          : 0.1;

    const stakesScore =
      context.stakesLevel === 'high' ? 0.3 : context.stakesLevel === 'medium' ? 0.2 : 0.1;

    const timeHorizonScore = context.timeHorizon < 3 ? 0.2 : context.timeHorizon < 7 ? 0.1 : 0.05;

    const alternativesScore = context.alternativesAvailable ? 0 : 0.1;

    return Math.min(1, uncertaintyScore + stakesScore + timeHorizonScore + alternativesScore);
  }

  /**
   * Select the most important recommendation as primary
   */
  private selectPrimaryRecommendation(recommendations: DecisionSupport[]): DecisionSupport {
    if (recommendations.length === 0) {
      return {
        recommendationType: 'confidence_adjustment',
        message: 'Use your best judgment based on the prediction confidence.',
        actionItems: ['Consider the confidence level when making your decision'],
        confidenceThreshold: 0.7,
        expectedRegretReduction: 0.1,
        applicableScenarios: ['all'],
      };
    }

    // Sort by expected regret reduction (descending)
    return recommendations.sort((a, b) => b.expectedRegretReduction - a.expectedRegretReduction)[0];
  }

  /**
   * Generate alternative decision strategies
   */
  private generateAlternativeStrategies(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any
  ): AlternativeStrategy[] {
    const strategies: AlternativeStrategy[] = [];

    // Conservative strategy
    strategies.push({
      name: 'Conservative Approach',
      description: 'Use wide confidence intervals and add buffer time',
      confidenceLevel: 0.5,
      bufferDays: context.stakesLevel === 'high' ? 3 : 2,
      expectedAccuracy: 0.9,
      expectedRegret: 0.2,
      suitableFor: ['High-stakes decisions', 'When you prefer certainty'],
    });

    // Balanced strategy
    strategies.push({
      name: 'Balanced Approach',
      description: 'Use moderate confidence with reasonable buffers',
      confidenceLevel: 0.7,
      bufferDays: 1,
      expectedAccuracy: 0.75,
      expectedRegret: 0.3,
      suitableFor: ['Most decisions', 'Regular planning'],
    });

    // Optimistic strategy
    if (context.stakesLevel !== 'high') {
      strategies.push({
        name: 'Optimistic Approach',
        description: 'Use high confidence with minimal buffers',
        confidenceLevel: 0.9,
        bufferDays: 0,
        expectedAccuracy: 0.6,
        expectedRegret: 0.4,
        suitableFor: ['Low-stakes decisions', 'When you prefer efficiency'],
      });
    }

    return strategies;
  }

  /**
   * Generate confidence level guidance
   */
  private generateConfidenceGuidance(
    prediction: PeriodPrediction | OvulationPrediction,
    userHistory: UserDecision[]
  ): ConfidenceGuidance {
    const uncertaintyLevel = this.assessUncertaintyLevel(prediction);
    const userOptimalRange =
      userHistory.length >= 3
        ? this.regretAnalyzer.analyzeDecisionHistory(userHistory).learningProgress
            .optimalConfidenceRange
        : ([0.6, 0.8] as [number, number]);

    let recommendedRange: [number, number];
    let explanation: string;

    switch (uncertaintyLevel) {
      case 'high':
        recommendedRange = [0.5, 0.7];
        explanation =
          'High uncertainty suggests using lower confidence levels and wider planning windows';
        break;
      case 'medium':
        recommendedRange = [userOptimalRange[0], userOptimalRange[1]];
        explanation = 'Medium uncertainty allows using your personal optimal confidence range';
        break;
      case 'low':
        recommendedRange = [Math.max(0.7, userOptimalRange[0]), Math.min(0.9, userOptimalRange[1])];
        explanation = 'Low uncertainty supports using higher confidence levels for planning';
        break;
    }

    return {
      recommendedRange,
      explanation,
      uncertaintyLevel,
      personalOptimalRange: userOptimalRange,
      adjustmentReason: this.getConfidenceAdjustmentReason(uncertaintyLevel, userOptimalRange),
    };
  }

  /**
   * Generate timing recommendations
   */
  private generateTimingRecommendations(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any
  ): TimingRecommendation[] {
    const recommendations: TimingRecommendation[] = [];
    const uncertaintyLevel = this.assessUncertaintyLevel(prediction);

    // Early window recommendation
    const earlyConfidence = prediction.confidenceIntervals.p50;
    recommendations.push({
      window: 'early',
      date: this.calculateDateWithOffset(prediction, -1),
      confidence: earlyConfidence * 0.3, // Lower confidence for early timing
      description: 'Conservative early timing with high certainty',
      suitableFor: ['High-stakes decisions', 'Cannot afford to be late'],
    });

    // Optimal window recommendation
    const predictionDate =
      'nextPeriodStart' in prediction ? prediction.nextPeriodStart : prediction.ovulationDate;
    recommendations.push({
      window: 'optimal',
      date: predictionDate,
      confidence: earlyConfidence,
      description: 'Most likely timing based on prediction model',
      suitableFor: ['Balanced decisions', 'Regular planning'],
    });

    // Late window recommendation (if appropriate)
    if (context.decisionType !== 'protection') {
      recommendations.push({
        window: 'late',
        date: this.calculateDateWithOffset(prediction, 1),
        confidence: earlyConfidence * 0.7,
        description: 'Later timing with moderate confidence',
        suitableFor: ['Flexible planning', 'When early action is costly'],
      });
    }

    return recommendations;
  }

  /**
   * Generate buffer recommendations
   */
  private generateBufferRecommendations(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any
  ): BufferRecommendation[] {
    const uncertaintyLevel = this.assessUncertaintyLevel(prediction);

    const baseBuffer = uncertaintyLevel === 'high' ? 2 : uncertaintyLevel === 'medium' ? 1 : 0;

    const stakesAdjustment =
      context.stakesLevel === 'high' ? 1 : context.stakesLevel === 'medium' ? 0 : -1;

    const timeHorizonAdjustment = context.timeHorizon < 3 ? 1 : 0;

    const recommendedBuffer = Math.max(0, baseBuffer + stakesAdjustment + timeHorizonAdjustment);

    return [
      {
        type: 'temporal',
        description: `Add ${recommendedBuffer} day(s) buffer to your planning`,
        bufferDays: recommendedBuffer,
        confidence: 0.85,
        reasoning: this.getBufferReasoning(
          uncertaintyLevel,
          context.stakesLevel,
          context.timeHorizon
        ),
      },
      {
        type: 'strategic',
        description: 'Develop contingency plans for different scenarios',
        bufferDays: 0,
        confidence: 0.9,
        reasoning: 'Strategic buffers reduce regret regardless of timing accuracy',
      },
    ];
  }

  /**
   * Generate contextual insights
   */
  private generateContextualInsights(context: any, userHistory: UserDecision[]): string[] {
    const insights: string[] = [];

    if (context.externalPressure > 0.7) {
      insights.push('High external pressure detected - consider if this decision can be delayed');
    }

    if (!context.alternativesAvailable) {
      insights.push(
        'Limited alternatives increase decision importance - use conservative approach'
      );
    }

    if (userHistory.length >= 5) {
      const avgRegret =
        userHistory.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
        userHistory.length;
      if (avgRegret > 0.5) {
        insights.push(
          'Your history shows higher regret levels - consider more conservative confidence levels'
        );
      } else {
        insights.push('Your decision patterns look healthy - maintain your current approach');
      }
    }

    return insights;
  }

  /**
   * Predict decision outcomes based on current context
   */
  private predictDecisionOutcomes(
    prediction: PeriodPrediction | OvulationPrediction,
    context: any,
    userHistory: UserDecision[]
  ): DecisionOutcomePrediction {
    const baseAccuracy = this.estimateBaseAccuracy(prediction);
    const userAdjustment = this.estimateUserPerformanceAdjustment(context, userHistory);
    const contextAdjustment = this.estimateContextualAdjustment(context);

    const adjustedAccuracy = Math.max(
      0.1,
      Math.min(0.95, baseAccuracy * userAdjustment * contextAdjustment)
    );

    const estimatedRegret = this.estimateRegret(adjustedAccuracy, context);

    return {
      estimatedAccuracy: adjustedAccuracy,
      estimatedRegret,
      confidenceInEstimate: userHistory.length >= 3 ? 0.8 : 0.5,
      factorsConsidered: [
        'Prediction uncertainty',
        'Your historical performance',
        'Decision context',
        'Stakes level',
      ],
    };
  }

  /**
   * Assess uncertainty level of prediction
   */
  private assessUncertaintyLevel(
    prediction: PeriodPrediction | OvulationPrediction
  ): 'low' | 'medium' | 'high' {
    const p50 = prediction.confidenceIntervals.p50;
    const p95 = prediction.confidenceIntervals.p95;
    const intervalWidth = p95 - p50;

    if (intervalWidth > 3) return 'high';
    if (intervalWidth > 1.5) return 'medium';
    return 'low';
  }

  /**
   * Calculate date with offset
   */
  private calculateDateWithOffset(
    prediction: PeriodPrediction | OvulationPrediction,
    offsetDays: number
  ): string {
    const baseDate =
      'nextPeriodStart' in prediction
        ? new Date(prediction.nextPeriodStart)
        : new Date(prediction.ovulationDate);

    baseDate.setDate(baseDate.getDate() + offsetDays);
    return baseDate.toISOString();
  }

  /**
   * Get confidence adjustment reasoning
   */
  private getConfidenceAdjustmentReason(
    uncertaintyLevel: 'low' | 'medium' | 'high',
    userOptimalRange: [number, number]
  ): string {
    if (uncertaintyLevel === 'high') {
      return 'High prediction uncertainty suggests using lower confidence levels';
    }
    if (uncertaintyLevel === 'low') {
      return 'Low prediction uncertainty allows for higher confidence levels';
    }
    return `Medium uncertainty allows using your personal optimal range (${(userOptimalRange[0] * 100).toFixed(0)}%-${(userOptimalRange[1] * 100).toFixed(0)}%)`;
  }

  /**
   * Get buffer reasoning
   */
  private getBufferReasoning(
    uncertaintyLevel: 'low' | 'medium' | 'high',
    stakesLevel: 'low' | 'medium' | 'high',
    timeHorizon: number
  ): string {
    const reasons: string[] = [];

    if (uncertaintyLevel === 'high') {
      reasons.push('high prediction uncertainty');
    }
    if (stakesLevel === 'high') {
      reasons.push('high decision stakes');
    }
    if (timeHorizon < 3) {
      reasons.push('short planning horizon');
    }

    return reasons.length > 0
      ? `Buffer recommended due to: ${reasons.join(', ')}`
      : 'Standard buffer for this decision type';
  }

  /**
   * Estimate base accuracy from prediction
   */
  private estimateBaseAccuracy(prediction: PeriodPrediction | OvulationPrediction): number {
    const uncertaintyLevel = this.assessUncertaintyLevel(prediction);
    const uncertaintyFactors = prediction.uncertaintyFactors;

    const baseAccuracy =
      uncertaintyLevel === 'high' ? 0.6 : uncertaintyLevel === 'medium' ? 0.75 : 0.85;

    const dataQualityAdjustment = uncertaintyFactors.dataQuality;
    const historyAdjustment = Math.min(1, uncertaintyFactors.historyLength / 6);

    return baseAccuracy * dataQualityAdjustment * historyAdjustment;
  }

  /**
   * Estimate user performance adjustment
   */
  private estimateUserPerformanceAdjustment(context: any, userHistory: UserDecision[]): number {
    if (userHistory.length < 2) return 1.0;

    const relevantDecisions = userHistory.filter(d => d.decisionType === context.decisionType);
    if (relevantDecisions.length === 0) return 1.0;

    const accuracy =
      relevantDecisions.filter(d => d.actualOutcome.wasCorrect).length / relevantDecisions.length;

    // Convert accuracy to multiplier (0.5 accuracy = 0.9 multiplier, 0.9 accuracy = 1.1 multiplier)
    return 0.8 + accuracy * 0.4;
  }

  /**
   * Estimate contextual adjustment
   */
  private estimateContextualAdjustment(context: any): number {
    let adjustment = 1.0;

    if (context.stakesLevel === 'high') adjustment *= 0.9; // High stakes = more pressure = lower performance
    if (context.timeHorizon < 3) adjustment *= 0.95; // Short horizon = more stress
    if (context.externalPressure > 0.7) adjustment *= 0.9; // High pressure = lower performance

    return adjustment;
  }

  /**
   * Estimate regret based on accuracy and context
   */
  private estimateRegret(accuracy: number, context: any): number {
    const baseRegret = 1 - accuracy; // Higher accuracy = lower regret

    const stakesMultiplier =
      context.stakesLevel === 'high' ? 1.3 : context.stakesLevel === 'medium' ? 1.0 : 0.8;

    return Math.min(1, baseRegret * stakesMultiplier);
  }
}

// Type definitions for decision support
interface DecisionSupportRecommendation {
  primaryRecommendation: DecisionSupport;
  alternativeStrategies: AlternativeStrategy[];
  confidenceGuidance: ConfidenceGuidance;
  timingRecommendations: TimingRecommendation[];
  bufferRecommendations: BufferRecommendation[];
  contextualInsights: string[];
  expectedOutcomes: DecisionOutcomePrediction;
}

interface AlternativeStrategy {
  name: string;
  description: string;
  confidenceLevel: number;
  bufferDays: number;
  expectedAccuracy: number;
  expectedRegret: number;
  suitableFor: string[];
}

interface ConfidenceGuidance {
  recommendedRange: [number, number];
  explanation: string;
  uncertaintyLevel: 'low' | 'medium' | 'high';
  personalOptimalRange: [number, number];
  adjustmentReason: string;
}

interface TimingRecommendation {
  window: 'early' | 'optimal' | 'late';
  date: string;
  confidence: number;
  description: string;
  suitableFor: string[];
}

interface BufferRecommendation {
  type: 'temporal' | 'strategic';
  description: string;
  bufferDays: number;
  confidence: number;
  reasoning: string;
}

interface DecisionOutcomePrediction {
  estimatedAccuracy: number;
  estimatedRegret: number;
  confidenceInEstimate: number;
  factorsConsidered: string[];
}
