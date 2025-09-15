import {
  PredictionAccuracy,
  AccuracyRecord,
  OvulationPrediction,
  PeriodPrediction,
} from '@aura/shared-types/prediction';
import { EncryptedCycleData } from '@aura/shared-types';

/**
 * Accuracy Metrics Calculator for Probabilistic Predictions
 * Implements Brier score and negative log-likelihood for prediction evaluation
 */
export class AccuracyMetricsCalculator {
  private readonly ACCURACY_HISTORY_LIMIT = 100; // Keep last 100 predictions for analysis

  /**
   * Calculate Brier score for probabilistic predictions
   * Lower scores indicate better calibration (0 = perfect, 1 = worst possible)
   */
  calculateBrierScore(predictions: ProbabilisticPrediction[], outcomes: boolean[]): number {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
      throw new Error('Predictions and outcomes arrays must have the same non-zero length');
    }

    let totalScore = 0;

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      const outcome = outcomes[i] ? 1 : 0; // Convert boolean to numeric

      // Brier score = (forecast - outcome)^2
      const score = Math.pow(prediction.probability - outcome, 2);
      totalScore += score;
    }

    return totalScore / predictions.length;
  }

  /**
   * Calculate negative log-likelihood for probabilistic predictions
   * Lower values indicate better predictions
   */
  calculateNegativeLogLikelihood(
    predictions: ProbabilisticPrediction[],
    outcomes: boolean[]
  ): number {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
      throw new Error('Predictions and outcomes arrays must have the same non-zero length');
    }

    let totalLogLikelihood = 0;

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      const outcome = outcomes[i];

      // Avoid log(0) by clamping probabilities
      const clampedProbability = Math.max(0.001, Math.min(0.999, prediction.probability));

      // Log-likelihood = log(p) if outcome is true, log(1-p) if false
      const logLikelihood = outcome
        ? Math.log(clampedProbability)
        : Math.log(1 - clampedProbability);

      totalLogLikelihood += logLikelihood;
    }

    // Return negative log-likelihood (lower is better)
    return -totalLogLikelihood / predictions.length;
  }

  /**
   * Calculate calibration score (reliability of confidence levels)
   * Measures how well predicted probabilities match observed frequencies
   */
  calculateCalibrationScore(predictions: ProbabilisticPrediction[], outcomes: boolean[]): number {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
      return 0;
    }

    // Create probability bins (0-0.1, 0.1-0.2, ..., 0.9-1.0)
    const bins = this.createCalibrationBins(predictions, outcomes);

    let calibrationError = 0;
    let totalWeight = 0;

    for (const bin of bins) {
      if (bin.count > 0) {
        const weight = bin.count / predictions.length;
        const error = Math.abs(bin.meanPrediction - bin.observedFrequency);
        calibrationError += weight * error;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? calibrationError / totalWeight : 0;
  }

  /**
   * Track accuracy for period predictions
   */
  async trackPeriodAccuracy(
    prediction: PeriodPrediction,
    actualPeriodStartDate: Date
  ): Promise<AccuracyRecord> {
    const predictedDate = new Date(prediction.nextPeriodStart);
    const errorDays = Math.abs(this.daysDifference(predictedDate, actualPeriodStartDate));

    // Convert to probabilistic format for Brier score calculation
    const probabilisticPredictions = this.convertToProabilistic(prediction, actualPeriodStartDate);
    const outcomes = probabilisticPredictions.map(p => p.wasCorrect);
    const brierScore = this.calculateBrierScore(
      probabilisticPredictions.map(p => ({ probability: p.probability })),
      outcomes
    );

    return {
      predictionDate: new Date().toISOString(),
      actualDate: actualPeriodStartDate.toISOString(),
      confidenceLevel: prediction.confidenceIntervals.p50,
      wasAccurate: errorDays <= 2, // Within 2 days is considered accurate
      errorDays,
      brierScore,
    };
  }

  /**
   * Track accuracy for ovulation predictions
   */
  async trackOvulationAccuracy(
    prediction: OvulationPrediction,
    actualOvulationDate: Date | null
  ): Promise<AccuracyRecord> {
    if (!actualOvulationDate) {
      return {
        predictionDate: new Date().toISOString(),
        actualDate: null,
        confidenceLevel: prediction.confidenceIntervals.p50,
        wasAccurate: false,
        errorDays: null,
        brierScore: 1.0, // Worst possible score for unknown outcome
      };
    }

    const predictedDate = new Date(prediction.ovulationDate);
    const errorDays = Math.abs(this.daysDifference(predictedDate, actualOvulationDate));

    // Calculate Brier score based on probability distribution
    const brierScore = this.calculateOvulationBrierScore(prediction, actualOvulationDate);

    return {
      predictionDate: new Date().toISOString(),
      actualDate: actualOvulationDate.toISOString(),
      confidenceLevel: prediction.confidenceIntervals.p50,
      wasAccurate: errorDays <= 2,
      errorDays,
      brierScore,
    };
  }

  /**
   * Calculate comprehensive accuracy metrics from history
   */
  calculateAccuracyMetrics(accuracyHistory: AccuracyRecord[]): PredictionAccuracy {
    if (accuracyHistory.length === 0) {
      return this.getDefaultAccuracyMetrics();
    }

    const validRecords = accuracyHistory.filter(
      record => record.actualDate !== null && record.brierScore !== null
    );

    if (validRecords.length === 0) {
      return this.getDefaultAccuracyMetrics();
    }

    // Calculate overall Brier score
    const overallBrierScore =
      validRecords.reduce((sum, record) => sum + record.brierScore, 0) / validRecords.length;

    // Calculate negative log-likelihood from error patterns
    const negativeLogLikelihood = this.calculateNLLFromHistory(validRecords);

    // Calculate calibration score
    const calibrationScore = this.calculateCalibrationFromHistory(validRecords);

    return {
      brierScore: overallBrierScore,
      negativeLogLikelihood,
      calibrationScore,
      accuracyHistory: accuracyHistory.slice(-this.ACCURACY_HISTORY_LIMIT),
    };
  }

  /**
   * Generate accuracy insights and recommendations
   */
  generateAccuracyInsights(metrics: PredictionAccuracy): AccuracyInsights {
    const insights: AccuracyInsights = {
      overallPerformance: this.categorizePerformance(metrics.brierScore),
      calibrationQuality: this.categorizeCalibration(metrics.calibrationScore),
      recommendations: [],
      trends: this.analyzeTrends(metrics.accuracyHistory),
    };

    // Generate recommendations based on metrics
    if (metrics.brierScore > 0.3) {
      insights.recommendations.push(
        'Consider collecting more cycle data to improve prediction accuracy'
      );
    }

    if (metrics.calibrationScore > 0.1) {
      insights.recommendations.push(
        'Confidence levels may need recalibration - predictions appear over or under-confident'
      );
    }

    if (insights.trends.isImproving) {
      insights.recommendations.push('Prediction accuracy is improving as more data is collected');
    } else if (insights.trends.isDeteriorating) {
      insights.recommendations.push(
        'Recent predictions show declining accuracy - cycle patterns may be changing'
      );
    }

    return insights;
  }

  /**
   * Compare accuracy across different time periods
   */
  compareAccuracyPeriods(
    recentHistory: AccuracyRecord[],
    olderHistory: AccuracyRecord[]
  ): AccuracyComparison {
    const recentMetrics = this.calculateAccuracyMetrics(recentHistory);
    const olderMetrics = this.calculateAccuracyMetrics(olderHistory);

    return {
      recentBrierScore: recentMetrics.brierScore,
      olderBrierScore: olderMetrics.brierScore,
      brierScoreImprovement: olderMetrics.brierScore - recentMetrics.brierScore,
      recentCalibration: recentMetrics.calibrationScore,
      olderCalibration: olderMetrics.calibrationScore,
      calibrationImprovement: olderMetrics.calibrationScore - recentMetrics.calibrationScore,
      significantImprovement: this.isSignificantImprovement(recentMetrics, olderMetrics),
    };
  }

  // Private helper methods

  private convertToProabilistic(
    prediction: PeriodPrediction,
    actualDate: Date
  ): ProbabilisticOutcome[] {
    const outcomes: ProbabilisticOutcome[] = [];
    const predictedDate = new Date(prediction.nextPeriodStart);

    // Create probabilistic outcomes for each day in the confidence range
    for (let i = -5; i <= 5; i++) {
      const testDate = new Date(predictedDate);
      testDate.setDate(testDate.getDate() + i);

      const probability = this.interpolateProbability(
        prediction.probabilityDistribution,
        i + 5, // Offset for array index
        prediction.probabilityDistribution.length
      );

      const wasCorrect = Math.abs(this.daysDifference(testDate, actualDate)) <= 1;

      outcomes.push({
        probability,
        wasCorrect,
      });
    }

    return outcomes;
  }

  private calculateOvulationBrierScore(prediction: OvulationPrediction, actualDate: Date): number {
    const predictedDate = new Date(prediction.ovulationDate);
    const daysDiff = this.daysDifference(predictedDate, actualDate);

    // Find the probability assigned to the actual outcome day
    const distributionIndex = Math.max(
      0,
      Math.min(
        prediction.probabilityDistribution.length - 1,
        Math.floor(prediction.probabilityDistribution.length / 2) + daysDiff
      )
    );

    const assignedProbability = prediction.probabilityDistribution[distributionIndex];
    const outcome = Math.abs(daysDiff) <= 2 ? 1 : 0; // Within 2 days = correct

    return Math.pow(assignedProbability - outcome, 2);
  }

  private createCalibrationBins(
    predictions: ProbabilisticPrediction[],
    outcomes: boolean[]
  ): CalibrationBin[] {
    const bins: CalibrationBin[] = Array.from({ length: 10 }, (_, i) => ({
      binStart: i * 0.1,
      binEnd: (i + 1) * 0.1,
      predictions: [],
      outcomes: [],
      count: 0,
      meanPrediction: 0,
      observedFrequency: 0,
    }));

    // Sort predictions into bins
    for (let i = 0; i < predictions.length; i++) {
      const probability = predictions[i].probability;
      const binIndex = Math.min(9, Math.floor(probability * 10));

      bins[binIndex].predictions.push(probability);
      bins[binIndex].outcomes.push(outcomes[i]);
      bins[binIndex].count++;
    }

    // Calculate statistics for each bin
    bins.forEach(bin => {
      if (bin.count > 0) {
        bin.meanPrediction = bin.predictions.reduce((sum, p) => sum + p, 0) / bin.count;
        bin.observedFrequency = bin.outcomes.filter(o => o).length / bin.count;
      }
    });

    return bins;
  }

  private calculateNLLFromHistory(history: AccuracyRecord[]): number {
    // Simplified NLL calculation based on error patterns
    let totalNLL = 0;

    for (const record of history) {
      if (record.errorDays !== null) {
        // Convert error days to probability (simplified model)
        const errorProbability = Math.max(
          0.001,
          Math.min(
            0.999,
            Math.exp(-Math.pow(record.errorDays, 2) / 8) // Gaussian-like decay
          )
        );

        totalNLL += -Math.log(errorProbability);
      }
    }

    return history.length > 0 ? totalNLL / history.length : 1.0;
  }

  private calculateCalibrationFromHistory(history: AccuracyRecord[]): number {
    // Group by confidence levels and calculate calibration
    const confidenceGroups = new Map<number, { predictions: number; correct: number }>();

    for (const record of history) {
      const confidenceLevel = Math.floor(record.confidenceLevel / 10) * 10; // Group by 10s

      if (!confidenceGroups.has(confidenceLevel)) {
        confidenceGroups.set(confidenceLevel, { predictions: 0, correct: 0 });
      }

      const group = confidenceGroups.get(confidenceLevel)!;
      group.predictions++;
      if (record.wasAccurate) group.correct++;
    }

    let calibrationError = 0;
    let totalWeight = 0;

    for (const [confidence, group] of confidenceGroups) {
      if (group.predictions > 0) {
        const weight = group.predictions / history.length;
        const observedAccuracy = group.correct / group.predictions;
        const expectedAccuracy = confidence / 100;

        calibrationError += weight * Math.abs(observedAccuracy - expectedAccuracy);
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? calibrationError / totalWeight : 0;
  }

  private categorizePerformance(brierScore: number): string {
    if (brierScore < 0.1) return 'excellent';
    if (brierScore < 0.2) return 'good';
    if (brierScore < 0.3) return 'fair';
    return 'needs-improvement';
  }

  private categorizeCalibration(calibrationScore: number): string {
    if (calibrationScore < 0.05) return 'well-calibrated';
    if (calibrationScore < 0.1) return 'moderately-calibrated';
    return 'poorly-calibrated';
  }

  private analyzeTrends(history: AccuracyRecord[]): AccuracyTrends {
    if (history.length < 10) {
      return { isImproving: false, isDeteriorating: false, isStable: true };
    }

    const recentHistory = history.slice(-10);
    const olderHistory = history.slice(-20, -10);

    const recentAccuracy = recentHistory.filter(r => r.wasAccurate).length / recentHistory.length;
    const olderAccuracy = olderHistory.filter(r => r.wasAccurate).length / olderHistory.length;

    const improvement = recentAccuracy - olderAccuracy;

    return {
      isImproving: improvement > 0.1,
      isDeteriorating: improvement < -0.1,
      isStable: Math.abs(improvement) <= 0.1,
    };
  }

  private isSignificantImprovement(recent: PredictionAccuracy, older: PredictionAccuracy): boolean {
    const brierImprovement = older.brierScore - recent.brierScore;
    const calibrationImprovement = older.calibrationScore - recent.calibrationScore;

    return brierImprovement > 0.05 || calibrationImprovement > 0.05;
  }

  private interpolateProbability(distribution: number[], index: number, length: number): number {
    if (index < 0 || index >= length) return 0.001;
    return Math.max(0.001, Math.min(0.999, distribution[index] || 0.001));
  }

  private daysDifference(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / oneDay);
  }

  private getDefaultAccuracyMetrics(): PredictionAccuracy {
    return {
      brierScore: 0.5, // Neutral score
      negativeLogLikelihood: 1.0,
      calibrationScore: 0.0,
      accuracyHistory: [],
    };
  }
}

// Supporting interfaces
interface ProbabilisticPrediction {
  probability: number;
}

interface ProbabilisticOutcome {
  probability: number;
  wasCorrect: boolean;
}

interface CalibrationBin {
  binStart: number;
  binEnd: number;
  predictions: number[];
  outcomes: boolean[];
  count: number;
  meanPrediction: number;
  observedFrequency: number;
}

export interface AccuracyInsights {
  overallPerformance: string;
  calibrationQuality: string;
  recommendations: string[];
  trends: AccuracyTrends;
}

interface AccuracyTrends {
  isImproving: boolean;
  isDeteriorating: boolean;
  isStable: boolean;
}

export interface AccuracyComparison {
  recentBrierScore: number;
  olderBrierScore: number;
  brierScoreImprovement: number;
  recentCalibration: number;
  olderCalibration: number;
  calibrationImprovement: number;
  significantImprovement: boolean;
}
