import { AccuracyMetricsCalculator } from '../../../components/prediction/models/AccuracyMetricsCalculator';
import {
  AccuracyRecord,
  OvulationPrediction,
  PeriodPrediction,
} from '@aura/shared-types/prediction';

describe('AccuracyMetricsCalculator', () => {
  let calculator: AccuracyMetricsCalculator;

  beforeEach(() => {
    calculator = new AccuracyMetricsCalculator();
  });

  describe('calculateBrierScore', () => {
    it('should calculate perfect Brier score for perfect predictions', () => {
      const predictions = [{ probability: 1.0 }, { probability: 0.0 }, { probability: 1.0 }];
      const outcomes = [true, false, true];

      const score = calculator.calculateBrierScore(predictions, outcomes);
      expect(score).toBe(0); // Perfect score
    });

    it('should calculate worst Brier score for completely wrong predictions', () => {
      const predictions = [{ probability: 0.0 }, { probability: 1.0 }, { probability: 0.0 }];
      const outcomes = [true, false, true];

      const score = calculator.calculateBrierScore(predictions, outcomes);
      expect(score).toBe(1); // Worst possible score
    });

    it('should calculate moderate Brier score for uncertain predictions', () => {
      const predictions = [{ probability: 0.5 }, { probability: 0.5 }, { probability: 0.5 }];
      const outcomes = [true, false, true];

      const score = calculator.calculateBrierScore(predictions, outcomes);
      expect(score).toBe(0.25); // (0.5-1)² + (0.5-0)² + (0.5-1)² / 3 = 0.25
    });

    it('should throw error for mismatched array lengths', () => {
      const predictions = [{ probability: 0.5 }];
      const outcomes = [true, false];

      expect(() => {
        calculator.calculateBrierScore(predictions, outcomes);
      }).toThrow('Predictions and outcomes arrays must have the same non-zero length');
    });
  });

  describe('calculateNegativeLogLikelihood', () => {
    it('should calculate low NLL for confident correct predictions', () => {
      const predictions = [{ probability: 0.9 }, { probability: 0.1 }, { probability: 0.9 }];
      const outcomes = [true, false, true];

      const nll = calculator.calculateNegativeLogLikelihood(predictions, outcomes);
      expect(nll).toBeLessThan(0.2); // Should be low for good predictions
    });

    it('should calculate high NLL for confident wrong predictions', () => {
      const predictions = [{ probability: 0.1 }, { probability: 0.9 }, { probability: 0.1 }];
      const outcomes = [true, false, true];

      const nll = calculator.calculateNegativeLogLikelihood(predictions, outcomes);
      expect(nll).toBeGreaterThan(2); // Should be high for bad predictions
    });

    it('should handle edge case probabilities without errors', () => {
      const predictions = [{ probability: 0.0 }, { probability: 1.0 }, { probability: 0.5 }];
      const outcomes = [true, false, true];

      expect(() => {
        const nll = calculator.calculateNegativeLogLikelihood(predictions, outcomes);
        expect(typeof nll).toBe('number');
        expect(nll).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('calculateCalibrationScore', () => {
    it('should return 0 for perfectly calibrated predictions', () => {
      // Create perfectly calibrated predictions
      const predictions = [
        ...Array(10).fill({ probability: 0.1 }),
        ...Array(10).fill({ probability: 0.5 }),
        ...Array(10).fill({ probability: 0.9 }),
      ];

      // Outcomes match probabilities exactly
      const outcomes = [
        ...Array(1).fill(true),
        ...Array(9).fill(false), // 10% true for 0.1 prob
        ...Array(5).fill(true),
        ...Array(5).fill(false), // 50% true for 0.5 prob
        ...Array(9).fill(true),
        ...Array(1).fill(false), // 90% true for 0.9 prob
      ];

      const calibrationScore = calculator.calculateCalibrationScore(predictions, outcomes);
      expect(calibrationScore).toBeLessThan(0.05); // Should be very low
    });

    it('should return higher score for poorly calibrated predictions', () => {
      // Overconfident predictions
      const predictions = Array(10).fill({ probability: 0.9 });
      const outcomes = Array(5).fill(true).concat(Array(5).fill(false)); // Only 50% correct

      const calibrationScore = calculator.calculateCalibrationScore(predictions, outcomes);
      expect(calibrationScore).toBeGreaterThan(0.3); // Should be high due to overconfidence
    });
  });

  describe('trackPeriodAccuracy', () => {
    it('should track accurate period prediction', async () => {
      const prediction = createMockPeriodPrediction('2024-02-01');
      const actualDate = new Date('2024-02-01'); // Exactly on time

      const record = await calculator.trackPeriodAccuracy(prediction, actualDate);

      expect(record.wasAccurate).toBe(true);
      expect(record.errorDays).toBe(0);
      expect(record.brierScore).toBeLessThan(0.1);
    });

    it('should track inaccurate period prediction', async () => {
      const prediction = createMockPeriodPrediction('2024-02-01');
      const actualDate = new Date('2024-02-05'); // 4 days late

      const record = await calculator.trackPeriodAccuracy(prediction, actualDate);

      expect(record.wasAccurate).toBe(false);
      expect(record.errorDays).toBe(4);
      expect(record.brierScore).toBeGreaterThan(0.1);
    });

    it('should track moderately accurate prediction within threshold', async () => {
      const prediction = createMockPeriodPrediction('2024-02-01');
      const actualDate = new Date('2024-02-03'); // 2 days late (still accurate)

      const record = await calculator.trackPeriodAccuracy(prediction, actualDate);

      expect(record.wasAccurate).toBe(true);
      expect(record.errorDays).toBe(2);
    });
  });

  describe('trackOvulationAccuracy', () => {
    it('should track accurate ovulation prediction', async () => {
      const prediction = createMockOvulationPrediction('2024-01-15');
      const actualDate = new Date('2024-01-15'); // Exactly correct

      const record = await calculator.trackOvulationAccuracy(prediction, actualDate);

      expect(record.wasAccurate).toBe(true);
      expect(record.errorDays).toBe(0);
      expect(record.brierScore).toBeLessThan(0.1);
    });

    it('should handle unknown ovulation date', async () => {
      const prediction = createMockOvulationPrediction('2024-01-15');

      const record = await calculator.trackOvulationAccuracy(prediction, null);

      expect(record.wasAccurate).toBe(false);
      expect(record.errorDays).toBe(null);
      expect(record.actualDate).toBe(null);
      expect(record.brierScore).toBe(1.0);
    });

    it('should track inaccurate ovulation prediction', async () => {
      const prediction = createMockOvulationPrediction('2024-01-15');
      const actualDate = new Date('2024-01-20'); // 5 days off

      const record = await calculator.trackOvulationAccuracy(prediction, actualDate);

      expect(record.wasAccurate).toBe(false);
      expect(record.errorDays).toBe(5);
      expect(record.brierScore).toBeGreaterThan(0.5);
    });
  });

  describe('calculateAccuracyMetrics', () => {
    it('should return default metrics for empty history', () => {
      const metrics = calculator.calculateAccuracyMetrics([]);

      expect(metrics.brierScore).toBe(0.5);
      expect(metrics.negativeLogLikelihood).toBe(1.0);
      expect(metrics.calibrationScore).toBe(0.0);
      expect(metrics.accuracyHistory).toEqual([]);
    });

    it('should calculate metrics from accuracy history', () => {
      const history = createMockAccuracyHistory();

      const metrics = calculator.calculateAccuracyMetrics(history);

      expect(typeof metrics.brierScore).toBe('number');
      expect(metrics.brierScore).toBeGreaterThanOrEqual(0);
      expect(metrics.brierScore).toBeLessThanOrEqual(1);

      expect(typeof metrics.negativeLogLikelihood).toBe('number');
      expect(metrics.negativeLogLikelihood).toBeGreaterThan(0);

      expect(typeof metrics.calibrationScore).toBe('number');
      expect(metrics.calibrationScore).toBeGreaterThanOrEqual(0);

      expect(metrics.accuracyHistory).toEqual(history);
    });

    it('should limit accuracy history length', () => {
      const longHistory = Array.from({ length: 150 }, (_, i) =>
        createMockAccuracyRecord(i % 2 === 0)
      );

      const metrics = calculator.calculateAccuracyMetrics(longHistory);

      expect(metrics.accuracyHistory.length).toBe(100); // Should be limited
    });
  });

  describe('generateAccuracyInsights', () => {
    it('should categorize excellent performance', () => {
      const metrics = {
        brierScore: 0.05,
        negativeLogLikelihood: 0.1,
        calibrationScore: 0.02,
        accuracyHistory: createMockAccuracyHistory(),
      };

      const insights = calculator.generateAccuracyInsights(metrics);

      expect(insights.overallPerformance).toBe('excellent');
      expect(insights.calibrationQuality).toBe('well-calibrated');
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it('should categorize poor performance and provide recommendations', () => {
      const metrics = {
        brierScore: 0.4, // Poor score
        negativeLogLikelihood: 2.0,
        calibrationScore: 0.15, // Poor calibration
        accuracyHistory: createMockAccuracyHistory(),
      };

      const insights = calculator.generateAccuracyInsights(metrics);

      expect(insights.overallPerformance).toBe('needs-improvement');
      expect(insights.calibrationQuality).toBe('poorly-calibrated');
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.recommendations.some(r => r.includes('more cycle data'))).toBe(true);
      expect(insights.recommendations.some(r => r.includes('recalibration'))).toBe(true);
    });
  });

  describe('compareAccuracyPeriods', () => {
    it('should detect improvement in accuracy', () => {
      const recentHistory = createMockAccuracyHistory(true); // Good performance
      const olderHistory = createMockAccuracyHistory(false); // Poor performance

      const comparison = calculator.compareAccuracyPeriods(recentHistory, olderHistory);

      expect(comparison.brierScoreImprovement).toBeGreaterThan(0);
      expect(comparison.significantImprovement).toBe(true);
    });

    it('should detect deterioration in accuracy', () => {
      const recentHistory = createMockAccuracyHistory(false); // Poor performance
      const olderHistory = createMockAccuracyHistory(true); // Good performance

      const comparison = calculator.compareAccuracyPeriods(recentHistory, olderHistory);

      expect(comparison.brierScoreImprovement).toBeLessThan(0);
      expect(comparison.significantImprovement).toBe(false);
    });
  });
});

// Helper functions for creating test data
function createMockPeriodPrediction(predictedDate: string): PeriodPrediction {
  return {
    nextPeriodStart: predictedDate,
    confidenceIntervals: {
      p50: 2,
      p80: 4,
      p95: 6,
    },
    uncertaintyFactors: {
      dataQuality: 0.8,
      historyLength: 10,
      cycleLengthVariability: 0.1,
      recentDataReliability: 0.9,
      seasonalPatterns: true,
    },
    probabilityDistribution: Array.from(
      { length: 11 },
      (_, i) => Math.exp(-Math.pow(i - 5, 2) / 8) // Gaussian distribution
    ),
    explanation: 'Test prediction',
  };
}

function createMockOvulationPrediction(predictedDate: string): OvulationPrediction {
  return {
    ovulationDate: predictedDate,
    fertilityWindow: {
      start: new Date(new Date(predictedDate).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(new Date(predictedDate).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      peakDay: predictedDate,
    },
    confidenceIntervals: {
      p50: 2,
      p80: 4,
      p95: 6,
    },
    uncertaintyFactors: {
      dataQuality: 0.8,
      historyLength: 10,
      cycleLengthVariability: 0.1,
      recentDataReliability: 0.9,
      seasonalPatterns: true,
    },
    probabilityDistribution: Array.from(
      { length: 11 },
      (_, i) => Math.exp(-Math.pow(i - 5, 2) / 8) // Gaussian distribution
    ),
    explanation: 'Test ovulation prediction',
  };
}

function createMockAccuracyRecord(isAccurate: boolean): AccuracyRecord {
  const baseDate = new Date();
  return {
    predictionDate: new Date(
      baseDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    actualDate: baseDate.toISOString(),
    confidenceLevel: 80,
    wasAccurate: isAccurate,
    errorDays: isAccurate ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5) + 3,
    brierScore: isAccurate ? Math.random() * 0.1 : Math.random() * 0.3 + 0.3,
  };
}

function createMockAccuracyHistory(goodPerformance: boolean = true): AccuracyRecord[] {
  return Array.from({ length: 20 }, () =>
    createMockAccuracyRecord(goodPerformance ? Math.random() > 0.2 : Math.random() > 0.7)
  );
}
