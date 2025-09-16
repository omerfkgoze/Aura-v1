import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignalExplanationEngine } from '../../components/prediction/explanation/SignalExplanationEngine';
import { CycleRegularityAnalyzer } from '../../components/prediction/explanation/CycleRegularityAnalyzer';
import { DataCompletenessAnalyzer } from '../../components/prediction/explanation/DataCompletenessAnalyzer';
import type {
  UncertaintyFactors,
  ClientOnlyPredictionCache,
  CyclePattern,
} from '@aura/shared-types';

// Mock data for testing
const mockUncertaintyFactors: UncertaintyFactors = {
  dataQuality: 0.85,
  historyLength: 8,
  cycleLengthVariability: 2.5,
  recentDataReliability: 0.9,
  seasonalPatterns: true,
};

const mockPredictionCache: ClientOnlyPredictionCache = {
  userId: 'test-user',
  accuracy: {
    brierScore: 0.15,
    negativeLogLikelihood: 0.25,
    calibrationScore: 0.05,
    accuracyHistory: [],
  },
  calibration: {
    calibrationCurve: [],
    isWellCalibrated: true,
    calibrationError: 0.05,
    reliabilityDiagram: [],
    needsRecalibration: false,
  },
  decisionHistory: [],
  lastUpdated: '2025-01-15T10:00:00Z',
  modelVersion: '2.4.0',
  confidenceIntervals: {
    p50: 2.0,
    p80: 3.5,
    p95: 5.5,
  },
  explanationData: {
    keyFactors: ['Data Quality', 'Cycle Regularity'],
    uncertaintyReasons: ['Recent changes', 'Limited history'],
    dataQualityNotes: ['Consistent tracking', 'Good symptom recording'],
  },
};

const mockCyclePattern: CyclePattern = {
  averageLength: 28.5,
  variance: 4.2,
  trend: 'stable',
  seasonalPattern: {
    hasSeasonalVariation: true,
    seasonalAmplitude: 1.5,
    peakMonth: 6,
    valleyMonth: 12,
    reliability: 0.75,
  },
  outliers: [35, 23],
  confidence: 0.88,
};

const mockMissingDataPoints = {
  totalDays: 90,
  recordedDays: 75,
  missingDays: 15,
  criticalMissingDays: 3,
};

const mockDataCategories = [
  {
    category: 'Period Flow',
    stealthName: 'Cycle Events',
    completeness: 0.9,
    importance: 'critical' as const,
    missingCount: 2,
    impactDescription: 'Critical for period prediction accuracy',
    stealthDescription: 'Important for cycle timing',
  },
  {
    category: 'Symptoms',
    stealthName: 'Health Notes',
    completeness: 0.75,
    importance: 'high' as const,
    missingCount: 8,
    impactDescription: 'Helps refine prediction timing',
    stealthDescription: 'Helps pattern recognition',
  },
  {
    category: 'Mood Tracking',
    stealthName: 'Daily Wellness',
    completeness: 0.6,
    importance: 'medium' as const,
    missingCount: 12,
    impactDescription: 'Provides additional context',
    stealthDescription: 'Adds pattern context',
  },
];

describe('SignalExplanationEngine', () => {
  it('renders explanation factors correctly', () => {
    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
      />
    );

    expect(getByText('Neden Bu Sinyal?')).toBeTruthy();
    expect(getByText('Veri Kalitesi')).toBeTruthy();
    expect(getByText('Geçmiş Veri Uzunluğu')).toBeTruthy();
    expect(getByText('Döngü Düzenlilik')).toBeTruthy();
    expect(getByText('Son Veri Güvenilirliği')).toBeTruthy();
  });

  it('adapts to stealth mode correctly', () => {
    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
        stealthMode={true}
      />
    );

    expect(getByText('Tahmin Analizi')).toBeTruthy();
    expect(getByText('Kayıt Tutarlılığı')).toBeTruthy();
    expect(getByText('Kayıt Geçmişi')).toBeTruthy();
    expect(getByText('Pattern Tutarlılığı')).toBeTruthy();
  });

  it('handles factor expansion interactions', () => {
    const mockOnFactorSelect = jest.fn();
    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
        onFactorSelect={mockOnFactorSelect}
      />
    );

    // Click on a factor to expand it
    const dataQualityFactor = getByText('Veri Kalitesi');
    fireEvent.press(dataQualityFactor.parent);

    expect(mockOnFactorSelect).toHaveBeenCalledWith('data_quality');
  });

  it('generates appropriate explanations for different data quality levels', () => {
    const lowQualityFactors = {
      ...mockUncertaintyFactors,
      dataQuality: 0.4,
      historyLength: 2,
      cycleLengthVariability: 8.0,
    };

    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={lowQualityFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
      />
    );

    expect(getByText(/iyileştirme gerekiyor/)).toBeTruthy();
  });

  it('displays confidence intervals correctly', () => {
    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
      />
    );

    expect(getByText('±2.0 gün')).toBeTruthy(); // p50
    expect(getByText('±3.5 gün')).toBeTruthy(); // p80
    expect(getByText('±5.5 gün')).toBeTruthy(); // p95
  });
});

describe('CycleRegularityAnalyzer', () => {
  const recentCycleLengths = [28, 29, 27, 30, 28, 26];

  it('analyzes cycle regularity correctly', () => {
    const { getByText } = render(
      <CycleRegularityAnalyzer
        cyclePattern={mockCyclePattern}
        uncertaintyFactors={mockUncertaintyFactors}
        recentCycleLengths={recentCycleLengths}
      />
    );

    expect(getByText('Döngü Düzenlilik İncelemesi')).toBeTruthy();
    expect(getByText('Döngü Düzenlilik Skoru')).toBeTruthy();
  });

  it('detects cycle trends correctly', () => {
    const improvingCycles = [32, 30, 29, 28, 28, 27]; // Improving regularity
    const { getByText } = render(
      <CycleRegularityAnalyzer
        cyclePattern={mockCyclePattern}
        uncertaintyFactors={mockUncertaintyFactors}
        recentCycleLengths={improvingCycles}
      />
    );

    expect(getByText(/eğilimi/)).toBeTruthy();
  });

  it('provides appropriate recommendations', () => {
    const irregularPattern = {
      ...mockCyclePattern,
      variance: 25, // High variance = irregular
    };

    const { getByText } = render(
      <CycleRegularityAnalyzer
        cyclePattern={irregularPattern}
        uncertaintyFactors={mockUncertaintyFactors}
        recentCycleLengths={recentCycleLengths}
      />
    );

    expect(getByText(/Öneriler/)).toBeTruthy();
  });

  it('adapts to stealth mode', () => {
    const { getByText } = render(
      <CycleRegularityAnalyzer
        cyclePattern={mockCyclePattern}
        uncertaintyFactors={mockUncertaintyFactors}
        recentCycleLengths={recentCycleLengths}
        stealthMode={true}
      />
    );

    expect(getByText('Pattern Düzenlilik Analizi')).toBeTruthy();
  });
});

describe('DataCompletenessAnalyzer', () => {
  it('analyzes data completeness correctly', () => {
    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={mockDataCategories}
      />
    );

    expect(getByText('Veri Tamamlılık İncelemesi')).toBeTruthy();
    expect(getByText('Genel Veri Tamamlılığı')).toBeTruthy();
    expect(getByText('Period Flow')).toBeTruthy();
    expect(getByText('Symptoms')).toBeTruthy();
  });

  it('calculates completeness scores correctly', () => {
    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={mockDataCategories}
      />
    );

    expect(getByText('90%')).toBeTruthy(); // Period Flow completeness
    expect(getByText('75%')).toBeTruthy(); // Symptoms completeness
  });

  it('shows critical missing days warning', () => {
    const criticalMissing = {
      ...mockMissingDataPoints,
      criticalMissingDays: 10,
    };

    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={criticalMissing}
        dataCategories={mockDataCategories}
      />
    );

    expect(getByText('Kritik Dönemde Eksik Veriler')).toBeTruthy();
  });

  it('provides priority actions based on missing data', () => {
    const poorDataCategories = mockDataCategories.map(cat => ({
      ...cat,
      completeness: 0.3, // Poor completeness
    }));

    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={poorDataCategories}
      />
    );

    expect(getByText('Öncelikli Veri Tamamlama')).toBeTruthy();
  });

  it('adapts to stealth mode correctly', () => {
    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={mockDataCategories}
        stealthMode={true}
      />
    );

    expect(getByText('Veri Tamlık Analizi')).toBeTruthy();
    expect(getByText('Cycle Events')).toBeTruthy(); // Stealth name
    expect(getByText('Health Notes')).toBeTruthy(); // Stealth name
  });
});

describe('Cultural Theme Adaptation', () => {
  it('adapts to traditional theme', () => {
    const { getByText } = render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
        culturalTheme="traditional"
      />
    );

    expect(getByText('Neden Bu Sinyal?')).toBeTruthy();
  });

  it('adapts to minimal theme', () => {
    const { getByText } = render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={mockDataCategories}
        culturalTheme="minimal"
      />
    );

    expect(getByText('Veri Tamamlılık İncelemesi')).toBeTruthy();
  });
});

describe('Performance Tests', () => {
  it('renders explanation components efficiently', () => {
    const startTime = performance.now();

    render(
      <SignalExplanationEngine
        uncertaintyFactors={mockUncertaintyFactors}
        predictionCache={mockPredictionCache}
        cyclePattern={mockCyclePattern}
        predictionType="period"
      />
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(50); // Should render within 50ms
  });

  it('handles large data categories efficiently', () => {
    const largeDataCategories = Array.from({ length: 20 }, (_, i) => ({
      category: `Category ${i}`,
      stealthName: `Stealth ${i}`,
      completeness: Math.random(),
      importance: 'medium' as const,
      missingCount: Math.floor(Math.random() * 10),
      impactDescription: `Impact description ${i}`,
      stealthDescription: `Stealth description ${i}`,
    }));

    const startTime = performance.now();

    render(
      <DataCompletenessAnalyzer
        uncertaintyFactors={mockUncertaintyFactors}
        missingDataPoints={mockMissingDataPoints}
        dataCategories={largeDataCategories}
      />
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Should handle large data efficiently
  });
});
