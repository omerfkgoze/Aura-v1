import { DecisionRegretAnalyzer } from '../../components/prediction/models/DecisionRegretAnalyzer';
import { UserDecisionTracker } from '../../components/prediction/models/UserDecisionTracker';
import { ConfidenceLevelRegretAnalyzer } from '../../components/prediction/models/ConfidenceLevelRegretAnalyzer';
import { DecisionSupportEngine } from '../../components/prediction/models/DecisionSupportEngine';
import { RegretAnalysisReporter } from '../../components/prediction/models/RegretAnalysisReporter';
import { UserDecision, PeriodPrediction } from '@aura/shared-types/prediction';

describe('Decision Regret Framework', () => {
  let regretAnalyzer: DecisionRegretAnalyzer;
  let decisionTracker: UserDecisionTracker;
  let confidenceAnalyzer: ConfidenceLevelRegretAnalyzer;
  let supportEngine: DecisionSupportEngine;
  let reporter: RegretAnalysisReporter;

  beforeEach(() => {
    regretAnalyzer = new DecisionRegretAnalyzer();
    decisionTracker = new UserDecisionTracker();
    confidenceAnalyzer = new ConfidenceLevelRegretAnalyzer();
    supportEngine = new DecisionSupportEngine();
    reporter = new RegretAnalysisReporter();
  });

  describe('DecisionRegretAnalyzer', () => {
    describe('calculateDecisionRegret', () => {
      it('should calculate regret for correct prediction with high confidence', () => {
        const decision: UserDecision = createMockDecision({
          confidenceLevel: 0.9,
          wasCorrect: true,
          errorDays: 0,
          stakesLevel: 'medium',
        });

        const regret = regretAnalyzer.calculateDecisionRegret(decision);

        expect(regret.regretScore).toBeLessThan(0.3);
        expect(regret.actualOutcome).toBe('correct');
        expect(regret.confidenceUsed).toBe(0.9);
      });

      it('should calculate high regret for incorrect prediction with high confidence', () => {
        const decision: UserDecision = createMockDecision({
          confidenceLevel: 0.9,
          wasCorrect: false,
          errorDays: 3,
          stakesLevel: 'high',
        });

        const regret = regretAnalyzer.calculateDecisionRegret(decision);

        expect(regret.regretScore).toBeGreaterThan(0.6);
        expect(regret.actualOutcome).toBe('late');
        expect(regret.impactLevel).toBe('high');
        expect(regret.recommendations).toContain(
          expect.stringMatching(/caution|conservative|overconfidence/i)
        );
      });

      it('should calculate moderate regret for uncertain prediction that was wrong', () => {
        const decision: UserDecision = createMockDecision({
          confidenceLevel: 0.5,
          wasCorrect: false,
          errorDays: 2,
          stakesLevel: 'medium',
        });

        const regret = regretAnalyzer.calculateDecisionRegret(decision);

        expect(regret.regretScore).toBeBetween(0.3, 0.7);
        expect(regret.actualOutcome).toBe('late');
      });

      it('should apply temporal decay to older decisions', () => {
        const recentDecision = createMockDecision({
          confidenceLevel: 0.8,
          wasCorrect: false,
          errorDays: 3,
          timestamp: new Date().toISOString(),
        });

        const oldDecision = createMockDecision({
          confidenceLevel: 0.8,
          wasCorrect: false,
          errorDays: 3,
          timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        });

        const recentRegret = regretAnalyzer.calculateDecisionRegret(recentDecision);
        const oldRegret = regretAnalyzer.calculateDecisionRegret(oldDecision);

        expect(oldRegret.regretScore).toBeLessThan(recentRegret.regretScore);
      });
    });

    describe('analyzeDecisionHistory', () => {
      it('should return empty insights for no decisions', () => {
        const insights = regretAnalyzer.analyzeDecisionHistory([]);

        expect(insights.overallRegretScore).toBe(0);
        expect(insights.personalizedRecommendations).toHaveLength(0);
      });

      it('should identify improving patterns', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.9, wasCorrect: false, errorDays: 3 }, // High regret
          { confidenceLevel: 0.8, wasCorrect: false, errorDays: 2 }, // Medium regret
          { confidenceLevel: 0.7, wasCorrect: true, errorDays: 0 }, // Low regret
        ]);

        const insights = regretAnalyzer.analyzeDecisionHistory(decisions);

        expect(insights.learningProgress.regretReduction).toBeGreaterThan(0);
        expect(insights.learningProgress.decisionImprovement).toBeGreaterThan(0);
      });

      it('should detect overconfidence patterns', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.9, wasCorrect: false, errorDays: 2 },
          { confidenceLevel: 0.95, wasCorrect: false, errorDays: 3 },
          { confidenceLevel: 0.85, wasCorrect: false, errorDays: 1 },
        ]);

        const insights = regretAnalyzer.analyzeDecisionHistory(decisions);

        expect(insights.personalizedRecommendations).toContainEqual(
          expect.objectContaining({
            recommendationType: 'confidence_adjustment',
            message: expect.stringMatching(/confidence/i),
          })
        );
      });

      it('should recommend timing buffers for short horizon high regret', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.7, wasCorrect: false, timeHorizon: 1 },
          { confidenceLevel: 0.8, wasCorrect: false, timeHorizon: 2 },
        ]);

        const insights = regretAnalyzer.analyzeDecisionHistory(decisions);

        expect(insights.personalizedRecommendations).toContainEqual(
          expect.objectContaining({
            recommendationType: 'timing_buffer',
          })
        );
      });
    });

    describe('generateRegretVisualization', () => {
      it('should generate visualization data for regret history', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.7, wasCorrect: true },
          { confidenceLevel: 0.8, wasCorrect: false },
          { confidenceLevel: 0.6, wasCorrect: true },
        ]);

        const visualization = regretAnalyzer.generateRegretVisualization(decisions);

        expect(visualization.regretHistory.dates).toHaveLength(3);
        expect(visualization.regretHistory.regretScores).toHaveLength(3);
        expect(visualization.regretHistory.decisionTypes).toHaveLength(3);
      });

      it('should generate confidence optimization data', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.5, wasCorrect: true },
          { confidenceLevel: 0.7, wasCorrect: true },
          { confidenceLevel: 0.9, wasCorrect: false },
        ]);

        const visualization = regretAnalyzer.generateRegretVisualization(decisions);

        expect(visualization.confidenceOptimization.confidenceLevels).toHaveLength(10);
        expect(visualization.confidenceOptimization.optimalRange).toHaveLength(2);
        expect(visualization.confidenceOptimization.optimalRange[0]).toBeLessThan(
          visualization.confidenceOptimization.optimalRange[1]
        );
      });
    });
  });

  describe('UserDecisionTracker', () => {
    describe('recordDecision', () => {
      it('should create a decision record with anticipated regret', () => {
        const decisionData = {
          decisionType: 'planning' as const,
          predictionUsed: {
            date: '2025-01-20',
            confidenceLevel: 0.8,
            probabilityEstimate: 0.75,
          },
          contextFactors: {
            timeHorizon: 3,
            stakesLevel: 'medium' as const,
            alternativesAvailable: true,
            externalPressure: 0.3,
          },
        };

        const decision = decisionTracker.recordDecision(decisionData);

        expect(decision.id).toBeTruthy();
        expect(decision.decisionType).toBe('planning');
        expect(decision.regretMetrics.anticipatedRegret).toBeGreaterThan(0);
        expect(decision.regretMetrics.anticipatedRegret).toBeLessThan(1);
      });

      it('should calculate higher anticipated regret for high stakes, uncertain decisions', () => {
        const highStakesDecision = decisionTracker.recordDecision({
          decisionType: 'health',
          predictionUsed: { date: '2025-01-20', confidenceLevel: 0.4, probabilityEstimate: 0.5 },
          contextFactors: {
            timeHorizon: 1,
            stakesLevel: 'high',
            alternativesAvailable: false,
            externalPressure: 0.8,
          },
        });

        const lowStakesDecision = decisionTracker.recordDecision({
          decisionType: 'planning',
          predictionUsed: { date: '2025-01-20', confidenceLevel: 0.8, probabilityEstimate: 0.8 },
          contextFactors: {
            timeHorizon: 7,
            stakesLevel: 'low',
            alternativesAvailable: true,
            externalPressure: 0.1,
          },
        });

        expect(highStakesDecision.regretMetrics.anticipatedRegret).toBeGreaterThan(
          lowStakesDecision.regretMetrics.anticipatedRegret
        );
      });
    });

    describe('updateDecisionOutcome', () => {
      it('should update decision with actual outcome and calculate experienced regret', () => {
        const decision = decisionTracker.recordDecision({
          decisionType: 'fertility',
          predictionUsed: { date: '2025-01-20', confidenceLevel: 0.7, probabilityEstimate: 0.7 },
          contextFactors: {
            timeHorizon: 5,
            stakesLevel: 'medium',
            alternativesAvailable: true,
            externalPressure: 0.2,
          },
        });

        const decisions = [decision];
        const updatedDecision = decisionTracker.updateDecisionOutcome(
          decision.id,
          {
            actualDate: '2025-01-22',
            predictionDate: '2025-01-20',
            consequenceLevel: 'medium',
          },
          decisions
        );

        expect(updatedDecision).toBeTruthy();
        expect(updatedDecision!.actualOutcome.errorDays).toBe(2);
        expect(updatedDecision!.actualOutcome.wasCorrect).toBe(false);
        expect(updatedDecision!.regretMetrics.experiencedRegret).toBeGreaterThan(0);
        expect(updatedDecision!.regretMetrics.learningValue).toBeGreaterThan(0);
      });

      it('should assess correct prediction outcomes', () => {
        const decision = decisionTracker.recordDecision({
          decisionType: 'planning',
          predictionUsed: { date: '2025-01-20', confidenceLevel: 0.8, probabilityEstimate: 0.8 },
          contextFactors: {
            timeHorizon: 3,
            stakesLevel: 'low',
            alternativesAvailable: true,
            externalPressure: 0.1,
          },
        });

        const decisions = [decision];
        const updatedDecision = decisionTracker.updateDecisionOutcome(
          decision.id,
          {
            actualDate: '2025-01-20', // Exact match
            predictionDate: '2025-01-20',
          },
          decisions
        );

        expect(updatedDecision!.actualOutcome.wasCorrect).toBe(true);
        expect(updatedDecision!.actualOutcome.errorDays).toBe(0);
        expect(updatedDecision!.regretMetrics.experiencedRegret).toBeLessThan(0.3);
      });
    });

    describe('generateDecisionTrackingReport', () => {
      it('should generate comprehensive tracking report', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.8, wasCorrect: true },
          { confidenceLevel: 0.7, wasCorrect: false },
          { confidenceLevel: 0.6, wasCorrect: true },
        ]);

        const report = decisionTracker.generateDecisionTrackingReport(decisions);

        expect(report.totalDecisions).toBe(3);
        expect(report.decisionAccuracy).toBe(2 / 3);
        expect(report.averageRegret).toBeGreaterThan(0);
        expect(report.riskProfile).toBeTruthy();
        expect(report.recommendations).toBeInstanceOf(Array);
      });
    });
  });

  describe('ConfidenceLevelRegretAnalyzer', () => {
    describe('analyzeConfidenceRegretPatterns', () => {
      it('should analyze regret patterns across confidence bins', () => {
        const decisions = [
          ...createDecisionSequence([
            { confidenceLevel: 0.4, wasCorrect: false }, // Low confidence
            { confidenceLevel: 0.6, wasCorrect: true }, // Medium confidence
            { confidenceLevel: 0.9, wasCorrect: false }, // High confidence
          ]),
        ];

        const analysis = confidenceAnalyzer.analyzeConfidenceRegretPatterns(decisions);

        expect(analysis.binAnalysis).toHaveLength(5); // 5 confidence bins
        expect(analysis.optimalRanges.overall).toBeTruthy();
        expect(analysis.recommendations).toBeInstanceOf(Array);
      });

      it('should identify overconfidence issues', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.9, wasCorrect: false },
          { confidenceLevel: 0.95, wasCorrect: false },
          { confidenceLevel: 0.85, wasCorrect: false },
        ]);

        const analysis = confidenceAnalyzer.analyzeConfidenceRegretPatterns(decisions);

        expect(analysis.calibrationIssues).toContainEqual(
          expect.objectContaining({
            type: 'overconfidence',
          })
        );
      });

      it('should identify underconfidence opportunities', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.3, wasCorrect: true },
          { confidenceLevel: 0.4, wasCorrect: true },
          { confidenceLevel: 0.45, wasCorrect: true },
        ]);

        const analysis = confidenceAnalyzer.analyzeConfidenceRegretPatterns(decisions);

        expect(analysis.calibrationIssues).toContainEqual(
          expect.objectContaining({
            type: 'underconfidence',
          })
        );
      });
    });
  });

  describe('DecisionSupportEngine', () => {
    describe('generateDecisionSupport', () => {
      it('should provide appropriate support for high uncertainty predictions', () => {
        const prediction: PeriodPrediction = {
          nextPeriodStart: '2025-01-20',
          confidenceIntervals: { p50: 1, p80: 3, p95: 5 }, // High uncertainty
          uncertaintyFactors: {
            dataQuality: 0.5,
            historyLength: 2,
            cycleLengthVariability: 0.8,
            recentDataReliability: 0.6,
            seasonalPatterns: false,
          },
          probabilityDistribution: [0.1, 0.2, 0.4, 0.2, 0.1],
          explanation: 'High uncertainty prediction',
        };

        const context = {
          decisionType: 'planning' as const,
          stakesLevel: 'medium' as const,
          timeHorizon: 3,
          alternativesAvailable: true,
          externalPressure: 0.3,
        };

        const support = supportEngine.generateDecisionSupport(prediction, context, []);

        expect(support.primaryRecommendation.message).toMatch(/uncertainty|buffer|caution/i);
        expect(support.confidenceGuidance.uncertaintyLevel).toBe('high');
        expect(support.bufferRecommendations[0].bufferDays).toBeGreaterThan(0);
      });

      it('should adjust recommendations based on user history', () => {
        const prediction: PeriodPrediction = createMockPrediction({ uncertaintyLevel: 'medium' });
        const context = {
          decisionType: 'planning' as const,
          stakesLevel: 'medium' as const,
          timeHorizon: 5,
          alternativesAvailable: true,
          externalPressure: 0.2,
        };

        const userHistory = createDecisionSequence([
          { confidenceLevel: 0.9, wasCorrect: false }, // Overconfident pattern
          { confidenceLevel: 0.85, wasCorrect: false },
          { confidenceLevel: 0.8, wasCorrect: false },
        ]);

        const support = supportEngine.generateDecisionSupport(prediction, context, userHistory);

        expect(support.primaryRecommendation.message).toMatch(/confidence|cautious/i);
        expect(support.confidenceGuidance.recommendedRange[1]).toBeLessThan(0.8);
      });

      it('should provide alternative strategies', () => {
        const prediction = createMockPrediction({ uncertaintyLevel: 'medium' });
        const context = {
          decisionType: 'fertility' as const,
          stakesLevel: 'high' as const,
          timeHorizon: 2,
          alternativesAvailable: false,
          externalPressure: 0.7,
        };

        const support = supportEngine.generateDecisionSupport(prediction, context, []);

        expect(support.alternativeStrategies).toHaveLength(2); // Conservative and Balanced
        expect(support.alternativeStrategies[0].name).toBe('Conservative Approach');
        expect(support.alternativeStrategies[0].bufferDays).toBeGreaterThan(1);
      });
    });
  });

  describe('RegretAnalysisReporter', () => {
    describe('generateComprehensiveReport', () => {
      it('should generate complete analysis report', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.8, wasCorrect: true },
          { confidenceLevel: 0.9, wasCorrect: false },
          { confidenceLevel: 0.7, wasCorrect: true },
          { confidenceLevel: 0.6, wasCorrect: true },
        ]);

        const report = reporter.generateComprehensiveReport(decisions);

        expect(report.reportId).toBeTruthy();
        expect(report.summary.overallPerformance).toBeTruthy();
        expect(report.keyMetrics.totalDecisions).toBe(4);
        expect(report.keyMetrics.accuracy).toBe(0.75);
        expect(report.improvementRecommendations).toBeInstanceOf(Array);
        expect(report.nextSteps).toBeInstanceOf(Array);
      });

      it('should handle empty decision history', () => {
        const report = reporter.generateComprehensiveReport([]);

        expect(report.keyMetrics.totalDecisions).toBe(0);
        expect(report.summary.overallPerformance).toBe('getting started');
        expect(report.nextSteps).toContain('Start making decisions based on predictions');
      });
    });

    describe('generateQuickInsights', () => {
      it('should provide quick insights for users with decision history', () => {
        const decisions = createDecisionSequence([
          { confidenceLevel: 0.7, wasCorrect: true },
          { confidenceLevel: 0.8, wasCorrect: true },
          { confidenceLevel: 0.6, wasCorrect: false },
        ]);

        const insights = reporter.generateQuickInsights(decisions);

        expect(insights.overallStatus).toMatch(/excellent|good|improving/i);
        expect(insights.keyInsight).toBeTruthy();
        expect(insights.confidenceRecommendation).toBeTruthy();
        expect(insights.nextAction).toBeTruthy();
      });

      it('should provide getting started guidance for new users', () => {
        const insights = reporter.generateQuickInsights([]);

        expect(insights.overallStatus).toBe('Getting Started');
        expect(insights.keyInsight).toMatch(/start making/i);
        expect(insights.nextAction).toMatch(/make a decision/i);
      });
    });
  });

  // Integration tests
  describe('Integration Tests', () => {
    it('should complete full decision lifecycle with regret analysis', async () => {
      // 1. Record initial decision
      const decisionData = {
        decisionType: 'planning' as const,
        predictionUsed: {
          date: '2025-01-20',
          confidenceLevel: 0.8,
          probabilityEstimate: 0.75,
        },
        contextFactors: {
          timeHorizon: 3,
          stakesLevel: 'medium' as const,
          alternativesAvailable: true,
          externalPressure: 0.3,
        },
      };

      const decision = decisionTracker.recordDecision(decisionData);
      expect(decision.regretMetrics.anticipatedRegret).toBeGreaterThan(0);

      // 2. Update with outcome
      const decisions = [decision];
      const updatedDecision = decisionTracker.updateDecisionOutcome(
        decision.id,
        {
          actualDate: '2025-01-22',
          predictionDate: '2025-01-20',
        },
        decisions
      );

      expect(updatedDecision!.regretMetrics.experiencedRegret).toBeGreaterThan(0);

      // 3. Analyze regret patterns
      const regretAnalysis = regretAnalyzer.calculateDecisionRegret(updatedDecision!);
      expect(regretAnalysis.regretScore).toBeGreaterThan(0);

      // 4. Generate insights and recommendations
      const insights = regretAnalyzer.analyzeDecisionHistory([updatedDecision!]);
      expect(insights.personalizedRecommendations).toBeDefined();

      // 5. Generate comprehensive report
      const report = reporter.generateComprehensiveReport([updatedDecision!]);
      expect(report.summary.overallPerformance).toBeTruthy();
    });

    it('should provide consistent recommendations across components', () => {
      const decisions = createDecisionSequence([
        { confidenceLevel: 0.9, wasCorrect: false },
        { confidenceLevel: 0.85, wasCorrect: false },
        { confidenceLevel: 0.8, wasCorrect: false },
      ]);

      const regretInsights = regretAnalyzer.analyzeDecisionHistory(decisions);
      const confidenceAnalysis = confidenceAnalyzer.analyzeConfidenceRegretPatterns(decisions);
      const report = reporter.generateComprehensiveReport(decisions);

      // All should identify overconfidence issue
      expect(
        regretInsights.personalizedRecommendations.some(r =>
          r.message.toLowerCase().includes('confidence')
        )
      ).toBe(true);

      expect(
        confidenceAnalysis.calibrationIssues.some(issue => issue.type === 'overconfidence')
      ).toBe(true);

      expect(
        report.improvementRecommendations.some(r => r.title.toLowerCase().includes('confidence'))
      ).toBe(true);
    });
  });

  // Helper functions
  function createMockDecision(
    overrides: Partial<{
      confidenceLevel: number;
      wasCorrect: boolean;
      errorDays: number;
      stakesLevel: 'low' | 'medium' | 'high';
      timeHorizon: number;
      timestamp: string;
    }>
  ): UserDecision {
    const defaults = {
      confidenceLevel: 0.7,
      wasCorrect: true,
      errorDays: 0,
      stakesLevel: 'medium' as const,
      timeHorizon: 5,
      timestamp: new Date().toISOString(),
    };

    const params = { ...defaults, ...overrides };

    return {
      id: `test_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: params.timestamp,
      decisionType: 'planning',
      predictionUsed: {
        date: '2025-01-20',
        confidenceLevel: params.confidenceLevel,
        probabilityEstimate: params.confidenceLevel,
      },
      actualOutcome: {
        date: new Date(
          new Date('2025-01-20').getTime() + params.errorDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        wasCorrect: params.wasCorrect,
        errorDays: params.errorDays,
        consequenceLevel: params.stakesLevel,
      },
      regretMetrics: {
        anticipatedRegret: 0.3,
        experiencedRegret: params.wasCorrect ? 0.2 : 0.6,
        regretIntensity: params.wasCorrect ? 0.1 : 0.5,
        learningValue: 0.4,
      },
      contextFactors: {
        timeHorizon: params.timeHorizon,
        stakesLevel: params.stakesLevel,
        alternativesAvailable: true,
        externalPressure: 0.2,
      },
    };
  }

  function createDecisionSequence(
    decisions: Array<
      Partial<{
        confidenceLevel: number;
        wasCorrect: boolean;
        errorDays: number;
        stakesLevel: 'low' | 'medium' | 'high';
        timeHorizon: number;
      }>
    >
  ): UserDecision[] {
    return decisions.map((decision, index) =>
      createMockDecision({
        ...decision,
        timestamp: new Date(
          Date.now() - (decisions.length - index) * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
    );
  }

  function createMockPrediction(overrides: {
    uncertaintyLevel: 'low' | 'medium' | 'high';
  }): PeriodPrediction {
    const intervalWidth =
      overrides.uncertaintyLevel === 'high' ? 4 : overrides.uncertaintyLevel === 'medium' ? 2 : 1;

    return {
      nextPeriodStart: '2025-01-20',
      confidenceIntervals: {
        p50: intervalWidth * 0.5,
        p80: intervalWidth * 0.8,
        p95: intervalWidth,
      },
      uncertaintyFactors: {
        dataQuality: overrides.uncertaintyLevel === 'high' ? 0.5 : 0.8,
        historyLength: overrides.uncertaintyLevel === 'high' ? 2 : 6,
        cycleLengthVariability: overrides.uncertaintyLevel === 'high' ? 0.8 : 0.3,
        recentDataReliability: 0.8,
        seasonalPatterns: false,
      },
      probabilityDistribution: [0.1, 0.2, 0.4, 0.2, 0.1],
      explanation: `${overrides.uncertaintyLevel} uncertainty prediction`,
    };
  }

  // Custom Jest matchers
  expect.extend({
    toBeBetween(received: number, floor: number, ceiling: number) {
      const pass = received >= floor && received <= ceiling;
      if (pass) {
        return {
          message: () => `expected ${received} not to be between ${floor} and ${ceiling}`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${received} to be between ${floor} and ${ceiling}`,
          pass: false,
        };
      }
    },
  });
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBetween(floor: number, ceiling: number): R;
    }
  }
}
