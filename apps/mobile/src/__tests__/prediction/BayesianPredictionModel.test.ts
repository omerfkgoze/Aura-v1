import { BayesianPredictionModel } from '../../components/prediction/models/BayesianPredictionModel';
import { EncryptedCycleData, BayesianModelParameters } from '@aura/shared-types';

describe('BayesianPredictionModel', () => {
  let model: BayesianPredictionModel;
  let mockCycleData: EncryptedCycleData[];

  beforeEach(() => {
    model = new BayesianPredictionModel();

    // Create mock cycle data for testing
    mockCycleData = [
      {
        id: '1',
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-05',
        dayData: [
          {
            date: '2024-01-01',
            flowIntensity: 'medium',
            symptoms: [],
            isPeriodStart: true,
          },
          {
            date: '2024-01-05',
            flowIntensity: 'light',
            symptoms: [],
            isPeriodEnd: true,
          },
        ],
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
        periodStartDate: '2024-01-29', // 28-day cycle
        periodEndDate: '2024-02-03',
        dayData: [
          {
            date: '2024-01-29',
            flowIntensity: 'medium',
            symptoms: [],
            isPeriodStart: true,
          },
        ],
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
        periodStartDate: '2024-02-27', // 29-day cycle
        periodEndDate: '2024-03-03',
        dayData: [
          {
            date: '2024-02-27',
            flowIntensity: 'heavy',
            symptoms: [],
            isPeriodStart: true,
          },
        ],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-02-27T00:00:00Z',
        updatedAt: '2024-02-27T00:00:00Z',
        modificationHistory: [],
      },
    ];
  });

  describe('Constructor', () => {
    it('should initialize with default parameters', () => {
      const defaultModel = new BayesianPredictionModel();
      const parameters = defaultModel.getModelParameters();

      expect(parameters.cycleLengthMean).toBe(28);
      expect(parameters.cycleLengthVariance).toBe(9);
      expect(parameters.periodLengthMean).toBe(5);
      expect(parameters.periodLengthVariance).toBe(1);
      expect(parameters.personalHistoryWeight).toBe(0.8);
    });

    it('should initialize with custom parameters', () => {
      const customParams: Partial<BayesianModelParameters> = {
        cycleLengthMean: 30,
        cycleLengthVariance: 12,
        personalHistoryWeight: 0.9,
      };

      const customModel = new BayesianPredictionModel(customParams);
      const parameters = customModel.getModelParameters();

      expect(parameters.cycleLengthMean).toBe(30);
      expect(parameters.cycleLengthVariance).toBe(12);
      expect(parameters.personalHistoryWeight).toBe(0.9);
      expect(parameters.periodLengthMean).toBe(5); // Should use default
    });
  });

  describe('predictNextPeriod', () => {
    it('should return default prediction for insufficient data', async () => {
      const prediction = await model.predictNextPeriod([mockCycleData[0]]);

      expect(prediction.uncertaintyFactors.historyLength).toBe(0);
      expect(prediction.uncertaintyFactors.dataQuality).toBe(0.1);
      expect(prediction.explanation).toContain('average cycle length');
      expect(prediction.confidenceIntervals.p95).toBeGreaterThan(
        prediction.confidenceIntervals.p80
      );
      expect(prediction.confidenceIntervals.p80).toBeGreaterThan(
        prediction.confidenceIntervals.p50
      );
    });

    it('should generate Bayesian prediction with sufficient data', async () => {
      const prediction = await model.predictNextPeriod(mockCycleData);

      expect(prediction.nextPeriodStart).toBeDefined();
      expect(prediction.confidenceIntervals).toBeDefined();
      expect(prediction.uncertaintyFactors.historyLength).toBe(3);
      expect(prediction.uncertaintyFactors.dataQuality).toBeGreaterThan(0.1);
      expect(prediction.probabilityDistribution).toHaveLength(15);

      // Verify confidence intervals are properly ordered
      expect(prediction.confidenceIntervals.p95).toBeGreaterThan(
        prediction.confidenceIntervals.p80
      );
      expect(prediction.confidenceIntervals.p80).toBeGreaterThan(
        prediction.confidenceIntervals.p50
      );
    });

    it('should incorporate cycle length variability', async () => {
      // Add more variable cycle data
      const variableCycleData = [
        ...mockCycleData,
        {
          ...mockCycleData[0],
          id: '4',
          cycleNumber: 4,
          periodStartDate: '2024-03-30', // 32-day cycle (more variable)
          createdAt: '2024-03-30T00:00:00Z',
          updatedAt: '2024-03-30T00:00:00Z',
        },
      ];

      const prediction = await model.predictNextPeriod(variableCycleData);

      expect(prediction.uncertaintyFactors.cycleLengthVariability).toBeGreaterThan(0);
      expect(prediction.confidenceIntervals.p95).toBeGreaterThan(5); // Higher uncertainty
    });

    it('should generate proper probability distribution', async () => {
      const prediction = await model.predictNextPeriod(mockCycleData);

      const probSum = prediction.probabilityDistribution.reduce((sum, prob) => sum + prob, 0);
      expect(probSum).toBeCloseTo(1, 1); // Probabilities should sum to ~1

      // Peak probability should be in the middle (around predicted date)
      const maxProb = Math.max(...prediction.probabilityDistribution);
      const maxIndex = prediction.probabilityDistribution.indexOf(maxProb);
      expect(maxIndex).toBeGreaterThan(2);
      expect(maxIndex).toBeLessThan(12);
    });
  });

  describe('predictOvulation', () => {
    it('should predict ovulation with uncertainty', async () => {
      const ovulationPrediction = await model.predictOvulation(mockCycleData);

      expect(ovulationPrediction.ovulationDate).toBeDefined();
      expect(ovulationPrediction.fertilityWindow).toBeDefined();
      expect(ovulationPrediction.fertilityWindow.start).toBeDefined();
      expect(ovulationPrediction.fertilityWindow.end).toBeDefined();
      expect(ovulationPrediction.fertilityWindow.peakDay).toBe(ovulationPrediction.ovulationDate);

      // Fertility window should be about 6 days (5 before + 1 after ovulation)
      const startDate = new Date(ovulationPrediction.fertilityWindow.start);
      const endDate = new Date(ovulationPrediction.fertilityWindow.end);
      const windowDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(windowDays).toBe(6);
    });

    it('should have higher uncertainty than period prediction', async () => {
      const periodPrediction = await model.predictNextPeriod(mockCycleData);
      const ovulationPrediction = await model.predictOvulation(mockCycleData);

      expect(ovulationPrediction.confidenceIntervals.p95).toBeGreaterThan(
        periodPrediction.confidenceIntervals.p95
      );
      expect(ovulationPrediction.uncertaintyFactors.dataQuality).toBeLessThanOrEqual(
        periodPrediction.uncertaintyFactors.dataQuality
      );
    });

    it('should generate ovulation probability distribution', async () => {
      const ovulationPrediction = await model.predictOvulation(mockCycleData);

      expect(ovulationPrediction.probabilityDistribution).toBeDefined();
      expect(ovulationPrediction.probabilityDistribution.length).toBeGreaterThan(5);

      const probSum = ovulationPrediction.probabilityDistribution.reduce(
        (sum, prob) => sum + prob,
        0
      );
      expect(probSum).toBeCloseTo(1, 1);
    });
  });

  describe('Cycle Pattern Analysis', () => {
    it('should detect regular cycles', async () => {
      // Create very regular cycle data
      const regularCycleData = Array.from({ length: 6 }, (_, i) => ({
        ...mockCycleData[0],
        id: `${i + 1}`,
        cycleNumber: i + 1,
        periodStartDate: new Date(2024, 0, 1 + i * 28).toISOString().split('T')[0],
        createdAt: new Date(2024, 0, 1 + i * 28).toISOString(),
        updatedAt: new Date(2024, 0, 1 + i * 28).toISOString(),
      }));

      const prediction = await model.predictNextPeriod(regularCycleData);

      expect(prediction.uncertaintyFactors.cycleLengthVariability).toBeLessThan(0.1);
      expect(prediction.confidenceIntervals.p50).toBeLessThan(3);
    });

    it('should detect irregular cycles', async () => {
      // Create irregular cycle data
      const irregularLengths = [21, 35, 25, 40, 22, 38];
      const irregularCycleData = irregularLengths.map((length, i) => {
        const startDate = new Date(2024, 0, 1);
        if (i > 0) {
          startDate.setDate(
            startDate.getDate() + irregularLengths.slice(0, i).reduce((sum, l) => sum + l, 0)
          );
        }

        return {
          ...mockCycleData[0],
          id: `${i + 1}`,
          cycleNumber: i + 1,
          periodStartDate: startDate.toISOString().split('T')[0],
          createdAt: startDate.toISOString(),
          updatedAt: startDate.toISOString(),
        };
      });

      const prediction = await model.predictNextPeriod(irregularCycleData);

      expect(prediction.uncertaintyFactors.cycleLengthVariability).toBeGreaterThan(0.3);
      expect(prediction.confidenceIntervals.p95).toBeGreaterThan(7);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess high quality data', async () => {
      const highQualityData = mockCycleData.map(cycle => ({
        ...cycle,
        dayData: [
          ...cycle.dayData,
          {
            date: cycle.periodStartDate,
            flowIntensity: 'medium' as const,
            symptoms: [
              { id: '1', name: 'cramping', category: 'physical' as const, severity: 3 as const },
            ],
          },
        ],
      }));

      const prediction = await model.predictNextPeriod(highQualityData);
      expect(prediction.uncertaintyFactors.dataQuality).toBeGreaterThan(0.7);
    });

    it('should assess low quality data', async () => {
      const lowQualityData = mockCycleData.map(cycle => ({
        ...cycle,
        periodEndDate: undefined,
        dayData: [],
      }));

      const prediction = await model.predictNextPeriod(lowQualityData);
      expect(prediction.uncertaintyFactors.dataQuality).toBeLessThan(0.4);
    });
  });

  describe('Model Parameter Updates', () => {
    it('should update model parameters', () => {
      const newCycleData: EncryptedCycleData = {
        ...mockCycleData[0],
        id: 'new-cycle',
        cycleNumber: 4,
      };

      expect(() => model.updateModelParameters(newCycleData)).not.toThrow();
    });

    it('should return current model parameters', () => {
      const parameters = model.getModelParameters();

      expect(parameters).toHaveProperty('cycleLengthMean');
      expect(parameters).toHaveProperty('cycleLengthVariance');
      expect(parameters).toHaveProperty('periodLengthMean');
      expect(parameters).toHaveProperty('periodLengthVariance');
      expect(parameters).toHaveProperty('seasonalVariation');
      expect(parameters).toHaveProperty('personalHistoryWeight');
      expect(parameters).toHaveProperty('adaptiveLearningRate');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty cycle history', async () => {
      const prediction = await model.predictNextPeriod([]);

      expect(prediction).toBeDefined();
      expect(prediction.nextPeriodStart).toBeDefined();
      expect(prediction.uncertaintyFactors.historyLength).toBe(0);
    });

    it('should handle malformed cycle data', async () => {
      const malformedData = [
        {
          ...mockCycleData[0],
          periodStartDate: 'invalid-date',
        },
      ];

      const prediction = await model.predictNextPeriod(malformedData);
      expect(prediction).toBeDefined();
    });
  });
});
