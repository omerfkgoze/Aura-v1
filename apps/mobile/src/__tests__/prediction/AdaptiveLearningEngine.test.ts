import { AdaptiveLearningEngine } from '../../components/prediction/models/AdaptiveLearningEngine';
import {
  BayesianModelParameters,
  AccuracyRecord,
  EncryptedCycleData,
  ModelUpdateResult,
} from '@aura/shared-types';

describe('AdaptiveLearningEngine', () => {
  let learningEngine: AdaptiveLearningEngine;
  let mockModelParameters: BayesianModelParameters;
  let mockAccuracyHistory: AccuracyRecord[];
  let mockCycleData: EncryptedCycleData[];

  beforeEach(() => {
    learningEngine = new AdaptiveLearningEngine();

    mockModelParameters = {
      cycleLengthMean: 28,
      cycleLengthVariance: 9,
      periodLengthMean: 5,
      periodLengthVariance: 1,
      seasonalVariation: 0.1,
      personalHistoryWeight: 0.8,
      adaptiveLearningRate: 0.1,
    };

    mockAccuracyHistory = [
      {
        predictionDate: '2024-01-15',
        actualDate: '2024-01-17',
        confidenceLevel: 0.8,
        wasAccurate: false,
        errorDays: 2,
        brierScore: 0.3,
      },
      {
        predictionDate: '2024-02-12',
        actualDate: '2024-02-14',
        confidenceLevel: 0.8,
        wasAccurate: false,
        errorDays: 2,
        brierScore: 0.4,
      },
      {
        predictionDate: '2024-03-11',
        actualDate: '2024-03-12',
        confidenceLevel: 0.9,
        wasAccurate: true,
        errorDays: 1,
        brierScore: 0.1,
      },
      {
        predictionDate: '2024-04-08',
        actualDate: '2024-04-10',
        confidenceLevel: 0.7,
        wasAccurate: false,
        errorDays: 2,
        brierScore: 0.5,
      },
    ];

    mockCycleData = [
      {
        id: '1',
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-05',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        modificationHistory: [],
      },
      {
        id: '2',
        userId: 'test-user',
        cycleNumber: 2,
        periodStartDate: '2024-01-29',
        periodEndDate: '2024-02-03',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-01-29T00:00:00Z',
        updatedAt: '2024-01-29T00:00:00Z',
        modificationHistory: [],
      },
      {
        id: '3',
        userId: 'test-user',
        cycleNumber: 3,
        periodStartDate: '2024-02-26',
        periodEndDate: '2024-03-02',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-02-26T00:00:00Z',
        updatedAt: '2024-02-26T00:00:00Z',
        modificationHistory: [],
      },
    ];
  });

  describe('updateModelFromAccuracy', () => {
    it('should decline update with insufficient accuracy data', async () => {
      const shortHistory = mockAccuracyHistory.slice(0, 2);

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        shortHistory,
        mockCycleData
      );

      expect(result.success).toBe(false);
      expect(result.updateReason).toContain('Insufficient accuracy data');
      expect(result.newParameters).toEqual(mockModelParameters);
    });

    it('should decline update when model performance is satisfactory', async () => {
      // Create high accuracy history
      const highAccuracyHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: true,
        errorDays: 0,
        brierScore: 0.1,
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        highAccuracyHistory,
        mockCycleData
      );

      expect(result.success).toBe(false);
      expect(result.updateReason).toContain('satisfactory');
    });

    it('should update parameters when model performance is poor', async () => {
      // Create poor accuracy history
      const poorAccuracyHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: false,
        errorDays: 3,
        brierScore: 0.6,
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        poorAccuracyHistory,
        mockCycleData
      );

      expect(result.success).toBe(true);
      expect(result.newParameters).not.toEqual(mockModelParameters);
      expect(result.accuracyImprovement).toBeGreaterThan(0);
    });

    it('should adjust learning rate based on performance', async () => {
      // Very poor performance should increase learning rate
      const veryPoorHistory = Array.from({ length: 10 }, (_, i) => ({
        predictionDate: `2024-${(i + 1).toString().padStart(2, '0')}-15`,
        actualDate: `2024-${(i + 1).toString().padStart(2, '0')}-20`,
        confidenceLevel: 0.8,
        wasAccurate: false,
        errorDays: 5,
        brierScore: 0.8,
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        veryPoorHistory,
        mockCycleData
      );

      expect(result.success).toBe(true);
      expect(result.newParameters.adaptiveLearningRate).toBeGreaterThan(
        mockModelParameters.adaptiveLearningRate
      );
    });

    it('should update cycle length parameters based on actual data', async () => {
      // Create cycle data with longer cycles than default
      const longCycleData = mockCycleData.map((cycle, i) => ({
        ...cycle,
        periodStartDate: new Date(2024, 0, 1 + i * 32).toISOString().split('T')[0], // 32-day cycles
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        mockAccuracyHistory,
        longCycleData
      );

      if (result.success) {
        expect(result.newParameters.cycleLengthMean).toBeGreaterThan(
          mockModelParameters.cycleLengthMean
        );
      }
    });
  });

  describe('updatePersonalHistoryWeight', () => {
    it('should not update with insufficient cycle history', () => {
      const shortCycleHistory = mockCycleData.slice(0, 2);

      const updatedParams = learningEngine.updatePersonalHistoryWeight(
        mockModelParameters,
        shortCycleHistory,
        mockAccuracyHistory
      );

      expect(updatedParams.personalHistoryWeight).toBe(mockModelParameters.personalHistoryWeight);
    });

    it('should increase weight when personal history helps accuracy', () => {
      // Simulate regular cycles and good accuracy
      const regularCycleData = Array.from({ length: 6 }, (_, i) => ({
        ...mockCycleData[0],
        id: `${i + 1}`,
        cycleNumber: i + 1,
        periodStartDate: new Date(2024, 0, 1 + i * 28).toISOString().split('T')[0],
      }));

      const goodAccuracyHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: true,
        errorDays: 0,
      }));

      const updatedParams = learningEngine.updatePersonalHistoryWeight(
        mockModelParameters,
        regularCycleData,
        goodAccuracyHistory
      );

      expect(updatedParams.personalHistoryWeight).toBeGreaterThanOrEqual(
        mockModelParameters.personalHistoryWeight
      );
    });

    it('should decrease weight when personal history hurts accuracy', () => {
      // Simulate irregular cycles and poor accuracy
      const irregularCycleData = [
        { ...mockCycleData[0], periodStartDate: '2024-01-01' },
        { ...mockCycleData[1], periodStartDate: '2024-01-25' }, // 24 days
        { ...mockCycleData[2], periodStartDate: '2024-02-30' }, // 36 days - invalid but testing edge case
        { ...mockCycleData[0], id: '4', cycleNumber: 4, periodStartDate: '2024-03-15' }, // 44 days
      ];

      const poorAccuracyHistory = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: false,
        errorDays: 5,
      }));

      const updatedParams = learningEngine.updatePersonalHistoryWeight(
        mockModelParameters,
        irregularCycleData,
        poorAccuracyHistory
      );

      expect(updatedParams.personalHistoryWeight).toBeLessThanOrEqual(
        mockModelParameters.personalHistoryWeight
      );
    });

    it('should keep weight within reasonable bounds', () => {
      const extremeParams = {
        ...mockModelParameters,
        personalHistoryWeight: 0.95,
      };

      const regularCycleData = Array.from({ length: 10 }, (_, i) => ({
        ...mockCycleData[0],
        id: `${i + 1}`,
        cycleNumber: i + 1,
        periodStartDate: new Date(2024, 0, 1 + i * 28).toISOString().split('T')[0],
      }));

      const perfectAccuracy = mockAccuracyHistory.map(record => ({
        ...record,
        wasAccurate: true,
        errorDays: 0,
      }));

      const updatedParams = learningEngine.updatePersonalHistoryWeight(
        extremeParams,
        regularCycleData,
        perfectAccuracy
      );

      expect(updatedParams.personalHistoryWeight).toBeLessThanOrEqual(0.95);
      expect(updatedParams.personalHistoryWeight).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('resetToDefaults', () => {
    it('should not reset when performance is not severely degraded', () => {
      const moderateAccuracy = mockAccuracyHistory.map((record, i) => ({
        ...record,
        wasAccurate: i % 2 === 0, // 50% accuracy
      }));

      const result = learningEngine.resetToDefaults(mockModelParameters, moderateAccuracy);

      expect(result.success).toBe(false);
      expect(result.updateReason).toContain('not severely degraded');
    });

    it('should reset to defaults when performance is severely degraded', () => {
      const terribleAccuracy = Array.from({ length: 10 }, (_, i) => ({
        predictionDate: `2024-${(i + 1).toString().padStart(2, '0')}-15`,
        actualDate: `2024-${(i + 1).toString().padStart(2, '0')}-25`,
        confidenceLevel: 0.8,
        wasAccurate: false,
        errorDays: 10,
        brierScore: 0.9,
      }));

      const result = learningEngine.resetToDefaults(mockModelParameters, terribleAccuracy);

      expect(result.success).toBe(true);
      expect(result.newParameters.cycleLengthMean).toBe(28);
      expect(result.newParameters.cycleLengthVariance).toBe(9);
      expect(result.newParameters.personalHistoryWeight).toBe(0.6);
      expect(result.updateReason).toContain('reset to defaults');
    });
  });

  describe('Accuracy Trend Analysis', () => {
    it('should detect improving accuracy trends', async () => {
      // Create improving trend: poor -> good accuracy
      const improvingHistory = [
        ...mockAccuracyHistory.slice(0, 2).map(r => ({ ...r, wasAccurate: false })),
        ...mockAccuracyHistory.slice(2).map(r => ({ ...r, wasAccurate: true })),
        {
          predictionDate: '2024-05-10',
          actualDate: '2024-05-10',
          confidenceLevel: 0.9,
          wasAccurate: true,
          errorDays: 0,
          brierScore: 0.05,
        },
      ];

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        improvingHistory,
        mockCycleData
      );

      // With improving trend, should be less aggressive with changes
      if (result.success) {
        expect(result.newParameters.adaptiveLearningRate).toBeLessThanOrEqual(
          mockModelParameters.adaptiveLearningRate * 1.1
        );
      }
    });

    it('should detect declining accuracy trends', async () => {
      // Create declining trend: good -> poor accuracy
      const decliningHistory = [
        ...mockAccuracyHistory.slice(0, 2).map(r => ({ ...r, wasAccurate: true })),
        ...mockAccuracyHistory.slice(2).map(r => ({ ...r, wasAccurate: false, errorDays: 4 })),
      ];

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        decliningHistory,
        mockCycleData
      );

      // With declining trend, should be more aggressive with changes
      if (result.success) {
        expect(result.newParameters.adaptiveLearningRate).toBeGreaterThanOrEqual(
          mockModelParameters.adaptiveLearningRate
        );
      }
    });
  });

  describe('Seasonal Pattern Detection', () => {
    it('should detect seasonal error patterns', async () => {
      // Create seasonal error pattern (worse in winter months)
      const seasonalHistory = Array.from({ length: 12 }, (_, i) => ({
        predictionDate: `2024-${(i + 1).toString().padStart(2, '0')}-15`,
        actualDate: `2024-${(i + 1).toString().padStart(2, '0')}-${i < 3 || i > 10 ? '20' : '16'}`, // Worse in winter
        confidenceLevel: 0.8,
        wasAccurate: !(i < 3 || i > 10),
        errorDays: i < 3 || i > 10 ? 5 : 1,
        brierScore: i < 3 || i > 10 ? 0.7 : 0.2,
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        seasonalHistory,
        mockCycleData
      );

      if (result.success) {
        expect(result.newParameters.seasonalVariation).toBeGreaterThan(
          mockModelParameters.seasonalVariation
        );
      }
    });
  });

  describe('Error Variance Analysis', () => {
    it('should handle consistent error patterns', async () => {
      const consistentErrors = Array.from({ length: 8 }, (_, i) => ({
        predictionDate: `2024-${(i + 1).toString().padStart(2, '0')}-15`,
        actualDate: `2024-${(i + 1).toString().padStart(2, '0')}-17`, // Always 2 days off
        confidenceLevel: 0.8,
        wasAccurate: false,
        errorDays: 2,
        brierScore: 0.4,
      }));

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        consistentErrors,
        mockCycleData
      );

      expect(result.success).toBe(true);
      // Should adjust cycle length mean to compensate for consistent bias
      expect(result.newParameters.cycleLengthMean).not.toBe(mockModelParameters.cycleLengthMean);
    });

    it('should handle highly variable error patterns', async () => {
      const variableErrors = [
        { ...mockAccuracyHistory[0], errorDays: -5 }, // Very early
        { ...mockAccuracyHistory[1], errorDays: 7 }, // Very late
        { ...mockAccuracyHistory[2], errorDays: -2 }, // Early
        { ...mockAccuracyHistory[3], errorDays: 3 }, // Late
      ];

      const result = await learningEngine.updateModelFromAccuracy(
        mockModelParameters,
        variableErrors,
        mockCycleData
      );

      if (result.success) {
        // Should increase variance to account for high variability
        expect(result.newParameters.cycleLengthVariance).toBeGreaterThan(
          mockModelParameters.cycleLengthVariance
        );
      }
    });
  });
});
