import {
  ConfidenceInterval,
  UncertaintyFactors,
  ProbabilityDistribution,
} from '@shared-types/prediction';

/**
 * Statistical confidence interval calculator for menstrual cycle predictions
 * Implements proper uncertainty propagation and statistical accuracy
 */
export class ConfidenceIntervalCalculator {
  private readonly CONFIDENCE_LEVELS = {
    p50: 0.5,
    p80: 0.8,
    p95: 0.95,
  };

  /**
   * Calculate confidence intervals for period predictions
   * @param predictedDate - Mean prediction date (days from reference)
   * @param uncertainty - Standard deviation of prediction
   * @param uncertaintyFactors - Factors affecting prediction reliability
   * @returns Confidence intervals in days from reference date
   */
  calculatePeriodConfidenceIntervals(
    predictedDate: number,
    uncertainty: number,
    uncertaintyFactors: UncertaintyFactors
  ): ConfidenceInterval {
    // Adjust uncertainty based on data quality and history length
    const adjustedUncertainty = this.adjustUncertaintyForDataQuality(
      uncertainty,
      uncertaintyFactors
    );

    // Calculate intervals using normal distribution approximation
    // For biological processes, we use slightly wider intervals
    const intervals = this.calculateNormalConfidenceIntervals(predictedDate, adjustedUncertainty);

    // Apply biological constraints (minimum/maximum reasonable intervals)
    return this.applyBiologicalConstraints(intervals, uncertaintyFactors);
  }

  /**
   * Calculate confidence intervals for ovulation predictions
   * @param predictedOvulationDay - Mean ovulation day (days from period start)
   * @param uncertainty - Standard deviation of ovulation timing
   * @param uncertaintyFactors - Factors affecting prediction reliability
   * @returns Confidence intervals for ovulation timing
   */
  calculateOvulationConfidenceIntervals(
    predictedOvulationDay: number,
    uncertainty: number,
    uncertaintyFactors: UncertaintyFactors
  ): ConfidenceInterval {
    // Ovulation predictions have different uncertainty characteristics
    const adjustedUncertainty = this.adjustOvulationUncertainty(uncertainty, uncertaintyFactors);

    const intervals = this.calculateNormalConfidenceIntervals(
      predictedOvulationDay,
      adjustedUncertainty
    );

    // Apply ovulation-specific biological constraints
    return this.applyOvulationConstraints(intervals, uncertaintyFactors);
  }

  /**
   * Calculate intervals using normal distribution with proper z-scores
   */
  private calculateNormalConfidenceIntervals(
    mean: number,
    standardDeviation: number
  ): ConfidenceInterval {
    // Z-scores for different confidence levels
    const zScores = {
      p50: 0.674, // 50% confidence interval
      p80: 1.282, // 80% confidence interval
      p95: 1.96, // 95% confidence interval
    };

    return {
      p50: Math.round(zScores.p50 * standardDeviation * 2), // Full interval width
      p80: Math.round(zScores.p80 * standardDeviation * 2),
      p95: Math.round(zScores.p95 * standardDeviation * 2),
    };
  }

  /**
   * Adjust uncertainty based on data quality factors
   */
  private adjustUncertaintyForDataQuality(
    baseUncertainty: number,
    factors: UncertaintyFactors
  ): number {
    let adjustmentFactor = 1.0;

    // Adjust for data quality (lower quality = higher uncertainty)
    adjustmentFactor *= 2.0 - factors.dataQuality;

    // Adjust for history length (more history = lower uncertainty)
    const historyFactor = Math.max(0.5, Math.min(1.5, 3.0 / Math.sqrt(factors.historyLength)));
    adjustmentFactor *= historyFactor;

    // Adjust for cycle variability (higher variability = higher uncertainty)
    adjustmentFactor *= 1.0 + factors.cycleLengthVariability;

    // Adjust for recent data reliability
    adjustmentFactor *= 2.0 - factors.recentDataReliability;

    // Cap adjustment factor to reasonable bounds
    return baseUncertainty * Math.max(0.5, Math.min(3.0, adjustmentFactor));
  }

  /**
   * Adjust uncertainty specifically for ovulation predictions
   */
  private adjustOvulationUncertainty(baseUncertainty: number, factors: UncertaintyFactors): number {
    let ovulationUncertainty = this.adjustUncertaintyForDataQuality(baseUncertainty, factors);

    // Ovulation is inherently more variable than period timing
    ovulationUncertainty *= 1.3;

    // If no clear seasonal patterns, increase uncertainty
    if (!factors.seasonalPatterns) {
      ovulationUncertainty *= 1.2;
    }

    return ovulationUncertainty;
  }

  /**
   * Apply biological constraints to confidence intervals
   */
  private applyBiologicalConstraints(
    intervals: ConfidenceInterval,
    factors: UncertaintyFactors
  ): ConfidenceInterval {
    // Minimum intervals (even with perfect data, biological variation exists)
    const minIntervals = {
      p50: 2, // Minimum 2-day window for 50% confidence
      p80: 4, // Minimum 4-day window for 80% confidence
      p95: 7, // Minimum 7-day window for 95% confidence
    };

    // Maximum intervals (protect against unreasonable predictions)
    const maxIntervals = {
      p50: 14, // Maximum 14-day window for 50% confidence
      p80: 21, // Maximum 21-day window for 80% confidence
      p95: 35, // Maximum 35-day window for 95% confidence
    };

    return {
      p50: Math.max(minIntervals.p50, Math.min(maxIntervals.p50, intervals.p50)),
      p80: Math.max(minIntervals.p80, Math.min(maxIntervals.p80, intervals.p80)),
      p95: Math.max(minIntervals.p95, Math.min(maxIntervals.p95, intervals.p95)),
    };
  }

  /**
   * Apply ovulation-specific biological constraints
   */
  private applyOvulationConstraints(
    intervals: ConfidenceInterval,
    factors: UncertaintyFactors
  ): ConfidenceInterval {
    // Ovulation intervals are typically smaller than period intervals
    const minIntervals = {
      p50: 1, // Minimum 1-day window for 50% confidence
      p80: 2, // Minimum 2-day window for 80% confidence
      p95: 4, // Minimum 4-day window for 95% confidence
    };

    const maxIntervals = {
      p50: 6, // Maximum 6-day window for 50% confidence
      p80: 10, // Maximum 10-day window for 80% confidence
      p95: 15, // Maximum 15-day window for 95% confidence
    };

    return {
      p50: Math.max(minIntervals.p50, Math.min(maxIntervals.p50, intervals.p50)),
      p80: Math.max(minIntervals.p80, Math.min(maxIntervals.p80, intervals.p80)),
      p95: Math.max(minIntervals.p95, Math.min(maxIntervals.p95, intervals.p95)),
    };
  }

  /**
   * Calculate uncertainty propagation through the prediction model
   */
  calculateUncertaintyPropagation(
    modelUncertainty: number,
    dataUncertainty: number,
    systemUncertainty: number
  ): number {
    // Combine uncertainties using root sum of squares
    return Math.sqrt(
      modelUncertainty * modelUncertainty +
        dataUncertainty * dataUncertainty +
        systemUncertainty * systemUncertainty
    );
  }

  /**
   * Convert confidence intervals to probability distribution
   */
  convertIntervalsToDistribution(
    mean: number,
    intervals: ConfidenceInterval,
    daysRange: number = 60
  ): ProbabilityDistribution {
    // Estimate standard deviation from 95% confidence interval
    const estimatedStdDev = intervals.p95 / (2 * 1.96);

    const distribution: number[] = [];
    const support: [number, number] = [mean - daysRange / 2, mean + daysRange / 2];

    // Generate normal distribution probabilities
    for (let day = support[0]; day <= support[1]; day++) {
      const zScore = (day - mean) / estimatedStdDev;
      const probability = this.normalPDF(zScore);
      distribution.push(probability);
    }

    // Normalize distribution to sum to 1
    const sum = distribution.reduce((acc, val) => acc + val, 0);
    const normalizedDistribution = distribution.map(val => val / sum);

    return {
      mean,
      variance: estimatedStdDev * estimatedStdDev,
      distribution: normalizedDistribution,
      support,
    };
  }

  /**
   * Normal probability density function
   */
  private normalPDF(z: number): number {
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }

  /**
   * Validate confidence intervals for statistical consistency
   */
  validateIntervalConsistency(intervals: ConfidenceInterval): boolean {
    // Check that intervals are properly ordered
    return intervals.p50 <= intervals.p80 && intervals.p80 <= intervals.p95;
  }

  /**
   * Calculate interval width adjustment based on prediction accuracy
   */
  calculateIntervalAdjustment(historicalAccuracy: number, targetAccuracy: number): number {
    // If historical accuracy is lower than target, increase intervals
    if (historicalAccuracy < targetAccuracy) {
      return 1.0 + (targetAccuracy - historicalAccuracy) * 2.0;
    }

    // If historical accuracy is much higher, slightly decrease intervals
    if (historicalAccuracy > targetAccuracy + 0.1) {
      return Math.max(0.8, 1.0 - (historicalAccuracy - targetAccuracy) * 0.5);
    }

    return 1.0; // No adjustment needed
  }
}

export default ConfidenceIntervalCalculator;
