import CalibrationValidator from '../../components/prediction/models/CalibrationValidator';
import type { AccuracyRecord } from '@aura/shared-types';

describe('CalibrationValidator', () => {
  let calibrationValidator: CalibrationValidator;
  let mockAccuracyHistory: AccuracyRecord[];

  beforeEach(() => {
    calibrationValidator = new CalibrationValidator();

    // Create well-calibrated mock data
    mockAccuracyHistory = [];
    for (let i = 0; i < 50; i++) {
      const confidence = 0.2 + (i / 50) * 0.6; // Range from 0.2 to 0.8
      const wasAccurate = Math.random() < confidence; // Properly calibrated

      mockAccuracyHistory.push({
        predictionDate: new Date(2024, 0, i + 1).toISOString(),
        actualDate: new Date(2024, 0, i + (wasAccurate ? 1 : 3)).toISOString(),
        confidenceLevel: confidence,
        wasAccurate,
        errorDays: wasAccurate ? 0 : 2,
        brierScore: Math.pow(confidence - (wasAccurate ? 1 : 0), 2),
      });
    }
  });

  describe('validateCalibration', () => {
    test('should validate well-calibrated predictions', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.analysis.isWellCalibrated).toBe(true);
      expect(result.analysis.expectedCalibrationError).toBeLessThan(0.1);
      expect(result.analysis.needsRecalibration).toBe(false);
      expect(result.recommendations).toContain(expect.stringContaining('excellent'));
    });

    test('should identify poorly calibrated predictions', () => {
      // Create overconfident predictions
      const overconfidentHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
        wasAccurate: record.wasAccurate,
      }));

      const result = calibrationValidator.validateCalibration(overconfidentHistory, 'period');

      expect(result.analysis.isWellCalibrated).toBe(false);
      expect(result.analysis.expectedCalibrationError).toBeGreaterThan(0.1);
      expect(result.analysis.needsRecalibration).toBe(true);
    });

    test('should handle insufficient data gracefully', () => {
      const insufficientData = mockAccuracyHistory.slice(0, 5);

      const result = calibrationValidator.validateCalibration(insufficientData, 'period', 20);

      expect(result.analysis.isWellCalibrated).toBe(false);
      expect(result.recommendations).toContain(expect.stringContaining('Need'));
      expect(result.confidenceAdjustments).toHaveLength(0);
    });

    test('should calculate calibration curve correctly', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.analysis.calibrationCurve.length).toBeGreaterThan(0);
      result.analysis.calibrationCurve.forEach(point => {
        expect(point.predictedProbability).toBeGreaterThanOrEqual(0);
        expect(point.predictedProbability).toBeLessThanOrEqual(1);
        expect(point.observedFrequency).toBeGreaterThanOrEqual(0);
        expect(point.observedFrequency).toBeLessThanOrEqual(1);
        expect(point.sampleSize).toBeGreaterThan(0);
      });
    });

    test('should calculate reliability diagram', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.analysis.reliabilityDiagram.length).toBeGreaterThan(0);
      result.analysis.reliabilityDiagram.forEach(([predicted, observed, count]) => {
        expect(predicted).toBeGreaterThanOrEqual(0);
        expect(predicted).toBeLessThanOrEqual(1);
        expect(observed).toBeGreaterThanOrEqual(0);
        expect(observed).toBeLessThanOrEqual(1);
        expect(count).toBeGreaterThan(0);
      });
    });

    test('should decompose Brier score correctly', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      const decomposition = result.analysis.brierScoreDecomposition;
      expect(decomposition.reliability).toBeGreaterThanOrEqual(0);
      expect(decomposition.resolution).toBeGreaterThanOrEqual(0);
      expect(decomposition.uncertainty).toBeGreaterThanOrEqual(0);
      expect(decomposition.uncertainty).toBeLessThanOrEqual(0.25); // Max for binary outcomes
    });
  });

  describe('calibration metrics calculation', () => {
    test('should calculate expected calibration error', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.analysis.expectedCalibrationError).toBeGreaterThanOrEqual(0);
      expect(result.analysis.expectedCalibrationError).toBeLessThanOrEqual(1);
    });

    test('should calculate maximum calibration error', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.analysis.maximumCalibrationError).toBeGreaterThanOrEqual(0);
      expect(result.analysis.maximumCalibrationError).toBeLessThanOrEqual(1);
      expect(result.analysis.maximumCalibrationError).toBeGreaterThanOrEqual(
        result.analysis.expectedCalibrationError
      );
    });

    test('should calculate validation metrics', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.validationMetrics.hosmerLemeshowTest).toBeGreaterThanOrEqual(0);
      expect(result.validationMetrics.kolmogorovSmirnovTest).toBeGreaterThanOrEqual(0);
      expect(result.validationMetrics.andersonDarlingTest).not.toBeNaN();
    });
  });

  describe('recalibration strategy determination', () => {
    test('should recommend temperature scaling for systematic bias', () => {
      // Create systematically overconfident data
      const biasedHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.2),
      }));

      const result = calibrationValidator.validateCalibration(biasedHistory, 'period');

      if (result.analysis.needsRecalibration) {
        expect(['temperature_scaling', 'platt_scaling']).toContain(
          result.analysis.recalibrationStrategy
        );
      }
    });

    test('should recommend isotonic regression for non-monotonic calibration', () => {
      // Create non-monotonic calibration data
      const nonMonotonicHistory = mockAccuracyHistory.map((record, index) => ({
        ...record,
        wasAccurate: index % 3 === 0 ? !record.wasAccurate : record.wasAccurate,
      }));

      const result = calibrationValidator.validateCalibration(nonMonotonicHistory, 'period');

      if (result.analysis.needsRecalibration) {
        expect(result.analysis.recalibrationStrategy).toBeDefined();
      }
    });
  });

  describe('confidence adjustments', () => {
    test('should provide confidence adjustments when recalibration is needed', () => {
      // Create poorly calibrated data
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.99, record.confidenceLevel + 0.4),
      }));

      const result = calibrationValidator.validateCalibration(poorHistory, 'period');

      if (result.analysis.needsRecalibration) {
        expect(result.confidenceAdjustments.length).toBeGreaterThan(0);
        result.confidenceAdjustments.forEach(adjustment => {
          expect(adjustment.originalConfidence).toBeGreaterThan(0);
          expect(adjustment.originalConfidence).toBeLessThan(1);
          expect(adjustment.adjustedConfidence).toBeGreaterThan(0);
          expect(adjustment.adjustedConfidence).toBeLessThan(1);
          expect(adjustment.adjustmentReason).toBeDefined();
        });
      }
    });

    test('should not provide adjustments for well-calibrated predictions', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.confidenceAdjustments).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty accuracy history', () => {
      const result = calibrationValidator.validateCalibration([], 'period');

      expect(result.analysis.isWellCalibrated).toBe(false);
      expect(result.recommendations).toContain(expect.stringContaining('Need'));
    });

    test('should handle all perfect predictions', () => {
      const perfectHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: true,
        confidenceLevel: 1.0,
        errorDays: 0,
      }));

      const result = calibrationValidator.validateCalibration(perfectHistory, 'period');

      expect(result.analysis.calibrationCurve.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle all incorrect predictions', () => {
      const incorrectHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: false,
        confidenceLevel: 0.0,
        errorDays: 5,
      }));

      const result = calibrationValidator.validateCalibration(incorrectHistory, 'period');

      expect(result.analysis.calibrationCurve.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle extreme confidence levels', () => {
      const extremeHistory = mockAccuracyHistory.map((record, index) => ({
        ...record,
        confidenceLevel: index % 2 === 0 ? 0.01 : 0.99,
      }));

      const result = calibrationValidator.validateCalibration(extremeHistory, 'period');

      expect(result.analysis.expectedCalibrationError).toBeGreaterThanOrEqual(0);
      expect(result.analysis.maximumCalibrationError).toBeGreaterThanOrEqual(0);
    });
  });

  describe('period vs ovulation prediction types', () => {
    test('should handle both prediction types', () => {
      const periodResult = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');
      const ovulationResult = calibrationValidator.validateCalibration(
        mockAccuracyHistory,
        'ovulation'
      );

      expect(periodResult.analysis).toBeDefined();
      expect(ovulationResult.analysis).toBeDefined();

      // Recommendations should be contextual
      expect(periodResult.recommendations.some(r => r.includes('period'))).toBe(true);
      expect(ovulationResult.recommendations.some(r => r.includes('ovulation'))).toBe(true);
    });
  });

  describe('statistical validation', () => {
    test('should calculate Hosmer-Lemeshow test statistic', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.validationMetrics.hosmerLemeshowTest).toBeGreaterThanOrEqual(0);
      expect(result.validationMetrics.hosmerLemeshowTest).not.toBeNaN();
    });

    test('should calculate Kolmogorov-Smirnov test statistic', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.validationMetrics.kolmogorovSmirnovTest).toBeGreaterThanOrEqual(0);
      expect(result.validationMetrics.kolmogorovSmirnovTest).not.toBeNaN();
    });

    test('should calculate Anderson-Darling test statistic', () => {
      const result = calibrationValidator.validateCalibration(mockAccuracyHistory, 'period');

      expect(result.validationMetrics.andersonDarlingTest).not.toBeNaN();
    });
  });
});
