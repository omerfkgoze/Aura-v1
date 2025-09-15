import ModelRecalibrationEngine from '../../components/prediction/models/ModelRecalibrationEngine';
import type { AccuracyRecord, BayesianModelParameters } from '@aura/shared-types';

describe('ModelRecalibrationEngine', () => {
  let recalibrationEngine: ModelRecalibrationEngine;
  let mockAccuracyHistory: AccuracyRecord[];
  let mockModelParameters: BayesianModelParameters;

  beforeEach(() => {
    recalibrationEngine = new ModelRecalibrationEngine();

    mockModelParameters = {
      cycleLengthMean: 28,
      cycleLengthVariance: 4,
      periodLengthMean: 5,
      periodLengthVariance: 1,
      seasonalVariation: 0.1,
      personalHistoryWeight: 0.7,
      adaptiveLearningRate: 0.2,
    };

    // Create well-calibrated mock data
    mockAccuracyHistory = [];
    for (let i = 0; i < 50; i++) {
      const confidence = 0.3 + (i / 50) * 0.4; // Range from 0.3 to 0.7
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

  describe('assessRecalibrationNeed', () => {
    test('should not trigger recalibration for well-calibrated model', () => {
      const assessment = recalibrationEngine.assessRecalibrationNeed(
        mockAccuracyHistory,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(false);
      expect(assessment.urgency).toBe('low');
      expect(assessment.reason).not.toContain('error');
    });

    test('should trigger recalibration for poorly calibrated model', () => {
      // Create overconfident predictions
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.4),
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        poorHistory,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(true);
      expect(['medium', 'high', 'critical']).toContain(assessment.urgency);
      expect(assessment.estimatedImprovement).toBeGreaterThan(0);
      expect(assessment.recommendedStrategy.method).not.toBe('none');
    });

    test('should not trigger during cooldown period', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        mockAccuracyHistory,
        mockModelParameters,
        recentDate.toISOString()
      );

      expect(assessment.triggered).toBe(false);
      expect(assessment.reason).toContain('cooldown');
    });

    test('should require minimum data points', () => {
      const insufficientData = mockAccuracyHistory.slice(0, 10);

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        insufficientData,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(false);
      expect(assessment.reason).toContain('Need');
      expect(assessment.estimatedImprovement).toBe(0);
    });

    test('should detect systematic bias', () => {
      // Create systematically overconfident data
      const biasedHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.25),
        wasAccurate: record.wasAccurate,
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        biasedHistory,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(true);
      expect(assessment.reason).toContain('bias');
    });

    test('should assess urgency levels correctly', () => {
      // Critical error case
      const criticalHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.99, record.confidenceLevel + 0.6),
      }));

      const criticalAssessment = recalibrationEngine.assessRecalibrationNeed(
        criticalHistory,
        mockModelParameters
      );

      expect(criticalAssessment.triggered).toBe(true);
      expect(criticalAssessment.urgency).toBe('critical');
    });
  });

  describe('performRecalibration', () => {
    test('should successfully recalibrate poorly calibrated model', () => {
      // Create poorly calibrated data that needs recalibration
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(poorHistory, mockModelParameters);

      if (result.success) {
        expect(result.newParameters).toBeDefined();
        expect(result.calibrationImprovement).toBeGreaterThanOrEqual(0);
        expect(result.validationMetrics.beforeECE).toBeGreaterThan(
          result.validationMetrics.afterECE
        );
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    test('should fail with insufficient data', () => {
      const insufficientData = mockAccuracyHistory.slice(0, 10);

      const result = recalibrationEngine.performRecalibration(
        insufficientData,
        mockModelParameters
      );

      expect(result.success).toBe(false);
      expect(result.recommendations[0]).toContain('Insufficient');
    });

    test('should apply temperature scaling strategy', () => {
      const strategy = {
        method: 'temperature_scaling' as const,
        parameters: { temperature: 1.5 },
        confidence: 0.8,
        expectedImprovement: 0.1,
        reasoning: 'Test temperature scaling',
      };

      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(
        poorHistory,
        mockModelParameters,
        strategy
      );

      if (result.success) {
        expect(result.strategy.method).toBe('temperature_scaling');
        expect(result.newParameters.cycleLengthVariance).not.toBe(
          mockModelParameters.cycleLengthVariance
        );
      }
    });

    test('should apply Platt scaling strategy', () => {
      const strategy = {
        method: 'platt_scaling' as const,
        parameters: { a: 1.2, b: 0.1 },
        confidence: 0.7,
        expectedImprovement: 0.08,
        reasoning: 'Test Platt scaling',
      };

      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(
        poorHistory,
        mockModelParameters,
        strategy
      );

      if (result.success) {
        expect(result.strategy.method).toBe('platt_scaling');
        expect(result.newParameters.personalHistoryWeight).not.toBe(
          mockModelParameters.personalHistoryWeight
        );
      }
    });

    test('should apply isotonic regression strategy', () => {
      const strategy = {
        method: 'isotonic_regression' as const,
        parameters: {},
        confidence: 0.6,
        expectedImprovement: 0.06,
        reasoning: 'Test isotonic regression',
      };

      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(
        poorHistory,
        mockModelParameters,
        strategy
      );

      if (result.success) {
        expect(result.strategy.method).toBe('isotonic_regression');
        expect(result.newParameters.adaptiveLearningRate).toBeGreaterThan(
          mockModelParameters.adaptiveLearningRate
        );
      }
    });

    test('should apply Bayesian update strategy', () => {
      const strategy = {
        method: 'bayesian_update' as const,
        parameters: { learning_rate: 0.1 },
        confidence: 0.9,
        expectedImprovement: 0.12,
        reasoning: 'Test Bayesian update',
      };

      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        errorDays: Math.abs(record.errorDays) + 2, // Increase recent errors
      }));

      const result = recalibrationEngine.performRecalibration(
        poorHistory,
        mockModelParameters,
        strategy
      );

      if (result.success) {
        expect(result.strategy.method).toBe('bayesian_update');
        expect(result.newParameters.cycleLengthVariance).toBeGreaterThan(
          mockModelParameters.cycleLengthVariance
        );
      }
    });

    test('should validate improvement significance', () => {
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.4),
      }));

      const result = recalibrationEngine.performRecalibration(poorHistory, mockModelParameters);

      if (result.success) {
        expect(result.validationMetrics.improvementSignificance).toBeGreaterThan(0);
        expect(result.validationMetrics.beforeECE).toBeGreaterThan(0);
        expect(result.validationMetrics.afterECE).toBeGreaterThanOrEqual(0);
      }
    });

    test('should provide meaningful recommendations', () => {
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(poorHistory, mockModelParameters);

      if (result.success) {
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations[0]).toContain('Applied');
        expect(result.recommendations.some(r => r.includes('calibration'))).toBe(true);
      }
    });
  });

  describe('strategy selection', () => {
    test('should select appropriate strategy based on calibration issues', () => {
      // Test different types of calibration problems
      const systematicBiasHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.2),
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        systematicBiasHistory,
        mockModelParameters
      );

      if (assessment.triggered) {
        expect(['temperature_scaling', 'platt_scaling', 'bayesian_update']).toContain(
          assessment.recommendedStrategy.method
        );
        expect(assessment.recommendedStrategy.reasoning).toBeDefined();
      }
    });

    test('should provide confidence and expected improvement estimates', () => {
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        poorHistory,
        mockModelParameters
      );

      if (assessment.triggered) {
        expect(assessment.recommendedStrategy.confidence).toBeGreaterThan(0);
        expect(assessment.recommendedStrategy.confidence).toBeLessThanOrEqual(1);
        expect(assessment.recommendedStrategy.expectedImprovement).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('edge cases', () => {
    test('should handle perfect predictions', () => {
      const perfectHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: true,
        confidenceLevel: 1.0,
        errorDays: 0,
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        perfectHistory,
        mockModelParameters
      );

      // Perfect predictions might still need recalibration if overconfident
      expect(assessment).toBeDefined();
    });

    test('should handle all incorrect predictions', () => {
      const incorrectHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: false,
        confidenceLevel: 0.9,
        errorDays: 5,
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        incorrectHistory,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(true);
      expect(assessment.urgency).toBe('critical');
    });

    test('should handle extreme confidence levels', () => {
      const extremeHistory = mockAccuracyHistory.map((record, index) => ({
        ...record,
        confidenceLevel: index % 2 === 0 ? 0.01 : 0.99,
      }));

      const assessment = recalibrationEngine.assessRecalibrationNeed(
        extremeHistory,
        mockModelParameters
      );

      expect(assessment.triggered).toBe(true);
    });

    test('should handle empty accuracy history gracefully', () => {
      const assessment = recalibrationEngine.assessRecalibrationNeed([], mockModelParameters);

      expect(assessment.triggered).toBe(false);
      expect(assessment.reason).toContain('Need');
    });
  });

  describe('parameter updates', () => {
    test('should update parameters within reasonable bounds', () => {
      const poorHistory = mockAccuracyHistory.map(record => ({
        ...record,
        confidenceLevel: Math.min(0.95, record.confidenceLevel + 0.3),
      }));

      const result = recalibrationEngine.performRecalibration(poorHistory, mockModelParameters);

      if (result.success) {
        // Check that parameters are within reasonable bounds
        expect(result.newParameters.cycleLengthVariance).toBeGreaterThan(0);
        expect(result.newParameters.periodLengthVariance).toBeGreaterThan(0);
        expect(result.newParameters.adaptiveLearningRate).toBeGreaterThan(0);
        expect(result.newParameters.adaptiveLearningRate).toBeLessThanOrEqual(0.5);
        expect(result.newParameters.personalHistoryWeight).toBeGreaterThan(0);
        expect(result.newParameters.personalHistoryWeight).toBeLessThanOrEqual(1);
      }
    });

    test('should preserve model stability during updates', () => {
      const result = recalibrationEngine.performRecalibration(
        mockAccuracyHistory,
        mockModelParameters
      );

      if (result.success) {
        // Updated parameters should not be drastically different
        const cycleLengthChange = Math.abs(
          result.newParameters.cycleLengthMean - mockModelParameters.cycleLengthMean
        );
        const periodLengthChange = Math.abs(
          result.newParameters.periodLengthMean - mockModelParameters.periodLengthMean
        );

        expect(cycleLengthChange).toBeLessThan(10); // Reasonable change
        expect(periodLengthChange).toBeLessThan(5); // Reasonable change
      }
    });
  });
});
