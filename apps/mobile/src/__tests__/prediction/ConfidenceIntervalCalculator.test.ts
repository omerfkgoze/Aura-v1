import ConfidenceIntervalCalculator from '../../components/prediction/models/ConfidenceIntervalCalculator';
import { UncertaintyFactors } from '@aura/shared-types';

describe('ConfidenceIntervalCalculator', () => {
  let calculator: ConfidenceIntervalCalculator;

  beforeEach(() => {
    calculator = new ConfidenceIntervalCalculator();
  });

  describe('calculatePeriodConfidenceIntervals', () => {
    it('should calculate basic confidence intervals for period predictions', () => {
      const predictedDate = 28; // days from reference
      const uncertainty = 3; // standard deviation
      const uncertaintyFactors: UncertaintyFactors = {
        dataQuality: 0.8,
        historyLength: 12,
        cycleLengthVariability: 0.2,
        recentDataReliability: 0.9,
        seasonalPatterns: true,
      };

      const intervals = calculator.calculatePeriodConfidenceIntervals(
        predictedDate,
        uncertainty,
        uncertaintyFactors
      );

      // Verify interval ordering
      expect(intervals.p50).toBeLessThanOrEqual(intervals.p80);
      expect(intervals.p80).toBeLessThanOrEqual(intervals.p95);

      // Verify reasonable bounds
      expect(intervals.p50).toBeGreaterThan(0);
      expect(intervals.p95).toBeLessThan(40); // Max reasonable interval
    });

    it('should adjust intervals based on data quality', () => {
      const predictedDate = 28;
      const uncertainty = 3;

      const highQualityFactors: UncertaintyFactors = {
        dataQuality: 0.9,
        historyLength: 18,
        cycleLengthVariability: 0.1,
        recentDataReliability: 0.95,
        seasonalPatterns: true,
      };

      const lowQualityFactors: UncertaintyFactors = {
        dataQuality: 0.4,
        historyLength: 3,
        cycleLengthVariability: 0.6,
        recentDataReliability: 0.5,
        seasonalPatterns: false,
      };

      const highQualityIntervals = calculator.calculatePeriodConfidenceIntervals(
        predictedDate,
        uncertainty,
        highQualityFactors
      );

      const lowQualityIntervals = calculator.calculatePeriodConfidenceIntervals(
        predictedDate,
        uncertainty,
        lowQualityFactors
      );

      // Low quality data should result in wider intervals
      expect(lowQualityIntervals.p50).toBeGreaterThan(highQualityIntervals.p50);
      expect(lowQualityIntervals.p80).toBeGreaterThan(highQualityIntervals.p80);
      expect(lowQualityIntervals.p95).toBeGreaterThan(highQualityIntervals.p95);
    });

    it('should apply biological constraints to prevent unreasonable intervals', () => {
      const predictedDate = 28;
      const veryHighUncertainty = 50;
      const uncertaintyFactors: UncertaintyFactors = {
        dataQuality: 0.1, // Very poor quality
        historyLength: 1,
        cycleLengthVariability: 0.9,
        recentDataReliability: 0.1,
        seasonalPatterns: false,
      };

      const intervals = calculator.calculatePeriodConfidenceIntervals(
        predictedDate,
        veryHighUncertainty,
        uncertaintyFactors
      );

      // Even with very high uncertainty, intervals should be capped
      expect(intervals.p50).toBeGreaterThanOrEqual(2); // Minimum constraints
      expect(intervals.p80).toBeGreaterThanOrEqual(4);
      expect(intervals.p95).toBeGreaterThanOrEqual(7);

      expect(intervals.p50).toBeLessThanOrEqual(14); // Maximum constraints
      expect(intervals.p80).toBeLessThanOrEqual(21);
      expect(intervals.p95).toBeLessThanOrEqual(35);
    });
  });

  describe('calculateOvulationConfidenceIntervals', () => {
    it('should calculate ovulation intervals with appropriate characteristics', () => {
      const predictedOvulationDay = 14;
      const uncertainty = 2;
      const uncertaintyFactors: UncertaintyFactors = {
        dataQuality: 0.8,
        historyLength: 10,
        cycleLengthVariability: 0.3,
        recentDataReliability: 0.8,
        seasonalPatterns: true,
      };

      const intervals = calculator.calculateOvulationConfidenceIntervals(
        predictedOvulationDay,
        uncertainty,
        uncertaintyFactors
      );

      // Ovulation intervals should be smaller than period intervals
      expect(intervals.p50).toBeLessThanOrEqual(6);
      expect(intervals.p80).toBeLessThanOrEqual(10);
      expect(intervals.p95).toBeLessThanOrEqual(15);

      // Verify ordering
      expect(intervals.p50).toBeLessThanOrEqual(intervals.p80);
      expect(intervals.p80).toBeLessThanOrEqual(intervals.p95);
    });

    it('should handle lack of seasonal patterns for ovulation', () => {
      const predictedOvulationDay = 14;
      const uncertainty = 2;

      const withSeasonalPatterns: UncertaintyFactors = {
        dataQuality: 0.8,
        historyLength: 10,
        cycleLengthVariability: 0.3,
        recentDataReliability: 0.8,
        seasonalPatterns: true,
      };

      const withoutSeasonalPatterns: UncertaintyFactors = {
        ...withSeasonalPatterns,
        seasonalPatterns: false,
      };

      const intervalsWithSeasons = calculator.calculateOvulationConfidenceIntervals(
        predictedOvulationDay,
        uncertainty,
        withSeasonalPatterns
      );

      const intervalsWithoutSeasons = calculator.calculateOvulationConfidenceIntervals(
        predictedOvulationDay,
        uncertainty,
        withoutSeasonalPatterns
      );

      // Lack of seasonal patterns should increase uncertainty
      expect(intervalsWithoutSeasons.p95).toBeGreaterThanOrEqual(intervalsWithSeasons.p95);
    });
  });

  describe('calculateUncertaintyPropagation', () => {
    it('should properly combine multiple uncertainty sources', () => {
      const modelUncertainty = 2.0;
      const dataUncertainty = 1.5;
      const systemUncertainty = 0.5;

      const totalUncertainty = calculator.calculateUncertaintyPropagation(
        modelUncertainty,
        dataUncertainty,
        systemUncertainty
      );

      // Total uncertainty should be root sum of squares
      const expectedUncertainty = Math.sqrt(
        modelUncertainty ** 2 + dataUncertainty ** 2 + systemUncertainty ** 2
      );

      expect(totalUncertainty).toBeCloseTo(expectedUncertainty, 2);
    });

    it('should handle zero uncertainties', () => {
      const totalUncertainty = calculator.calculateUncertaintyPropagation(0, 0, 0);
      expect(totalUncertainty).toBe(0);
    });
  });

  describe('convertIntervalsToDistribution', () => {
    it('should convert confidence intervals to probability distribution', () => {
      const mean = 28;
      const intervals = {
        p50: 4,
        p80: 8,
        p95: 14,
      };

      const distribution = calculator.convertIntervalsToDistribution(mean, intervals);

      expect(distribution.mean).toBe(mean);
      expect(distribution.variance).toBeGreaterThan(0);
      expect(distribution.distribution.length).toBeGreaterThan(0);
      expect(distribution.support).toEqual([mean - 30, mean + 30]);

      // Distribution should sum to approximately 1
      const sum = distribution.distribution.reduce((acc, val) => acc + val, 0);
      expect(sum).toBeCloseTo(1, 2);
    });
  });

  describe('validateIntervalConsistency', () => {
    it('should validate properly ordered intervals', () => {
      const validIntervals = { p50: 4, p80: 8, p95: 14 };
      expect(calculator.validateIntervalConsistency(validIntervals)).toBe(true);
    });

    it('should reject improperly ordered intervals', () => {
      const invalidIntervals = { p50: 10, p80: 8, p95: 14 };
      expect(calculator.validateIntervalConsistency(invalidIntervals)).toBe(false);
    });

    it('should handle equal interval values', () => {
      const equalIntervals = { p50: 6, p80: 6, p95: 6 };
      expect(calculator.validateIntervalConsistency(equalIntervals)).toBe(true);
    });
  });

  describe('calculateIntervalAdjustment', () => {
    it('should increase intervals when historical accuracy is low', () => {
      const historicalAccuracy = 0.6;
      const targetAccuracy = 0.8;

      const adjustment = calculator.calculateIntervalAdjustment(historicalAccuracy, targetAccuracy);

      expect(adjustment).toBeGreaterThan(1.0);
    });

    it('should decrease intervals when historical accuracy is very high', () => {
      const historicalAccuracy = 0.95;
      const targetAccuracy = 0.8;

      const adjustment = calculator.calculateIntervalAdjustment(historicalAccuracy, targetAccuracy);

      expect(adjustment).toBeLessThan(1.0);
      expect(adjustment).toBeGreaterThanOrEqual(0.8); // Minimum bound
    });

    it('should not adjust when accuracy matches target', () => {
      const historicalAccuracy = 0.8;
      const targetAccuracy = 0.8;

      const adjustment = calculator.calculateIntervalAdjustment(historicalAccuracy, targetAccuracy);

      expect(adjustment).toBeCloseTo(1.0, 2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme uncertainty factors gracefully', () => {
      const extremeFactors: UncertaintyFactors = {
        dataQuality: 0,
        historyLength: 0,
        cycleLengthVariability: 1,
        recentDataReliability: 0,
        seasonalPatterns: false,
      };

      expect(() => {
        calculator.calculatePeriodConfidenceIntervals(28, 5, extremeFactors);
      }).not.toThrow();
    });

    it('should handle negative prediction dates', () => {
      const uncertaintyFactors: UncertaintyFactors = {
        dataQuality: 0.8,
        historyLength: 12,
        cycleLengthVariability: 0.2,
        recentDataReliability: 0.9,
        seasonalPatterns: true,
      };

      expect(() => {
        calculator.calculatePeriodConfidenceIntervals(-5, 3, uncertaintyFactors);
      }).not.toThrow();
    });

    it('should handle very small uncertainties', () => {
      const uncertaintyFactors: UncertaintyFactors = {
        dataQuality: 1.0,
        historyLength: 24,
        cycleLengthVariability: 0.05,
        recentDataReliability: 1.0,
        seasonalPatterns: true,
      };

      const intervals = calculator.calculatePeriodConfidenceIntervals(28, 0.1, uncertaintyFactors);

      // Even with perfect data, minimum biological variation should apply
      expect(intervals.p50).toBeGreaterThanOrEqual(2);
      expect(intervals.p80).toBeGreaterThanOrEqual(4);
      expect(intervals.p95).toBeGreaterThanOrEqual(7);
    });
  });
});

// Integration tests with real-world scenarios
describe('ConfidenceIntervalCalculator Integration', () => {
  let calculator: ConfidenceIntervalCalculator;

  beforeEach(() => {
    calculator = new ConfidenceIntervalCalculator();
  });

  it('should handle typical user scenario with good data quality', () => {
    const scenarios = [
      {
        name: 'New user with limited data',
        factors: {
          dataQuality: 0.7,
          historyLength: 3,
          cycleLengthVariability: 0.4,
          recentDataReliability: 0.8,
          seasonalPatterns: false,
        },
        expectedWiderIntervals: true,
      },
      {
        name: 'Experienced user with consistent cycles',
        factors: {
          dataQuality: 0.9,
          historyLength: 15,
          cycleLengthVariability: 0.15,
          recentDataReliability: 0.95,
          seasonalPatterns: true,
        },
        expectedWiderIntervals: false,
      },
      {
        name: 'User with irregular cycles',
        factors: {
          dataQuality: 0.8,
          historyLength: 12,
          cycleLengthVariability: 0.7,
          recentDataReliability: 0.7,
          seasonalPatterns: false,
        },
        expectedWiderIntervals: true,
      },
    ];

    scenarios.forEach(scenario => {
      const intervals = calculator.calculatePeriodConfidenceIntervals(28, 3, scenario.factors);

      expect(intervals.p50).toBeGreaterThan(0);
      expect(intervals.p95).toBeLessThan(40);
      expect(calculator.validateIntervalConsistency(intervals)).toBe(true);
    });
  });

  it('should demonstrate uncertainty propagation in realistic scenarios', () => {
    // Simulate a complete prediction pipeline
    const modelUncertainty = 2.5; // Days
    const dataUncertainty = 1.8; // Based on input quality
    const systemUncertainty = 0.5; // Computational uncertainty

    const totalUncertainty = calculator.calculateUncertaintyPropagation(
      modelUncertainty,
      dataUncertainty,
      systemUncertainty
    );

    const uncertaintyFactors: UncertaintyFactors = {
      dataQuality: 0.8,
      historyLength: 10,
      cycleLengthVariability: 0.3,
      recentDataReliability: 0.85,
      seasonalPatterns: true,
    };

    const intervals = calculator.calculatePeriodConfidenceIntervals(
      28,
      totalUncertainty,
      uncertaintyFactors
    );

    // Verify realistic intervals
    expect(intervals.p50).toBeLessThan(10);
    expect(intervals.p80).toBeLessThan(16);
    expect(intervals.p95).toBeLessThan(24);
  });
});
