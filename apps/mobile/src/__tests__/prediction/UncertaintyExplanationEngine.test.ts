import UncertaintyExplanationEngine from '../../components/prediction/models/UncertaintyExplanationEngine';
import type {
  UncertaintyFactors,
  PredictionAccuracy,
  CyclePattern,
  BayesianModelParameters,
} from '@aura/shared-types';

describe('UncertaintyExplanationEngine', () => {
  let explanationEngine: UncertaintyExplanationEngine;
  let mockUncertaintyFactors: UncertaintyFactors;
  let mockAccuracy: PredictionAccuracy;
  let mockCyclePattern: CyclePattern;
  let mockModelParams: BayesianModelParameters;

  beforeEach(() => {
    explanationEngine = new UncertaintyExplanationEngine();

    mockUncertaintyFactors = {
      dataQuality: 0.8,
      historyLength: 6,
      cycleLengthVariability: 3,
      recentDataReliability: 0.9,
      seasonalPatterns: false,
    };

    mockAccuracy = {
      brierScore: 0.15,
      negativeLogLikelihood: 0.5,
      calibrationScore: 0.05,
      accuracyHistory: [],
    };

    mockCyclePattern = {
      averageLength: 28,
      variance: 4,
      trend: 'stable',
      seasonalPattern: {
        hasSeasonalVariation: false,
        seasonalAmplitude: 0,
        peakMonth: 6,
        valleyMonth: 12,
        reliability: 0.8,
      },
      outliers: [],
      confidence: 0.8,
    };

    mockModelParams = {
      cycleLengthMean: 28,
      cycleLengthVariance: 4,
      periodLengthMean: 5,
      periodLengthVariance: 1,
      seasonalVariation: 0.1,
      personalHistoryWeight: 0.7,
      adaptiveLearningRate: 0.2,
    };
  });

  describe('generateUncertaintyExplanation', () => {
    test('should generate low uncertainty explanation for high quality data', () => {
      const explanation = explanationEngine.generateUncertaintyExplanation(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(explanation.uncertaintyLevel).toBe('low');
      expect(explanation.primaryFactors).toHaveLength(0);
      expect(explanation.dataQualityAssessment.overallScore).toBeGreaterThan(0.7);
      expect(explanation.confidenceRecommendation).toBeLessThan(0.8);
    });

    test('should generate high uncertainty explanation for poor data quality', () => {
      const poorFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.3,
        historyLength: 2,
        cycleLengthVariability: 15,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        poorFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(explanation.uncertaintyLevel).toBe('very_high');
      expect(explanation.primaryFactors.length).toBeGreaterThan(0);
      expect(explanation.dataQualityAssessment.overallScore).toBeLessThan(0.5);
      expect(explanation.confidenceRecommendation).toBeGreaterThan(0.9);
    });

    test('should identify data quality as primary factor for poor quality data', () => {
      const poorQualityFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.4,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        poorQualityFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const dataQualityFactor = explanation.primaryFactors.find(f => f.factor === 'data_quality');
      expect(dataQualityFactor).toBeTruthy();
      expect(dataQualityFactor?.impact).toBe('major');
    });

    test('should identify history length as factor for new users', () => {
      const newUserFactors = {
        ...mockUncertaintyFactors,
        historyLength: 2,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        newUserFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const historyFactor = explanation.primaryFactors.find(f => f.factor === 'history_length');
      expect(historyFactor).toBeTruthy();
      expect(historyFactor?.impact).toBe('major');
    });

    test('should identify cycle variability for irregular cycles', () => {
      const irregularFactors = {
        ...mockUncertaintyFactors,
        cycleLengthVariability: 20,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        irregularFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const variabilityFactor = explanation.primaryFactors.find(
        f => f.factor === 'cycle_variability'
      );
      expect(variabilityFactor).toBeTruthy();
      expect(variabilityFactor?.impact).toBe('major');
    });

    test('should provide improvement suggestions for identified factors', () => {
      const poorFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.3,
        historyLength: 1,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        poorFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(explanation.recommendations.length).toBeGreaterThan(0);
      expect(
        explanation.recommendations.some(
          r => r.includes('track') || r.includes('consistent') || r.includes('data')
        )
      ).toBe(true);
    });

    test('should work in stealth mode', () => {
      const explanation = explanationEngine.generateUncertaintyExplanation(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams,
        true // stealth mode
      );

      expect(
        explanation.recommendations.some(r => r.includes('period') || r.includes('menstrual'))
      ).toBe(false);
    });
  });

  describe('generateSimpleExplanation', () => {
    test('should generate appropriate simple explanations for each uncertainty level', () => {
      const lowExplanation = explanationEngine.generateSimpleExplanation('low', []);
      expect(lowExplanation).toContain('reliable');

      const highExplanation = explanationEngine.generateSimpleExplanation('very_high', []);
      expect(highExplanation).toContain('uncertain');
    });

    test('should include primary factor in explanation when available', () => {
      const primaryFactors = [
        {
          factor: 'data_quality',
          impact: 'major' as const,
          description: 'Test description',
          weight: 0.8,
        },
      ];

      const explanation = explanationEngine.generateSimpleExplanation('high', primaryFactors);
      expect(explanation).toContain('tracking consistency');
    });

    test('should work in stealth mode', () => {
      const stealthExplanation = explanationEngine.generateSimpleExplanation('medium', [], true);

      expect(stealthExplanation).not.toContain('prediction');
      expect(stealthExplanation).toContain('planning');
    });
  });

  describe('data quality assessment', () => {
    test('should correctly assess high quality data', () => {
      const explanation = explanationEngine.generateUncertaintyExplanation(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const assessment = explanation.dataQualityAssessment;
      expect(assessment.overallScore).toBeGreaterThan(0.7);
      expect(assessment.completeness).toBe(mockUncertaintyFactors.dataQuality);
      expect(assessment.recency).toBe(mockUncertaintyFactors.recentDataReliability);
    });

    test('should provide recommendations for low quality scores', () => {
      const poorFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.3,
        recentDataReliability: 0.4,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        poorFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const assessment = explanation.dataQualityAssessment;
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      expect(
        assessment.recommendations.some(r => r.includes('track') || r.includes('consistent'))
      ).toBe(true);
    });
  });

  describe('confidence recommendation', () => {
    test('should recommend higher confidence for lower uncertainty', () => {
      const lowUncertaintyExplanation = explanationEngine.generateUncertaintyExplanation(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const highUncertaintyFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.2,
        historyLength: 1,
      };

      const highUncertaintyExplanation = explanationEngine.generateUncertaintyExplanation(
        highUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(lowUncertaintyExplanation.confidenceRecommendation).toBeLessThan(
        highUncertaintyExplanation.confidenceRecommendation
      );
    });

    test('should adjust recommendation based on data quality', () => {
      const highQualityFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.9,
      };

      const lowQualityFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.3,
      };

      const highQualityExplanation = explanationEngine.generateUncertaintyExplanation(
        highQualityFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      const lowQualityExplanation = explanationEngine.generateUncertaintyExplanation(
        lowQualityFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(highQualityExplanation.confidenceRecommendation).toBeLessThan(
        lowQualityExplanation.confidenceRecommendation
      );
    });
  });

  describe('edge cases', () => {
    test('should handle extreme uncertainty factors gracefully', () => {
      const extremeFactors = {
        dataQuality: 0,
        historyLength: 0,
        cycleLengthVariability: 50,
        recentDataReliability: 0,
        seasonalPatterns: true,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        extremeFactors,
        mockAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(explanation.uncertaintyLevel).toBe('very_high');
      expect(explanation.primaryFactors.length).toBeGreaterThan(0);
      expect(explanation.confidenceRecommendation).toBeGreaterThanOrEqual(0.95);
    });

    test('should handle perfect data gracefully', () => {
      const perfectFactors = {
        dataQuality: 1,
        historyLength: 20,
        cycleLengthVariability: 1,
        recentDataReliability: 1,
        seasonalPatterns: false,
      };

      const perfectAccuracy = {
        ...mockAccuracy,
        brierScore: 0.01,
        calibrationScore: 0.01,
      };

      const explanation = explanationEngine.generateUncertaintyExplanation(
        perfectFactors,
        perfectAccuracy,
        mockCyclePattern,
        mockModelParams
      );

      expect(explanation.uncertaintyLevel).toBe('low');
      expect(explanation.confidenceRecommendation).toBeLessThanOrEqual(0.5);
    });
  });
});
