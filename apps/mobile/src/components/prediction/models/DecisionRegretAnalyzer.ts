import {
  UserDecision,
  DecisionRegret,
  DecisionSupport,
  RegretAnalysisInsights,
  RegretVisualization,
} from '@aura/shared-types';

/**
 * Decision Regret Analysis Framework
 *
 * Analyzes user decisions based on prediction reliability to help users understand
 * the impact of prediction uncertainty on their decision-making process.
 *
 * Features:
 * - Decision regret calculation using prospect theory
 * - Personalized decision support recommendations
 * - Learning progress tracking and optimization
 * - Risk tolerance estimation and adaptation
 */
export class DecisionRegretAnalyzer {
  private readonly REGRET_DECAY_FACTOR = 0.85; // How quickly regret memories fade
  private readonly LEARNING_RATE = 0.15; // How quickly users adapt their behavior
  private readonly CONFIDENCE_SENSITIVITY = 0.3; // How much confidence affects regret

  /**
   * Calculate decision regret score for a specific decision outcome
   */
  calculateDecisionRegret(decision: UserDecision): DecisionRegret {
    const baseRegret = this.calculateBaseRegret(decision);
    const contextualRegret = this.applyContextualFactors(baseRegret, decision);
    const temporalRegret = this.applyTemporalDecay(contextualRegret, decision);

    const regretScore = Math.max(0, Math.min(1, temporalRegret));

    return {
      regretScore,
      decisionType: decision.decisionType,
      confidenceUsed: decision.predictionUsed.confidenceLevel,
      actualOutcome: this.classifyOutcome(decision),
      impactLevel: decision.actualOutcome.consequenceLevel,
      recommendations: this.generateRegretBasedRecommendations(decision, regretScore),
    };
  }

  /**
   * Calculate base regret using prospect theory principles
   */
  private calculateBaseRegret(decision: UserDecision): number {
    const predictionError = Math.abs(decision.actualOutcome.errorDays);
    const confidenceLevel = decision.predictionUsed.confidenceLevel;
    const probabilityEstimate = decision.predictionUsed.probabilityEstimate;

    // Prospect theory: losses loom larger than gains
    const lossAversion = decision.actualOutcome.wasCorrect ? 1.0 : 2.5;

    // Overconfidence penalty: higher confidence with wrong outcome = higher regret
    const overconfidencePenalty = decision.actualOutcome.wasCorrect
      ? 0
      : Math.pow(confidenceLevel, 2) * 0.4;

    // Prediction error impact with diminishing returns
    const errorImpact = 1 - Math.exp(-predictionError / 3);

    // Probability miscalibration regret
    const expectedCorrectness = probabilityEstimate;
    const actualCorrectness = decision.actualOutcome.wasCorrect ? 1 : 0;
    const calibrationRegret = Math.pow(expectedCorrectness - actualCorrectness, 2);

    return (errorImpact + overconfidencePenalty + calibrationRegret) * lossAversion * 0.33;
  }

  /**
   * Apply contextual factors that modify regret intensity
   */
  private applyContextualFactors(baseRegret: number, decision: UserDecision): number {
    const context = decision.contextFactors;
    let modifiedRegret = baseRegret;

    // Stakes multiplier: higher stakes = higher potential regret
    const stakesMultiplier =
      context.stakesLevel === 'low' ? 0.7 : context.stakesLevel === 'medium' ? 1.0 : 1.4;

    // Time horizon effect: shorter horizons = higher urgency regret
    const timeHorizonFactor = Math.exp(-context.timeHorizon / 7); // 7-day decay

    // Alternative availability: fewer alternatives = higher regret
    const alternativesFactor = context.alternativesAvailable ? 0.8 : 1.2;

    // External pressure amplifies regret
    const pressureFactor = 1 + context.externalPressure * 0.3;

    modifiedRegret *=
      stakesMultiplier * (1 + timeHorizonFactor) * alternativesFactor * pressureFactor;

    return Math.max(0, Math.min(1, modifiedRegret));
  }

  /**
   * Apply temporal decay to regret memories
   */
  private applyTemporalDecay(regret: number, decision: UserDecision): number {
    const daysSinceDecision = Math.floor(
      (Date.now() - new Date(decision.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    const decayFactor = Math.pow(this.REGRET_DECAY_FACTOR, daysSinceDecision / 30); // Monthly decay
    return regret * decayFactor;
  }

  /**
   * Classify decision outcome for regret analysis
   */
  private classifyOutcome(decision: UserDecision): 'correct' | 'early' | 'late' {
    if (decision.actualOutcome.wasCorrect) return 'correct';
    return decision.actualOutcome.errorDays > 0 ? 'late' : 'early';
  }

  /**
   * Generate personalized recommendations based on regret pattern
   */
  private generateRegretBasedRecommendations(
    decision: UserDecision,
    regretScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (regretScore > 0.7) {
      recommendations.push('Consider using wider confidence intervals for high-stakes decisions');
      recommendations.push('Add buffer time when planning around predictions');
    }

    if (decision.predictionUsed.confidenceLevel > 0.8 && !decision.actualOutcome.wasCorrect) {
      recommendations.push('Be cautious of overconfidence in predictions');
      recommendations.push('Consider alternative scenarios even with high confidence');
    }

    if (decision.contextFactors.stakesLevel === 'high' && regretScore > 0.5) {
      recommendations.push('Develop backup plans for high-stakes decisions');
      recommendations.push('Seek additional data sources for important decisions');
    }

    return recommendations;
  }

  /**
   * Analyze complete decision history for insights and learning
   */
  analyzeDecisionHistory(decisions: UserDecision[]): RegretAnalysisInsights {
    if (decisions.length === 0) {
      return this.createEmptyInsights();
    }

    const regretScores = decisions.map(d => this.calculateDecisionRegret(d));
    const overallRegretScore = this.calculateWeightedRegretScore(regretScores, decisions);

    return {
      overallRegretScore,
      regretTrends: this.analyzeRegretTrends(decisions, regretScores),
      learningProgress: this.assessLearningProgress(decisions, regretScores),
      personalizedRecommendations: this.generatePersonalizedRecommendations(
        decisions,
        regretScores
      ),
      riskTolerance: this.estimateRiskTolerance(decisions, regretScores),
    };
  }

  /**
   * Calculate weighted regret score with temporal weighting
   */
  private calculateWeightedRegretScore(
    regretScores: DecisionRegret[],
    decisions: UserDecision[]
  ): number {
    if (regretScores.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    regretScores.forEach((regret, index) => {
      const decision = decisions[index];
      const daysSince = Math.floor(
        (Date.now() - new Date(decision.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Recent decisions have higher weight
      const weight = Math.exp(-daysSince / 90); // 90-day decay
      weightedSum += regret.regretScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Analyze regret trends across different dimensions
   */
  private analyzeRegretTrends(decisions: UserDecision[], regretScores: DecisionRegret[]) {
    const byDecisionType: Record<string, number> = {};
    const byConfidenceLevel: Record<string, number> = {};
    const byTimeHorizon: Record<string, number> = {};

    // Group by decision type
    decisions.forEach((decision, index) => {
      const regret = regretScores[index].regretScore;

      if (!byDecisionType[decision.decisionType]) {
        byDecisionType[decision.decisionType] = 0;
      }
      byDecisionType[decision.decisionType] = (byDecisionType[decision.decisionType] + regret) / 2;

      // Group by confidence level ranges
      const confidenceRange =
        decision.predictionUsed.confidenceLevel < 0.5
          ? 'low'
          : decision.predictionUsed.confidenceLevel < 0.8
            ? 'medium'
            : 'high';
      if (!byConfidenceLevel[confidenceRange]) {
        byConfidenceLevel[confidenceRange] = 0;
      }
      byConfidenceLevel[confidenceRange] = (byConfidenceLevel[confidenceRange] + regret) / 2;

      // Group by time horizon
      const horizonRange =
        decision.contextFactors.timeHorizon < 3
          ? 'short'
          : decision.contextFactors.timeHorizon < 7
            ? 'medium'
            : 'long';
      if (!byTimeHorizon[horizonRange]) {
        byTimeHorizon[horizonRange] = 0;
      }
      byTimeHorizon[horizonRange] = (byTimeHorizon[horizonRange] + regret) / 2;
    });

    return { byDecisionType, byConfidenceLevel, byTimeHorizon };
  }

  /**
   * Assess learning progress and improvement over time
   */
  private assessLearningProgress(decisions: UserDecision[], regretScores: DecisionRegret[]) {
    if (decisions.length < 2) {
      return {
        regretReduction: 0,
        decisionImprovement: 0,
        optimalConfidenceRange: [0.6, 0.8] as [number, number],
      };
    }

    // Sort by timestamp
    const sortedDecisions = decisions
      .map((d, i) => ({ decision: d, regret: regretScores[i] }))
      .sort(
        (a, b) =>
          new Date(a.decision.timestamp).getTime() - new Date(b.decision.timestamp).getTime()
      );

    // Calculate regret trend
    const recentRegret =
      sortedDecisions.slice(-5).reduce((sum, item) => sum + item.regret.regretScore, 0) / 5;
    const earlierRegret =
      sortedDecisions.slice(0, 5).reduce((sum, item) => sum + item.regret.regretScore, 0) / 5;
    const regretReduction = Math.max(0, earlierRegret - recentRegret);

    // Calculate decision improvement
    const recentAccuracy =
      sortedDecisions
        .slice(-5)
        .reduce((sum, item) => sum + (item.decision.actualOutcome.wasCorrect ? 1 : 0), 0) / 5;
    const earlierAccuracy =
      sortedDecisions
        .slice(0, 5)
        .reduce((sum, item) => sum + (item.decision.actualOutcome.wasCorrect ? 1 : 0), 0) / 5;
    const decisionImprovement = recentAccuracy - earlierAccuracy;

    // Find optimal confidence range
    const optimalConfidenceRange = this.findOptimalConfidenceRange(sortedDecisions);

    return {
      regretReduction,
      decisionImprovement,
      optimalConfidenceRange,
    };
  }

  /**
   * Find the confidence range that minimizes regret
   */
  private findOptimalConfidenceRange(
    sortedDecisions: Array<{ decision: UserDecision; regret: DecisionRegret }>
  ): [number, number] {
    const confidenceRanges = [
      [0.5, 0.6],
      [0.6, 0.7],
      [0.7, 0.8],
      [0.8, 0.9],
      [0.9, 1.0],
    ];

    let bestRange: [number, number] = [0.6, 0.8];
    let lowestRegret = Infinity;

    confidenceRanges.forEach(([min, max]) => {
      const decisionsInRange = sortedDecisions.filter(
        item =>
          item.decision.predictionUsed.confidenceLevel >= min &&
          item.decision.predictionUsed.confidenceLevel < max
      );

      if (decisionsInRange.length > 0) {
        const avgRegret =
          decisionsInRange.reduce((sum, item) => sum + item.regret.regretScore, 0) /
          decisionsInRange.length;
        if (avgRegret < lowestRegret) {
          lowestRegret = avgRegret;
          bestRange = [min, max];
        }
      }
    });

    return bestRange;
  }

  /**
   * Generate personalized recommendations based on decision patterns
   */
  private generatePersonalizedRecommendations(
    decisions: UserDecision[],
    regretScores: DecisionRegret[]
  ): DecisionSupport[] {
    const recommendations: DecisionSupport[] = [];

    // High regret with high confidence pattern
    const highConfidenceRegret = decisions.filter(
      (d, i) => d.predictionUsed.confidenceLevel > 0.8 && regretScores[i].regretScore > 0.6
    );

    if (highConfidenceRegret.length > 2) {
      recommendations.push({
        recommendationType: 'confidence_adjustment',
        message:
          'You tend to experience regret when using high confidence predictions. Consider being more cautious.',
        actionItems: [
          'Use 80% confidence intervals instead of 95% for planning',
          'Always consider alternative scenarios',
          'Add buffer time to high-confidence predictions',
        ],
        confidenceThreshold: 0.8,
        expectedRegretReduction: 0.3,
        applicableScenarios: ['planning', 'protection'],
      });
    }

    // Short time horizon high regret pattern
    const shortHorizonRegret = decisions.filter(
      (d, i) => d.contextFactors.timeHorizon < 3 && regretScores[i].regretScore > 0.5
    );

    if (shortHorizonRegret.length > 1) {
      recommendations.push({
        recommendationType: 'timing_buffer',
        message:
          'Short-term decisions based on predictions often lead to regret. Consider longer planning horizons.',
        actionItems: [
          'Plan at least 5 days ahead when possible',
          'Use wider confidence intervals for urgent decisions',
          'Develop contingency plans for time-sensitive decisions',
        ],
        confidenceThreshold: 0.6,
        expectedRegretReduction: 0.25,
        applicableScenarios: ['planning', 'fertility'],
      });
    }

    return recommendations;
  }

  /**
   * Estimate user's risk tolerance based on decision patterns
   */
  private estimateRiskTolerance(decisions: UserDecision[], regretScores: DecisionRegret[]) {
    if (decisions.length < 3) {
      return {
        estimatedLevel: 'moderate' as const,
        consistency: 0,
        adaptationRate: 0,
      };
    }

    // Analyze confidence level preferences
    const avgConfidenceUsed =
      decisions.reduce((sum, d) => sum + d.predictionUsed.confidenceLevel, 0) / decisions.length;
    const confidenceVariability = this.calculateVariability(
      decisions.map(d => d.predictionUsed.confidenceLevel)
    );

    // Analyze stakes level preferences
    const highStakesDecisions = decisions.filter(
      d => d.contextFactors.stakesLevel === 'high'
    ).length;
    const riskSeekingScore = highStakesDecisions / decisions.length;

    // Estimate risk tolerance level
    const estimatedLevel: 'conservative' | 'moderate' | 'aggressive' =
      avgConfidenceUsed > 0.8 && riskSeekingScore > 0.3
        ? 'aggressive'
        : avgConfidenceUsed < 0.6 || riskSeekingScore < 0.1
          ? 'conservative'
          : 'moderate';

    // Calculate consistency (inverse of variability)
    const consistency = Math.max(0, 1 - confidenceVariability);

    // Calculate adaptation rate based on regret response
    const adaptationRate = this.calculateAdaptationRate(decisions, regretScores);

    return {
      estimatedLevel,
      consistency,
      adaptationRate,
    };
  }

  /**
   * Calculate how quickly user adapts behavior after regretful decisions
   */
  private calculateAdaptationRate(
    decisions: UserDecision[],
    regretScores: DecisionRegret[]
  ): number {
    const sortedDecisions = decisions
      .map((d, i) => ({ decision: d, regret: regretScores[i] }))
      .sort(
        (a, b) =>
          new Date(a.decision.timestamp).getTime() - new Date(b.decision.timestamp).getTime()
      );

    let adaptationSum = 0;
    let adaptationCount = 0;

    for (let i = 1; i < sortedDecisions.length; i++) {
      const prevRegret = sortedDecisions[i - 1].regret.regretScore;
      const currConfidence = sortedDecisions[i].decision.predictionUsed.confidenceLevel;
      const prevConfidence = sortedDecisions[i - 1].decision.predictionUsed.confidenceLevel;

      if (prevRegret > 0.5) {
        // If previous decision had high regret, adaptation = confidence reduction
        const confidenceAdjustment = Math.max(0, prevConfidence - currConfidence);
        adaptationSum += confidenceAdjustment / prevRegret;
        adaptationCount++;
      }
    }

    return adaptationCount > 0 ? Math.min(1, adaptationSum / adaptationCount) : 0;
  }

  /**
   * Calculate coefficient of variation for a series of values
   */
  private calculateVariability(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Create empty insights for users with no decision history
   */
  private createEmptyInsights(): RegretAnalysisInsights {
    return {
      overallRegretScore: 0,
      regretTrends: {
        byDecisionType: {},
        byConfidenceLevel: {},
        byTimeHorizon: {},
      },
      learningProgress: {
        regretReduction: 0,
        decisionImprovement: 0,
        optimalConfidenceRange: [0.6, 0.8],
      },
      personalizedRecommendations: [],
      riskTolerance: {
        estimatedLevel: 'moderate',
        consistency: 0,
        adaptationRate: 0,
      },
    };
  }

  /**
   * Generate visualization data for regret analysis
   */
  generateRegretVisualization(decisions: UserDecision[]): RegretVisualization {
    if (decisions.length === 0) {
      return {
        regretHistory: { dates: [], regretScores: [], decisionTypes: [] },
        confidenceOptimization: {
          confidenceLevels: [],
          expectedRegret: [],
          optimalRange: [0.6, 0.8],
        },
        learningCurve: { timePoints: [], cumulativeRegret: [], improvementRate: [] },
      };
    }

    const regretScores = decisions.map(d => this.calculateDecisionRegret(d));
    const sortedData = decisions
      .map((d, i) => ({ decision: d, regret: regretScores[i] }))
      .sort(
        (a, b) =>
          new Date(a.decision.timestamp).getTime() - new Date(b.decision.timestamp).getTime()
      );

    return {
      regretHistory: {
        dates: sortedData.map(item => item.decision.timestamp),
        regretScores: sortedData.map(item => item.regret.regretScore),
        decisionTypes: sortedData.map(item => item.decision.decisionType),
      },
      confidenceOptimization: this.generateConfidenceOptimization(decisions, regretScores),
      learningCurve: this.generateLearningCurve(sortedData),
    };
  }

  /**
   * Generate confidence level optimization data
   */
  private generateConfidenceOptimization(
    decisions: UserDecision[],
    regretScores: DecisionRegret[]
  ) {
    const confidenceLevels = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.1);
    const expectedRegret: number[] = [];

    confidenceLevels.forEach(level => {
      const decisionsAtLevel = decisions.filter(
        d => Math.abs(d.predictionUsed.confidenceLevel - level) < 0.05
      );

      if (decisionsAtLevel.length > 0) {
        const avgRegret =
          decisionsAtLevel.reduce((sum, d, i) => {
            const regretIndex = decisions.indexOf(d);
            return sum + regretScores[regretIndex].regretScore;
          }, 0) / decisionsAtLevel.length;
        expectedRegret.push(avgRegret);
      } else {
        expectedRegret.push(0);
      }
    });

    const optimalIndex = expectedRegret.indexOf(Math.min(...expectedRegret.filter(r => r > 0)));
    const optimalRange: [number, number] = [
      Math.max(0.1, confidenceLevels[optimalIndex] - 0.1),
      Math.min(1.0, confidenceLevels[optimalIndex] + 0.1),
    ];

    return { confidenceLevels, expectedRegret, optimalRange };
  }

  /**
   * Generate learning curve data showing cumulative regret and improvement over time
   */
  private generateLearningCurve(
    sortedData: Array<{ decision: UserDecision; regret: DecisionRegret }>
  ) {
    const timePoints: string[] = [];
    const cumulativeRegret: number[] = [];
    const improvementRate: number[] = [];

    let runningRegret = 0;
    const windowSize = 5; // Moving average window

    sortedData.forEach((item, index) => {
      runningRegret += item.regret.regretScore;
      timePoints.push(item.decision.timestamp);
      cumulativeRegret.push(runningRegret / (index + 1));

      if (index >= windowSize) {
        const recentAvg =
          sortedData
            .slice(index - windowSize + 1, index + 1)
            .reduce((sum, data) => sum + data.regret.regretScore, 0) / windowSize;
        const olderAvg =
          sortedData
            .slice(Math.max(0, index - windowSize * 2), index - windowSize + 1)
            .reduce((sum, data) => sum + data.regret.regretScore, 0) / windowSize;

        improvementRate.push(Math.max(0, olderAvg - recentAvg));
      } else {
        improvementRate.push(0);
      }
    });

    return { timePoints, cumulativeRegret, improvementRate };
  }
}
