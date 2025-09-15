import {
  ConfidenceInterval,
  ProbabilityDistribution,
  UncertaintyFactors,
} from '@shared-types/prediction';

/**
 * Advanced statistical computation engine for interval calculations
 * Handles uncertainty propagation and statistical accuracy
 */
export class StatisticalIntervalComputer {
  private readonly MONTE_CARLO_SAMPLES = 10000;
  private readonly BOOTSTRAP_ITERATIONS = 1000;

  /**
   * Compute confidence intervals using Monte Carlo simulation
   * Provides more accurate intervals for complex distributions
   */
  computeMonteCarloIntervals(
    meanPrediction: number,
    uncertaintyParameters: UncertaintyParameters,
    confidenceLevels: number[] = [0.5, 0.8, 0.95]
  ): ConfidenceInterval {
    const samples = this.generateMonteCarloSamples(meanPrediction, uncertaintyParameters);

    // Sort samples for percentile calculation
    const sortedSamples = samples.sort((a, b) => a - b);

    return {
      p50: this.calculatePercentileInterval(sortedSamples, 0.5),
      p80: this.calculatePercentileInterval(sortedSamples, 0.8),
      p95: this.calculatePercentileInterval(sortedSamples, 0.95),
    };
  }

  /**
   * Compute bootstrap confidence intervals from historical data
   */
  computeBootstrapIntervals(
    historicalData: number[],
    confidenceLevels: number[] = [0.5, 0.8, 0.95]
  ): ConfidenceInterval {
    if (historicalData.length < 3) {
      // Fall back to basic intervals for insufficient data
      return this.computeBasicIntervals(historicalData);
    }

    const bootstrapMeans: number[] = [];

    // Perform bootstrap resampling
    for (let i = 0; i < this.BOOTSTRAP_ITERATIONS; i++) {
      const sample = this.bootstrapSample(historicalData);
      bootstrapMeans.push(this.calculateMean(sample));
    }

    const sortedMeans = bootstrapMeans.sort((a, b) => a - b);

    return {
      p50: this.calculatePercentileInterval(sortedMeans, 0.5),
      p80: this.calculatePercentileInterval(sortedMeans, 0.8),
      p95: this.calculatePercentileInterval(sortedMeans, 0.95),
    };
  }

  /**
   * Propagate uncertainty through the prediction pipeline
   */
  propagateUncertainty(
    modelUncertainty: UncertaintySource,
    dataUncertainty: UncertaintySource,
    measurementUncertainty: UncertaintySource
  ): PropagatedUncertainty {
    // Use Taylor series expansion for uncertainty propagation
    const combinedVariance =
      modelUncertainty.variance + dataUncertainty.variance + measurementUncertainty.variance;

    // Account for correlations between uncertainty sources
    const correlationAdjustment = this.calculateCorrelationAdjustment(
      modelUncertainty,
      dataUncertainty,
      measurementUncertainty
    );

    const totalUncertainty = Math.sqrt(combinedVariance + correlationAdjustment);

    return {
      totalUncertainty,
      components: {
        model: modelUncertainty.standardDeviation / totalUncertainty,
        data: dataUncertainty.standardDeviation / totalUncertainty,
        measurement: measurementUncertainty.standardDeviation / totalUncertainty,
      },
      correlationEffect: correlationAdjustment / combinedVariance,
    };
  }

  /**
   * Compute prediction intervals accounting for future variability
   */
  computePredictionIntervals(
    modelPrediction: number,
    modelUncertainty: number,
    futureVariability: number
  ): ConfidenceInterval {
    // Prediction intervals are wider than confidence intervals
    // They account for both model uncertainty and future observation variability
    const totalVariability = Math.sqrt(
      modelUncertainty * modelUncertainty + futureVariability * futureVariability
    );

    const zScores = {
      p50: 0.674,
      p80: 1.282,
      p95: 1.96,
    };

    return {
      p50: Math.round(zScores.p50 * totalVariability * 2),
      p80: Math.round(zScores.p80 * totalVariability * 2),
      p95: Math.round(zScores.p95 * totalVariability * 2),
    };
  }

  /**
   * Calculate interval coverage probability
   */
  calculateIntervalCoverage(
    intervals: ConfidenceInterval,
    actualOutcomes: number[],
    predictions: number[]
  ): IntervalCoverage {
    if (actualOutcomes.length !== predictions.length) {
      throw new Error('Outcomes and predictions arrays must have the same length');
    }

    let p50Coverage = 0;
    let p80Coverage = 0;
    let p95Coverage = 0;

    for (let i = 0; i < actualOutcomes.length; i++) {
      const actual = actualOutcomes[i];
      const predicted = predictions[i];
      const error = Math.abs(actual - predicted);

      if (error <= intervals.p50 / 2) p50Coverage++;
      if (error <= intervals.p80 / 2) p80Coverage++;
      if (error <= intervals.p95 / 2) p95Coverage++;
    }

    const total = actualOutcomes.length;
    return {
      p50: p50Coverage / total,
      p80: p80Coverage / total,
      p95: p95Coverage / total,
      sampleSize: total,
    };
  }

  /**
   * Adjust intervals based on historical coverage
   */
  adjustIntervalsForCoverage(
    currentIntervals: ConfidenceInterval,
    actualCoverage: IntervalCoverage,
    targetCoverage: ConfidenceInterval = { p50: 0.5, p80: 0.8, p95: 0.95 }
  ): ConfidenceInterval {
    const adjustmentFactors = {
      p50: this.calculateAdjustmentFactor(actualCoverage.p50, targetCoverage.p50),
      p80: this.calculateAdjustmentFactor(actualCoverage.p80, targetCoverage.p80),
      p95: this.calculateAdjustmentFactor(actualCoverage.p95, targetCoverage.p95),
    };

    return {
      p50: Math.round(currentIntervals.p50 * adjustmentFactors.p50),
      p80: Math.round(currentIntervals.p80 * adjustmentFactors.p80),
      p95: Math.round(currentIntervals.p95 * adjustmentFactors.p95),
    };
  }

  /**
   * Generate Monte Carlo samples with complex uncertainty
   */
  private generateMonteCarloSamples(mean: number, params: UncertaintyParameters): number[] {
    const samples: number[] = [];

    for (let i = 0; i < this.MONTE_CARLO_SAMPLES; i++) {
      let sample = mean;

      // Add model uncertainty
      sample += this.randomNormal() * params.modelStdDev;

      // Add data uncertainty
      sample += this.randomNormal() * params.dataStdDev;

      // Add systematic bias
      sample += params.systematicBias;

      // Add seasonal variation
      if (params.seasonalAmplitude > 0) {
        const seasonalEffect =
          params.seasonalAmplitude * Math.sin((2 * Math.PI * (params.seasonalPhase || 0)) / 365.25);
        sample += seasonalEffect;
      }

      samples.push(sample);
    }

    return samples;
  }

  /**
   * Calculate percentile-based interval width
   */
  private calculatePercentileInterval(sortedSamples: number[], confidence: number): number {
    const alpha = 1 - confidence;
    const lowerIndex = Math.floor((sortedSamples.length * alpha) / 2);
    const upperIndex = Math.ceil(sortedSamples.length * (1 - alpha / 2)) - 1;

    const lower = sortedSamples[lowerIndex];
    const upper = sortedSamples[upperIndex];

    return Math.round(upper - lower);
  }

  /**
   * Bootstrap sample generation
   */
  private bootstrapSample(data: number[]): number[] {
    const sample: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }

  /**
   * Calculate mean of array
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate correlation adjustment for uncertainty propagation
   */
  private calculateCorrelationAdjustment(
    source1: UncertaintySource,
    source2: UncertaintySource,
    source3: UncertaintySource
  ): number {
    // Estimate correlations between uncertainty sources
    const correlation12 = 0.3; // Model and data uncertainty correlation
    const correlation13 = 0.1; // Model and measurement uncertainty correlation
    const correlation23 = 0.2; // Data and measurement uncertainty correlation

    return (
      2 *
      (correlation12 * source1.standardDeviation * source2.standardDeviation +
        correlation13 * source1.standardDeviation * source3.standardDeviation +
        correlation23 * source2.standardDeviation * source3.standardDeviation)
    );
  }

  /**
   * Generate random normal distribution sample
   */
  private randomNormal(): number {
    // Box-Muller transformation
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Calculate adjustment factor for interval calibration
   */
  private calculateAdjustmentFactor(actualCoverage: number, targetCoverage: number): number {
    if (actualCoverage === 0) return 1.5; // Increase intervals significantly

    const ratio = targetCoverage / actualCoverage;

    // Smooth adjustment to avoid oscillations
    if (ratio > 1.2) return 1.2; // Maximum 20% increase per adjustment
    if (ratio < 0.8) return 0.8; // Maximum 20% decrease per adjustment

    return ratio;
  }

  /**
   * Compute basic intervals for small datasets
   */
  private computeBasicIntervals(data: number[]): ConfidenceInterval {
    if (data.length === 0) {
      return { p50: 7, p80: 14, p95: 21 }; // Default intervals
    }

    const mean = this.calculateMean(data);
    const stdDev = this.calculateStandardDeviation(data);

    return {
      p50: Math.round(0.674 * stdDev * 2),
      p80: Math.round(1.282 * stdDev * 2),
      p95: Math.round(1.96 * stdDev * 2),
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => (val - mean) ** 2);
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }
}

// Supporting interfaces
interface UncertaintyParameters {
  modelStdDev: number;
  dataStdDev: number;
  systematicBias: number;
  seasonalAmplitude: number;
  seasonalPhase?: number;
}

interface UncertaintySource {
  standardDeviation: number;
  variance: number;
}

interface PropagatedUncertainty {
  totalUncertainty: number;
  components: {
    model: number;
    data: number;
    measurement: number;
  };
  correlationEffect: number;
}

interface IntervalCoverage {
  p50: number;
  p80: number;
  p95: number;
  sampleSize: number;
}

export default StatisticalIntervalComputer;
