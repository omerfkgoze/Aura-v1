import { ConfidenceInterval, UncertaintyFactors } from '@aura/shared-types';

/**
 * Dynamically adjusts confidence intervals based on data quality
 * and prediction reliability factors
 */
export class IntervalAdjuster {
  private readonly MIN_ADJUSTMENT_FACTOR = 0.3;
  private readonly MAX_ADJUSTMENT_FACTOR = 3.0;
  private readonly QUALITY_WEIGHTS = {
    dataQuality: 0.35,
    historyLength: 0.25,
    cycleLengthVariability: 0.2,
    recentDataReliability: 0.2,
  };

  /**
   * Adjust confidence intervals based on comprehensive data quality assessment
   */
  adjustForDataQuality(
    baseIntervals: ConfidenceInterval,
    uncertaintyFactors: UncertaintyFactors,
    predictionContext: PredictionContext
  ): AdjustedInterval {
    const qualityScore = this.calculateCompositeQualityScore(uncertaintyFactors);
    const contextAdjustment = this.calculateContextualAdjustment(predictionContext);
    const temporalAdjustment = this.calculateTemporalAdjustment(uncertaintyFactors);

    const combinedAdjustment = this.combineAdjustmentFactors({
      quality: this.qualityScoreToAdjustment(qualityScore),
      contextual: contextAdjustment,
      temporal: temporalAdjustment,
    });

    const adjustedIntervals = this.applyAdjustment(baseIntervals, combinedAdjustment);

    return {
      intervals: adjustedIntervals,
      adjustmentFactor: combinedAdjustment,
      qualityScore,
      adjustmentReasoning: this.generateAdjustmentReasoning(
        qualityScore,
        contextAdjustment,
        temporalAdjustment
      ),
      confidence: this.calculateAdjustedConfidence(qualityScore),
    };
  }

  /**
   * Adjust intervals based on historical prediction accuracy
   */
  adjustForAccuracy(
    baseIntervals: ConfidenceInterval,
    accuracyHistory: AccuracyHistoryData
  ): AccuracyAdjustedInterval {
    const accuracyFactors = this.analyzeAccuracyHistory(accuracyHistory);
    const adjustmentMultipliers = this.calculateAccuracyAdjustments(accuracyFactors);

    const adjustedIntervals: ConfidenceInterval = {
      p50: Math.round(baseIntervals.p50 * adjustmentMultipliers.p50),
      p80: Math.round(baseIntervals.p80 * adjustmentMultipliers.p80),
      p95: Math.round(baseIntervals.p95 * adjustmentMultipliers.p95),
    };

    return {
      intervals: this.ensureIntervalConsistency(adjustedIntervals),
      accuracyFactors,
      adjustmentMultipliers,
      confidenceInAdjustment: accuracyFactors.sampleSize >= 20 ? 'high' : 'low',
    };
  }

  /**
   * Dynamically adjust intervals based on real-time factors
   */
  dynamicAdjustment(
    baseIntervals: ConfidenceInterval,
    realtimeFactors: RealtimeAdjustmentFactors
  ): DynamicAdjustment {
    let adjustmentFactor = 1.0;

    // Adjust for irregular cycle patterns
    if (realtimeFactors.irregularPatternDetected) {
      adjustmentFactor *= 1.4;
    }

    // Adjust for stress indicators
    if (realtimeFactors.stressLevel > 0.7) {
      adjustmentFactor *= 1.0 + realtimeFactors.stressLevel * 0.3;
    }

    // Adjust for lifestyle changes
    if (realtimeFactors.lifestyleChangeScore > 0.5) {
      adjustmentFactor *= 1.0 + realtimeFactors.lifestyleChangeScore * 0.4;
    }

    // Adjust for health status changes
    if (realtimeFactors.healthStatusChange) {
      adjustmentFactor *= 1.3;
    }

    // Cap the adjustment
    adjustmentFactor = Math.max(
      this.MIN_ADJUSTMENT_FACTOR,
      Math.min(this.MAX_ADJUSTMENT_FACTOR, adjustmentFactor)
    );

    const dynamicIntervals = this.applyAdjustment(baseIntervals, adjustmentFactor);

    return {
      intervals: dynamicIntervals,
      adjustmentFactor,
      triggeringFactors: this.identifyTriggeringFactors(realtimeFactors),
      validityPeriod: this.calculateValidityPeriod(realtimeFactors),
    };
  }

  /**
   * Adjust intervals based on user feedback and actual outcomes
   */
  adjustForUserFeedback(
    baseIntervals: ConfidenceInterval,
    feedbackData: UserFeedbackData[]
  ): FeedbackAdjustedInterval {
    if (feedbackData.length < 5) {
      return {
        intervals: baseIntervals,
        adjustmentApplied: false,
        reason: 'Insufficient feedback data for adjustment',
      };
    }

    const feedbackAnalysis = this.analyzeFeedback(feedbackData);
    const adjustment = this.calculateFeedbackAdjustment(feedbackAnalysis);

    const adjustedIntervals = this.applyAdjustment(baseIntervals, adjustment.factor);

    return {
      intervals: adjustedIntervals,
      adjustmentApplied: true,
      feedbackAnalysis,
      adjustment,
      userSatisfactionScore: feedbackAnalysis.satisfactionScore,
    };
  }

  /**
   * Calculate composite quality score from uncertainty factors
   */
  private calculateCompositeQualityScore(factors: UncertaintyFactors): number {
    const weightedScore =
      factors.dataQuality * this.QUALITY_WEIGHTS.dataQuality +
      this.normalizeHistoryLength(factors.historyLength) * this.QUALITY_WEIGHTS.historyLength +
      (1 - factors.cycleLengthVariability) * this.QUALITY_WEIGHTS.cycleLengthVariability +
      factors.recentDataReliability * this.QUALITY_WEIGHTS.recentDataReliability;

    return Math.max(0.1, Math.min(1.0, weightedScore));
  }

  /**
   * Convert quality score to adjustment factor
   */
  private qualityScoreToAdjustment(qualityScore: number): number {
    // High quality = narrower intervals (smaller adjustment)
    // Low quality = wider intervals (larger adjustment)
    return 2.0 - qualityScore; // Score of 1.0 -> 1.0x, Score of 0.5 -> 1.5x, Score of 0.1 -> 1.9x
  }

  /**
   * Calculate contextual adjustment based on prediction scenario
   */
  private calculateContextualAdjustment(context: PredictionContext): number {
    let adjustment = 1.0;

    // Adjust based on prediction horizon
    if (context.predictionHorizonDays > 60) {
      adjustment *= 1.2; // Longer predictions are less reliable
    } else if (context.predictionHorizonDays > 30) {
      adjustment *= 1.1;
    }

    // Adjust based on data completeness
    adjustment *= 2.0 - context.dataCompleteness;

    // Adjust for seasonal effects
    if (context.seasonalEffectsPresent) {
      adjustment *= 1.05;
    }

    return Math.max(0.8, Math.min(1.8, adjustment));
  }

  /**
   * Calculate temporal adjustment based on recency and trends
   */
  private calculateTemporalAdjustment(factors: UncertaintyFactors): number {
    let adjustment = 1.0;

    // Less reliable recent data increases uncertainty
    adjustment *= 2.0 - factors.recentDataReliability;

    // Lack of seasonal patterns increases uncertainty
    if (!factors.seasonalPatterns) {
      adjustment *= 1.15;
    }

    return Math.max(0.9, Math.min(1.5, adjustment));
  }

  /**
   * Combine multiple adjustment factors with appropriate weighting
   */
  private combineAdjustmentFactors(adjustments: {
    quality: number;
    contextual: number;
    temporal: number;
  }): number {
    // Geometric mean provides better balance than arithmetic mean
    const geometricMean = Math.pow(
      adjustments.quality * adjustments.contextual * adjustments.temporal,
      1 / 3
    );

    return Math.max(
      this.MIN_ADJUSTMENT_FACTOR,
      Math.min(this.MAX_ADJUSTMENT_FACTOR, geometricMean)
    );
  }

  /**
   * Apply adjustment factor to confidence intervals
   */
  private applyAdjustment(intervals: ConfidenceInterval, factor: number): ConfidenceInterval {
    const adjusted = {
      p50: Math.round(intervals.p50 * factor),
      p80: Math.round(intervals.p80 * factor),
      p95: Math.round(intervals.p95 * factor),
    };

    return this.ensureIntervalConsistency(adjusted);
  }

  /**
   * Ensure intervals maintain proper ordering and bounds
   */
  private ensureIntervalConsistency(intervals: ConfidenceInterval): ConfidenceInterval {
    // Ensure proper ordering: p50 <= p80 <= p95
    const p50 = Math.max(1, intervals.p50);
    const p80 = Math.max(p50, intervals.p80);
    const p95 = Math.max(p80, intervals.p95);

    // Apply reasonable bounds
    return {
      p50: Math.min(14, p50), // Max 2 weeks for 50%
      p80: Math.min(21, p80), // Max 3 weeks for 80%
      p95: Math.min(35, p95), // Max 5 weeks for 95%
    };
  }

  /**
   * Normalize history length to 0-1 scale
   */
  private normalizeHistoryLength(historyLength: number): number {
    // Assume optimal history is around 12 cycles
    return Math.min(1.0, historyLength / 12);
  }

  /**
   * Generate human-readable reasoning for adjustments
   */
  private generateAdjustmentReasoning(
    qualityScore: number,
    contextualAdjustment: number,
    temporalAdjustment: number
  ): string[] {
    const reasons: string[] = [];

    if (qualityScore < 0.6) {
      reasons.push('Intervals widened due to limited or inconsistent cycle data');
    }

    if (contextualAdjustment > 1.2) {
      reasons.push('Intervals expanded for longer-term predictions');
    }

    if (temporalAdjustment > 1.1) {
      reasons.push('Intervals adjusted for recent data reliability concerns');
    }

    if (reasons.length === 0) {
      reasons.push('Intervals based on high-quality, consistent data');
    }

    return reasons;
  }

  /**
   * Calculate confidence level in the adjusted intervals
   */
  private calculateAdjustedConfidence(qualityScore: number): number {
    // Higher quality data = higher confidence in the intervals
    return Math.max(0.5, Math.min(0.95, 0.6 + qualityScore * 0.35));
  }

  /**
   * Analyze historical accuracy data
   */
  private analyzeAccuracyHistory(history: AccuracyHistoryData): AccuracyFactors {
    const recentAccuracy = this.calculateRecentAccuracy(history.recent);
    const overallAccuracy = this.calculateOverallAccuracy(history.overall);
    const trendDirection = this.calculateTrend(history.recent);

    return {
      recentAccuracy,
      overallAccuracy,
      trendDirection,
      sampleSize: history.overall.length,
      consistency: this.calculateConsistency(history.overall),
    };
  }

  /**
   * Calculate accuracy adjustments based on historical performance
   */
  private calculateAccuracyAdjustments(factors: AccuracyFactors): ConfidenceInterval {
    const baseAdjustment =
      factors.overallAccuracy < 0.8 ? 1.3 : factors.overallAccuracy > 0.9 ? 0.9 : 1.0;

    const trendAdjustment =
      factors.trendDirection === 'declining'
        ? 1.1
        : factors.trendDirection === 'improving'
          ? 0.95
          : 1.0;

    const finalAdjustment = baseAdjustment * trendAdjustment;

    return {
      p50: finalAdjustment * 0.9, // 50% intervals adjust less
      p80: finalAdjustment, // 80% intervals adjust normally
      p95: finalAdjustment * 1.1, // 95% intervals adjust more
    };
  }

  /**
   * Identify factors triggering dynamic adjustments
   */
  private identifyTriggeringFactors(factors: RealtimeAdjustmentFactors): string[] {
    const triggers: string[] = [];

    if (factors.irregularPatternDetected) triggers.push('irregular cycle pattern');
    if (factors.stressLevel > 0.7) triggers.push('high stress levels');
    if (factors.lifestyleChangeScore > 0.5) triggers.push('significant lifestyle changes');
    if (factors.healthStatusChange) triggers.push('health status changes');

    return triggers;
  }

  /**
   * Calculate how long the dynamic adjustment should remain valid
   */
  private calculateValidityPeriod(factors: RealtimeAdjustmentFactors): number {
    // More volatile factors = shorter validity period
    let basePeriod = 30; // 30 days default

    if (factors.irregularPatternDetected) basePeriod *= 0.7;
    if (factors.stressLevel > 0.8) basePeriod *= 0.8;
    if (factors.healthStatusChange) basePeriod *= 0.6;

    return Math.max(7, Math.round(basePeriod)); // Minimum 1 week
  }

  /**
   * Analyze user feedback patterns
   */
  private analyzeFeedback(feedback: UserFeedbackData[]): FeedbackAnalysis {
    const satisfactionScores = feedback.map(f => f.satisfactionScore);
    const accuracyRatings = feedback.map(f => f.accuracyRating);

    return {
      satisfactionScore: satisfactionScores.reduce((s, v) => s + v, 0) / satisfactionScores.length,
      averageAccuracyRating: accuracyRatings.reduce((s, v) => s + v, 0) / accuracyRatings.length,
      commonComplaint: this.identifyCommonComplaint(feedback),
      improvementSuggestion: this.generateImprovementSuggestion(feedback),
    };
  }

  /**
   * Calculate feedback-based adjustment
   */
  private calculateFeedbackAdjustment(analysis: FeedbackAnalysis): FeedbackAdjustment {
    let factor = 1.0;

    // Adjust based on satisfaction
    if (analysis.satisfactionScore < 0.6) {
      factor = analysis.commonComplaint === 'too_narrow' ? 1.3 : 0.8;
    } else if (analysis.satisfactionScore > 0.8) {
      factor = 0.95; // Slight optimization
    }

    return {
      factor,
      reason: this.getFeedbackAdjustmentReason(analysis),
      confidence: analysis.satisfactionScore,
    };
  }

  // Helper methods for feedback analysis
  private calculateRecentAccuracy(recent: number[]): number {
    return recent.reduce((s, v) => s + v, 0) / recent.length;
  }

  private calculateOverallAccuracy(overall: number[]): number {
    return overall.reduce((s, v) => s + v, 0) / overall.length;
  }

  private calculateTrend(recent: number[]): 'improving' | 'stable' | 'declining' {
    if (recent.length < 3) return 'stable';

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    return difference > 0.05 ? 'improving' : difference < -0.05 ? 'declining' : 'stable';
  }

  private calculateConsistency(data: number[]): number {
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const variance = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / data.length;
    return 1 - Math.sqrt(variance); // Higher consistency = lower variance
  }

  private identifyCommonComplaint(feedback: UserFeedbackData[]): string {
    const complaints = feedback.map(f => f.complaint).filter(c => c);
    if (complaints.length === 0) return 'none';

    // Simple frequency count - in real implementation, use more sophisticated analysis
    return complaints[0] || 'none';
  }

  private generateImprovementSuggestion(feedback: UserFeedbackData[]): string {
    return 'Continue monitoring feedback patterns';
  }

  private getFeedbackAdjustmentReason(analysis: FeedbackAnalysis): string {
    return analysis.satisfactionScore < 0.6
      ? 'Adjusted based on user dissatisfaction'
      : 'Fine-tuned based on positive feedback';
  }
}

// Supporting interfaces
interface PredictionContext {
  predictionHorizonDays: number;
  dataCompleteness: number;
  seasonalEffectsPresent: boolean;
  userProfile: 'regular' | 'irregular' | 'unknown';
}

interface AdjustedInterval {
  intervals: ConfidenceInterval;
  adjustmentFactor: number;
  qualityScore: number;
  adjustmentReasoning: string[];
  confidence: number;
}

interface AccuracyHistoryData {
  recent: number[];
  overall: number[];
}

interface AccuracyAdjustedInterval {
  intervals: ConfidenceInterval;
  accuracyFactors: AccuracyFactors;
  adjustmentMultipliers: ConfidenceInterval;
  confidenceInAdjustment: 'high' | 'medium' | 'low';
}

interface AccuracyFactors {
  recentAccuracy: number;
  overallAccuracy: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  sampleSize: number;
  consistency: number;
}

interface RealtimeAdjustmentFactors {
  irregularPatternDetected: boolean;
  stressLevel: number; // 0-1
  lifestyleChangeScore: number; // 0-1
  healthStatusChange: boolean;
}

interface DynamicAdjustment {
  intervals: ConfidenceInterval;
  adjustmentFactor: number;
  triggeringFactors: string[];
  validityPeriod: number; // days
}

interface UserFeedbackData {
  satisfactionScore: number; // 0-1
  accuracyRating: number; // 0-1
  complaint?: string;
  timestamp: string;
}

interface FeedbackAdjustedInterval {
  intervals: ConfidenceInterval;
  adjustmentApplied: boolean;
  feedbackAnalysis?: FeedbackAnalysis;
  adjustment?: FeedbackAdjustment;
  userSatisfactionScore?: number;
  reason?: string;
}

interface FeedbackAnalysis {
  satisfactionScore: number;
  averageAccuracyRating: number;
  commonComplaint: string;
  improvementSuggestion: string;
}

interface FeedbackAdjustment {
  factor: number;
  reason: string;
  confidence: number;
}

export default IntervalAdjuster;
