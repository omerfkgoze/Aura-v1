import type {
  CalibrationPoint,
  ModelCalibration,
  AccuracyRecord,
  PredictionAccuracy,
} from '@aura/shared-types';

export interface CalibrationMetrics {
  expectedCalibrationError: number;
  maximumCalibrationError: number;
  averageCalibrationError: number;
  brierScore: number;
  brierSkillScore: number;
  logLoss: number;
  calibrationSlope: number;
  calibrationIntercept: number;
  reliabilityIndex: number;
  sharpness: number;
}

export interface CalibrationTrend {
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  confidenceInTrend: number;
  significantChange: boolean;
  timeHorizon: 'recent' | 'medium' | 'long_term';
}

export interface CalibrationReport {
  currentMetrics: CalibrationMetrics;
  historicalTrend: CalibrationTrend;
  performanceByConfidenceLevel: {
    confidenceLevel: number;
    accuracy: number;
    sampleSize: number;
    calibrationError: number;
  }[];
  recommendations: string[];
  qualityScore: number; // 0-100
}

export class CalibrationMetricsCalculator {
  private readonly CONFIDENCE_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
  private readonly TREND_WINDOW_DAYS = 30;
  private readonly MIN_SAMPLES_FOR_TREND = 10;

  /**
   * Calculate comprehensive calibration metrics
   */
  calculateCalibrationMetrics(accuracyHistory: AccuracyRecord[]): CalibrationMetrics {
    if (accuracyHistory.length === 0) {
      return this.getEmptyMetrics();
    }

    const ece = this.calculateExpectedCalibrationError(accuracyHistory);
    const mce = this.calculateMaximumCalibrationError(accuracyHistory);
    const ace = this.calculateAverageCalibrationError(accuracyHistory);
    const brierScore = this.calculateBrierScore(accuracyHistory);
    const brierSkillScore = this.calculateBrierSkillScore(accuracyHistory);
    const logLoss = this.calculateLogLoss(accuracyHistory);
    const { slope, intercept } = this.calculateCalibrationRegression(accuracyHistory);
    const reliabilityIndex = this.calculateReliabilityIndex(accuracyHistory);
    const sharpness = this.calculateSharpness(accuracyHistory);

    return {
      expectedCalibrationError: ece,
      maximumCalibrationError: mce,
      averageCalibrationError: ace,
      brierScore,
      brierSkillScore,
      logLoss,
      calibrationSlope: slope,
      calibrationIntercept: intercept,
      reliabilityIndex,
      sharpness,
    };
  }

  /**
   * Generate comprehensive calibration report
   */
  generateCalibrationReport(
    currentAccuracy: AccuracyRecord[],
    historicalAccuracy: AccuracyRecord[],
    predictionType: 'period' | 'ovulation'
  ): CalibrationReport {
    const currentMetrics = this.calculateCalibrationMetrics(currentAccuracy);
    const historicalTrend = this.analyzeCalibrationTrend(historicalAccuracy);
    const performanceByLevel = this.analyzePerformanceByConfidenceLevel(currentAccuracy);
    const recommendations = this.generateMetricsRecommendations(
      currentMetrics,
      historicalTrend,
      predictionType
    );
    const qualityScore = this.calculateQualityScore(currentMetrics);

    return {
      currentMetrics,
      historicalTrend,
      performanceByConfidenceLevel: performanceByLevel,
      recommendations,
      qualityScore,
    };
  }

  /**
   * Calculate Expected Calibration Error (ECE)
   */
  private calculateExpectedCalibrationError(accuracyHistory: AccuracyRecord[]): number {
    const bins = this.binPredictionsByConfidence(accuracyHistory, 10);
    const totalSamples = accuracyHistory.length;

    return bins.reduce((ece, bin) => {
      if (bin.samples.length === 0) return ece;

      const weight = bin.samples.length / totalSamples;
      const avgConfidence =
        bin.samples.reduce((sum, s) => sum + s.confidenceLevel, 0) / bin.samples.length;
      const accuracy = bin.samples.filter(s => s.wasAccurate).length / bin.samples.length;
      const calibrationError = Math.abs(avgConfidence - accuracy);

      return ece + weight * calibrationError;
    }, 0);
  }

  /**
   * Calculate Maximum Calibration Error (MCE)
   */
  private calculateMaximumCalibrationError(accuracyHistory: AccuracyRecord[]): number {
    const bins = this.binPredictionsByConfidence(accuracyHistory, 10);

    return Math.max(
      ...bins.map(bin => {
        if (bin.samples.length === 0) return 0;

        const avgConfidence =
          bin.samples.reduce((sum, s) => sum + s.confidenceLevel, 0) / bin.samples.length;
        const accuracy = bin.samples.filter(s => s.wasAccurate).length / bin.samples.length;
        return Math.abs(avgConfidence - accuracy);
      })
    );
  }

  /**
   * Calculate Average Calibration Error (ACE)
   */
  private calculateAverageCalibrationError(accuracyHistory: AccuracyRecord[]): number {
    const bins = this.binPredictionsByConfidence(accuracyHistory, 10);
    const nonEmptyBins = bins.filter(bin => bin.samples.length > 0);

    if (nonEmptyBins.length === 0) return 0;

    const totalError = nonEmptyBins.reduce((ace, bin) => {
      const avgConfidence =
        bin.samples.reduce((sum, s) => sum + s.confidenceLevel, 0) / bin.samples.length;
      const accuracy = bin.samples.filter(s => s.wasAccurate).length / bin.samples.length;
      return ace + Math.abs(avgConfidence - accuracy);
    }, 0);

    return totalError / nonEmptyBins.length;
  }

  /**
   * Calculate Brier Score
   */
  private calculateBrierScore(accuracyHistory: AccuracyRecord[]): number {
    if (accuracyHistory.length === 0) return 1;

    return (
      accuracyHistory.reduce((sum, record) => {
        const predicted = record.confidenceLevel;
        const actual = record.wasAccurate ? 1 : 0;
        return sum + Math.pow(predicted - actual, 2);
      }, 0) / accuracyHistory.length
    );
  }

  /**
   * Calculate Brier Skill Score
   */
  private calculateBrierSkillScore(accuracyHistory: AccuracyRecord[]): number {
    const brierScore = this.calculateBrierScore(accuracyHistory);
    const baseRate = accuracyHistory.filter(r => r.wasAccurate).length / accuracyHistory.length;
    const brierReference = baseRate * (1 - baseRate); // Brier score of always predicting base rate

    if (brierReference === 0) return 0;
    return 1 - brierScore / brierReference;
  }

  /**
   * Calculate Log Loss (Cross-entropy)
   */
  private calculateLogLoss(accuracyHistory: AccuracyRecord[]): number {
    if (accuracyHistory.length === 0) return Infinity;

    return (
      -accuracyHistory.reduce((sum, record) => {
        const predicted = Math.max(0.001, Math.min(0.999, record.confidenceLevel)); // Clip to avoid log(0)
        const actual = record.wasAccurate ? 1 : 0;
        return sum + actual * Math.log(predicted) + (1 - actual) * Math.log(1 - predicted);
      }, 0) / accuracyHistory.length
    );
  }

  /**
   * Calculate calibration regression (slope and intercept)
   */
  private calculateCalibrationRegression(accuracyHistory: AccuracyRecord[]): {
    slope: number;
    intercept: number;
  } {
    if (accuracyHistory.length < 2) return { slope: 1, intercept: 0 };

    const n = accuracyHistory.length;
    const sumX = accuracyHistory.reduce((sum, r) => sum + r.confidenceLevel, 0);
    const sumY = accuracyHistory.reduce((sum, r) => sum + (r.wasAccurate ? 1 : 0), 0);
    const sumXY = accuracyHistory.reduce(
      (sum, r) => sum + r.confidenceLevel * (r.wasAccurate ? 1 : 0),
      0
    );
    const sumXX = accuracyHistory.reduce(
      (sum, r) => sum + r.confidenceLevel * r.confidenceLevel,
      0
    );

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope: isNaN(slope) ? 1 : slope, intercept: isNaN(intercept) ? 0 : intercept };
  }

  /**
   * Calculate reliability index
   */
  private calculateReliabilityIndex(accuracyHistory: AccuracyRecord[]): number {
    const bins = this.binPredictionsByConfidence(accuracyHistory, 10);
    const totalSamples = accuracyHistory.length;

    return bins.reduce((reliability, bin) => {
      if (bin.samples.length === 0) return reliability;

      const weight = bin.samples.length / totalSamples;
      const avgConfidence =
        bin.samples.reduce((sum, s) => sum + s.confidenceLevel, 0) / bin.samples.length;
      const accuracy = bin.samples.filter(s => s.wasAccurate).length / bin.samples.length;

      return reliability + weight * Math.pow(avgConfidence - accuracy, 2);
    }, 0);
  }

  /**
   * Calculate sharpness (how often predictions are close to 0 or 1)
   */
  private calculateSharpness(accuracyHistory: AccuracyRecord[]): number {
    if (accuracyHistory.length === 0) return 0;

    const baseRate = accuracyHistory.filter(r => r.wasAccurate).length / accuracyHistory.length;

    return (
      accuracyHistory.reduce((sum, record) => {
        return sum + Math.pow(record.confidenceLevel - baseRate, 2);
      }, 0) / accuracyHistory.length
    );
  }

  /**
   * Bin predictions by confidence level
   */
  private binPredictionsByConfidence(
    accuracyHistory: AccuracyRecord[],
    numBins: number
  ): { binStart: number; binEnd: number; samples: AccuracyRecord[] }[] {
    const bins: { binStart: number; binEnd: number; samples: AccuracyRecord[] }[] = [];
    const binSize = 1.0 / numBins;

    for (let i = 0; i < numBins; i++) {
      const binStart = i * binSize;
      const binEnd = (i + 1) * binSize;

      const samplesInBin = accuracyHistory.filter(
        record =>
          record.confidenceLevel >= binStart &&
          (record.confidenceLevel < binEnd ||
            (i === numBins - 1 && record.confidenceLevel <= binEnd))
      );

      bins.push({ binStart, binEnd, samples: samplesInBin });
    }

    return bins;
  }

  /**
   * Analyze calibration trend over time
   */
  private analyzeCalibrationTrend(historicalAccuracy: AccuracyRecord[]): CalibrationTrend {
    if (historicalAccuracy.length < this.MIN_SAMPLES_FOR_TREND) {
      return {
        direction: 'stable',
        rate: 0,
        confidenceInTrend: 0,
        significantChange: false,
        timeHorizon: 'recent',
      };
    }

    // Sort by prediction date
    const sortedHistory = [...historicalAccuracy].sort(
      (a, b) => new Date(a.predictionDate).getTime() - new Date(b.predictionDate).getTime()
    );

    // Calculate rolling calibration errors
    const windowSize = Math.max(5, Math.floor(sortedHistory.length / 5));
    const calibrationErrors: { time: number; error: number }[] = [];

    for (let i = windowSize; i <= sortedHistory.length; i++) {
      const window = sortedHistory.slice(i - windowSize, i);
      const error = this.calculateExpectedCalibrationError(window);
      const time = new Date(window[window.length - 1].predictionDate).getTime();
      calibrationErrors.push({ time, error });
    }

    if (calibrationErrors.length < 2) {
      return {
        direction: 'stable',
        rate: 0,
        confidenceInTrend: 0,
        significantChange: false,
        timeHorizon: 'recent',
      };
    }

    // Calculate trend using linear regression
    const n = calibrationErrors.length;
    const sumX = calibrationErrors.reduce((sum, point) => sum + point.time, 0);
    const sumY = calibrationErrors.reduce((sum, point) => sum + point.error, 0);
    const sumXY = calibrationErrors.reduce((sum, point) => sum + point.time * point.error, 0);
    const sumXX = calibrationErrors.reduce((sum, point) => sum + point.time * point.time, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence in trend
    const meanError = sumY / n;
    const totalSumSquares = calibrationErrors.reduce(
      (sum, point) => sum + Math.pow(point.error - meanError, 2),
      0
    );
    const residualSumSquares = calibrationErrors.reduce(
      (sum, point) => sum + Math.pow(point.error - (slope * point.time + intercept), 2),
      0
    );
    const rSquared = 1 - residualSumSquares / totalSumSquares;

    // Determine trend direction and significance
    const direction = slope > 0.001 ? 'declining' : slope < -0.001 ? 'improving' : 'stable';
    const significantChange = Math.abs(slope) > 0.001 && rSquared > 0.3;
    const rate = Math.abs(slope) * (24 * 60 * 60 * 1000 * 30); // Rate per month

    return {
      direction,
      rate,
      confidenceInTrend: rSquared,
      significantChange,
      timeHorizon:
        calibrationErrors.length > 20
          ? 'long_term'
          : calibrationErrors.length > 10
            ? 'medium'
            : 'recent',
    };
  }

  /**
   * Analyze performance by confidence level
   */
  private analyzePerformanceByConfidenceLevel(accuracyHistory: AccuracyRecord[]): {
    confidenceLevel: number;
    accuracy: number;
    sampleSize: number;
    calibrationError: number;
  }[] {
    return this.CONFIDENCE_LEVELS.map(level => {
      const tolerance = 0.05;
      const recordsAtLevel = accuracyHistory.filter(
        record => Math.abs(record.confidenceLevel - level) <= tolerance
      );

      if (recordsAtLevel.length === 0) {
        return {
          confidenceLevel: level,
          accuracy: 0,
          sampleSize: 0,
          calibrationError: 0,
        };
      }

      const accuracy = recordsAtLevel.filter(r => r.wasAccurate).length / recordsAtLevel.length;
      const calibrationError = Math.abs(level - accuracy);

      return {
        confidenceLevel: level,
        accuracy,
        sampleSize: recordsAtLevel.length,
        calibrationError,
      };
    });
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateMetricsRecommendations(
    metrics: CalibrationMetrics,
    trend: CalibrationTrend,
    predictionType: 'period' | 'ovulation'
  ): string[] {
    const recommendations: string[] = [];

    // Expected Calibration Error recommendations
    if (metrics.expectedCalibrationError > 0.1) {
      recommendations.push(
        `High calibration error (${(metrics.expectedCalibrationError * 100).toFixed(1)}%) - predictions need recalibration`
      );
    } else if (metrics.expectedCalibrationError < 0.05) {
      recommendations.push(
        `Excellent calibration - confidence levels accurately reflect uncertainty`
      );
    }

    // Brier Score recommendations
    if (metrics.brierScore > 0.25) {
      recommendations.push(
        `High Brier score indicates room for improvement in ${predictionType} prediction accuracy`
      );
    }

    // Brier Skill Score recommendations
    if (metrics.brierSkillScore < 0) {
      recommendations.push(`Negative skill score - predictions perform worse than baseline rates`);
    } else if (metrics.brierSkillScore > 0.2) {
      recommendations.push(`Good predictive skill - significantly better than baseline`);
    }

    // Calibration slope recommendations
    if (Math.abs(metrics.calibrationSlope - 1) > 0.2) {
      if (metrics.calibrationSlope > 1.2) {
        recommendations.push(`Overconfident predictions - consider using lower confidence levels`);
      } else if (metrics.calibrationSlope < 0.8) {
        recommendations.push(`Underconfident predictions - confidence levels could be higher`);
      }
    }

    // Trend-based recommendations
    if (trend.significantChange) {
      switch (trend.direction) {
        case 'improving':
          recommendations.push(
            `Calibration is improving over time - current tracking approach is working well`
          );
          break;
        case 'declining':
          recommendations.push(
            `Calibration is declining - review recent tracking consistency and data quality`
          );
          break;
      }
    }

    // Reliability index recommendations
    if (metrics.reliabilityIndex > 0.05) {
      recommendations.push(`High reliability component suggests systematic calibration bias`);
    }

    // Sharpness recommendations
    if (metrics.sharpness < 0.01) {
      recommendations.push(`Low sharpness - predictions could be more discriminative`);
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private calculateQualityScore(metrics: CalibrationMetrics): number {
    let score = 100;

    // Penalize high calibration errors
    score -= metrics.expectedCalibrationError * 200; // Up to -20 points
    score -= Math.min(metrics.maximumCalibrationError * 100, 30); // Up to -30 points

    // Penalize high Brier score
    score -= Math.min(metrics.brierScore * 100, 25); // Up to -25 points

    // Reward good skill score
    if (metrics.brierSkillScore > 0) {
      score += Math.min(metrics.brierSkillScore * 20, 10); // Up to +10 points
    } else {
      score += metrics.brierSkillScore * 20; // Negative penalty
    }

    // Penalize poor calibration slope
    score -= Math.min(Math.abs(metrics.calibrationSlope - 1) * 50, 15); // Up to -15 points

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get empty metrics for initialization
   */
  private getEmptyMetrics(): CalibrationMetrics {
    return {
      expectedCalibrationError: 0,
      maximumCalibrationError: 0,
      averageCalibrationError: 0,
      brierScore: 1,
      brierSkillScore: 0,
      logLoss: Infinity,
      calibrationSlope: 1,
      calibrationIntercept: 0,
      reliabilityIndex: 0,
      sharpness: 0,
    };
  }
}

export default CalibrationMetricsCalculator;
