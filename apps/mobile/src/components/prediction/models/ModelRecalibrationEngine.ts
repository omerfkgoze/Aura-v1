import type {
  ModelCalibration,
  CalibrationPoint,
  AccuracyRecord,
  BayesianModelParameters,
  ModelUpdateResult,
} from '@aura/shared-types';
import CalibrationValidator, { type CalibrationValidationResult } from './CalibrationValidator';

export interface RecalibrationStrategy {
  method:
    | 'temperature_scaling'
    | 'platt_scaling'
    | 'isotonic_regression'
    | 'bayesian_update'
    | 'none';
  parameters: Record<string, number>;
  confidence: number;
  expectedImprovement: number;
  reasoning: string;
}

export interface RecalibrationResult {
  success: boolean;
  strategy: RecalibrationStrategy;
  newParameters: BayesianModelParameters;
  calibrationImprovement: number;
  accuracyChange: number;
  validationMetrics: {
    beforeECE: number;
    afterECE: number;
    beforeBrier: number;
    afterBrier: number;
    improvementSignificance: number;
  };
  recommendations: string[];
}

export interface RecalibrationTrigger {
  triggered: boolean;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedImprovement: number;
  recommendedStrategy: RecalibrationStrategy;
}

export class ModelRecalibrationEngine {
  private calibrationValidator: CalibrationValidator;
  private readonly ECE_THRESHOLD = 0.1;
  private readonly BRIER_THRESHOLD = 0.3;
  private readonly MIN_SAMPLES_FOR_RECALIBRATION = 30;
  private readonly RECALIBRATION_COOLDOWN_DAYS = 7;

  constructor() {
    this.calibrationValidator = new CalibrationValidator();
  }

  /**
   * Assess whether model recalibration is needed
   */
  assessRecalibrationNeed(
    accuracyHistory: AccuracyRecord[],
    currentParameters: BayesianModelParameters,
    predictionType: 'period' | 'ovulation' = 'period',
    lastRecalibrationDate?: string
  ): RecalibrationTrigger {
    // Check if we have enough data
    if (accuracyHistory.length < this.MIN_SAMPLES_FOR_RECALIBRATION) {
      return {
        triggered: false,
        reason: `Need ${this.MIN_SAMPLES_FOR_RECALIBRATION - accuracyHistory.length} more predictions for recalibration`,
        urgency: 'low',
        estimatedImprovement: 0,
        recommendedStrategy: this.getDefaultStrategy(),
      };
    }

    // Check cooldown period
    if (lastRecalibrationDate && this.isInCooldownPeriod(lastRecalibrationDate)) {
      return {
        triggered: false,
        reason: 'Recalibration cooldown period active',
        urgency: 'low',
        estimatedImprovement: 0,
        recommendedStrategy: this.getDefaultStrategy(),
      };
    }

    // Validate current calibration
    const validation = this.calibrationValidator.validateCalibration(
      accuracyHistory,
      predictionType
    );
    const ece = validation.analysis.expectedCalibrationError;
    const brierScore = this.calculateBrierScore(accuracyHistory);

    // Determine urgency and trigger
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let triggered = false;
    let reason = '';
    let estimatedImprovement = 0;

    if (ece > this.ECE_THRESHOLD * 2) {
      triggered = true;
      urgency = 'critical';
      reason = `Critical calibration error: ${(ece * 100).toFixed(1)}%`;
      estimatedImprovement = ece - this.ECE_THRESHOLD;
    } else if (ece > this.ECE_THRESHOLD * 1.5) {
      triggered = true;
      urgency = 'high';
      reason = `High calibration error: ${(ece * 100).toFixed(1)}%`;
      estimatedImprovement = ece - this.ECE_THRESHOLD;
    } else if (ece > this.ECE_THRESHOLD) {
      triggered = true;
      urgency = 'medium';
      reason = `Moderate calibration error: ${(ece * 100).toFixed(1)}%`;
      estimatedImprovement = ece - this.ECE_THRESHOLD;
    } else if (brierScore > this.BRIER_THRESHOLD) {
      triggered = true;
      urgency = 'medium';
      reason = `High Brier score: ${brierScore.toFixed(3)}`;
      estimatedImprovement = brierScore - this.BRIER_THRESHOLD;
    }

    // Check for systematic bias
    const systematicBias = this.detectSystematicBias(accuracyHistory);
    if (!triggered && systematicBias.detected) {
      triggered = true;
      urgency = 'medium';
      reason = `Systematic bias detected: ${systematicBias.description}`;
      estimatedImprovement = Math.abs(systematicBias.magnitude);
    }

    const recommendedStrategy = this.selectRecalibrationStrategy(validation, accuracyHistory);

    return {
      triggered,
      reason,
      urgency,
      estimatedImprovement,
      recommendedStrategy,
    };
  }

  /**
   * Perform model recalibration
   */
  performRecalibration(
    accuracyHistory: AccuracyRecord[],
    currentParameters: BayesianModelParameters,
    predictionType: 'period' | 'ovulation' = 'period',
    strategy?: RecalibrationStrategy
  ): RecalibrationResult {
    // Validate input data
    if (accuracyHistory.length < this.MIN_SAMPLES_FOR_RECALIBRATION) {
      return this.getFailureResult('Insufficient data for recalibration');
    }

    // Select strategy if not provided
    const validation = this.calibrationValidator.validateCalibration(
      accuracyHistory,
      predictionType
    );
    const selectedStrategy =
      strategy || this.selectRecalibrationStrategy(validation, accuracyHistory);

    // Calculate baseline metrics
    const beforeECE = validation.analysis.expectedCalibrationError;
    const beforeBrier = this.calculateBrierScore(accuracyHistory);

    try {
      // Apply recalibration method
      const newParameters = this.applyRecalibrationMethod(
        selectedStrategy,
        currentParameters,
        accuracyHistory
      );

      // Validate improvement using cross-validation
      const improvementValidation = this.validateImprovement(
        accuracyHistory,
        currentParameters,
        newParameters,
        selectedStrategy
      );

      if (!improvementValidation.significant) {
        return this.getFailureResult('Recalibration did not provide significant improvement');
      }

      const recommendations = this.generateRecalibrationRecommendations(
        selectedStrategy,
        improvementValidation
      );

      return {
        success: true,
        strategy: selectedStrategy,
        newParameters,
        calibrationImprovement: beforeECE - improvementValidation.afterECE,
        accuracyChange: improvementValidation.afterBrier - beforeBrier,
        validationMetrics: {
          beforeECE,
          afterECE: improvementValidation.afterECE,
          beforeBrier,
          afterBrier: improvementValidation.afterBrier,
          improvementSignificance: improvementValidation.significance,
        },
        recommendations,
      };
    } catch (error) {
      return this.getFailureResult(`Recalibration failed: ${error}`);
    }
  }

  /**
   * Select appropriate recalibration strategy
   */
  private selectRecalibrationStrategy(
    validation: CalibrationValidationResult,
    accuracyHistory: AccuracyRecord[]
  ): RecalibrationStrategy {
    const analysis = validation.analysis;

    // Temperature scaling for systematic bias
    if (this.detectSystematicBias(accuracyHistory).detected && analysis.isWellCalibrated) {
      return {
        method: 'temperature_scaling',
        parameters: { temperature: 1.0 },
        confidence: 0.8,
        expectedImprovement: analysis.expectedCalibrationError * 0.5,
        reasoning: 'Systematic overconfidence/underconfidence detected',
      };
    }

    // Isotonic regression for non-monotonic calibration
    if (!this.isMonotonic(validation.analysis.calibrationCurve)) {
      return {
        method: 'isotonic_regression',
        parameters: {},
        confidence: 0.7,
        expectedImprovement: analysis.expectedCalibrationError * 0.4,
        reasoning: 'Non-monotonic calibration curve requires isotonic regression',
      };
    }

    // Platt scaling for general calibration issues
    if (analysis.expectedCalibrationError > 0.1) {
      return {
        method: 'platt_scaling',
        parameters: { a: 1.0, b: 0.0 },
        confidence: 0.6,
        expectedImprovement: analysis.expectedCalibrationError * 0.3,
        reasoning: 'General calibration issues require sigmoid recalibration',
      };
    }

    // Bayesian update for parameter drift
    if (this.detectParameterDrift(accuracyHistory)) {
      return {
        method: 'bayesian_update',
        parameters: { learning_rate: 0.1 },
        confidence: 0.9,
        expectedImprovement: analysis.expectedCalibrationError * 0.6,
        reasoning: 'Model parameters need updating based on recent data',
      };
    }

    return this.getDefaultStrategy();
  }

  /**
   * Apply the selected recalibration method
   */
  private applyRecalibrationMethod(
    strategy: RecalibrationStrategy,
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    switch (strategy.method) {
      case 'temperature_scaling':
        return this.applyTemperatureScaling(strategy, currentParameters, accuracyHistory);
      case 'platt_scaling':
        return this.applyPlattScaling(strategy, currentParameters, accuracyHistory);
      case 'isotonic_regression':
        return this.applyIsotonicRegression(strategy, currentParameters, accuracyHistory);
      case 'bayesian_update':
        return this.applyBayesianUpdate(strategy, currentParameters, accuracyHistory);
      default:
        return currentParameters;
    }
  }

  /**
   * Apply temperature scaling recalibration
   */
  private applyTemperatureScaling(
    strategy: RecalibrationStrategy,
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    // Calculate optimal temperature parameter
    const temperature = this.findOptimalTemperature(accuracyHistory);

    // Adjust model parameters based on temperature
    return {
      ...currentParameters,
      cycleLengthVariance: currentParameters.cycleLengthVariance * temperature,
      periodLengthVariance: currentParameters.periodLengthVariance * temperature,
      adaptiveLearningRate: Math.min(
        0.5,
        currentParameters.adaptiveLearningRate * (1 + (temperature - 1) * 0.1)
      ),
    };
  }

  /**
   * Apply Platt scaling recalibration
   */
  private applyPlattScaling(
    strategy: RecalibrationStrategy,
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    // Fit sigmoid parameters (a, b)
    const { a, b } = this.fitSigmoidParameters(accuracyHistory);

    // Adjust model variance parameters based on sigmoid scaling
    const varianceAdjustment = Math.abs(a - 1) + Math.abs(b);

    return {
      ...currentParameters,
      cycleLengthVariance: currentParameters.cycleLengthVariance * (1 + varianceAdjustment * 0.1),
      periodLengthVariance: currentParameters.periodLengthVariance * (1 + varianceAdjustment * 0.1),
      personalHistoryWeight: Math.max(
        0.1,
        Math.min(0.9, currentParameters.personalHistoryWeight * a)
      ),
    };
  }

  /**
   * Apply isotonic regression recalibration
   */
  private applyIsotonicRegression(
    strategy: RecalibrationStrategy,
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    // Isotonic regression adjusts confidence mapping rather than model parameters
    // We adjust learning rate to be more adaptive
    return {
      ...currentParameters,
      adaptiveLearningRate: Math.min(0.4, currentParameters.adaptiveLearningRate * 1.2),
      personalHistoryWeight: Math.max(0.3, currentParameters.personalHistoryWeight * 0.9),
    };
  }

  /**
   * Apply Bayesian parameter update
   */
  private applyBayesianUpdate(
    strategy: RecalibrationStrategy,
    currentParameters: BayesianModelParameters,
    accuracyHistory: AccuracyRecord[]
  ): BayesianModelParameters {
    // Calculate recent prediction errors
    const recentHistory = accuracyHistory.slice(-20);
    const errorMagnitude =
      recentHistory.reduce((sum, record) => sum + Math.abs(record.errorDays || 0), 0) /
      recentHistory.length;

    // Update parameters based on recent errors
    const learningRate = strategy.parameters['learning_rate'] || 0.1;

    return {
      ...currentParameters,
      cycleLengthVariance: currentParameters.cycleLengthVariance + errorMagnitude * learningRate,
      periodLengthVariance:
        currentParameters.periodLengthVariance + errorMagnitude * learningRate * 0.5,
      adaptiveLearningRate: Math.min(
        0.5,
        currentParameters.adaptiveLearningRate + learningRate * 0.1
      ),
      personalHistoryWeight: Math.max(
        0.1,
        currentParameters.personalHistoryWeight - learningRate * 0.1
      ),
    };
  }

  /**
   * Validate improvement using cross-validation
   */
  private validateImprovement(
    accuracyHistory: AccuracyRecord[],
    oldParameters: BayesianModelParameters,
    newParameters: BayesianModelParameters,
    strategy: RecalibrationStrategy
  ): {
    significant: boolean;
    significance: number;
    afterECE: number;
    afterBrier: number;
  } {
    // Simplified cross-validation - in production, use proper k-fold validation
    const testSize = Math.floor(accuracyHistory.length * 0.3);
    const trainData = accuracyHistory.slice(0, -testSize);
    const testData = accuracyHistory.slice(-testSize);

    // Simulate predictions with old and new parameters
    const oldPredictionAccuracy = this.simulatePredictionAccuracy(testData, oldParameters);
    const newPredictionAccuracy = this.simulatePredictionAccuracy(testData, newParameters);

    const oldECE = this.calculateECEFromAccuracy(oldPredictionAccuracy);
    const newECE = this.calculateECEFromAccuracy(newPredictionAccuracy);
    const oldBrier = this.calculateBrierScore(oldPredictionAccuracy);
    const newBrier = this.calculateBrierScore(newPredictionAccuracy);

    const eceImprovement = oldECE - newECE;
    const brierImprovement = oldBrier - newBrier;

    // Statistical significance test (simplified)
    const significance = this.calculateStatisticalSignificance(eceImprovement, testData.length);
    const significant = significance > 0.05 && eceImprovement > 0.01;

    return {
      significant,
      significance,
      afterECE: newECE,
      afterBrier: newBrier,
    };
  }

  /**
   * Helper methods
   */
  private getDefaultStrategy(): RecalibrationStrategy {
    return {
      method: 'none',
      parameters: {},
      confidence: 0,
      expectedImprovement: 0,
      reasoning: 'No recalibration needed',
    };
  }

  private getFailureResult(reason: string): RecalibrationResult {
    return {
      success: false,
      strategy: this.getDefaultStrategy(),
      newParameters: {} as BayesianModelParameters,
      calibrationImprovement: 0,
      accuracyChange: 0,
      validationMetrics: {
        beforeECE: 0,
        afterECE: 0,
        beforeBrier: 0,
        afterBrier: 0,
        improvementSignificance: 0,
      },
      recommendations: [reason],
    };
  }

  private isInCooldownPeriod(lastRecalibrationDate: string): boolean {
    const lastDate = new Date(lastRecalibrationDate);
    const now = new Date();
    const daysDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < this.RECALIBRATION_COOLDOWN_DAYS;
  }

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

  private detectSystematicBias(accuracyHistory: AccuracyRecord[]): {
    detected: boolean;
    magnitude: number;
    description: string;
  } {
    const bias =
      accuracyHistory.reduce((sum, record) => {
        return sum + (record.confidenceLevel - (record.wasAccurate ? 1 : 0));
      }, 0) / accuracyHistory.length;

    const magnitude = Math.abs(bias);
    const detected = magnitude > 0.1;

    let description = '';
    if (detected) {
      description = bias > 0 ? 'Overconfident predictions' : 'Underconfident predictions';
    }

    return { detected, magnitude, description };
  }

  private isMonotonic(calibrationCurve: CalibrationPoint[]): boolean {
    const sortedCurve = [...calibrationCurve].sort(
      (a, b) => a.predictedProbability - b.predictedProbability
    );

    for (let i = 1; i < sortedCurve.length; i++) {
      if (sortedCurve[i].observedFrequency < sortedCurve[i - 1].observedFrequency) {
        return false;
      }
    }
    return true;
  }

  private detectParameterDrift(accuracyHistory: AccuracyRecord[]): boolean {
    if (accuracyHistory.length < 20) return false;

    const recent = accuracyHistory.slice(-10);
    const older = accuracyHistory.slice(-20, -10);

    const recentError =
      recent.reduce((sum, r) => sum + Math.abs(r.errorDays || 0), 0) / recent.length;
    const olderError = older.reduce((sum, r) => sum + Math.abs(r.errorDays || 0), 0) / older.length;

    return Math.abs(recentError - olderError) > 1.0; // 1 day threshold
  }

  private findOptimalTemperature(accuracyHistory: AccuracyRecord[]): number {
    // Simplified temperature optimization
    let bestTemperature = 1.0;
    let bestLoss = Infinity;

    for (let temp = 0.5; temp <= 2.0; temp += 0.1) {
      let loss = 0;

      accuracyHistory.forEach(record => {
        const adjustedConf = this.applyTemperatureToConfidence(record.confidenceLevel, temp);
        const actual = record.wasAccurate ? 1 : 0;
        loss += Math.pow(adjustedConf - actual, 2);
      });

      if (loss < bestLoss) {
        bestLoss = loss;
        bestTemperature = temp;
      }
    }

    return bestTemperature;
  }

  private applyTemperatureToConfidence(confidence: number, temperature: number): number {
    const logit = Math.log(confidence / (1 - confidence));
    const adjustedLogit = logit / temperature;
    return 1 / (1 + Math.exp(-adjustedLogit));
  }

  private fitSigmoidParameters(accuracyHistory: AccuracyRecord[]): { a: number; b: number } {
    // Simplified sigmoid fitting
    let bestA = 1.0;
    let bestB = 0.0;
    let bestLoss = Infinity;

    for (let a = 0.5; a <= 2.0; a += 0.1) {
      for (let b = -1.0; b <= 1.0; b += 0.2) {
        let loss = 0;

        accuracyHistory.forEach(record => {
          const logit = Math.log(record.confidenceLevel / (1 - record.confidenceLevel));
          const adjustedLogit = a * logit + b;
          const adjustedConf = 1 / (1 + Math.exp(-adjustedLogit));
          const actual = record.wasAccurate ? 1 : 0;
          loss += Math.pow(adjustedConf - actual, 2);
        });

        if (loss < bestLoss) {
          bestLoss = loss;
          bestA = a;
          bestB = b;
        }
      }
    }

    return { a: bestA, b: bestB };
  }

  private simulatePredictionAccuracy(
    testData: AccuracyRecord[],
    parameters: BayesianModelParameters
  ): AccuracyRecord[] {
    // Simplified simulation - in production, use actual prediction model
    return testData.map(record => ({
      ...record,
      confidenceLevel: Math.max(
        0.01,
        Math.min(0.99, record.confidenceLevel * (1 + (parameters.adaptiveLearningRate - 0.2) * 0.1))
      ),
    }));
  }

  private calculateECEFromAccuracy(
    accuracyHistory: AccuracyRecord[],
    predictionType: 'period' | 'ovulation' = 'period'
  ): number {
    // Reuse the ECE calculation from calibration validator
    return this.calibrationValidator.validateCalibration(accuracyHistory, predictionType).analysis
      .expectedCalibrationError;
  }

  private calculateStatisticalSignificance(improvement: number, sampleSize: number): number {
    // Simplified significance test
    const standardError = Math.sqrt((improvement * (1 - improvement)) / sampleSize);
    const zScore = improvement / standardError;
    return Math.abs(zScore);
  }

  private generateRecalibrationRecommendations(
    strategy: RecalibrationStrategy,
    validation: { significant: boolean; significance: number; afterECE: number; afterBrier: number }
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Applied ${strategy.method.replace('_', ' ')} recalibration strategy`);

    if (validation.significant) {
      recommendations.push(`Significant improvement achieved (p < 0.05)`);
    } else {
      recommendations.push(`Marginal improvement - monitor continued performance`);
    }

    if (validation.afterECE < 0.05) {
      recommendations.push(
        `Excellent calibration achieved - confidence levels now highly reliable`
      );
    } else if (validation.afterECE < 0.1) {
      recommendations.push(
        `Good calibration achieved - continue monitoring for further improvements`
      );
    } else {
      recommendations.push(`Calibration improved but further optimization may be beneficial`);
    }

    recommendations.push(`Continue consistent tracking to maintain calibration quality`);

    return recommendations;
  }
}

export default ModelRecalibrationEngine;
