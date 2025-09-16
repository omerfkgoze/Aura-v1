import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConfidenceIntervalChart } from '../../components/prediction/visualization/ConfidenceIntervalChart';
import { ProbabilityDistributionChart } from '../../components/prediction/visualization/ProbabilityDistributionChart';
import type { ConfidenceInterval, PredictionVisualization } from '@aura/shared-types';

// Mock data for testing
const mockConfidenceIntervals: ConfidenceInterval = {
  p50: 2.5,
  p80: 4.0,
  p95: 6.5,
};

const mockVisualization: PredictionVisualization = {
  uncertaintyBands: {
    dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
    p50Band: [0.6, 0.8, 0.4],
    p80Band: [0.4, 0.6, 0.2],
    p95Band: [0.2, 0.4, 0.1],
  },
  probabilityChart: {
    dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
    probabilities: [0.3, 0.8, 0.2],
  },
  confidenceVisualization: [
    {
      level: '50%',
      description: 'Most likely range',
      color: '#10B981',
      opacity: 0.4,
    },
    {
      level: '80%',
      description: 'Probable range',
      color: '#F59E0B',
      opacity: 0.3,
    },
    {
      level: '95%',
      description: 'Possible range',
      color: '#EF4444',
      opacity: 0.2,
    },
  ],
};

describe('UncertaintyBandSystem', () => {
  describe('ConfidenceIntervalChart', () => {
    it('renders confidence intervals correctly', () => {
      const { getByText } = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
        />
      );

      expect(getByText('Güven Aralıkları')).toBeTruthy();
      expect(getByText('Aralık Seviyeleri')).toBeTruthy();
    });

    it('renders stealth mode correctly', () => {
      const { getByText } = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
          stealthMode={true}
        />
      );

      expect(getByText('Zaman Aralığı Tahminleri')).toBeTruthy();
      expect(getByText('Muhtemel')).toBeTruthy();
      expect(getByText('Olası')).toBeTruthy();
      expect(getByText('Geniş')).toBeTruthy();
    });

    it('handles interval tap interactions', () => {
      const mockOnIntervalTap = jest.fn();
      const { getByText } = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
          onIntervalTap={mockOnIntervalTap}
        />
      );

      // Find and tap p50 confidence level
      const p50Element = getByText('Yüksek Olasılık');
      fireEvent.press(p50Element.parent);

      expect(mockOnIntervalTap).toHaveBeenCalledWith('p50');
    });

    it('calculates date ranges correctly', () => {
      const { getByText } = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
        />
      );

      // Check that date calculations are present
      expect(getByText(/±\d+ gün/)).toBeTruthy();
    });
  });

  describe('ProbabilityDistributionChart', () => {
    it('renders probability distribution correctly', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
        />
      );

      expect(getByText('Period Probability Distribution')).toBeTruthy();
      expect(getByText('3 days shown')).toBeTruthy();
    });

    it('adapts to cultural themes', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
          culturalTheme="traditional"
        />
      );

      expect(getByText('Period Probability Distribution')).toBeTruthy();
    });

    it('renders stealth mode correctly', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
          stealthMode={true}
        />
      );

      expect(getByText('Cycle Prediction')).toBeTruthy();
      expect(getByText('Likelihood')).toBeTruthy();
    });

    it('displays key statistics correctly', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
        />
      );

      expect(getByText('Most Likely')).toBeTruthy();
      expect(getByText('95% Range')).toBeTruthy();
      expect(getByText('Certainty')).toBeTruthy();
    });

    it('handles ovulation prediction type correctly', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="ovulation"
        />
      );

      expect(getByText('Ovulation Probability Distribution')).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('maintains functionality across different screen sizes', async () => {
      // Test for mobile dimensions
      const mobileRender = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
        />
      );

      await waitFor(() => {
        expect(mobileRender.getByText('Güven Aralıkları')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides accessible labels for confidence intervals', () => {
      const { getByText } = render(
        <ConfidenceIntervalChart
          intervals={mockConfidenceIntervals}
          centerDate="2025-01-15"
          visualization={mockVisualization}
          showLabels={true}
        />
      );

      expect(getByText('%50 Güven')).toBeTruthy();
      expect(getByText('%80 Güven')).toBeTruthy();
      expect(getByText('%95 Güven')).toBeTruthy();
    });

    it('maintains contrast in stealth mode', () => {
      const { getByText } = render(
        <ProbabilityDistributionChart
          data={mockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
          stealthMode={true}
        />
      );

      // Stealth mode should still be readable
      expect(getByText('Cycle Prediction')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeMockVisualization: PredictionVisualization = {
        uncertaintyBands: {
          dates: Array.from({ length: 30 }, (_, i) => new Date(2025, 0, i + 1).toISOString()),
          p50Band: Array.from({ length: 30 }, () => Math.random()),
          p80Band: Array.from({ length: 30 }, () => Math.random()),
          p95Band: Array.from({ length: 30 }, () => Math.random()),
        },
        probabilityChart: {
          dates: Array.from({ length: 30 }, (_, i) => new Date(2025, 0, i + 1).toISOString()),
          probabilities: Array.from({ length: 30 }, () => Math.random()),
        },
        confidenceVisualization: mockVisualization.confidenceVisualization,
      };

      const startTime = performance.now();
      render(
        <ProbabilityDistributionChart
          data={largeMockVisualization}
          confidenceIntervals={mockConfidenceIntervals}
          predictionType="period"
        />
      );
      const endTime = performance.now();

      // Render should complete within 100ms for good performance
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
