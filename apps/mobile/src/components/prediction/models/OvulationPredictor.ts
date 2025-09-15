import {
  OvulationPrediction,
  UncertaintyFactors,
  ConfidenceInterval,
  BayesianInference,
  ProbabilityDistribution,
} from '@aura/shared-types/prediction';
import { EncryptedCycleData } from '@aura/shared-types';

/**
 * Ovulation Prediction Engine with Uncertainty Quantification
 * Implements cycle phase modeling and probability-based fertility window prediction
 */
export class OvulationPredictor {
  private readonly LUTEAL_PHASE_MEAN = 14; // Average luteal phase length
  private readonly LUTEAL_PHASE_VARIANCE = 2; // Luteal phase variability
  private readonly FERTILE_WINDOW_DAYS = 6; // Fertile window duration
  private readonly SPERM_SURVIVAL_DAYS = 5; // Maximum sperm survival

  /**
   * Predict ovulation date with uncertainty quantification
   */
  async predictOvulation(
    cycleData: EncryptedCycleData[],
    nextPeriodPrediction: Date
  ): Promise<OvulationPrediction> {
    const uncertaintyFactors = this.calculateUncertaintyFactors(cycleData);
    const cyclePhaseModel = this.buildCyclePhaseModel(cycleData);
    const ovulationDistribution = this.calculateOvulationDistribution(
      cyclePhaseModel,
      nextPeriodPrediction,
      uncertaintyFactors
    );

    const ovulationDate = this.findMostProbableOvulationDate(ovulationDistribution);
    const fertilityWindow = this.calculateFertilityWindow(ovulationDate, ovulationDistribution);
    const confidenceIntervals = this.calculateOvulationConfidence(ovulationDistribution);
    const probabilityArray = this.generateProbabilityArray(ovulationDistribution);

    return {
      ovulationDate: ovulationDate.toISOString(),
      fertilityWindow: {
        start: fertilityWindow.start.toISOString(),
        end: fertilityWindow.end.toISOString(),
        peakDay: ovulationDate.toISOString(),
      },
      confidenceIntervals,
      uncertaintyFactors,
      probabilityDistribution: probabilityArray,
      explanation: this.generateExplanation(uncertaintyFactors, confidenceIntervals),
    };
  }

  /**
   * Build cycle phase model from historical data
   */
  private buildCyclePhaseModel(cycleData: EncryptedCycleData[]): CyclePhaseModel {
    if (cycleData.length < 2) {
      return this.getDefaultCyclePhaseModel();
    }

    const cycleLengths = this.extractCycleLengths(cycleData);
    const lutealPhaseLengths = this.estimateLutealPhaseLengths(cycleData);
    const follicularPhaseLengths = cycleLengths.map(
      (cycle, i) => cycle - (lutealPhaseLengths[i] || this.LUTEAL_PHASE_MEAN)
    );

    return {
      lutealPhase: {
        mean: this.calculateMean(lutealPhaseLengths),
        variance: this.calculateVariance(lutealPhaseLengths),
        distribution: this.createNormalDistribution(
          this.calculateMean(lutealPhaseLengths),
          this.calculateVariance(lutealPhaseLengths)
        ),
      },
      follicularPhase: {
        mean: this.calculateMean(follicularPhaseLengths),
        variance: this.calculateVariance(follicularPhaseLengths),
        distribution: this.createNormalDistribution(
          this.calculateMean(follicularPhaseLengths),
          this.calculateVariance(follicularPhaseLengths)
        ),
      },
      totalCycleLength: {
        mean: this.calculateMean(cycleLengths),
        variance: this.calculateVariance(cycleLengths),
        distribution: this.createNormalDistribution(
          this.calculateMean(cycleLengths),
          this.calculateVariance(cycleLengths)
        ),
      },
    };
  }

  /**
   * Calculate ovulation probability distribution
   */
  private calculateOvulationDistribution(
    cycleModel: CyclePhaseModel,
    nextPeriodDate: Date,
    uncertaintyFactors: UncertaintyFactors
  ): OvulationDistribution {
    const ovulationDays: number[] = [];
    const probabilities: number[] = [];

    // Calculate ovulation probabilities for each day in the cycle
    for (let dayBeforePeriod = 10; dayBeforePeriod <= 20; dayBeforePeriod++) {
      const ovulationDate = new Date(nextPeriodDate);
      ovulationDate.setDate(ovulationDate.getDate() - dayBeforePeriod);

      // Bayesian probability calculation
      const lutealPhaseProbability = this.calculateLutealPhaseProbability(
        dayBeforePeriod,
        cycleModel.lutealPhase
      );

      const priorProbability = this.calculatePriorOvulationProbability(dayBeforePeriod);

      // Adjust for uncertainty factors
      const adjustedProbability =
        lutealPhaseProbability *
        priorProbability *
        this.getUncertaintyAdjustment(uncertaintyFactors);

      ovulationDays.push(dayBeforePeriod);
      probabilities.push(adjustedProbability);
    }

    // Normalize probabilities
    const totalProbability = probabilities.reduce((sum, p) => sum + p, 0);
    const normalizedProbabilities = probabilities.map(p => p / totalProbability);

    return {
      days: ovulationDays,
      probabilities: normalizedProbabilities,
      peakProbabilityDay: ovulationDays[this.findMaxIndex(normalizedProbabilities)],
      confidenceDistribution: this.calculateConfidenceDistribution(normalizedProbabilities),
    };
  }

  /**
   * Calculate luteal phase probability for given days before period
   */
  private calculateLutealPhaseProbability(
    dayBeforePeriod: number,
    lutealPhase: PhaseModel
  ): number {
    // Normal distribution probability density function
    const variance = lutealPhase.variance;
    const mean = lutealPhase.mean;
    const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
    const exponent = -Math.pow(dayBeforePeriod - mean, 2) / (2 * variance);
    return coefficient * Math.exp(exponent);
  }

  /**
   * Calculate prior ovulation probability (biological knowledge)
   */
  private calculatePriorOvulationProbability(dayBeforePeriod: number): number {
    // Most ovulation occurs 12-16 days before period
    if (dayBeforePeriod >= 12 && dayBeforePeriod <= 16) {
      return 1.0;
    } else if (dayBeforePeriod >= 10 && dayBeforePeriod <= 18) {
      return 0.7;
    } else {
      return 0.3;
    }
  }

  /**
   * Calculate fertility window with probability consideration
   */
  private calculateFertilityWindow(
    ovulationDate: Date,
    distribution: OvulationDistribution
  ): FertilityWindow {
    const windowStart = new Date(ovulationDate);
    windowStart.setDate(windowStart.getDate() - this.SPERM_SURVIVAL_DAYS);

    const windowEnd = new Date(ovulationDate);
    windowEnd.setDate(windowEnd.getDate() + 1); // Egg survives ~24 hours

    return {
      start: windowStart,
      end: windowEnd,
      peakFertilityDate: ovulationDate,
      probabilityByDay: this.calculateFertilityProbabilityByDay(
        windowStart,
        windowEnd,
        ovulationDate,
        distribution
      ),
    };
  }

  /**
   * Calculate fertility probability for each day in the window
   */
  private calculateFertilityProbabilityByDay(
    windowStart: Date,
    windowEnd: Date,
    ovulationDate: Date,
    distribution: OvulationDistribution
  ): Map<string, number> {
    const probabilities = new Map<string, number>();
    const currentDate = new Date(windowStart);

    while (currentDate <= windowEnd) {
      const daysDiffFromOvulation = this.daysDifference(currentDate, ovulationDate);

      // Fertility probability based on distance from ovulation
      let fertility = 0;
      if (daysDiffFromOvulation >= -5 && daysDiffFromOvulation <= 0) {
        // Sperm can survive up to 5 days
        fertility = Math.max(0, 1 - Math.abs(daysDiffFromOvulation) * 0.15);
      } else if (daysDiffFromOvulation === 1) {
        // Egg survival day
        fertility = 0.1;
      }

      probabilities.set(currentDate.toISOString().split('T')[0], fertility);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return probabilities;
  }

  /**
   * Calculate confidence intervals for ovulation prediction
   */
  private calculateOvulationConfidence(distribution: OvulationDistribution): ConfidenceInterval {
    const cumulativeProbabilities = this.calculateCumulative(distribution.probabilities);

    return {
      p50: this.findPercentile(distribution.days, cumulativeProbabilities, 0.25, 0.75),
      p80: this.findPercentile(distribution.days, cumulativeProbabilities, 0.1, 0.9),
      p95: this.findPercentile(distribution.days, cumulativeProbabilities, 0.025, 0.975),
    };
  }

  /**
   * Calculate uncertainty factors for ovulation prediction
   */
  private calculateUncertaintyFactors(cycleData: EncryptedCycleData[]): UncertaintyFactors {
    const cycleLengths = this.extractCycleLengths(cycleData);
    const recentCycles = cycleData.slice(-6); // Last 6 cycles

    return {
      dataQuality: this.calculateDataQuality(cycleData),
      historyLength: cycleData.length,
      cycleLengthVariability: this.calculateVariability(cycleLengths),
      recentDataReliability: this.calculateRecentReliability(recentCycles),
      seasonalPatterns: this.detectSeasonalPatterns(cycleData),
    };
  }

  /**
   * Generate user-friendly explanation
   */
  private generateExplanation(
    uncertainty: UncertaintyFactors,
    confidence: ConfidenceInterval
  ): string {
    const dataQuality = uncertainty.dataQuality;
    const historyLength = uncertainty.historyLength;
    const variability = uncertainty.cycleLengthVariability;

    let explanation = 'Ovulation prediction based on ';

    if (historyLength >= 6) {
      explanation += `${historyLength} cycles of personal data. `;
    } else {
      explanation += `${historyLength} cycles (more data will improve accuracy). `;
    }

    if (dataQuality > 0.8) {
      explanation += 'High data quality provides reliable prediction. ';
    } else if (dataQuality > 0.6) {
      explanation += 'Moderate data quality - prediction has some uncertainty. ';
    } else {
      explanation += 'Limited data quality increases prediction uncertainty. ';
    }

    if (variability < 0.1) {
      explanation += 'Regular cycles provide accurate timing.';
    } else if (variability < 0.2) {
      explanation += 'Slightly irregular cycles add moderate uncertainty.';
    } else {
      explanation += 'Irregular cycles increase prediction uncertainty significantly.';
    }

    return explanation;
  }

  /**
   * Estimate luteal phase lengths from historical data
   */
  private estimateLutealPhaseLengths(cycleData: EncryptedCycleData[]): number[] {
    // In the absence of ovulation tracking data, use average luteal phase
    // This is a simplification - real implementation would use BBT, CM, or LH data
    return cycleData.map(() => this.LUTEAL_PHASE_MEAN);
  }

  /**
   * Track prediction accuracy for model improvement
   */
  async trackOvulationAccuracy(
    prediction: OvulationPrediction,
    actualOvulationDate: Date | null
  ): Promise<OvulationAccuracyRecord> {
    if (!actualOvulationDate) {
      return {
        predictionDate: new Date().toISOString(),
        actualDate: null,
        wasAccurate: false,
        errorDays: null,
        confidenceLevel: prediction.confidenceIntervals.p50,
        accuracyType: 'unknown',
      };
    }

    const predictedDate = new Date(prediction.ovulationDate);
    const errorDays = Math.abs(this.daysDifference(predictedDate, actualOvulationDate));
    const wasAccurate = errorDays <= 2; // Within 2 days is considered accurate

    return {
      predictionDate: new Date().toISOString(),
      actualDate: actualOvulationDate.toISOString(),
      wasAccurate,
      errorDays,
      confidenceLevel: prediction.confidenceIntervals.p50,
      accuracyType: this.determineAccuracyType(errorDays),
    };
  }

  // Utility methods
  private extractCycleLengths(cycleData: EncryptedCycleData[]): number[] {
    const lengths: number[] = [];
    for (let i = 1; i < cycleData.length; i++) {
      const current = new Date(cycleData[i].periodStartDate);
      const previous = new Date(cycleData[i - 1].periodStartDate);
      const daysDiff = Math.abs(this.daysDifference(previous, current));
      if (daysDiff >= 21 && daysDiff <= 45) {
        // Valid cycle length
        lengths.push(daysDiff);
      }
    }
    return lengths;
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 1;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return this.calculateMean(squaredDiffs);
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    const variance = this.calculateVariance(values);
    const mean = this.calculateMean(values);
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private daysDifference(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / oneDay);
  }

  private findMaxIndex(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  private calculateCumulative(probabilities: number[]): number[] {
    const cumulative = [probabilities[0]];
    for (let i = 1; i < probabilities.length; i++) {
      cumulative[i] = cumulative[i - 1] + probabilities[i];
    }
    return cumulative;
  }

  private findPercentile(
    days: number[],
    cumulative: number[],
    lowerPercentile: number,
    upperPercentile: number
  ): number {
    const lowerIndex = cumulative.findIndex(p => p >= lowerPercentile);
    const upperIndex = cumulative.findIndex(p => p >= upperPercentile);
    const range = Math.abs(days[upperIndex] - days[lowerIndex]);
    return range;
  }

  private calculateDataQuality(cycleData: EncryptedCycleData[]): number {
    if (cycleData.length === 0) return 0;

    let qualityScore = 0;
    const totalCycles = cycleData.length;

    cycleData.forEach(cycle => {
      if (cycle.periodStartDate) qualityScore += 0.5;
      if (cycle.periodEndDate) qualityScore += 0.3;
      if (cycle.flowIntensity) qualityScore += 0.1;
      if (cycle.symptoms && cycle.symptoms.length > 0) qualityScore += 0.1;
    });

    return qualityScore / totalCycles;
  }

  private calculateRecentReliability(recentCycles: EncryptedCycleData[]): number {
    if (recentCycles.length < 3) return 0.5;

    const recentLengths = this.extractCycleLengths(recentCycles);
    const variability = this.calculateVariability(recentLengths);
    return Math.max(0, 1 - variability * 2); // Higher variability = lower reliability
  }

  private detectSeasonalPatterns(cycleData: EncryptedCycleData[]): boolean {
    // Simplified seasonal detection - would need more sophisticated analysis
    return cycleData.length >= 12; // Need at least a year of data
  }

  private getUncertaintyAdjustment(factors: UncertaintyFactors): number {
    const baseAdjustment =
      factors.dataQuality * 0.4 +
      (factors.historyLength / 12) * 0.3 +
      (1 - factors.cycleLengthVariability) * 0.3;
    return Math.max(0.3, Math.min(1.0, baseAdjustment));
  }

  private calculateConfidenceDistribution(probabilities: number[]): number[] {
    // Return cumulative distribution for confidence calculations
    return this.calculateCumulative(probabilities);
  }

  private findMostProbableOvulationDate(distribution: OvulationDistribution): Date {
    const maxProbabilityIndex = this.findMaxIndex(distribution.probabilities);
    const daysBeforePeriod = distribution.days[maxProbabilityIndex];

    // This would need actual next period date - simplified for now
    const estimatedNextPeriod = new Date();
    estimatedNextPeriod.setDate(estimatedNextPeriod.getDate() + 14); // Simplified

    const ovulationDate = new Date(estimatedNextPeriod);
    ovulationDate.setDate(ovulationDate.getDate() - daysBeforePeriod);

    return ovulationDate;
  }

  private generateProbabilityArray(distribution: OvulationDistribution): number[] {
    return distribution.probabilities;
  }

  private createNormalDistribution(mean: number, variance: number): ProbabilityDistribution {
    const distribution: number[] = [];
    const support: [number, number] = [
      mean - 3 * Math.sqrt(variance),
      mean + 3 * Math.sqrt(variance),
    ];

    for (let x = support[0]; x <= support[1]; x += 0.1) {
      const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
      const exponent = -Math.pow(x - mean, 2) / (2 * variance);
      distribution.push(coefficient * Math.exp(exponent));
    }

    return { mean, variance, distribution, support };
  }

  private getDefaultCyclePhaseModel(): CyclePhaseModel {
    return {
      lutealPhase: {
        mean: this.LUTEAL_PHASE_MEAN,
        variance: this.LUTEAL_PHASE_VARIANCE,
        distribution: this.createNormalDistribution(
          this.LUTEAL_PHASE_MEAN,
          this.LUTEAL_PHASE_VARIANCE
        ),
      },
      follicularPhase: {
        mean: 14,
        variance: 7,
        distribution: this.createNormalDistribution(14, 7),
      },
      totalCycleLength: {
        mean: 28,
        variance: 4,
        distribution: this.createNormalDistribution(28, 4),
      },
    };
  }

  private determineAccuracyType(errorDays: number | null): string {
    if (errorDays === null) return 'unknown';
    if (errorDays <= 1) return 'excellent';
    if (errorDays <= 2) return 'good';
    if (errorDays <= 3) return 'fair';
    return 'poor';
  }
}

// Supporting interfaces
interface CyclePhaseModel {
  lutealPhase: PhaseModel;
  follicularPhase: PhaseModel;
  totalCycleLength: PhaseModel;
}

interface PhaseModel {
  mean: number;
  variance: number;
  distribution: ProbabilityDistribution;
}

interface OvulationDistribution {
  days: number[];
  probabilities: number[];
  peakProbabilityDay: number;
  confidenceDistribution: number[];
}

interface FertilityWindow {
  start: Date;
  end: Date;
  peakFertilityDate: Date;
  probabilityByDay: Map<string, number>;
}

interface OvulationAccuracyRecord {
  predictionDate: string;
  actualDate: string | null;
  wasAccurate: boolean;
  errorDays: number | null;
  confidenceLevel: number;
  accuracyType: string;
}
