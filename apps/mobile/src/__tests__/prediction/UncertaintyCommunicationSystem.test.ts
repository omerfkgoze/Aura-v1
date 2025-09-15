import UncertaintyCommunicationSystem from '../../components/prediction/models/UncertaintyCommunicationSystem';
import type {
  UncertaintyFactors,
  PredictionAccuracy,
  CyclePattern,
  ConfidenceInterval,
  CommunicationStyle,
} from '@aura/shared-types';

describe('UncertaintyCommunicationSystem', () => {
  let communicationSystem: UncertaintyCommunicationSystem;
  let mockUncertaintyFactors: UncertaintyFactors;
  let mockAccuracy: PredictionAccuracy;
  let mockCyclePattern: CyclePattern;
  let mockConfidenceIntervals: ConfidenceInterval;

  beforeEach(() => {
    communicationSystem = new UncertaintyCommunicationSystem();

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

    mockConfidenceIntervals = {
      p50: 2,
      p80: 4,
      p95: 7,
    };
  });

  describe('generateUncertaintyCommunication', () => {
    test('should generate complete communication package for technical style', () => {
      const style: CommunicationStyle = {
        style: 'technical',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'high',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.message).toBeDefined();
      expect(result.message.tone).toBe('confident');
      expect(result.message.primary).toContain('confidence');
      expect(result.visualization).toBeDefined();
      expect(result.visualization.probabilityChart).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    test('should generate conversational communication for general users', () => {
      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'ovulation'
      );

      expect(result.message.primary).not.toContain('%');
      expect(result.message.primary).toContain('ovulation');
      expect(result.message.actionable).toBeDefined();
      expect(result.config.showUncertaintyFactors).toBe(false);
    });

    test('should generate minimal communication for simple display', () => {
      const style: CommunicationStyle = {
        style: 'minimal',
        culturalAdaptation: 'minimal',
        confidenceDisplay: 'visual',
        uncertaintyEmphasis: 'low',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.message.primary).toMatch(/\d+%/);
      expect(result.message.secondary).toContain('days');
      expect(result.config.showConfidenceBands).toBe(false);
      expect(result.config.showRecommendations).toBe(false);
    });

    test('should generate stealth mode communication', () => {
      const style: CommunicationStyle = {
        style: 'stealth',
        culturalAdaptation: 'universal',
        confidenceDisplay: 'hidden',
        uncertaintyEmphasis: 'low',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.message.primary).not.toContain('period');
      expect(result.message.primary).not.toContain('menstrual');
      expect(result.message.primary).toContain('planning');
      expect(result.config.colorScheme).toBe('stealth');
    });
  });

  describe('visualization generation', () => {
    test('should generate proper visualization data', () => {
      const style: CommunicationStyle = {
        style: 'technical',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'high',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const viz = result.visualization;
      expect(viz.probabilityChart.dates.length).toBe(viz.probabilityChart.probabilities.length);
      expect(viz.uncertaintyBands.dates.length).toBe(viz.uncertaintyBands.p50Band.length);
      expect(viz.uncertaintyBands.dates.length).toBe(viz.uncertaintyBands.p80Band.length);
      expect(viz.uncertaintyBands.dates.length).toBe(viz.uncertaintyBands.p95Band.length);
      expect(viz.confidenceVisualization.length).toBe(3);
    });

    test('should generate different colors for period vs ovulation', () => {
      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'medium',
      };

      const periodResult = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const ovulationResult = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'ovulation'
      );

      expect(periodResult.visualization.confidenceVisualization[0].color).not.toBe(
        ovulationResult.visualization.confidenceVisualization[0].color
      );
    });
  });

  describe('configuration generation', () => {
    test('should generate appropriate config for technical users', () => {
      const style: CommunicationStyle = {
        style: 'technical',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'high',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.config.showProbabilityDistribution).toBe(true);
      expect(result.config.interactivityLevel).toBe('educational');
    });

    test('should generate appropriate config for minimal interface', () => {
      const style: CommunicationStyle = {
        style: 'minimal',
        culturalAdaptation: 'minimal',
        confidenceDisplay: 'visual',
        uncertaintyEmphasis: 'low',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.config.showConfidenceBands).toBe(false);
      expect(result.config.showRecommendations).toBe(false);
      expect(result.config.interactivityLevel).toBe('basic');
    });

    test('should adapt config for high uncertainty scenarios', () => {
      const highUncertaintyFactors = {
        ...mockUncertaintyFactors,
        dataQuality: 0.2,
        historyLength: 1,
      };

      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        highUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.config.showUncertaintyFactors).toBe(true);
    });
  });

  describe('cultural adaptation', () => {
    test('should adapt messages for different cultural contexts', () => {
      const culturalContext = {
        language: 'en',
        region: 'US',
        planningCulture: 'precise' as const,
        uncertaintyTolerance: 'low' as const,
      };

      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'traditional',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const adaptedMessage = communicationSystem.adaptForCulturalContext(
        result.message,
        culturalContext
      );

      expect(adaptedMessage.primary).toBeDefined();
      expect(adaptedMessage.tone).toBe('supportive');
    });

    test('should adjust language for uncertainty tolerance', () => {
      const lowToleranceContext = {
        language: 'en',
        region: 'US',
        planningCulture: 'precise' as const,
        uncertaintyTolerance: 'low' as const,
      };

      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const message = { ...result.message, tone: 'cautious' as const };
      const adaptedMessage = communicationSystem.adaptForCulturalContext(
        message,
        lowToleranceContext
      );

      expect(adaptedMessage.primary).not.toContain('uncertain');
      expect(adaptedMessage.tone).toBe('supportive');
    });
  });

  describe('educational content generation', () => {
    test('should generate appropriate content for beginners', () => {
      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const educational = communicationSystem.generateEducationalContent(
        result.explanation,
        'beginner'
      );

      expect(educational.basicExplanation).toBeDefined();
      expect(educational.detailedExplanation).toBeUndefined();
      expect(educational.expertInsights).toBeUndefined();
      expect(educational.interactiveTips.length).toBe(2);
    });

    test('should generate detailed content for intermediate users', () => {
      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'medium',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const educational = communicationSystem.generateEducationalContent(
        result.explanation,
        'intermediate'
      );

      expect(educational.basicExplanation).toBeDefined();
      expect(educational.detailedExplanation).toBeDefined();
      expect(educational.expertInsights).toBeUndefined();
      expect(educational.interactiveTips.length).toBe(4);
    });

    test('should generate expert content for advanced users', () => {
      const style: CommunicationStyle = {
        style: 'technical',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'percentage',
        uncertaintyEmphasis: 'high',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        mockUncertaintyFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      const educational = communicationSystem.generateEducationalContent(
        result.explanation,
        'advanced'
      );

      expect(educational.basicExplanation).toBeDefined();
      expect(educational.detailedExplanation).toBeDefined();
      expect(educational.expertInsights).toBeDefined();
      expect(educational.interactiveTips.length).toBe(4);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle extreme uncertainty factors', () => {
      const extremeFactors = {
        dataQuality: 0,
        historyLength: 0,
        cycleLengthVariability: 50,
        recentDataReliability: 0,
        seasonalPatterns: true,
      };

      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'high',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        extremeFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.message.tone).toBe('supportive');
      expect(result.config.showUncertaintyFactors).toBe(true);
    });

    test('should handle perfect prediction scenarios', () => {
      const perfectFactors = {
        dataQuality: 1,
        historyLength: 20,
        cycleLengthVariability: 1,
        recentDataReliability: 1,
        seasonalPatterns: false,
      };

      const style: CommunicationStyle = {
        style: 'conversational',
        culturalAdaptation: 'modern',
        confidenceDisplay: 'descriptive',
        uncertaintyEmphasis: 'low',
      };

      const result = communicationSystem.generateUncertaintyCommunication(
        perfectFactors,
        mockAccuracy,
        mockCyclePattern,
        mockConfidenceIntervals,
        style,
        'period'
      );

      expect(result.message.tone).toBe('confident');
      expect(result.message.primary).toContain('reliable');
    });
  });
});
