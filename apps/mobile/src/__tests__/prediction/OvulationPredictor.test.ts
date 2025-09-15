import { OvulationPredictor } from '../../../components/prediction/models/OvulationPredictor';
import { EncryptedCycleData } from '@aura/shared-types';

describe('OvulationPredictor', () => {
  let predictor: OvulationPredictor;
  let mockCycleData: EncryptedCycleData[];

  beforeEach(() => {
    predictor = new OvulationPredictor();
    mockCycleData = createMockCycleData();
  });

  describe('predictOvulation', () => {
    it('should predict ovulation with confidence intervals', async () => {
      const nextPeriodDate = new Date('2024-02-01');
      const prediction = await predictor.predictOvulation(mockCycleData, nextPeriodDate);

      expect(prediction).toHaveProperty('ovulationDate');
      expect(prediction).toHaveProperty('fertilityWindow');
      expect(prediction).toHaveProperty('confidenceIntervals');
      expect(prediction.confidenceIntervals).toHaveProperty('p50');
      expect(prediction.confidenceIntervals).toHaveProperty('p80');
      expect(prediction.confidenceIntervals).toHaveProperty('p95');
    });

    it('should calculate fertility window correctly', async () => {
      const nextPeriodDate = new Date('2024-02-01');
      const prediction = await predictor.predictOvulation(mockCycleData, nextPeriodDate);

      const ovulationDate = new Date(prediction.ovulationDate);
      const windowStart = new Date(prediction.fertilityWindow.start);
      const windowEnd = new Date(prediction.fertilityWindow.end);

      expect(windowStart).toBeLessThan(ovulationDate);
      expect(windowEnd).toBeGreaterThan(ovulationDate);

      // Fertility window should be approximately 6 days
      const windowDays = Math.ceil(
        (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(windowDays).toBeGreaterThanOrEqual(5);
      expect(windowDays).toBeLessThanOrEqual(7);
    });

    it('should provide uncertainty factors', async () => {
      const nextPeriodDate = new Date('2024-02-01');
      const prediction = await predictor.predictOvulation(mockCycleData, nextPeriodDate);

      expect(prediction.uncertaintyFactors).toHaveProperty('dataQuality');
      expect(prediction.uncertaintyFactors).toHaveProperty('historyLength');
      expect(prediction.uncertaintyFactors).toHaveProperty('cycleLengthVariability');
      expect(prediction.uncertaintyFactors).toHaveProperty('recentDataReliability');

      expect(prediction.uncertaintyFactors.dataQuality).toBeGreaterThanOrEqual(0);
      expect(prediction.uncertaintyFactors.dataQuality).toBeLessThanOrEqual(1);
      expect(prediction.uncertaintyFactors.historyLength).toBe(mockCycleData.length);
    });

    it('should generate probability distribution', async () => {
      const nextPeriodDate = new Date('2024-02-01');
      const prediction = await predictor.predictOvulation(mockCycleData, nextPeriodDate);

      expect(Array.isArray(prediction.probabilityDistribution)).toBe(true);
      expect(prediction.probabilityDistribution.length).toBeGreaterThan(0);

      // Probabilities should sum to approximately 1
      const sum = prediction.probabilityDistribution.reduce((total, p) => total + p, 0);
      expect(sum).toBeCloseTo(1, 1);
    });

    it('should provide meaningful explanation', async () => {
      const nextPeriodDate = new Date('2024-02-01');
      const prediction = await predictor.predictOvulation(mockCycleData, nextPeriodDate);

      expect(typeof prediction.explanation).toBe('string');
      expect(prediction.explanation.length).toBeGreaterThan(0);
      expect(prediction.explanation).toContain('cycles');
    });
  });

  describe('trackOvulationAccuracy', () => {
    it('should track accurate prediction', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));
      const actualOvulationDate = new Date(prediction.ovulationDate);

      const accuracyRecord = await predictor.trackOvulationAccuracy(
        prediction,
        actualOvulationDate
      );

      expect(accuracyRecord.wasAccurate).toBe(true);
      expect(accuracyRecord.errorDays).toBe(0);
      expect(accuracyRecord.accuracyType).toBe('excellent');
    });

    it('should track inaccurate prediction', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));
      const actualOvulationDate = new Date(prediction.ovulationDate);
      actualOvulationDate.setDate(actualOvulationDate.getDate() + 4); // 4 days off

      const accuracyRecord = await predictor.trackOvulationAccuracy(
        prediction,
        actualOvulationDate
      );

      expect(accuracyRecord.wasAccurate).toBe(false);
      expect(accuracyRecord.errorDays).toBe(4);
      expect(accuracyRecord.accuracyType).toBe('poor');
    });

    it('should handle unknown ovulation date', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));

      const accuracyRecord = await predictor.trackOvulationAccuracy(prediction, null);

      expect(accuracyRecord.wasAccurate).toBe(false);
      expect(accuracyRecord.errorDays).toBe(null);
      expect(accuracyRecord.accuracyType).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle minimal cycle data', async () => {
      const minimalData: EncryptedCycleData[] = [createMockCycle('2024-01-01', 5)];

      const prediction = await predictor.predictOvulation(minimalData, new Date('2024-02-01'));

      expect(prediction).toHaveProperty('ovulationDate');
      expect(prediction.uncertaintyFactors.dataQuality).toBeLessThan(0.6);
      expect(prediction.explanation).toContain('more data');
    });

    it('should handle irregular cycles', async () => {
      const irregularData = createIrregularCycleData();

      const prediction = await predictor.predictOvulation(irregularData, new Date('2024-02-01'));

      expect(prediction).toHaveProperty('ovulationDate');
      expect(prediction.uncertaintyFactors.cycleLengthVariability).toBeGreaterThan(0.2);
      expect(prediction.explanation).toContain('irregular');
    });

    it('should handle very regular cycles', async () => {
      const regularData = createRegularCycleData();

      const prediction = await predictor.predictOvulation(regularData, new Date('2024-02-01'));

      expect(prediction).toHaveProperty('ovulationDate');
      expect(prediction.uncertaintyFactors.cycleLengthVariability).toBeLessThan(0.1);
      expect(prediction.explanation).toContain('Regular');
    });
  });

  describe('biological constraints', () => {
    it('should respect luteal phase length constraints', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));
      const ovulationDate = new Date(prediction.ovulationDate);
      const nextPeriodDate = new Date('2024-02-01');

      const lutealPhaseDays = Math.ceil(
        (nextPeriodDate.getTime() - ovulationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Luteal phase should typically be 10-16 days
      expect(lutealPhaseDays).toBeGreaterThanOrEqual(10);
      expect(lutealPhaseDays).toBeLessThanOrEqual(20);
    });

    it('should generate realistic confidence intervals', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));

      expect(prediction.confidenceIntervals.p50).toBeLessThan(prediction.confidenceIntervals.p80);
      expect(prediction.confidenceIntervals.p80).toBeLessThan(prediction.confidenceIntervals.p95);

      // Confidence intervals should be reasonable (not too wide or narrow)
      expect(prediction.confidenceIntervals.p95).toBeLessThan(10); // Within 10 days range
      expect(prediction.confidenceIntervals.p50).toBeGreaterThan(0); // Some uncertainty
    });
  });

  describe('privacy and security', () => {
    it('should not expose sensitive data in prediction', async () => {
      const prediction = await predictor.predictOvulation(mockCycleData, new Date('2024-02-01'));

      // Check that raw cycle data is not included in prediction
      const predictionString = JSON.stringify(prediction);
      expect(predictionString).not.toContain('periodStartDate');
      expect(predictionString).not.toContain('symptoms');
      expect(predictionString).not.toContain('flowIntensity');
    });
  });
});

// Helper functions for creating test data
function createMockCycleData(): EncryptedCycleData[] {
  const cycles: EncryptedCycleData[] = [];
  const baseDate = new Date('2023-06-01');

  for (let i = 0; i < 8; i++) {
    const cycleStart = new Date(baseDate);
    cycleStart.setDate(baseDate.getDate() + i * 28); // 28-day cycles

    cycles.push(createMockCycle(cycleStart.toISOString().split('T')[0], 5));
  }

  return cycles;
}

function createMockCycle(startDate: string, duration: number): EncryptedCycleData {
  return {
    id: `cycle-${startDate}`,
    userId: 'test-user',
    periodStartDate: startDate,
    periodEndDate: new Date(new Date(startDate).getTime() + duration * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    flowIntensity: 'medium',
    symptoms: ['cramps'],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    deviceId: 'test-device',
    syncedAt: new Date().toISOString(),
  };
}

function createIrregularCycleData(): EncryptedCycleData[] {
  const cycles: EncryptedCycleData[] = [];
  const baseDate = new Date('2023-06-01');
  const cycleLengths = [25, 32, 27, 35, 26, 29, 31, 28]; // Irregular cycle lengths

  const currentDate = baseDate;

  cycleLengths.forEach((length, i) => {
    cycles.push(createMockCycle(currentDate.toISOString().split('T')[0], 5));
    currentDate.setDate(currentDate.getDate() + length);
  });

  return cycles;
}

function createRegularCycleData(): EncryptedCycleData[] {
  const cycles: EncryptedCycleData[] = [];
  const baseDate = new Date('2023-06-01');

  for (let i = 0; i < 8; i++) {
    const cycleStart = new Date(baseDate);
    cycleStart.setDate(baseDate.getDate() + i * 28); // Very regular 28-day cycles

    cycles.push(createMockCycle(cycleStart.toISOString().split('T')[0], 5));
  }

  return cycles;
}
