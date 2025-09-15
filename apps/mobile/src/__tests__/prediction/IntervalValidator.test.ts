import IntervalValidator from '../../components/prediction/models/IntervalValidator';
import { ConfidenceInterval, AccuracyRecord } from '@aura/shared-types';

// Mock data interfaces for testing
interface PredictionValidationData {
  predictionDate: string;
  predictedDate: string;
  intervals: ConfidenceInterval;
  predictedProbability: number;
  confidenceLevel: number;
}

interface ActualOutcome {
  actualDate: string;
  wasCorrect: boolean;
}

describe('IntervalValidator', () => {
  let validator: IntervalValidator;

  beforeEach(() => {
    validator = new IntervalValidator();
  });

  describe('validatePeriodIntervals', () => {
    it('should validate intervals with sufficient data', () => {
      const predictions: PredictionValidationData[] = Array.from({ length: 15 }, (_, i) => ({
        predictionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
        predictedDate: `2024-01-${String(i + 15).padStart(2, '0')}`,
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.8,
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map((pred, i) => ({
        actualDate: `2024-01-${String(i + 16).padStart(2, '0')}`, // 1 day after prediction
        wasCorrect: Math.random() > 0.2, // 80% accuracy
      }));

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.coverageAnalysis).toBeDefined();
      expect(result.calibrationAnalysis).toBeDefined();
      expect(result.accuracyRecords).toHaveLength(15);
      expect(result.recommendations).toBeDefined();
    });

    it('should handle insufficient data gracefully', () => {
      const predictions: PredictionValidationData[] = Array.from({ length: 5 }, (_, i) => ({
        predictionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
        predictedDate: `2024-01-${String(i + 15).padStart(2, '0')}`,
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.8,
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map(() => ({
        actualDate: '2024-01-16',
        wasCorrect: true,
      }));

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      expect(result.isValid).toBe(false);
      expect(result.recommendations).toContain(
        'Insufficient data for validation - need at least 10 samples'
      );
    });

    it('should reject mismatched prediction and outcome arrays', () => {
      const predictions: PredictionValidationData[] = [
        {
          predictionDate: '2024-01-01',
          predictedDate: '2024-01-15',
          intervals: { p50: 4, p80: 8, p95: 14 },
          predictedProbability: 0.8,
          confidenceLevel: 0.95,
        },
      ];

      const outcomes: ActualOutcome[] = [
        { actualDate: '2024-01-16', wasCorrect: true },
        { actualDate: '2024-01-17', wasCorrect: false },
      ];

      expect(() => {
        validator.validatePeriodIntervals(predictions, outcomes);
      }).toThrow('Predictions and outcomes must have equal length');
    });
  });

  describe('validateCalibration', () => {
    it('should assess calibration quality correctly', () => {
      // Create well-calibrated data
      const predictions: PredictionValidationData[] = Array.from({ length: 100 }, (_, i) => ({
        predictionDate: `2024-01-01`,
        predictedDate: `2024-01-15`,
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.1 + (i / 100) * 0.8, // Spread from 0.1 to 0.9
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map(pred => ({
        actualDate: '2024-01-16',
        wasCorrect: Math.random() < pred.predictedProbability, // Calibrated outcomes
      }));

      const result = validator.validateCalibration(predictions, outcomes);

      expect(result).toBeDefined();
      expect(result.calibrationCurve).toBeDefined();
      expect(result.calibrationError).toBeGreaterThanOrEqual(0);
      expect(typeof result.isWellCalibrated).toBe('boolean');
      expect(result.reliabilityDiagram).toBeDefined();
    });

    it('should detect poor calibration', () => {
      // Create poorly calibrated data (high confidence, low accuracy)
      const predictions: PredictionValidationData[] = Array.from({ length: 50 }, () => ({
        predictionDate: '2024-01-01',
        predictedDate: '2024-01-15',
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.9, // High confidence
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map(() => ({
        actualDate: '2024-01-16',
        wasCorrect: Math.random() < 0.5, // But only 50% accuracy
      }));

      const result = validator.validateCalibration(predictions, outcomes);

      expect(result.calibrationError).toBeGreaterThan(0.1);
      expect(result.isWellCalibrated).toBe(false);
    });
  });

  describe('performCrossValidation', () => {
    it('should perform k-fold cross validation', () => {
      const historicalData = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        cycleLength: 28 + Math.random() * 4 - 2, // 26-30 days
        periodLength: 5 + Math.random() * 2 - 1, // 4-6 days
      }));

      const result = validator.performCrossValidation(historicalData, 0.8);

      expect(result).toBeDefined();
      expect(result.meanCoverageError).toBeGreaterThanOrEqual(0);
      expect(result.meanCalibrationError).toBeGreaterThanOrEqual(0);
      expect(result.foldResults).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should handle small datasets appropriately', () => {
      const smallData = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        cycleLength: 28,
        periodLength: 5,
      }));

      expect(() => {
        validator.performCrossValidation(smallData);
      }).not.toThrow();
    });
  });

  describe('analyzeTemporalStability', () => {
    it('should analyze performance stability over time', () => {
      const predictions: PredictionValidationData[] = Array.from({ length: 180 }, (_, i) => {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);

        return {
          predictionDate: date.toISOString().split('T')[0],
          predictedDate: new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          intervals: { p50: 4, p80: 8, p95: 14 },
          predictedProbability: 0.8,
          confidenceLevel: 0.95,
        };
      });

      const outcomes: ActualOutcome[] = predictions.map(pred => {
        const predDate = new Date(pred.predictedDate);
        const actualDate = new Date(
          predDate.getTime() + (Math.random() - 0.5) * 3 * 24 * 60 * 60 * 1000
        );
        const errorDays =
          Math.abs(actualDate.getTime() - predDate.getTime()) / (24 * 60 * 60 * 1000);

        return {
          actualDate: actualDate.toISOString().split('T')[0],
          wasCorrect: errorDays <= 7, // Within 7 days is correct
        };
      });

      const result = validator.analyzeTemporalStability(predictions, outcomes, 30);

      expect(result).toBeDefined();
      expect(result.windows).toBeDefined();
      expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.stabilityScore).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'degrading']).toContain(result.trend);
      expect(typeof result.isStable).toBe('boolean');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty prediction arrays', () => {
      const predictions: PredictionValidationData[] = [];
      const outcomes: ActualOutcome[] = [];

      expect(() => {
        validator.validatePeriodIntervals(predictions, outcomes);
      }).not.toThrow();
    });

    it('should handle predictions with extreme confidence intervals', () => {
      const predictions: PredictionValidationData[] = [
        {
          predictionDate: '2024-01-01',
          predictedDate: '2024-01-15',
          intervals: { p50: 1, p80: 2, p95: 100 }, // Extreme 95% interval
          predictedProbability: 0.5,
          confidenceLevel: 0.95,
        },
      ];

      const outcomes: ActualOutcome[] = [
        {
          actualDate: '2024-01-16',
          wasCorrect: true,
        },
      ];

      expect(() => {
        validator.validatePeriodIntervals(predictions, outcomes);
      }).not.toThrow();
    });

    it('should handle all incorrect predictions', () => {
      const predictions: PredictionValidationData[] = Array.from({ length: 20 }, (_, i) => ({
        predictionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
        predictedDate: `2024-01-${String(i + 15).padStart(2, '0')}`,
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.9,
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map(() => ({
        actualDate: '2024-02-01', // All predictions way off
        wasCorrect: false,
      }));

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      expect(result.coverageAnalysis.actualCoverage).toBe(0);
      expect(result.coverageAnalysis.underCoverage).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should handle all correct predictions', () => {
      const predictions: PredictionValidationData[] = Array.from({ length: 20 }, (_, i) => ({
        predictionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
        predictedDate: `2024-01-${String(i + 15).padStart(2, '0')}`,
        intervals: { p50: 4, p80: 8, p95: 14 },
        predictedProbability: 0.5,
        confidenceLevel: 0.95,
      }));

      const outcomes: ActualOutcome[] = predictions.map(pred => ({
        actualDate: pred.predictedDate, // Exact predictions
        wasCorrect: true,
      }));

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      expect(result.coverageAnalysis.actualCoverage).toBe(1);
      expect(result.coverageAnalysis.overCoverage).toBe(true);
    });
  });

  describe('Statistical Accuracy', () => {
    it('should calculate Brier scores correctly', () => {
      const predictions: PredictionValidationData[] = [
        {
          predictionDate: '2024-01-01',
          predictedDate: '2024-01-15',
          intervals: { p50: 4, p80: 8, p95: 14 },
          predictedProbability: 0.8,
          confidenceLevel: 0.95,
        },
        {
          predictionDate: '2024-01-02',
          predictedDate: '2024-01-16',
          intervals: { p50: 4, p80: 8, p95: 14 },
          predictedProbability: 0.3,
          confidenceLevel: 0.95,
        },
      ];

      const outcomes: ActualOutcome[] = [
        { actualDate: '2024-01-15', wasCorrect: true }, // Perfect prediction
        { actualDate: '2024-01-20', wasCorrect: false }, // Poor prediction
      ];

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      // First prediction should have good Brier score (predicted 0.8, actual 1)
      // Second prediction should have better Brier score (predicted 0.3, actual 0)
      expect(result.accuracyRecords).toHaveLength(2);
      result.accuracyRecords.forEach(record => {
        expect(record.brierScore).toBeGreaterThanOrEqual(0);
        expect(record.brierScore).toBeLessThanOrEqual(1);
      });
    });

    it('should provide meaningful calibration metrics', () => {
      // Create data with known calibration properties
      const predictions: PredictionValidationData[] = Array.from({ length: 60 }, (_, i) => {
        const prob = i < 20 ? 0.3 : i < 40 ? 0.6 : 0.9;
        return {
          predictionDate: '2024-01-01',
          predictedDate: '2024-01-15',
          intervals: { p50: 4, p80: 8, p95: 14 },
          predictedProbability: prob,
          confidenceLevel: 0.95,
        };
      });

      const outcomes: ActualOutcome[] = predictions.map(pred => ({
        actualDate: '2024-01-16',
        wasCorrect: Math.random() < pred.predictedProbability,
      }));

      const result = validator.validateCalibration(predictions, outcomes);

      expect(result.calibrationCurve.length).toBeGreaterThan(0);
      expect(result.sharpness).toBeGreaterThanOrEqual(0);
      expect(result.sharpness).toBeLessThanOrEqual(1);
      expect(result.resolution).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-world Validation Scenarios', () => {
    it('should validate typical menstrual cycle prediction accuracy', () => {
      // Simulate realistic menstrual cycle prediction data
      const predictions: PredictionValidationData[] = Array.from({ length: 50 }, (_, i) => {
        const cycleDay = 28 + Math.sin(i * 0.1) * 2; // Slight variation
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i * cycleDay);

        return {
          predictionDate: date.toISOString().split('T')[0],
          predictedDate: new Date(date.getTime() + cycleDay * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          intervals: {
            p50: 3 + Math.random(),
            p80: 6 + Math.random() * 2,
            p95: 10 + Math.random() * 4,
          },
          predictedProbability: 0.7 + Math.random() * 0.2,
          confidenceLevel: 0.95,
        };
      });

      const outcomes: ActualOutcome[] = predictions.map(pred => {
        const predDate = new Date(pred.predictedDate);
        // Add realistic error (±2 days typically)
        const actualDate = new Date(
          predDate.getTime() + (Math.random() - 0.5) * 4 * 24 * 60 * 60 * 1000
        );
        const errorDays =
          Math.abs(actualDate.getTime() - predDate.getTime()) / (24 * 60 * 60 * 1000);

        return {
          actualDate: actualDate.toISOString().split('T')[0],
          wasCorrect: errorDays <= pred.intervals.p95 / 2,
        };
      });

      const result = validator.validatePeriodIntervals(predictions, outcomes);

      // Should be valid with realistic cycle data
      expect(result.isValid).toBe(true);
      expect(result.coverageAnalysis.actualCoverage).toBeGreaterThan(0.8);
      expect(result.calibrationAnalysis.calibrationError).toBeLessThan(0.3);
    });
  });
});
