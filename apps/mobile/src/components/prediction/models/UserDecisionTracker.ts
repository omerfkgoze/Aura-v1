import {
  UserDecision,
  DecisionRegret,
  DecisionSupport,
  RegretAnalysisInsights,
} from '@aura/shared-types/prediction';
import { DecisionRegretAnalyzer } from './DecisionRegretAnalyzer';

/**
 * User Decision Outcome Tracking System
 *
 * Tracks user decisions made based on predictions to enable regret analysis
 * and decision support recommendations. Maintains complete privacy by storing
 * all data locally with encryption.
 *
 * Features:
 * - Privacy-preserving decision outcome tracking
 * - Automatic decision categorization and impact assessment
 * - Real-time decision quality feedback
 * - Learning-based decision support
 */
export class UserDecisionTracker {
  private readonly regretAnalyzer: DecisionRegretAnalyzer;
  private readonly MAX_DECISION_HISTORY = 100; // Limit storage for performance

  constructor() {
    this.regretAnalyzer = new DecisionRegretAnalyzer();
  }

  /**
   * Record a new decision made based on prediction
   */
  recordDecision(decisionData: {
    decisionType: 'planning' | 'protection' | 'fertility' | 'health';
    predictionUsed: {
      date: string;
      confidenceLevel: number;
      probabilityEstimate: number;
    };
    contextFactors: {
      timeHorizon: number;
      stakesLevel: 'low' | 'medium' | 'high';
      alternativesAvailable: boolean;
      externalPressure: number;
    };
  }): UserDecision {
    const decision: UserDecision = {
      id: this.generateDecisionId(),
      timestamp: new Date().toISOString(),
      decisionType: decisionData.decisionType,
      predictionUsed: decisionData.predictionUsed,
      actualOutcome: {
        date: '', // Will be filled when outcome is known
        wasCorrect: false,
        errorDays: 0,
        consequenceLevel: 'low',
      },
      regretMetrics: {
        anticipatedRegret: this.calculateAnticipatedRegret(decisionData),
        experiencedRegret: 0, // Will be calculated when outcome is known
        regretIntensity: 0,
        learningValue: 0,
      },
      contextFactors: decisionData.contextFactors,
    };

    return decision;
  }

  /**
   * Update decision with actual outcome information
   */
  updateDecisionOutcome(
    decisionId: string,
    outcome: {
      actualDate: string;
      predictionDate: string;
      consequenceLevel?: 'low' | 'medium' | 'high';
    },
    existingDecisions: UserDecision[]
  ): UserDecision | null {
    const decision = existingDecisions.find(d => d.id === decisionId);
    if (!decision) return null;

    const predictionDate = new Date(outcome.predictionDate);
    const actualDate = new Date(outcome.actualDate);
    const errorDays = Math.floor(
      (actualDate.getTime() - predictionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Update outcome information
    decision.actualOutcome = {
      date: outcome.actualDate,
      wasCorrect: Math.abs(errorDays) <= 1, // Within 1 day tolerance
      errorDays,
      consequenceLevel:
        outcome.consequenceLevel || this.assessConsequenceLevel(decision, errorDays),
    };

    // Calculate experienced regret now that we know the outcome
    decision.regretMetrics.experiencedRegret = this.calculateExperiencedRegret(decision);
    decision.regretMetrics.regretIntensity = this.calculateRegretIntensity(decision);
    decision.regretMetrics.learningValue = this.calculateLearningValue(decision, existingDecisions);

    return decision;
  }

  /**
   * Calculate anticipated regret before outcome is known
   */
  private calculateAnticipatedRegret(decisionData: {
    decisionType: 'planning' | 'protection' | 'fertility' | 'health';
    predictionUsed: {
      confidenceLevel: number;
      probabilityEstimate: number;
    };
    contextFactors: {
      stakesLevel: 'low' | 'medium' | 'high';
      timeHorizon: number;
      alternativesAvailable: boolean;
    };
  }): number {
    // Base anticipated regret based on uncertainty
    const uncertaintyRegret = 1 - decisionData.predictionUsed.confidenceLevel;

    // Stakes amplify anticipated regret
    const stakesMultiplier =
      decisionData.contextFactors.stakesLevel === 'low'
        ? 0.7
        : decisionData.contextFactors.stakesLevel === 'medium'
          ? 1.0
          : 1.3;

    // Short time horizons increase anxiety and anticipated regret
    const timeHorizonFactor = Math.exp(-decisionData.contextFactors.timeHorizon / 5);

    // Lack of alternatives increases anticipated regret
    const alternativesFactor = decisionData.contextFactors.alternativesAvailable ? 0.9 : 1.2;

    const anticipatedRegret =
      uncertaintyRegret * stakesMultiplier * (1 + timeHorizonFactor) * alternativesFactor;

    return Math.max(0, Math.min(1, anticipatedRegret));
  }

  /**
   * Calculate experienced regret after outcome is known
   */
  private calculateExperiencedRegret(decision: UserDecision): number {
    // Use the regret analyzer to calculate the actual regret score
    const regretAnalysis = this.regretAnalyzer.calculateDecisionRegret(decision);
    return regretAnalysis.regretScore;
  }

  /**
   * Calculate regret intensity (how strongly the regret is felt)
   */
  private calculateRegretIntensity(decision: UserDecision): number {
    const baseRegret = decision.regretMetrics.experiencedRegret;

    // Intensity factors
    const consequenceMultiplier =
      decision.actualOutcome.consequenceLevel === 'low'
        ? 0.8
        : decision.actualOutcome.consequenceLevel === 'medium'
          ? 1.0
          : 1.4;

    // Surprise factor: unexpected outcomes feel more intense
    const expectedCorrectness = decision.predictionUsed.probabilityEstimate;
    const actualCorrectness = decision.actualOutcome.wasCorrect ? 1 : 0;
    const surpriseFactor = 1 + Math.abs(expectedCorrectness - actualCorrectness);

    // Stakes amplify emotional intensity
    const stakesIntensity =
      decision.contextFactors.stakesLevel === 'low'
        ? 0.9
        : decision.contextFactors.stakesLevel === 'medium'
          ? 1.0
          : 1.2;

    const intensity = baseRegret * consequenceMultiplier * surpriseFactor * stakesIntensity;

    return Math.max(0, Math.min(1, intensity));
  }

  /**
   * Calculate learning value of this decision experience
   */
  private calculateLearningValue(
    decision: UserDecision,
    existingDecisions: UserDecision[]
  ): number {
    // Novel situations have higher learning value
    const noveltyValue = this.assessNoveltyValue(decision, existingDecisions);

    // Surprising outcomes have higher learning value
    const surpriseValue = Math.abs(
      decision.predictionUsed.probabilityEstimate - (decision.actualOutcome.wasCorrect ? 1 : 0)
    );

    // High-stakes decisions provide more valuable learning
    const stakesValue =
      decision.contextFactors.stakesLevel === 'low'
        ? 0.6
        : decision.contextFactors.stakesLevel === 'medium'
          ? 0.8
          : 1.0;

    // Regret intensity contributes to memorability and learning
    const regretValue = decision.regretMetrics.regretIntensity * 0.7;

    const learningValue = (noveltyValue + surpriseValue + stakesValue + regretValue) / 4;

    return Math.max(0, Math.min(1, learningValue));
  }

  /**
   * Assess how novel this decision situation is compared to previous decisions
   */
  private assessNoveltyValue(decision: UserDecision, existingDecisions: UserDecision[]): number {
    if (existingDecisions.length === 0) return 1.0;

    // Find similar decisions
    const similarDecisions = existingDecisions.filter(
      d =>
        d.decisionType === decision.decisionType &&
        Math.abs(d.predictionUsed.confidenceLevel - decision.predictionUsed.confidenceLevel) <
          0.2 &&
        d.contextFactors.stakesLevel === decision.contextFactors.stakesLevel
    );

    // Novelty is inverse of similarity
    const noveltyScore = 1 - similarDecisions.length / Math.max(1, existingDecisions.length);

    return Math.max(0.1, Math.min(1, noveltyScore)); // Minimum novelty of 0.1
  }

  /**
   * Assess consequence level based on decision context and prediction error
   */
  private assessConsequenceLevel(
    decision: UserDecision,
    errorDays: number
  ): 'low' | 'medium' | 'high' {
    const absError = Math.abs(errorDays);
    const stakesLevel = decision.contextFactors.stakesLevel;
    const decisionType = decision.decisionType;

    // Base consequence on prediction error
    let baseConsequence: 'low' | 'medium' | 'high' = 'low';
    if (absError <= 1) baseConsequence = 'low';
    else if (absError <= 3) baseConsequence = 'medium';
    else baseConsequence = 'high';

    // Adjust based on stakes and decision type
    if (stakesLevel === 'high' && baseConsequence !== 'low') {
      return 'high';
    }

    if (decisionType === 'health' && absError > 2) {
      return 'high';
    }

    if (decisionType === 'fertility' && absError > 1) {
      return baseConsequence === 'low' ? 'medium' : 'high';
    }

    return baseConsequence;
  }

  /**
   * Generate decision tracking report for user insight
   */
  generateDecisionTrackingReport(decisions: UserDecision[]): {
    totalDecisions: number;
    decisionAccuracy: number;
    averageRegret: number;
    learningProgress: number;
    riskProfile: string;
    recommendations: string[];
  } {
    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        decisionAccuracy: 0,
        averageRegret: 0,
        learningProgress: 0,
        riskProfile: 'Unknown',
        recommendations: [
          'Start making decisions based on predictions to build your decision profile',
        ],
      };
    }

    const totalDecisions = decisions.length;
    const correctDecisions = decisions.filter(d => d.actualOutcome.wasCorrect).length;
    const decisionAccuracy = correctDecisions / totalDecisions;

    const averageRegret =
      decisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) / decisions.length;

    const learningProgress = this.calculateLearningProgress(decisions);
    const riskProfile = this.assessRiskProfile(decisions);
    const recommendations = this.generateDecisionRecommendations(decisions);

    return {
      totalDecisions,
      decisionAccuracy,
      averageRegret,
      learningProgress,
      riskProfile,
      recommendations,
    };
  }

  /**
   * Calculate overall learning progress from decision history
   */
  private calculateLearningProgress(decisions: UserDecision[]): number {
    if (decisions.length < 3) return 0;

    // Sort by timestamp
    const sortedDecisions = decisions.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compare recent vs earlier performance
    const recentDecisions = sortedDecisions.slice(-Math.floor(decisions.length / 3));
    const earlierDecisions = sortedDecisions.slice(0, Math.floor(decisions.length / 3));

    const recentAccuracy =
      recentDecisions.filter(d => d.actualOutcome.wasCorrect).length / recentDecisions.length;
    const earlierAccuracy =
      earlierDecisions.filter(d => d.actualOutcome.wasCorrect).length / earlierDecisions.length;

    const recentRegret =
      recentDecisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
      recentDecisions.length;
    const earlierRegret =
      earlierDecisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
      earlierDecisions.length;

    // Learning progress = improvement in accuracy + reduction in regret
    const accuracyImprovement = Math.max(0, recentAccuracy - earlierAccuracy);
    const regretReduction = Math.max(0, earlierRegret - recentRegret);

    return Math.min(1, (accuracyImprovement + regretReduction) / 2);
  }

  /**
   * Assess user's risk profile based on decision patterns
   */
  private assessRiskProfile(decisions: UserDecision[]): string {
    const avgConfidence =
      decisions.reduce((sum, d) => sum + d.predictionUsed.confidenceLevel, 0) / decisions.length;
    const highStakesRatio =
      decisions.filter(d => d.contextFactors.stakesLevel === 'high').length / decisions.length;
    const avgRegret =
      decisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) / decisions.length;

    if (avgConfidence > 0.8 && highStakesRatio > 0.3) {
      return avgRegret > 0.5 ? 'Risk-seeking with high regret' : 'Confident risk-taker';
    } else if (avgConfidence < 0.6 && avgRegret < 0.3) {
      return 'Conservative and careful';
    } else if (avgRegret > 0.6) {
      return 'Learning from mistakes';
    } else {
      return 'Balanced decision-maker';
    }
  }

  /**
   * Generate personalized decision recommendations
   */
  private generateDecisionRecommendations(decisions: UserDecision[]): string[] {
    const recommendations: string[] = [];
    const avgRegret =
      decisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) / decisions.length;
    const avgConfidence =
      decisions.reduce((sum, d) => sum + d.predictionUsed.confidenceLevel, 0) / decisions.length;

    if (avgRegret > 0.6) {
      recommendations.push('Consider using lower confidence levels to reduce regret');
      recommendations.push('Add buffer time to your predictions for important decisions');
    }

    if (avgConfidence > 0.8) {
      recommendations.push('Be cautious of overconfidence - consider alternative scenarios');
      recommendations.push('Use 80% confidence intervals instead of 95% for planning');
    }

    const highStakesRegret =
      decisions
        .filter(d => d.contextFactors.stakesLevel === 'high')
        .reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
      decisions.filter(d => d.contextFactors.stakesLevel === 'high').length;

    if (highStakesRegret > 0.5) {
      recommendations.push('Develop backup plans for high-stakes decisions');
      recommendations.push('Seek additional information for important decisions');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your decision patterns look healthy - keep up the good work!');
      recommendations.push('Consider tracking more decisions to improve your prediction skills');
    }

    return recommendations;
  }

  /**
   * Clean up old decision records to maintain performance
   */
  pruneDecisionHistory(decisions: UserDecision[]): UserDecision[] {
    if (decisions.length <= this.MAX_DECISION_HISTORY) {
      return decisions;
    }

    // Sort by timestamp and learning value, keeping most recent and most valuable
    const sortedByTime = decisions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const recentDecisions = sortedByTime.slice(0, Math.floor(this.MAX_DECISION_HISTORY * 0.7));
    const remainingDecisions = sortedByTime.slice(Math.floor(this.MAX_DECISION_HISTORY * 0.7));

    // Keep highest learning value decisions from remaining
    const valuableDecisions = remainingDecisions
      .sort((a, b) => b.regretMetrics.learningValue - a.regretMetrics.learningValue)
      .slice(0, this.MAX_DECISION_HISTORY - recentDecisions.length);

    return [...recentDecisions, ...valuableDecisions];
  }

  /**
   * Generate unique decision ID
   */
  private generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export decision data for analysis (privacy-safe)
   */
  exportDecisionInsights(decisions: UserDecision[]): {
    decisionPatterns: {
      preferredConfidenceLevel: number;
      riskTolerance: string;
      learningRate: number;
    };
    performanceMetrics: {
      accuracy: number;
      averageRegret: number;
      improvementTrend: number;
    };
    recommendations: string[];
  } {
    if (decisions.length === 0) {
      return {
        decisionPatterns: {
          preferredConfidenceLevel: 0.7,
          riskTolerance: 'Unknown',
          learningRate: 0,
        },
        performanceMetrics: {
          accuracy: 0,
          averageRegret: 0,
          improvementTrend: 0,
        },
        recommendations: ['Start using predictions to build decision insights'],
      };
    }

    const preferredConfidenceLevel =
      decisions.reduce((sum, d) => sum + d.predictionUsed.confidenceLevel, 0) / decisions.length;
    const riskTolerance = this.assessRiskProfile(decisions);
    const learningRate = this.calculateLearningProgress(decisions);

    const accuracy = decisions.filter(d => d.actualOutcome.wasCorrect).length / decisions.length;
    const averageRegret =
      decisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) / decisions.length;
    const improvementTrend = this.calculateLearningProgress(decisions);

    const recommendations = this.generateDecisionRecommendations(decisions);

    return {
      decisionPatterns: {
        preferredConfidenceLevel,
        riskTolerance,
        learningRate,
      },
      performanceMetrics: {
        accuracy,
        averageRegret,
        improvementTrend,
      },
      recommendations,
    };
  }
}
