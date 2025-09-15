import {
  UserDecision,
  DecisionRegret,
  DecisionSupport,
  RegretAnalysisInsights,
} from '@aura/shared-types';

/**
 * Confidence Level Regret Analysis System
 *
 * Analyzes regret patterns across different confidence levels to help users
 * understand optimal confidence thresholds for different types of decisions.
 *
 * Features:
 * - Confidence-specific regret pattern analysis
 * - Optimal confidence range identification
 * - Confidence calibration recommendations
 * - Dynamic confidence adjustment suggestions
 */
export class ConfidenceLevelRegretAnalyzer {
  private readonly CONFIDENCE_BINS = [
    { min: 0.0, max: 0.3, label: 'Very Low Confidence' },
    { min: 0.3, max: 0.5, label: 'Low Confidence' },
    { min: 0.5, max: 0.7, label: 'Medium Confidence' },
    { min: 0.7, max: 0.9, label: 'High Confidence' },
    { min: 0.9, max: 1.0, label: 'Very High Confidence' },
  ];

  /**
   * Analyze regret patterns across different confidence levels
   */
  analyzeConfidenceRegretPatterns(decisions: UserDecision[]): ConfidenceRegretAnalysis {
    if (decisions.length === 0) {
      return this.createEmptyAnalysis();
    }

    const binAnalysis = this.analyzeBinnedConfidenceRegret(decisions);
    const optimalRanges = this.identifyOptimalConfidenceRanges(decisions);
    const calibrationIssues = this.identifyCalibrationIssues(decisions);
    const recommendations = this.generateConfidenceRecommendations(
      binAnalysis,
      optimalRanges,
      calibrationIssues
    );

    return {
      binAnalysis,
      optimalRanges,
      calibrationIssues,
      recommendations,
      overallInsights: this.generateOverallInsights(binAnalysis, optimalRanges),
    };
  }

  /**
   * Analyze regret for each confidence bin
   */
  private analyzeBinnedConfidenceRegret(decisions: UserDecision[]): ConfidenceBinAnalysis[] {
    return this.CONFIDENCE_BINS.map(bin => {
      const decisionsInBin = decisions.filter(
        d =>
          d.predictionUsed.confidenceLevel >= bin.min && d.predictionUsed.confidenceLevel < bin.max
      );

      if (decisionsInBin.length === 0) {
        return {
          confidenceRange: bin,
          sampleSize: 0,
          averageRegret: 0,
          regretVariability: 0,
          accuracy: 0,
          regretByDecisionType: {},
          regretByStakesLevel: {},
          regretTrend: 'stable',
          recommendedAdjustment: 'none',
        };
      }

      const regretScores = decisionsInBin.map(d => d.regretMetrics.experiencedRegret);
      const averageRegret = regretScores.reduce((sum, r) => sum + r, 0) / regretScores.length;
      const regretVariability = this.calculateVariability(regretScores);

      const accuracy =
        decisionsInBin.filter(d => d.actualOutcome.wasCorrect).length / decisionsInBin.length;

      const regretByDecisionType = this.analyzeRegretByCategory(
        decisionsInBin,
        d => d.decisionType
      );

      const regretByStakesLevel = this.analyzeRegretByCategory(
        decisionsInBin,
        d => d.contextFactors.stakesLevel
      );

      const regretTrend = this.analyzeRegretTrend(decisionsInBin);
      const recommendedAdjustment = this.recommendConfidenceAdjustment(
        averageRegret,
        accuracy,
        bin
      );

      return {
        confidenceRange: bin,
        sampleSize: decisionsInBin.length,
        averageRegret,
        regretVariability,
        accuracy,
        regretByDecisionType,
        regretByStakesLevel,
        regretTrend,
        recommendedAdjustment,
      };
    });
  }

  /**
   * Identify optimal confidence ranges for different scenarios
   */
  private identifyOptimalConfidenceRanges(decisions: UserDecision[]): OptimalConfidenceRanges {
    const decisionTypes = ['planning', 'protection', 'fertility', 'health'] as const;
    const stakesLevels = ['low', 'medium', 'high'] as const;

    const byDecisionType: Record<string, ConfidenceRange> = {};
    const byStakesLevel: Record<string, ConfidenceRange> = {};

    // Analyze by decision type
    decisionTypes.forEach(type => {
      const typeDecisions = decisions.filter(d => d.decisionType === type);
      byDecisionType[type] = this.findOptimalRange(typeDecisions);
    });

    // Analyze by stakes level
    stakesLevels.forEach(level => {
      const levelDecisions = decisions.filter(d => d.contextFactors.stakesLevel === level);
      byStakesLevel[level] = this.findOptimalRange(levelDecisions);
    });

    const overall = this.findOptimalRange(decisions);

    return {
      overall,
      byDecisionType,
      byStakesLevel,
      contextualRecommendations: this.generateContextualRecommendations(
        byDecisionType,
        byStakesLevel
      ),
    };
  }

  /**
   * Find optimal confidence range that minimizes regret
   */
  private findOptimalRange(decisions: UserDecision[]): ConfidenceRange {
    if (decisions.length < 3) {
      return {
        min: 0.6,
        max: 0.8,
        averageRegret: 0,
        accuracy: 0,
        confidence: 'low',
      };
    }

    let bestRange = { min: 0.6, max: 0.8 };
    let lowestRegret = Infinity;
    let bestAccuracy = 0;

    // Test different ranges
    for (let min = 0.3; min <= 0.8; min += 0.1) {
      for (let max = min + 0.2; max <= 1.0; max += 0.1) {
        const rangeDecisions = decisions.filter(
          d => d.predictionUsed.confidenceLevel >= min && d.predictionUsed.confidenceLevel <= max
        );

        if (rangeDecisions.length >= 2) {
          const avgRegret =
            rangeDecisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
            rangeDecisions.length;
          const accuracy =
            rangeDecisions.filter(d => d.actualOutcome.wasCorrect).length / rangeDecisions.length;

          // Weighted score: regret (primary) + accuracy (secondary)
          const score = avgRegret - accuracy * 0.2;

          if (score < lowestRegret) {
            lowestRegret = avgRegret;
            bestAccuracy = accuracy;
            bestRange = { min, max };
          }
        }
      }
    }

    const rangeDecisions = decisions.filter(
      d =>
        d.predictionUsed.confidenceLevel >= bestRange.min &&
        d.predictionUsed.confidenceLevel <= bestRange.max
    );

    const confidence =
      rangeDecisions.length >= 5 ? 'high' : rangeDecisions.length >= 3 ? 'medium' : 'low';

    return {
      min: bestRange.min,
      max: bestRange.max,
      averageRegret: lowestRegret === Infinity ? 0 : lowestRegret,
      accuracy: bestAccuracy,
      confidence,
    };
  }

  /**
   * Identify confidence calibration issues
   */
  private identifyCalibrationIssues(decisions: UserDecision[]): CalibrationIssue[] {
    const issues: CalibrationIssue[] = [];

    // Overconfidence detection
    const highConfidenceDecisions = decisions.filter(d => d.predictionUsed.confidenceLevel > 0.8);
    if (highConfidenceDecisions.length >= 3) {
      const accuracy =
        highConfidenceDecisions.filter(d => d.actualOutcome.wasCorrect).length /
        highConfidenceDecisions.length;
      if (accuracy < 0.8) {
        issues.push({
          type: 'overconfidence',
          severity: accuracy < 0.6 ? 'high' : 'medium',
          description: `High confidence predictions (>80%) are only ${(accuracy * 100).toFixed(0)}% accurate`,
          affectedDecisions: highConfidenceDecisions.length,
          recommendedAction: 'Reduce confidence levels for similar predictions',
        });
      }
    }

    // Underconfidence detection
    const lowConfidenceDecisions = decisions.filter(d => d.predictionUsed.confidenceLevel < 0.5);
    if (lowConfidenceDecisions.length >= 3) {
      const accuracy =
        lowConfidenceDecisions.filter(d => d.actualOutcome.wasCorrect).length /
        lowConfidenceDecisions.length;
      if (accuracy > 0.7) {
        issues.push({
          type: 'underconfidence',
          severity: accuracy > 0.8 ? 'medium' : 'low',
          description: `Low confidence predictions (<50%) are ${(accuracy * 100).toFixed(0)}% accurate`,
          affectedDecisions: lowConfidenceDecisions.length,
          recommendedAction: 'Consider using higher confidence levels',
        });
      }
    }

    // High regret at any confidence level
    this.CONFIDENCE_BINS.forEach(bin => {
      const binDecisions = decisions.filter(
        d =>
          d.predictionUsed.confidenceLevel >= bin.min && d.predictionUsed.confidenceLevel < bin.max
      );

      if (binDecisions.length >= 2) {
        const avgRegret =
          binDecisions.reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
          binDecisions.length;
        if (avgRegret > 0.7) {
          issues.push({
            type: 'high_regret',
            severity: avgRegret > 0.8 ? 'high' : 'medium',
            description: `${bin.label} range shows high regret (${(avgRegret * 100).toFixed(0)}%)`,
            affectedDecisions: binDecisions.length,
            recommendedAction: 'Adjust decision strategy for this confidence range',
          });
        }
      }
    });

    return issues;
  }

  /**
   * Generate confidence-specific recommendations
   */
  private generateConfidenceRecommendations(
    binAnalysis: ConfidenceBinAnalysis[],
    optimalRanges: OptimalConfidenceRanges,
    calibrationIssues: CalibrationIssue[]
  ): ConfidenceRecommendation[] {
    const recommendations: ConfidenceRecommendation[] = [];

    // General optimal range recommendation
    if (optimalRanges.overall.confidence !== 'low') {
      recommendations.push({
        type: 'optimal_range',
        priority: 'high',
        title: 'Use Your Optimal Confidence Range',
        message: `Your decisions work best with ${(optimalRanges.overall.min * 100).toFixed(0)}%-${(optimalRanges.overall.max * 100).toFixed(0)}% confidence levels`,
        actionItems: [
          `Target ${(optimalRanges.overall.min * 100).toFixed(0)}%-${(optimalRanges.overall.max * 100).toFixed(0)}% confidence for most decisions`,
          'Monitor regret levels when using confidence outside this range',
        ],
        applicableScenarios: ['all'],
        expectedBenefit: 'Reduced regret and improved decision outcomes',
      });
    }

    // Decision type specific recommendations
    Object.entries(optimalRanges.byDecisionType).forEach(([type, range]) => {
      if (range.confidence !== 'low' && range.averageRegret < 0.4) {
        recommendations.push({
          type: 'decision_specific',
          priority: 'medium',
          title: `Optimized Confidence for ${type.charAt(0).toUpperCase() + type.slice(1)} Decisions`,
          message: `For ${type} decisions, use ${(range.min * 100).toFixed(0)}%-${(range.max * 100).toFixed(0)}% confidence`,
          actionItems: [
            `Adjust confidence levels for ${type} decisions`,
            'Consider context and stakes when fine-tuning',
          ],
          applicableScenarios: [type],
          expectedBenefit: `Lower regret for ${type} decisions`,
        });
      }
    });

    // Calibration issue recommendations
    calibrationIssues.forEach(issue => {
      recommendations.push({
        type: 'calibration',
        priority: issue.severity === 'high' ? 'high' : 'medium',
        title: this.getCalibrationRecommendationTitle(issue.type),
        message: issue.description,
        actionItems: [
          issue.recommendedAction,
          'Track prediction accuracy more carefully',
          'Consider using prediction intervals instead of point estimates',
        ],
        applicableScenarios: ['all'],
        expectedBenefit: 'Better calibrated confidence levels',
      });
    });

    // High variability recommendations
    binAnalysis.forEach(bin => {
      if (bin.sampleSize >= 3 && bin.regretVariability > 0.3) {
        recommendations.push({
          type: 'variability',
          priority: 'low',
          title: `Inconsistent Outcomes in ${bin.confidenceRange.label}`,
          message: `Your ${bin.confidenceRange.label.toLowerCase()} decisions show high variability in outcomes`,
          actionItems: [
            'Review context factors for these decisions',
            'Consider additional information sources',
            'Use wider confidence intervals for uncertain situations',
          ],
          applicableScenarios: ['all'],
          expectedBenefit: 'More consistent decision outcomes',
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze regret by category (decision type or stakes level)
   */
  private analyzeRegretByCategory<T extends string>(
    decisions: UserDecision[],
    categorizer: (decision: UserDecision) => T
  ): Record<T, number> {
    const categories: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    decisions.forEach(decision => {
      const category = categorizer(decision);
      if (!categories[category]) {
        categories[category] = 0;
        categoryCounts[category] = 0;
      }
      categories[category] += decision.regretMetrics.experiencedRegret;
      categoryCounts[category]++;
    });

    // Calculate averages
    Object.keys(categories).forEach(category => {
      categories[category] = categories[category] / categoryCounts[category];
    });

    return categories as Record<T, number>;
  }

  /**
   * Analyze regret trend over time for a confidence bin
   */
  private analyzeRegretTrend(decisions: UserDecision[]): 'improving' | 'stable' | 'worsening' {
    if (decisions.length < 4) return 'stable';

    const sortedDecisions = decisions.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const halfPoint = Math.floor(sortedDecisions.length / 2);
    const earlierRegret =
      sortedDecisions
        .slice(0, halfPoint)
        .reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) / halfPoint;
    const laterRegret =
      sortedDecisions
        .slice(halfPoint)
        .reduce((sum, d) => sum + d.regretMetrics.experiencedRegret, 0) /
      (sortedDecisions.length - halfPoint);

    const improvement = earlierRegret - laterRegret;

    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'worsening';
    return 'stable';
  }

  /**
   * Recommend confidence adjustment for a bin
   */
  private recommendConfidenceAdjustment(
    averageRegret: number,
    accuracy: number,
    bin: { min: number; max: number; label: string }
  ): 'increase' | 'decrease' | 'none' {
    // High regret suggests overconfidence
    if (averageRegret > 0.6) return 'decrease';

    // High accuracy with low regret suggests possible underconfidence
    if (accuracy > 0.8 && averageRegret < 0.3 && bin.max < 0.8) return 'increase';

    return 'none';
  }

  /**
   * Generate contextual recommendations
   */
  private generateContextualRecommendations(
    byDecisionType: Record<string, ConfidenceRange>,
    byStakesLevel: Record<string, ConfidenceRange>
  ): string[] {
    const recommendations: string[] = [];

    // High stakes recommendations
    const highStakesRange = byStakesLevel['high'];
    if (highStakesRange && highStakesRange.confidence !== 'low') {
      if (highStakesRange.averageRegret > 0.5) {
        recommendations.push(
          'For high-stakes decisions, consider using lower confidence levels and backup plans'
        );
      } else {
        recommendations.push(
          `High-stakes decisions work well with ${(highStakesRange.min * 100).toFixed(0)}%-${(highStakesRange.max * 100).toFixed(0)}% confidence`
        );
      }
    }

    // Fertility-specific recommendations
    const fertilityRange = byDecisionType['fertility'];
    if (fertilityRange && fertilityRange.confidence !== 'low') {
      recommendations.push(
        `Fertility decisions optimal at ${(fertilityRange.min * 100).toFixed(0)}%-${(fertilityRange.max * 100).toFixed(0)}% confidence`
      );
    }

    return recommendations;
  }

  /**
   * Generate overall insights
   */
  private generateOverallInsights(
    binAnalysis: ConfidenceBinAnalysis[],
    optimalRanges: OptimalConfidenceRanges
  ): string[] {
    const insights: string[] = [];

    // Find best performing bin
    const validBins = binAnalysis.filter(bin => bin.sampleSize >= 2);
    if (validBins.length > 0) {
      const bestBin = validBins.reduce((best, current) =>
        current.averageRegret < best.averageRegret ? current : best
      );

      insights.push(
        `Your best results come from ${bestBin.confidenceRange.label.toLowerCase()} (${(bestBin.averageRegret * 100).toFixed(0)}% regret)`
      );
    }

    // Confidence spread insight
    const nonEmptyBins = binAnalysis.filter(bin => bin.sampleSize > 0);
    if (nonEmptyBins.length >= 3) {
      insights.push(
        'You use a wide range of confidence levels - consider focusing on your optimal range'
      );
    } else if (nonEmptyBins.length === 1) {
      insights.push(
        'You tend to use similar confidence levels - try experimenting with different ranges'
      );
    }

    // Overall trend insight
    const improvingBins = binAnalysis.filter(bin => bin.regretTrend === 'improving').length;
    const worseningBins = binAnalysis.filter(bin => bin.regretTrend === 'worsening').length;

    if (improvingBins > worseningBins) {
      insights.push('Your decision-making is improving across confidence levels');
    } else if (worseningBins > improvingBins) {
      insights.push('Consider reviewing your recent decision patterns');
    }

    return insights;
  }

  /**
   * Calculate coefficient of variation
   */
  private calculateVariability(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Get recommendation title for calibration issues
   */
  private getCalibrationRecommendationTitle(issueType: string): string {
    switch (issueType) {
      case 'overconfidence':
        return 'Reduce Overconfidence';
      case 'underconfidence':
        return 'Increase Confidence When Appropriate';
      case 'high_regret':
        return 'Address High Regret Pattern';
      default:
        return 'Improve Confidence Calibration';
    }
  }

  /**
   * Create empty analysis for users with no data
   */
  private createEmptyAnalysis(): ConfidenceRegretAnalysis {
    return {
      binAnalysis: this.CONFIDENCE_BINS.map(bin => ({
        confidenceRange: bin,
        sampleSize: 0,
        averageRegret: 0,
        regretVariability: 0,
        accuracy: 0,
        regretByDecisionType: {},
        regretByStakesLevel: {},
        regretTrend: 'stable' as const,
        recommendedAdjustment: 'none' as const,
      })),
      optimalRanges: {
        overall: { min: 0.6, max: 0.8, averageRegret: 0, accuracy: 0, confidence: 'low' },
        byDecisionType: {},
        byStakesLevel: {},
        contextualRecommendations: [],
      },
      calibrationIssues: [],
      recommendations: [],
      overallInsights: ['Start making decisions to build confidence level insights'],
    };
  }
}

// Type definitions for confidence level analysis
interface ConfidenceRegretAnalysis {
  binAnalysis: ConfidenceBinAnalysis[];
  optimalRanges: OptimalConfidenceRanges;
  calibrationIssues: CalibrationIssue[];
  recommendations: ConfidenceRecommendation[];
  overallInsights: string[];
}

interface ConfidenceBinAnalysis {
  confidenceRange: { min: number; max: number; label: string };
  sampleSize: number;
  averageRegret: number;
  regretVariability: number;
  accuracy: number;
  regretByDecisionType: Record<string, number>;
  regretByStakesLevel: Record<string, number>;
  regretTrend: 'improving' | 'stable' | 'worsening';
  recommendedAdjustment: 'increase' | 'decrease' | 'none';
}

interface OptimalConfidenceRanges {
  overall: ConfidenceRange;
  byDecisionType: Record<string, ConfidenceRange>;
  byStakesLevel: Record<string, ConfidenceRange>;
  contextualRecommendations: string[];
}

interface ConfidenceRange {
  min: number;
  max: number;
  averageRegret: number;
  accuracy: number;
  confidence: 'low' | 'medium' | 'high';
}

interface CalibrationIssue {
  type: 'overconfidence' | 'underconfidence' | 'high_regret';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedDecisions: number;
  recommendedAction: string;
}

interface ConfidenceRecommendation {
  type: 'optimal_range' | 'decision_specific' | 'calibration' | 'variability';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionItems: string[];
  applicableScenarios: string[];
  expectedBenefit: string;
}
