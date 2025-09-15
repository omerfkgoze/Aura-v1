// Prediction model types for probabilistic menstrual cycle predictions

// Confidence interval bands
export interface ConfidenceInterval {
  p50: number; // 50% confidence interval
  p80: number; // 80% confidence interval
  p95: number; // 95% confidence interval
}

// Bayesian model parameters
export interface BayesianModelParameters {
  cycleLengthMean: number;
  cycleLengthVariance: number;
  periodLengthMean: number;
  periodLengthVariance: number;
  seasonalVariation: number;
  personalHistoryWeight: number;
  adaptiveLearningRate: number;
}

// Prediction uncertainty factors
export interface UncertaintyFactors {
  dataQuality: number; // 0-1 score
  historyLength: number; // Number of cycles
  cycleLengthVariability: number;
  recentDataReliability: number;
  seasonalPatterns: boolean;
}

// Period prediction with uncertainty
export interface PeriodPrediction {
  nextPeriodStart: string; // ISO date string
  confidenceIntervals: ConfidenceInterval;
  uncertaintyFactors: UncertaintyFactors;
  probabilityDistribution: number[]; // Array of probabilities for each day
  explanation: string; // User-friendly explanation
}

// Ovulation prediction with uncertainty
export interface OvulationPrediction {
  ovulationDate: string; // ISO date string
  fertilityWindow: {
    start: string;
    end: string;
    peakDay: string;
  };
  confidenceIntervals: ConfidenceInterval;
  uncertaintyFactors: UncertaintyFactors;
  probabilityDistribution: number[];
  explanation: string;
}

// Prediction accuracy metrics
export interface PredictionAccuracy {
  brierScore: number; // Lower is better (0-1)
  negativeLogLikelihood: number; // Lower is better
  calibrationScore: number; // Closer to 0 is better
  accuracyHistory: AccuracyRecord[];
}

// Individual accuracy record
export interface AccuracyRecord {
  predictionDate: string;
  actualDate: string | null;
  confidenceLevel: number;
  wasAccurate: boolean;
  errorDays: number | null;
  brierScore: number;
}

// Decision regret analysis
export interface DecisionRegret {
  regretScore: number; // 0-1 score
  decisionType: 'planning' | 'protection' | 'fertility' | 'health';
  confidenceUsed: number;
  actualOutcome: 'correct' | 'early' | 'late';
  impactLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// User decision tracking for regret analysis
export interface UserDecision {
  id: string;
  timestamp: string;
  decisionType: 'planning' | 'protection' | 'fertility' | 'health';
  predictionUsed: {
    date: string;
    confidenceLevel: number;
    probabilityEstimate: number;
  };
  actualOutcome: {
    date: string;
    wasCorrect: boolean;
    errorDays: number;
    consequenceLevel: 'low' | 'medium' | 'high';
  };
  regretMetrics: {
    anticipatedRegret: number;
    experiencedRegret: number;
    regretIntensity: number;
    learningValue: number;
  };
  contextFactors: {
    timeHorizon: number;
    stakesLevel: 'low' | 'medium' | 'high';
    alternativesAvailable: boolean;
    externalPressure: number;
  };
}

// Decision support recommendation system
export interface DecisionSupport {
  recommendationType:
    | 'confidence_adjustment'
    | 'timing_buffer'
    | 'alternative_strategy'
    | 'data_improvement';
  message: string;
  actionItems: string[];
  confidenceThreshold: number;
  expectedRegretReduction: number;
  applicableScenarios: string[];
}

// Regret analysis insights
export interface RegretAnalysisInsights {
  overallRegretScore: number;
  regretTrends: {
    byDecisionType: Record<string, number>;
    byConfidenceLevel: Record<string, number>;
    byTimeHorizon: Record<string, number>;
  };
  learningProgress: {
    regretReduction: number;
    decisionImprovement: number;
    optimalConfidenceRange: [number, number];
  };
  personalizedRecommendations: DecisionSupport[];
  riskTolerance: {
    estimatedLevel: 'conservative' | 'moderate' | 'aggressive';
    consistency: number;
    adaptationRate: number;
  };
}

// Model calibration data
export interface ModelCalibration {
  calibrationCurve: CalibrationPoint[];
  isWellCalibrated: boolean;
  calibrationError: number;
  reliabilityDiagram: number[][];
  needsRecalibration: boolean;
}

// Calibration point for calibration curve
export interface CalibrationPoint {
  predictedProbability: number;
  observedFrequency: number;
  sampleSize: number;
}

// Client-side prediction cache (never sent to server)
export interface ClientOnlyPredictionCache {
  userId: string;
  periodPrediction?: PeriodPrediction;
  ovulationPrediction?: OvulationPrediction;
  accuracy: PredictionAccuracy;
  calibration: ModelCalibration;
  regretAnalysis?: RegretAnalysisInsights;
  decisionHistory: UserDecision[];
  lastUpdated: string;
  modelVersion: string;
  confidenceIntervals: ConfidenceInterval;
  explanationData: {
    keyFactors: string[];
    uncertaintyReasons: string[];
    dataQualityNotes: string[];
  };
}

// Cycle pattern recognition data
export interface CyclePattern {
  averageLength: number;
  variance: number;
  trend: 'stable' | 'increasing' | 'decreasing' | 'irregular';
  seasonalPattern: SeasonalPattern;
  outliers: number[];
  confidence: number;
}

// Seasonal variation patterns
export interface SeasonalPattern {
  hasSeasonalVariation: boolean;
  seasonalAmplitude: number;
  peakMonth: number;
  valleyMonth: number;
  reliability: number;
}

// Bayesian inference data
export interface BayesianInference {
  priorDistribution: ProbabilityDistribution;
  likelihood: ProbabilityDistribution;
  posteriorDistribution: ProbabilityDistribution;
  evidence: number;
  updateStrength: number;
}

// Probability distribution for Bayesian calculations
export interface ProbabilityDistribution {
  mean: number;
  variance: number;
  distribution: number[]; // Array of probability densities
  support: [number, number]; // [min, max] range
}

// Model update result
export interface ModelUpdateResult {
  success: boolean;
  newParameters: BayesianModelParameters;
  accuracyImprovement: number;
  calibrationImprovement: number;
  updateReason: string;
}

// Prediction visualization data
export interface PredictionVisualization {
  uncertaintyBands: {
    dates: string[];
    p50Band: number[];
    p80Band: number[];
    p95Band: number[];
  };
  probabilityChart: {
    dates: string[];
    probabilities: number[];
  };
  confidenceVisualization: {
    level: string;
    description: string;
    color: string;
    opacity: number;
  }[];
}

// Regret analysis visualization
export interface RegretVisualization {
  regretHistory: {
    dates: string[];
    regretScores: number[];
    decisionTypes: string[];
  };
  confidenceOptimization: {
    confidenceLevels: number[];
    expectedRegret: number[];
    optimalRange: [number, number];
  };
  learningCurve: {
    timePoints: string[];
    cumulativeRegret: number[];
    improvementRate: number[];
  };
}
