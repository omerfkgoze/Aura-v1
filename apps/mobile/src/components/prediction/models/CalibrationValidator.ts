import type {
  ModelCalibration,
  CalibrationPoint,
  PredictionAccuracy,
  AccuracyRecord,
  BayesianModelParameters,
} from '@aura/shared-types';

export interface CalibrationAnalysis {
  isWellCalibrated: boolean;
  calibrationError: number;
  reliabilityDiagram: number[][];
  calibrationCurve: CalibrationPoint[];
  brierScoreDecomposition: {
    reliability: number;
    resolution: number;
    uncertainty: number;
  };
  expectedCalibrationError: number;
  maximumCalibrationError: number;
  needsRecalibration: boolean;
  recalibrationStrategy: 'temperature_scaling' | 'platt_scaling' | 'isotonic_regression' | 'none';
}

export interface CalibrationValidationResult {
  analysis: CalibrationAnalysis;
  recommendations: string[];
  confidenceAdjustments: {
    originalConfidence: number;
    adjustedConfidence: number;
    adjustmentReason: string;
  }[];
  validationMetrics: {
    hosmerLemeshowTest: number;
    kolmogorovSmirnovTest: number;
    andersonDarlingTest: number;
  };
}

export class CalibrationValidator {
  private readonly CALIBRATION_BINS = 10;
  private readonly CALIBRATION_THRESHOLD = 0.1;
  private readonly MIN_SAMPLES_PER_BIN = 5;

  /**
   * Validate prediction calibration ensuring stated confidence matches actual accuracy
   */
  validateCalibration(
    accuracyHistory: AccuracyRecord[],
    predictionType: 'period' | 'ovulation',
    minDataPoints: number = 20
  ): CalibrationValidationResult {
    if (accuracyHistory.length < minDataPoints) {
      return this.generateInsufficientDataResult(accuracyHistory.length, minDataPoints);
    }

    const analysis = this.performCalibrationAnalysis(accuracyHistory);
    const recommendations = this.generateCalibrationRecommendations(analysis, predictionType);
    const confidenceAdjustments = this.calculateConfidenceAdjustments(analysis, accuracyHistory);
    const validationMetrics = this.calculateValidationMetrics(accuracyHistory);

    return {
      analysis,
      recommendations,
      confidenceAdjustments,
      validationMetrics,
    };
  }

  /**
   * Perform comprehensive calibration analysis
   */
  private performCalibrationAnalysis(accuracyHistory: AccuracyRecord[]): CalibrationAnalysis {
    const calibrationCurve = this.calculateCalibrationCurve(accuracyHistory);
    const reliabilityDiagram = this.calculateReliabilityDiagram(accuracyHistory);
    const brierScoreDecomposition = this.decomposeBrierScore(accuracyHistory);

    const calibrationError = this.calculateCalibrationError(calibrationCurve);
    const expectedCalibrationError = this.calculateExpectedCalibrationError(calibrationCurve);
    const maximumCalibrationError = this.calculateMaximumCalibrationError(calibrationCurve);

    const isWellCalibrated = expectedCalibrationError < this.CALIBRATION_THRESHOLD;
    const needsRecalibration = expectedCalibrationError > this.CALIBRATION_THRESHOLD * 1.5;
    const recalibrationStrategy = this.determineRecalibrationStrategy(
      calibrationCurve,
      brierScoreDecomposition
    );

    return {
      isWellCalibrated,
      calibrationError,
      reliabilityDiagram,
      calibrationCurve,
      brierScoreDecomposition,
      expectedCalibrationError,
      maximumCalibrationError,
      needsRecalibration,
      recalibrationStrategy,
    };
  }

  /**
   * Calculate calibration curve by binning predictions and measuring accuracy
   */
  private calculateCalibrationCurve(accuracyHistory: AccuracyRecord[]): CalibrationPoint[] {
    const bins: { [key: number]: { predictions: number[]; outcomes: number[] } } = {};

    // Initialize bins
    for (let i = 0; i < this.CALIBRATION_BINS; i++) {
      bins[i] = { predictions: [], outcomes: [] };
    }

    // Sort predictions into bins
    accuracyHistory.forEach(record => {
      const confidence = record.confidenceLevel;
      const binIndex = Math.min(
        Math.floor(confidence * this.CALIBRATION_BINS),
        this.CALIBRATION_BINS - 1
      );

      bins[binIndex].predictions.push(confidence);
      bins[binIndex].outcomes.push(record.wasAccurate ? 1 : 0);
    });

    // Calculate calibration points
    const calibrationPoints: CalibrationPoint[] = [];

    for (let i = 0; i < this.CALIBRATION_BINS; i++) {
      const bin = bins[i];

      if (bin.predictions.length >= this.MIN_SAMPLES_PER_BIN) {
        const predictedProbability =
          bin.predictions.reduce((sum, p) => sum + p, 0) / bin.predictions.length;
        const observedFrequency = bin.outcomes.reduce((sum, o) => sum + o, 0) / bin.outcomes.length;

        calibrationPoints.push({
          predictedProbability,
          observedFrequency,
          sampleSize: bin.predictions.length,
        });
      }
    }

    return calibrationPoints;
  }

  /**
   * Calculate reliability diagram for visualization
   */
  private calculateReliabilityDiagram(accuracyHistory: AccuracyRecord[]): number[][] {
    const diagram: number[][] = [];
    const binSize = 1.0 / this.CALIBRATION_BINS;

    for (let i = 0; i < this.CALIBRATION_BINS; i++) {
      const binStart = i * binSize;
      const binEnd = (i + 1) * binSize;

      const recordsInBin = accuracyHistory.filter(
        record => record.confidenceLevel >= binStart && record.confidenceLevel < binEnd
      );

      if (recordsInBin.length > 0) {
        const avgPredicted =
          recordsInBin.reduce((sum, record) => sum + record.confidenceLevel, 0) /
          recordsInBin.length;

        const avgActual =
          recordsInBin.reduce((sum, record) => sum + (record.wasAccurate ? 1 : 0), 0) /
          recordsInBin.length;

        diagram.push([avgPredicted, avgActual, recordsInBin.length]);
      }
    }

    return diagram;
  }

  /**
   * Decompose Brier score into reliability, resolution, and uncertainty components
   */
  private decomposeBrierScore(accuracyHistory: AccuracyRecord[]): {
    reliability: number;
    resolution: number;
    uncertainty: number;
  } {
    const totalSamples = accuracyHistory.length;
    const overallMean =
      accuracyHistory.reduce((sum, record) => sum + (record.wasAccurate ? 1 : 0), 0) / totalSamples;

    let reliability = 0;
    let resolution = 0;

    // Calculate calibration curve for decomposition
    const calibrationCurve = this.calculateCalibrationCurve(accuracyHistory);

    calibrationCurve.forEach(point => {
      const weight = point.sampleSize / totalSamples;

      // Reliability: how far predicted probabilities are from observed frequencies
      reliability += weight * Math.pow(point.predictedProbability - point.observedFrequency, 2);

      // Resolution: how much the conditional expectations vary
      resolution += weight * Math.pow(point.observedFrequency - overallMean, 2);
    });

    // Uncertainty: inherent uncertainty in the data
    const uncertainty = overallMean * (1 - overallMean);

    return { reliability, resolution, uncertainty };
  }

  /**
   * Calculate expected calibration error (ECE)
   */
  private calculateExpectedCalibrationError(calibrationCurve: CalibrationPoint[]): number {
    const totalSamples = calibrationCurve.reduce((sum, point) => sum + point.sampleSize, 0);

    return calibrationCurve.reduce((ece, point) => {
      const weight = point.sampleSize / totalSamples;
      const error = Math.abs(point.predictedProbability - point.observedFrequency);
      return ece + weight * error;
    }, 0);
  }

  /**
   * Calculate maximum calibration error (MCE)
   */
  private calculateMaximumCalibrationError(calibrationCurve: CalibrationPoint[]): number {
    return Math.max(
      ...calibrationCurve.map(point =>
        Math.abs(point.predictedProbability - point.observedFrequency)
      )
    );
  }

  /**
   * Calculate overall calibration error using chi-square-like metric
   */
  private calculateCalibrationError(calibrationCurve: CalibrationPoint[]): number {
    return calibrationCurve.reduce((error, point) => {
      const expectedCount = point.sampleSize * point.predictedProbability;
      const actualCount = point.sampleSize * point.observedFrequency;

      if (expectedCount > 0) {
        return error + Math.pow(actualCount - expectedCount, 2) / expectedCount;
      }
      return error;
    }, 0);
  }

  /**
   * Determine appropriate recalibration strategy
   */
  private determineRecalibrationStrategy(
    calibrationCurve: CalibrationPoint[],
    brierDecomposition: { reliability: number; resolution: number; uncertainty: number }
  ): 'temperature_scaling' | 'platt_scaling' | 'isotonic_regression' | 'none' {
    const reliabilityIssue = brierDecomposition.reliability > 0.05;
    const nonMonotonicity = this.checkMonotonicity(calibrationCurve);
    const systematicBias = this.checkSystematicBias(calibrationCurve);

    if (!reliabilityIssue) {
      return 'none';
    }

    if (systematicBias && !nonMonotonicity) {
      return 'temperature_scaling';
    }

    if (nonMonotonicity) {
      return 'isotonic_regression';
    }

    return 'platt_scaling';
  }

  /**
   * Check if calibration curve is monotonic
   */
  private checkMonotonicity(calibrationCurve: CalibrationPoint[]): boolean {
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

  /**
   * Check for systematic bias in predictions
   */
  private checkSystematicBias(calibrationCurve: CalibrationPoint[]): boolean {
    const totalWeight = calibrationCurve.reduce((sum, point) => sum + point.sampleSize, 0);

    const weightedBias = calibrationCurve.reduce((bias, point) => {
      const weight = point.sampleSize / totalWeight;
      return bias + weight * (point.predictedProbability - point.observedFrequency);
    }, 0);

    return Math.abs(weightedBias) > 0.05;
  }

  /**
   * Calculate confidence adjustments based on calibration analysis
   */
  private calculateConfidenceAdjustments(
    analysis: CalibrationAnalysis,
    accuracyHistory: AccuracyRecord[]
  ): {
    originalConfidence: number;
    adjustedConfidence: number;
    adjustmentReason: string;
  }[] {
    const adjustments: {
      originalConfidence: number;
      adjustedConfidence: number;
      adjustmentReason: string;
    }[] = [];

    if (!analysis.needsRecalibration) {
      return adjustments;
    }

    // Create adjustments for common confidence levels
    const commonLevels = [0.5, 0.8, 0.9, 0.95];

    commonLevels.forEach(originalConfidence => {
      const adjustment = this.calculateSingleConfidenceAdjustment(
        originalConfidence,
        analysis.calibrationCurve,
        analysis.recalibrationStrategy
      );

      if (Math.abs(adjustment.adjustedConfidence - originalConfidence) > 0.05) {
        adjustments.push({
          originalConfidence,
          adjustedConfidence: adjustment.adjustedConfidence,
          adjustmentReason: adjustment.reason,
        });
      }
    });

    return adjustments;
  }

  /**
   * Calculate adjustment for a single confidence level
   */
  private calculateSingleConfidenceAdjustment(
    originalConfidence: number,
    calibrationCurve: CalibrationPoint[],
    strategy: 'temperature_scaling' | 'platt_scaling' | 'isotonic_regression' | 'none'
  ): { adjustedConfidence: number; reason: string } {
    switch (strategy) {
      case 'temperature_scaling':
        return this.applyTemperatureScaling(originalConfidence, calibrationCurve);
      case 'platt_scaling':
        return this.applyPlattScaling(originalConfidence, calibrationCurve);
      case 'isotonic_regression':
        return this.applyIsotonicRegression(originalConfidence, calibrationCurve);
      default:
        return { adjustedConfidence: originalConfidence, reason: 'No adjustment needed' };
    }
  }

  /**
   * Apply temperature scaling calibration
   */
  private applyTemperatureScaling(
    originalConfidence: number,
    calibrationCurve: CalibrationPoint[]
  ): { adjustedConfidence: number; reason: string } {
    // Estimate temperature parameter from calibration curve
    const logits = calibrationCurve.map(point =>
      Math.log(point.predictedProbability / (1 - point.predictedProbability))
    );
    const outcomes = calibrationCurve.map(point => point.observedFrequency);

    // Simple temperature estimation (in production, use proper optimization)
    const temperature = this.estimateTemperature(logits, outcomes);

    const originalLogit = Math.log(originalConfidence / (1 - originalConfidence));
    const adjustedLogit = originalLogit / temperature;
    const adjustedConfidence = 1 / (1 + Math.exp(-adjustedLogit));

    return {
      adjustedConfidence: Math.max(0.01, Math.min(0.99, adjustedConfidence)),
      reason: `Temperature scaling applied (T=${temperature.toFixed(2)})`,
    };
  }

  /**
   * Apply Platt scaling calibration
   */
  private applyPlattScaling(
    originalConfidence: number,
    calibrationCurve: CalibrationPoint[]
  ): { adjustedConfidence: number; reason: string } {
    // Simplified Platt scaling - fit sigmoid function
    const { a, b } = this.fitSigmoid(calibrationCurve);

    const originalLogit = Math.log(originalConfidence / (1 - originalConfidence));
    const adjustedLogit = a * originalLogit + b;
    const adjustedConfidence = 1 / (1 + Math.exp(-adjustedLogit));

    return {
      adjustedConfidence: Math.max(0.01, Math.min(0.99, adjustedConfidence)),
      reason: `Platt scaling applied (a=${a.toFixed(2)}, b=${b.toFixed(2)})`,
    };
  }

  /**
   * Apply isotonic regression calibration
   */
  private applyIsotonicRegression(
    originalConfidence: number,
    calibrationCurve: CalibrationPoint[]
  ): { adjustedConfidence: number; reason: string } {
    // Sort calibration curve by predicted probability
    const sortedCurve = [...calibrationCurve].sort(
      (a, b) => a.predictedProbability - b.predictedProbability
    );

    // Find interpolation points
    let adjustedConfidence = originalConfidence;

    for (let i = 0; i < sortedCurve.length - 1; i++) {
      const current = sortedCurve[i];
      const next = sortedCurve[i + 1];

      if (
        originalConfidence >= current.predictedProbability &&
        originalConfidence <= next.predictedProbability
      ) {
        // Linear interpolation
        const ratio =
          (originalConfidence - current.predictedProbability) /
          (next.predictedProbability - current.predictedProbability);
        adjustedConfidence =
          current.observedFrequency + ratio * (next.observedFrequency - current.observedFrequency);
        break;
      }
    }

    return {
      adjustedConfidence: Math.max(0.01, Math.min(0.99, adjustedConfidence)),
      reason: 'Isotonic regression applied',
    };
  }

  /**
   * Estimate temperature parameter for temperature scaling
   */
  private estimateTemperature(logits: number[], outcomes: number[]): number {
    // Simplified temperature estimation using cross-entropy minimization
    let bestTemperature = 1.0;
    let bestLoss = Infinity;

    for (let temp = 0.1; temp <= 3.0; temp += 0.1) {
      let loss = 0;

      for (let i = 0; i < logits.length; i++) {
        const scaledLogit = logits[i] / temp;
        const prob = 1 / (1 + Math.exp(-scaledLogit));
        loss += -outcomes[i] * Math.log(prob) - (1 - outcomes[i]) * Math.log(1 - prob);
      }

      if (loss < bestLoss) {
        bestLoss = loss;
        bestTemperature = temp;
      }
    }

    return bestTemperature;
  }

  /**
   * Fit sigmoid function for Platt scaling
   */
  private fitSigmoid(calibrationCurve: CalibrationPoint[]): { a: number; b: number } {
    // Simplified sigmoid fitting - in production, use proper optimization
    let bestA = 1.0;
    let bestB = 0.0;
    let bestLoss = Infinity;

    for (let a = 0.1; a <= 2.0; a += 0.1) {
      for (let b = -2.0; b <= 2.0; b += 0.2) {
        let loss = 0;

        calibrationCurve.forEach(point => {
          const logit = Math.log(point.predictedProbability / (1 - point.predictedProbability));
          const adjustedLogit = a * logit + b;
          const adjustedProb = 1 / (1 + Math.exp(-adjustedLogit));

          loss += Math.pow(adjustedProb - point.observedFrequency, 2) * point.sampleSize;
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

  /**
   * Calculate statistical validation metrics
   */
  private calculateValidationMetrics(accuracyHistory: AccuracyRecord[]): {
    hosmerLemeshowTest: number;
    kolmogorovSmirnovTest: number;
    andersonDarlingTest: number;
  } {
    // Simplified implementations - in production, use proper statistical libraries
    return {
      hosmerLemeshowTest: this.calculateHosmerLemeshow(accuracyHistory),
      kolmogorovSmirnovTest: this.calculateKolmogorovSmirnov(accuracyHistory),
      andersonDarlingTest: this.calculateAndersonDarling(accuracyHistory),
    };
  }

  private calculateHosmerLemeshow(accuracyHistory: AccuracyRecord[]): number {
    // Simplified Hosmer-Lemeshow test
    const bins = this.CALIBRATION_BINS;
    const sortedRecords = [...accuracyHistory].sort(
      (a, b) => a.confidenceLevel - b.confidenceLevel
    );
    const binSize = Math.floor(sortedRecords.length / bins);

    let chiSquare = 0;

    for (let i = 0; i < bins; i++) {
      const binStart = i * binSize;
      const binEnd = i === bins - 1 ? sortedRecords.length : (i + 1) * binSize;
      const binRecords = sortedRecords.slice(binStart, binEnd);

      if (binRecords.length > 0) {
        const observed = binRecords.filter(r => r.wasAccurate).length;
        const expected = binRecords.reduce((sum, r) => sum + r.confidenceLevel, 0);

        if (expected > 0) {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        }
      }
    }

    return chiSquare;
  }

  private calculateKolmogorovSmirnov(accuracyHistory: AccuracyRecord[]): number {
    // Simplified KS test comparing predicted vs actual distributions
    const n = accuracyHistory.length;
    const sortedPredicted = [...accuracyHistory].map(r => r.confidenceLevel).sort((a, b) => a - b);
    const sortedActual = [...accuracyHistory]
      .map(r => (r.wasAccurate ? 1 : 0))
      .sort((a, b) => a - b);

    let maxDifference = 0;

    for (let i = 0; i < n; i++) {
      const empiricalPredicted = (i + 1) / n;
      const empiricalActual =
        sortedActual.slice(0, i + 1).reduce((sum, val) => sum + val, 0 as number) / (i + 1);
      const difference = Math.abs(empiricalPredicted - empiricalActual);
      maxDifference = Math.max(maxDifference, difference);
    }

    return maxDifference * Math.sqrt(n);
  }

  private calculateAndersonDarling(accuracyHistory: AccuracyRecord[]): number {
    // Simplified Anderson-Darling test
    const n = accuracyHistory.length;
    const sortedRecords = [...accuracyHistory].sort(
      (a, b) => a.confidenceLevel - b.confidenceLevel
    );

    let adStatistic = 0;

    for (let i = 0; i < n; i++) {
      const predicted = sortedRecords[i].confidenceLevel;
      const actual = sortedRecords[i].wasAccurate ? 1 : 0;

      if (predicted > 0 && predicted < 1) {
        const logTerm1 = Math.log(predicted);
        const logTerm2 = Math.log(1 - predicted);
        adStatistic += (2 * i + 1) * (actual * logTerm1 + (1 - actual) * logTerm2);
      }
    }

    return -n - adStatistic / n;
  }

  /**
   * Generate calibration recommendations
   */
  private generateCalibrationRecommendations(
    analysis: CalibrationAnalysis,
    predictionType: 'period' | 'ovulation'
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.isWellCalibrated) {
      recommendations.push(
        `${predictionType} prediction calibration is excellent - confidence levels accurately reflect uncertainty`
      );
    } else {
      recommendations.push(
        `${predictionType} prediction calibration needs improvement - stated confidence doesn't match actual accuracy`
      );
    }

    if (analysis.needsRecalibration) {
      switch (analysis.recalibrationStrategy) {
        case 'temperature_scaling':
          recommendations.push('Applying temperature scaling to adjust overall confidence levels');
          break;
        case 'platt_scaling':
          recommendations.push('Applying Platt scaling to improve probability calibration');
          break;
        case 'isotonic_regression':
          recommendations.push(
            'Applying isotonic regression to handle non-monotonic calibration issues'
          );
          break;
      }
    }

    if (analysis.brierScoreDecomposition.reliability > 0.05) {
      recommendations.push(
        'High reliability component in Brier score indicates calibration issues'
      );
    }

    if (analysis.brierScoreDecomposition.resolution < 0.01) {
      recommendations.push('Low resolution suggests predictions could be more discriminative');
    }

    if (analysis.expectedCalibrationError > 0.15) {
      recommendations.push(
        'High expected calibration error - consider collecting more diverse training data'
      );
    }

    return recommendations;
  }

  /**
   * Handle insufficient data case
   */
  private generateInsufficientDataResult(
    currentDataPoints: number,
    requiredDataPoints: number
  ): CalibrationValidationResult {
    return {
      analysis: {
        isWellCalibrated: false,
        calibrationError: 0,
        reliabilityDiagram: [],
        calibrationCurve: [],
        brierScoreDecomposition: { reliability: 0, resolution: 0, uncertainty: 0 },
        expectedCalibrationError: 0,
        maximumCalibrationError: 0,
        needsRecalibration: false,
        recalibrationStrategy: 'none',
      },
      recommendations: [
        `Need ${requiredDataPoints - currentDataPoints} more predictions for calibration validation`,
        'Continue tracking consistently to enable calibration analysis',
        'Preliminary calibration assessment will be available after more data collection',
      ],
      confidenceAdjustments: [],
      validationMetrics: {
        hosmerLemeshowTest: 0,
        kolmogorovSmirnovTest: 0,
        andersonDarlingTest: 0,
      },
    };
  }
}

export default CalibrationValidator;
