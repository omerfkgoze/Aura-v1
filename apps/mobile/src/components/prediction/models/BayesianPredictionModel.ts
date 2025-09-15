import {
  BayesianModelParameters,
  PeriodPrediction,
  OvulationPrediction,
  ConfidenceInterval,
  UncertaintyFactors,
  CyclePattern,
  BayesianInference,
  ProbabilityDistribution,
  EncryptedCycleData,
} from '@aura/shared-types';

/**
 * Bayesian Prediction Model for menstrual cycle predictions
 * Implements probabilistic predictions with uncertainty quantification
 * All calculations performed client-side for privacy
 */
export class BayesianPredictionModel {
  private modelParameters: BayesianModelParameters;
  private readonly MIN_CYCLES_FOR_PREDICTION = 2;
  private readonly DEFAULT_CYCLE_LENGTH = 28;
  private readonly DEFAULT_PERIOD_LENGTH = 5;

  constructor(initialParameters?: Partial<BayesianModelParameters>) {
    this.modelParameters = {
      cycleLengthMean: initialParameters?.cycleLengthMean ?? this.DEFAULT_CYCLE_LENGTH,
      cycleLengthVariance: initialParameters?.cycleLengthVariance ?? 9.0,
      periodLengthMean: initialParameters?.periodLengthMean ?? this.DEFAULT_PERIOD_LENGTH,
      periodLengthVariance: initialParameters?.periodLengthVariance ?? 1.0,
      seasonalVariation: initialParameters?.seasonalVariation ?? 0.1,
      personalHistoryWeight: initialParameters?.personalHistoryWeight ?? 0.8,
      adaptiveLearningRate: initialParameters?.adaptiveLearningRate ?? 0.1,
    };
  }

  /**
   * Generate period prediction with confidence intervals
   */
  async predictNextPeriod(cycleHistory: EncryptedCycleData[]): Promise<PeriodPrediction> {
    if (cycleHistory.length < this.MIN_CYCLES_FOR_PREDICTION) {
      return this.generateDefaultPrediction();
    }

    const cyclePattern = this.analyzeCyclePattern(cycleHistory);
    const uncertaintyFactors = this.calculateUncertaintyFactors(cycleHistory, cyclePattern);
    const bayesianInference = this.performBayesianInference(cycleHistory, cyclePattern);

    // Calculate next period start date
    const lastPeriodStart = new Date(cycleHistory[cycleHistory.length - 1].periodStartDate);
    const predictedCycleLength = bayesianInference.posteriorDistribution.mean;
    const nextPeriodStart = new Date(lastPeriodStart);
    nextPeriodStart.setDate(lastPeriodStart.getDate() + Math.round(predictedCycleLength));

    // Calculate confidence intervals
    const confidenceIntervals = this.calculateConfidenceIntervals(
      bayesianInference.posteriorDistribution,
      uncertaintyFactors
    );

    // Generate probability distribution
    const probabilityDistribution = this.generateProbabilityDistribution(
      bayesianInference.posteriorDistribution,
      nextPeriodStart
    );

    return {
      nextPeriodStart: nextPeriodStart.toISOString().split('T')[0],
      confidenceIntervals,
      uncertaintyFactors,
      probabilityDistribution,
      explanation: this.generatePredictionExplanation(uncertaintyFactors, cyclePattern),
    };
  }

  /**
   * Generate ovulation prediction with uncertainty
   */
  async predictOvulation(cycleHistory: EncryptedCycleData[]): Promise<OvulationPrediction> {
    const periodPrediction = await this.predictNextPeriod(cycleHistory);
    const nextPeriodDate = new Date(periodPrediction.nextPeriodStart);

    // Ovulation typically occurs 14 days before period (luteal phase)
    const ovulationDate = new Date(nextPeriodDate);
    ovulationDate.setDate(nextPeriodDate.getDate() - 14);

    // Fertility window: 5 days before ovulation to 1 day after
    const fertilityStart = new Date(ovulationDate);
    fertilityStart.setDate(ovulationDate.getDate() - 5);

    const fertilityEnd = new Date(ovulationDate);
    fertilityEnd.setDate(ovulationDate.getDate() + 1);

    // Adjust confidence intervals for ovulation uncertainty
    const ovulationConfidence: ConfidenceInterval = {
      p50: Math.max(1, periodPrediction.confidenceIntervals.p50 * 1.2),
      p80: Math.max(2, periodPrediction.confidenceIntervals.p80 * 1.3),
      p95: Math.max(3, periodPrediction.confidenceIntervals.p95 * 1.5),
    };

    // Adjust uncertainty factors for ovulation
    const ovulationUncertainty: UncertaintyFactors = {
      ...periodPrediction.uncertaintyFactors,
      dataQuality: periodPrediction.uncertaintyFactors.dataQuality * 0.9, // Slightly less certain
      recentDataReliability: periodPrediction.uncertaintyFactors.recentDataReliability * 0.85,
    };

    return {
      ovulationDate: ovulationDate.toISOString().split('T')[0],
      fertilityWindow: {
        start: fertilityStart.toISOString().split('T')[0],
        end: fertilityEnd.toISOString().split('T')[0],
        peakDay: ovulationDate.toISOString().split('T')[0],
      },
      confidenceIntervals: ovulationConfidence,
      uncertaintyFactors: ovulationUncertainty,
      probabilityDistribution: this.generateOvulationProbability(
        ovulationDate,
        ovulationConfidence
      ),
      explanation: this.generateOvulationExplanation(ovulationUncertainty),
    };
  }

  /**
   * Analyze cycle patterns from historical data
   */
  private analyzeCyclePattern(cycleHistory: EncryptedCycleData[]): CyclePattern {
    const cycleLengths = this.extractCycleLengths(cycleHistory);
    const mean = cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;
    const variance = this.calculateVariance(cycleLengths, mean);

    return {
      averageLength: mean,
      variance: variance,
      trend: this.detectTrend(cycleLengths),
      seasonalPattern: this.detectSeasonalPattern(cycleHistory),
      outliers: this.detectOutliers(cycleLengths, mean, variance),
      confidence: this.calculatePatternConfidence(cycleLengths),
    };
  }

  /**
   * Extract cycle lengths from history
   */
  private extractCycleLengths(cycleHistory: EncryptedCycleData[]): number[] {
    const lengths: number[] = [];

    for (let i = 1; i < cycleHistory.length; i++) {
      const currentStart = new Date(cycleHistory[i].periodStartDate);
      const previousStart = new Date(cycleHistory[i - 1].periodStartDate);
      const daysDiff = Math.round(
        (currentStart.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 0 && daysDiff < 60) {
        // Reasonable cycle length
        lengths.push(daysDiff);
      }
    }

    return lengths;
  }

  /**
   * Calculate variance of cycle lengths
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length <= 1) return 0;

    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (values.length - 1);
  }

  /**
   * Detect trend in cycle lengths
   */
  private detectTrend(
    cycleLengths: number[]
  ): 'stable' | 'increasing' | 'decreasing' | 'irregular' {
    if (cycleLengths.length < 3) return 'stable';

    const recentCycles = cycleLengths.slice(-Math.min(6, cycleLengths.length));
    const firstHalf = recentCycles.slice(0, Math.floor(recentCycles.length / 2));
    const secondHalf = recentCycles.slice(Math.floor(recentCycles.length / 2));

    const firstMean = firstHalf.reduce((sum, length) => sum + length, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((sum, length) => sum + length, 0) / secondHalf.length;

    const diff = secondMean - firstMean;
    const variance = this.calculateVariance(
      recentCycles,
      recentCycles.reduce((sum, l) => sum + l, 0) / recentCycles.length
    );

    if (Math.abs(diff) < Math.sqrt(variance)) return 'stable';
    if (variance > 25) return 'irregular'; // High variability

    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Detect seasonal patterns in cycle data
   */
  private detectSeasonalPattern(cycleHistory: EncryptedCycleData[]): any {
    if (cycleHistory.length < 12) {
      return {
        hasSeasonalVariation: false,
        seasonalAmplitude: 0,
        peakMonth: 0,
        valleyMonth: 0,
        reliability: 0,
      };
    }

    // Group cycles by month
    const monthlyLengths: { [month: number]: number[] } = {};

    for (let i = 1; i < cycleHistory.length; i++) {
      const cycleStart = new Date(cycleHistory[i].periodStartDate);
      const month = cycleStart.getMonth();
      const cycleLength = this.extractCycleLengths([cycleHistory[i - 1], cycleHistory[i]])[0];

      if (cycleLength) {
        if (!monthlyLengths[month]) monthlyLengths[month] = [];
        monthlyLengths[month].push(cycleLength);
      }
    }

    // Calculate monthly averages
    const monthlyAverages: number[] = [];
    for (let month = 0; month < 12; month++) {
      if (monthlyLengths[month] && monthlyLengths[month].length > 0) {
        const avg =
          monthlyLengths[month].reduce((sum, length) => sum + length, 0) /
          monthlyLengths[month].length;
        monthlyAverages[month] = avg;
      } else {
        monthlyAverages[month] = this.modelParameters.cycleLengthMean;
      }
    }

    const overallMean = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;
    const deviations = monthlyAverages.map(avg => avg - overallMean);
    const amplitude = Math.max(...deviations) - Math.min(...deviations);

    return {
      hasSeasonalVariation: amplitude > 2,
      seasonalAmplitude: amplitude,
      peakMonth: deviations.indexOf(Math.max(...deviations)),
      valleyMonth: deviations.indexOf(Math.min(...deviations)),
      reliability: Math.min(1, cycleHistory.length / 24), // More reliable with 2+ years of data
    };
  }

  /**
   * Detect outliers in cycle lengths
   */
  private detectOutliers(cycleLengths: number[], mean: number, variance: number): number[] {
    const stdDev = Math.sqrt(variance);
    const outliers: number[] = [];

    cycleLengths.forEach((length, index) => {
      const zScore = Math.abs((length - mean) / stdDev);
      if (zScore > 2.5) {
        // More than 2.5 standard deviations
        outliers.push(index);
      }
    });

    return outliers;
  }

  /**
   * Calculate confidence in pattern detection
   */
  private calculatePatternConfidence(cycleLengths: number[]): number {
    if (cycleLengths.length < 2) return 0;

    const mean = cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;
    const variance = this.calculateVariance(cycleLengths, mean);
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Higher confidence with more data and lower variability
    const dataConfidence = Math.min(1, cycleLengths.length / 12);
    const consistencyConfidence = Math.max(0, 1 - coefficientOfVariation);

    return (dataConfidence + consistencyConfidence) / 2;
  }

  /**
   * Calculate uncertainty factors for predictions
   */
  private calculateUncertaintyFactors(
    cycleHistory: EncryptedCycleData[],
    cyclePattern: CyclePattern
  ): UncertaintyFactors {
    const historyLength = cycleHistory.length;
    const dataQuality = this.assessDataQuality(cycleHistory);
    const recentDataReliability = this.assessRecentDataReliability(cycleHistory);
    const cycleLengthVariability = Math.min(1, cyclePattern.variance / 25); // Normalize variance

    return {
      dataQuality,
      historyLength,
      cycleLengthVariability,
      recentDataReliability,
      seasonalPatterns: cyclePattern.seasonalPattern.hasSeasonalVariation,
    };
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(cycleHistory: EncryptedCycleData[]): number {
    if (cycleHistory.length === 0) return 0;

    let qualityScore = 0;
    const totalCycles = cycleHistory.length;

    cycleHistory.forEach(cycle => {
      let cycleScore = 0;

      // Check if period start and end dates are present
      if (cycle.periodStartDate) cycleScore += 0.3;
      if (cycle.periodEndDate) cycleScore += 0.2;

      // Check if day data is comprehensive
      if (cycle.dayData && cycle.dayData.length > 0) {
        cycleScore += 0.3;

        // Bonus for having symptom data
        const hasSymptoms = cycle.dayData.some(day => day.symptoms && day.symptoms.length > 0);
        if (hasSymptoms) cycleScore += 0.2;
      }

      qualityScore += cycleScore;
    });

    return Math.min(1, qualityScore / totalCycles);
  }

  /**
   * Assess reliability of recent data
   */
  private assessRecentDataReliability(cycleHistory: EncryptedCycleData[]): number {
    if (cycleHistory.length < 3) return 0.5;

    const recentCycles = cycleHistory.slice(-3);
    const recentLengths = this.extractCycleLengths([...cycleHistory.slice(-4), ...recentCycles]);

    if (recentLengths.length < 2) return 0.5;

    const variance = this.calculateVariance(
      recentLengths,
      recentLengths.reduce((sum, l) => sum + l, 0) / recentLengths.length
    );

    // Lower variance in recent cycles = higher reliability
    return Math.max(0.2, Math.min(1, 1 - variance / 25));
  }

  /**
   * Perform Bayesian inference for cycle prediction
   */
  private performBayesianInference(
    cycleHistory: EncryptedCycleData[],
    cyclePattern: CyclePattern
  ): BayesianInference {
    // Prior distribution (from model parameters)
    const priorDistribution: ProbabilityDistribution = {
      mean: this.modelParameters.cycleLengthMean,
      variance: this.modelParameters.cycleLengthVariance,
      distribution: this.generateNormalDistribution(
        this.modelParameters.cycleLengthMean,
        this.modelParameters.cycleLengthVariance
      ),
      support: [15, 50],
    };

    // Likelihood from observed data
    const cycleLengths = this.extractCycleLengths(cycleHistory);
    const likelihoodMean =
      cycleLengths.length > 0
        ? cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
        : this.modelParameters.cycleLengthMean;

    const likelihoodVariance =
      cycleLengths.length > 1
        ? this.calculateVariance(cycleLengths, likelihoodMean)
        : this.modelParameters.cycleLengthVariance;

    const likelihood: ProbabilityDistribution = {
      mean: likelihoodMean,
      variance: likelihoodVariance,
      distribution: this.generateNormalDistribution(likelihoodMean, likelihoodVariance),
      support: [15, 50],
    };

    // Posterior distribution (Bayesian update)
    const posteriorVariance =
      1 / (1 / priorDistribution.variance + cycleLengths.length / likelihoodVariance);
    const posteriorMean =
      posteriorVariance *
      (priorDistribution.mean / priorDistribution.variance +
        (cycleLengths.length * likelihoodMean) / likelihoodVariance);

    const posteriorDistribution: ProbabilityDistribution = {
      mean: posteriorMean,
      variance: posteriorVariance,
      distribution: this.generateNormalDistribution(posteriorMean, posteriorVariance),
      support: [15, 50],
    };

    // Calculate evidence and update strength
    const evidence = this.calculateEvidence(priorDistribution, likelihood);
    const updateStrength = cycleLengths.length / (cycleLengths.length + 1);

    return {
      priorDistribution,
      likelihood,
      posteriorDistribution,
      evidence,
      updateStrength,
    };
  }

  /**
   * Generate normal distribution array
   */
  private generateNormalDistribution(mean: number, variance: number): number[] {
    const stdDev = Math.sqrt(variance);
    const distribution: number[] = [];

    for (let x = 15; x <= 50; x++) {
      const probability =
        Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI));
      distribution.push(probability);
    }

    return distribution;
  }

  /**
   * Calculate marginal likelihood (evidence)
   */
  private calculateEvidence(
    prior: ProbabilityDistribution,
    likelihood: ProbabilityDistribution
  ): number {
    // Simplified evidence calculation
    const overlap = Math.exp(
      (-0.5 * Math.pow(prior.mean - likelihood.mean, 2)) / (prior.variance + likelihood.variance)
    );
    return overlap;
  }

  /**
   * Calculate confidence intervals from posterior distribution
   */
  private calculateConfidenceIntervals(
    posteriorDistribution: ProbabilityDistribution,
    uncertaintyFactors: UncertaintyFactors
  ): ConfidenceInterval {
    const stdDev = Math.sqrt(posteriorDistribution.variance);
    const uncertaintyMultiplier = 1 + (1 - uncertaintyFactors.dataQuality) * 0.5;

    return {
      p50: Math.ceil(0.67 * stdDev * uncertaintyMultiplier), // ~50% interval
      p80: Math.ceil(1.28 * stdDev * uncertaintyMultiplier), // ~80% interval
      p95: Math.ceil(1.96 * stdDev * uncertaintyMultiplier), // ~95% interval
    };
  }

  /**
   * Generate probability distribution for prediction visualization
   */
  private generateProbabilityDistribution(
    posteriorDistribution: ProbabilityDistribution,
    centerDate: Date
  ): number[] {
    const probabilities: number[] = [];
    const stdDev = Math.sqrt(posteriorDistribution.variance);

    // Generate probabilities for 14 days around predicted date
    for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
      const probability = Math.exp(-0.5 * Math.pow(dayOffset / stdDev, 2));
      probabilities.push(probability);
    }

    // Normalize probabilities to sum to 1
    const sum = probabilities.reduce((s, p) => s + p, 0);
    return probabilities.map(p => p / sum);
  }

  /**
   * Generate ovulation probability distribution
   */
  private generateOvulationProbability(
    ovulationDate: Date,
    confidence: ConfidenceInterval
  ): number[] {
    const probabilities: number[] = [];
    const uncertaintyRange = confidence.p80; // Use 80% confidence as base uncertainty

    // Generate probabilities for fertility window
    for (let dayOffset = -6; dayOffset <= 2; dayOffset++) {
      let probability = 0;

      if (dayOffset >= -5 && dayOffset <= 1) {
        // Within fertility window
        const distanceFromPeak = Math.abs(dayOffset);
        probability = Math.exp(-0.5 * Math.pow(distanceFromPeak / uncertaintyRange, 2));
      }

      probabilities.push(probability);
    }

    // Normalize
    const sum = probabilities.reduce((s, p) => s + p, 0);
    return probabilities.map(p => (sum > 0 ? p / sum : 0));
  }

  /**
   * Generate user-friendly prediction explanation
   */
  private generatePredictionExplanation(
    uncertaintyFactors: UncertaintyFactors,
    cyclePattern: CyclePattern
  ): string {
    let explanation = `Based on your cycle history of ${uncertaintyFactors.historyLength} cycles, `;

    if (uncertaintyFactors.dataQuality > 0.8) {
      explanation += 'with high-quality data, ';
    } else if (uncertaintyFactors.dataQuality > 0.6) {
      explanation += 'with good data quality, ';
    } else {
      explanation += 'with limited data, ';
    }

    if (cyclePattern.variance < 5) {
      explanation += 'your cycles are quite regular.';
    } else if (cyclePattern.variance < 15) {
      explanation += 'your cycles show moderate variability.';
    } else {
      explanation += 'your cycles are quite variable.';
    }

    if (uncertaintyFactors.seasonalPatterns) {
      explanation += ' Seasonal patterns have been detected in your cycle timing.';
    }

    return explanation;
  }

  /**
   * Generate ovulation explanation
   */
  private generateOvulationExplanation(uncertaintyFactors: UncertaintyFactors): string {
    let explanation =
      'Ovulation prediction is based on the typical luteal phase length of 14 days. ';

    if (uncertaintyFactors.dataQuality > 0.7) {
      explanation += 'Your cycle data provides a good basis for this prediction.';
    } else {
      explanation += 'More cycle data would improve prediction accuracy.';
    }

    explanation += ' The fertility window includes the 5 days before ovulation and 1 day after.';

    return explanation;
  }

  /**
   * Generate default prediction for insufficient data
   */
  private generateDefaultPrediction(): PeriodPrediction {
    const today = new Date();
    const defaultNextPeriod = new Date(today);
    defaultNextPeriod.setDate(today.getDate() + this.DEFAULT_CYCLE_LENGTH);

    return {
      nextPeriodStart: defaultNextPeriod.toISOString().split('T')[0],
      confidenceIntervals: {
        p50: 3,
        p80: 5,
        p95: 7,
      },
      uncertaintyFactors: {
        dataQuality: 0.1,
        historyLength: 0,
        cycleLengthVariability: 0.5,
        recentDataReliability: 0.1,
        seasonalPatterns: false,
      },
      probabilityDistribution: Array(15).fill(1 / 15), // Uniform distribution
      explanation:
        'Prediction based on average cycle length. Track more cycles for personalized predictions.',
    };
  }

  /**
   * Update model parameters with new cycle data
   */
  public updateModelParameters(newCycleData: EncryptedCycleData): void {
    // Implement adaptive learning logic
    const learningRate = this.modelParameters.adaptiveLearningRate;

    // Update cycle length parameters if we have previous cycle to compare
    if (newCycleData.cycleNumber > 1) {
      // This would be implemented with the actual previous cycle data
      // For now, we maintain the existing parameters
    }
  }

  /**
   * Get current model parameters
   */
  public getModelParameters(): BayesianModelParameters {
    return { ...this.modelParameters };
  }
}
