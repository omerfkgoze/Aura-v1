import {
  BayesianModelParameters,
  ModelUpdateResult,
  AccuracyRecord,
  EncryptedCycleData,
  PredictionAccuracy,
} from '@aura/shared-types';

/**
 * Adaptive Learning Engine for continuous model improvement
 * Updates Bayesian model parameters based on prediction accuracy feedback
 */
export class AdaptiveLearningEngine {
  private readonly MIN_UPDATES_FOR_LEARNING = 3;
  private readonly ACCURACY_THRESHOLD = 0.7;
  private readonly MAX_LEARNING_RATE = 0.3;
  private readonly MIN_LEARNING_RATE = 0.05;

  /**
   * Update model parameters based on prediction accuracy
   */
  public async updateModelFromAccuracy(
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[],
    recentCycleData: EncryptedCycleData[]
  ): Promise<ModelUpdateResult> {
    if (accuracyHistory.length < this.MIN_UPDATES_FOR_LEARNING) {
      return {
        success: false,
        newParameters: currentParameters,
        accuracyImprovement: 0,
        calibrationImprovement: 0,
        updateReason: 'Insufficient accuracy data for learning',
      };
    }

    // Calculate recent accuracy trends
    const recentAccuracy = this.calculateRecentAccuracy(accuracyHistory);
    const accuracyTrend = this.calculateAccuracyTrend(accuracyHistory);

    // Determine if model needs updating
    if (recentAccuracy > this.ACCURACY_THRESHOLD && accuracyTrend >= 0) {
      return {
        success: false,
        newParameters: currentParameters,
        accuracyImprovement: 0,
        calibrationImprovement: 0,
        updateReason: 'Model performance is satisfactory',
      };
    }

    // Calculate adaptive learning rate based on performance
    const adaptiveLearningRate = this.calculateAdaptiveLearningRate(
      recentAccuracy,
      accuracyTrend,
      currentParameters.adaptiveLearningRate
    );

    // Update parameters based on prediction errors
    const newParameters = this.updateParametersFromErrors(
      currentParameters,
      accuracyHistory,
      recentCycleData,
      adaptiveLearningRate
    );

    // Calculate improvement metrics
    const accuracyImprovement = this.estimateAccuracyImprovement(
      currentParameters,
      newParameters,
      accuracyHistory
    );

    const calibrationImprovement = this.estimateCalibrationImprovement(
      currentParameters,
      newParameters,
      accuracyHistory
    );

    return {
      success: true,
      newParameters,
      accuracyImprovement,
      calibrationImprovement,
      updateReason: `Model updated based on ${accuracyHistory.length} accuracy records`,
    };
  }

  /**
   * Update parameters specifically for personal history integration
   */
  public updatePersonalHistoryWeight(
    currentParameters: BayesianModelParameters,
    cycleHistory: EncryptedCycleData[],
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    if (cycleHistory.length < 3) {
      return currentParameters;
    }

    // Calculate how much personal history helps vs hurts predictions
    const personalHistoryAccuracy = this.evaluatePersonalHistoryImpact(
      cycleHistory,
      accuracyHistory
    );

    // Adjust personal history weight based on its effectiveness
    let newWeight = currentParameters.personalHistoryWeight;

    if (personalHistoryAccuracy > 0.8) {
      // Personal history is very helpful, increase weight
      newWeight = Math.min(0.95, currentParameters.personalHistoryWeight + 0.1);
    } else if (personalHistoryAccuracy < 0.5) {
      // Personal history is hurting, decrease weight
      newWeight = Math.max(0.3, currentParameters.personalHistoryWeight - 0.1);
    }

    return {
      ...currentParameters,
      personalHistoryWeight: newWeight,
    };
  }

  /**
   * Calculate recent accuracy from history
   */
  private calculateRecentAccuracy(accuracyHistory: AccuracyRecord[]): number {
    const recentRecords = accuracyHistory.slice(-Math.min(5, accuracyHistory.length));
    const accurateCount = recentRecords.filter(record => record.wasAccurate).length;
    return accurateCount / recentRecords.length;
  }

  /**
   * Calculate accuracy trend (positive = improving, negative = declining)
   */
  private calculateAccuracyTrend(accuracyHistory: AccuracyRecord[]): number {
    if (accuracyHistory.length < 4) return 0;

    const midpoint = Math.floor(accuracyHistory.length / 2);
    const firstHalf = accuracyHistory.slice(0, midpoint);
    const secondHalf = accuracyHistory.slice(midpoint);

    const firstHalfAccuracy = firstHalf.filter(r => r.wasAccurate).length / firstHalf.length;
    const secondHalfAccuracy = secondHalf.filter(r => r.wasAccurate).length / secondHalf.length;

    return secondHalfAccuracy - firstHalfAccuracy;
  }

  /**
   * Calculate adaptive learning rate based on current performance
   */
  private calculateAdaptiveLearningRate(
    recentAccuracy: number,
    accuracyTrend: number,
    currentLearningRate: number
  ): number {
    let adaptiveRate = currentLearningRate;

    // If accuracy is very low, increase learning rate for faster adaptation
    if (recentAccuracy < 0.4) {
      adaptiveRate = Math.min(this.MAX_LEARNING_RATE, currentLearningRate * 1.5);
    }
    // If accuracy is declining, increase learning rate
    else if (accuracyTrend < -0.1) {
      adaptiveRate = Math.min(this.MAX_LEARNING_RATE, currentLearningRate * 1.2);
    }
    // If accuracy is good and stable, use conservative learning rate
    else if (recentAccuracy > 0.8 && Math.abs(accuracyTrend) < 0.1) {
      adaptiveRate = Math.max(this.MIN_LEARNING_RATE, currentLearningRate * 0.8);
    }

    return adaptiveRate;
  }

  /**
   * Update model parameters based on prediction errors
   */
  private updateParametersFromErrors(
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[],
    recentCycleData: EncryptedCycleData[],
    learningRate: number
  ): BayesianModelParameters {
    const recentErrors = accuracyHistory.slice(-10); // Use last 10 predictions

    // Calculate average error patterns
    const averageError =
      recentErrors.reduce((sum, record) => sum + (record.errorDays || 0), 0) / recentErrors.length;
    const errorVariance = this.calculateErrorVariance(recentErrors, averageError);

    // Extract actual cycle patterns from recent data
    const actualCycleLengths = this.extractActualCycleLengths(recentCycleData);
    const actualMean =
      actualCycleLengths.length > 0
        ? actualCycleLengths.reduce((sum, length) => sum + length, 0) / actualCycleLengths.length
        : currentParameters.cycleLengthMean;

    const actualVariance =
      actualCycleLengths.length > 1
        ? this.calculateVariance(actualCycleLengths, actualMean)
        : currentParameters.cycleLengthVariance;

    // Update parameters using exponential moving average
    const newCycleLengthMean =
      (1 - learningRate) * currentParameters.cycleLengthMean + learningRate * actualMean;

    const newCycleLengthVariance =
      (1 - learningRate) * currentParameters.cycleLengthVariance +
      learningRate * Math.max(actualVariance, errorVariance);

    // Adjust seasonal variation based on recent prediction errors
    let newSeasonalVariation = currentParameters.seasonalVariation;
    if (this.detectSeasonalErrors(recentErrors)) {
      newSeasonalVariation = Math.min(
        0.3,
        currentParameters.seasonalVariation + learningRate * 0.1
      );
    } else if (errorVariance < 2) {
      newSeasonalVariation = Math.max(
        0.05,
        currentParameters.seasonalVariation - learningRate * 0.05
      );
    }

    return {
      ...currentParameters,
      cycleLengthMean: newCycleLengthMean,
      cycleLengthVariance: newCycleLengthVariance,
      seasonalVariation: newSeasonalVariation,
      adaptiveLearningRate: learningRate,
    };
  }

  /**
   * Calculate variance of prediction errors
   */
  private calculateErrorVariance(errors: AccuracyRecord[], meanError: number): number {
    if (errors.length <= 1) return 1;

    const squaredDiffs = errors.map(record => Math.pow((record.errorDays || 0) - meanError, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (errors.length - 1);
  }

  /**
   * Extract actual cycle lengths from recent cycle data
   */
  private extractActualCycleLengths(cycleData: EncryptedCycleData[]): number[] {
    const lengths: number[] = [];

    for (let i = 1; i < cycleData.length; i++) {
      const currentStart = new Date(cycleData[i].periodStartDate);
      const previousStart = new Date(cycleData[i - 1].periodStartDate);
      const daysDiff = Math.round(
        (currentStart.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 0 && daysDiff < 60) {
        lengths.push(daysDiff);
      }
    }

    return lengths;
  }

  /**
   * Calculate variance helper function
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length <= 1) return 0;

    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (values.length - 1);
  }

  /**
   * Detect if prediction errors show seasonal patterns
   */
  private detectSeasonalErrors(recentErrors: AccuracyRecord[]): boolean {
    if (recentErrors.length < 8) return false;

    // Group errors by month of prediction
    const monthlyErrors: { [month: number]: number[] } = {};

    recentErrors.forEach(record => {
      const month = new Date(record.predictionDate).getMonth();
      if (!monthlyErrors[month]) monthlyErrors[month] = [];
      monthlyErrors[month].push(Math.abs(record.errorDays || 0));
    });

    // Check if certain months have consistently higher errors
    const monthsWithData = Object.keys(monthlyErrors).length;
    if (monthsWithData < 4) return false;

    const monthlyAverages = Object.entries(monthlyErrors).map(([month, errors]) => {
      const average = errors.reduce((sum, error) => sum + error, 0) / errors.length;
      return { month: parseInt(month), average };
    });

    const overallAverage =
      monthlyAverages.reduce((sum, ma) => sum + ma.average, 0) / monthlyAverages.length;
    const hasSeasonalPattern = monthlyAverages.some(
      ma => Math.abs(ma.average - overallAverage) > overallAverage * 0.3
    );

    return hasSeasonalPattern;
  }

  /**
   * Evaluate how much personal history helps or hurts predictions
   */
  private evaluatePersonalHistoryImpact(
    cycleHistory: EncryptedCycleData[],
    accuracyHistory: AccuracyRecord[]
  ): number {
    if (cycleHistory.length < 5 || accuracyHistory.length < 3) {
      return 0.5; // Neutral score for insufficient data
    }

    // Calculate accuracy with different history weights (simulated)
    const cycleLengths = this.extractActualCycleLengths(cycleHistory);
    if (cycleLengths.length < 2) return 0.5;

    const recentAccuracy = accuracyHistory.slice(-5);
    const averageAccuracy =
      recentAccuracy.filter(r => r.wasAccurate).length / recentAccuracy.length;

    // If cycles are very regular, personal history is more valuable
    const mean = cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;
    const variance = this.calculateVariance(cycleLengths, mean);
    const regularity = Math.max(0, 1 - variance / 25); // Normalize variance to 0-1

    // Combine accuracy and regularity to estimate personal history impact
    return (averageAccuracy + regularity) / 2;
  }

  /**
   * Estimate accuracy improvement from parameter updates
   */
  private estimateAccuracyImprovement(
    oldParameters: BayesianModelParameters,
    newParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): number {
    // Simplified estimation based on parameter changes
    const cycleMeanChange = Math.abs(newParameters.cycleLengthMean - oldParameters.cycleLengthMean);
    const varianceChange = Math.abs(
      newParameters.cycleLengthVariance - oldParameters.cycleLengthVariance
    );

    // Estimate improvement based on how much parameters needed to change
    const parameterChangeScore = Math.min(1, (cycleMeanChange + varianceChange) / 10);

    // Recent accuracy provides baseline
    const recentAccuracy = this.calculateRecentAccuracy(accuracyHistory);

    // Estimate improvement as percentage of remaining error
    const remainingError = 1 - recentAccuracy;
    const estimatedImprovement = parameterChangeScore * remainingError * 0.3; // Conservative estimate

    return Math.min(0.2, estimatedImprovement); // Cap at 20% improvement
  }

  /**
   * Estimate calibration improvement from parameter updates
   */
  private estimateCalibrationImprovement(
    oldParameters: BayesianModelParameters,
    newParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): number {
    // Calibration improvement is typically smaller than accuracy improvement
    const accuracyImprovement = this.estimateAccuracyImprovement(
      oldParameters,
      newParameters,
      accuracyHistory
    );

    return accuracyImprovement * 0.5; // Calibration improves at about half the rate of accuracy
  }

  /**
   * Reset learning parameters to defaults if model performance degrades severely
   */
  public resetToDefaults(
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): ModelUpdateResult {
    const recentAccuracy = this.calculateRecentAccuracy(accuracyHistory);

    if (recentAccuracy > 0.3) {
      return {
        success: false,
        newParameters: currentParameters,
        accuracyImprovement: 0,
        calibrationImprovement: 0,
        updateReason: 'Model performance not severely degraded',
      };
    }

    // Reset to conservative defaults
    const defaultParameters: BayesianModelParameters = {
      cycleLengthMean: 28,
      cycleLengthVariance: 9,
      periodLengthMean: 5,
      periodLengthVariance: 1,
      seasonalVariation: 0.1,
      personalHistoryWeight: 0.6,
      adaptiveLearningRate: 0.1,
    };

    return {
      success: true,
      newParameters: defaultParameters,
      accuracyImprovement: 0.1, // Expected improvement from reset
      calibrationImprovement: 0.05,
      updateReason: 'Model reset to defaults due to poor performance',
    };
  }
}
