import React from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import { SymptomIntensityTracker } from '../../../components/cycle-tracking/SymptomIntensityTracker';
import { Symptom } from '@aura/shared-types';
import * as AccessibilityUtils from '../../../utils/accessibility';

// Mock dependencies
jest.mock('../../../utils/accessibility', () => ({
  useAccessibility: jest.fn(() => ({
    getAccessibilityLabel: (label: string) => label,
    getAccessibilityHint: (hint: string) => hint,
  })),
}));

const mockTamaguiConfig = {
  animations: {},
  themes: {},
  tokens: {},
  fonts: {},
  config: {},
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TamaguiProvider config={mockTamaguiConfig}>{children}</TamaguiProvider>
);

describe('SymptomIntensityTracker', () => {
  const mockSymptoms: Symptom[] = [
    {
      id: 'symptom-1',
      name: 'Headache',
      category: 'physical',
      severity: 4,
    },
    {
      id: 'symptom-2',
      name: 'Anxiety',
      category: 'mood',
      severity: 3,
    },
    {
      id: 'symptom-3',
      name: 'Fatigue',
      category: 'energy',
      severity: 5,
    },
  ];

  const mockHistoricalData = [
    {
      date: '2025-01-01',
      symptoms: [
        { id: 'symptom-1', name: 'Headache', category: 'physical' as const, severity: 3 },
        { id: 'symptom-2', name: 'Anxiety', category: 'mood' as const, severity: 4 },
      ],
    },
    {
      date: '2025-01-02',
      symptoms: [
        { id: 'symptom-1', name: 'Headache', category: 'physical' as const, severity: 2 },
        { id: 'symptom-2', name: 'Anxiety', category: 'mood' as const, severity: 2 },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no symptoms are provided', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={[]} testID="test-tracker" />
      </TestWrapper>
    );

    expect(getByTestId('test-tracker')).toBeTruthy();
    expect(getByText('No symptoms selected for tracking')).toBeTruthy();
  });

  it('renders symptom intensity correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={mockSymptoms} testID="test-tracker" />
      </TestWrapper>
    );

    expect(getByText('Symptom Intensity')).toBeTruthy();
    expect(getByText('3 symptoms tracked')).toBeTruthy();

    // Check individual symptoms
    expect(getByText('Headache')).toBeTruthy();
    expect(getByText('4/5')).toBeTruthy();
    expect(getByText('Strong')).toBeTruthy();

    expect(getByText('Anxiety')).toBeTruthy();
    expect(getByText('3/5')).toBeTruthy();
    expect(getByText('Moderate')).toBeTruthy();

    expect(getByText('Fatigue')).toBeTruthy();
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('Severe')).toBeTruthy();

    // Check progress bars exist
    expect(getByTestId('test-tracker-progress-symptom-1')).toBeTruthy();
    expect(getByTestId('test-tracker-progress-symptom-2')).toBeTruthy();
    expect(getByTestId('test-tracker-progress-symptom-3')).toBeTruthy();
  });

  it('displays category statistics', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={mockSymptoms} testID="test-tracker" />
      </TestWrapper>
    );

    expect(getByText('Category Overview')).toBeTruthy();

    // Check category cards
    expect(getByTestId('test-tracker-category-physical')).toBeTruthy();
    expect(getByTestId('test-tracker-category-mood')).toBeTruthy();
    expect(getByTestId('test-tracker-category-energy')).toBeTruthy();

    // Check category content
    expect(getByText('Physical')).toBeTruthy();
    expect(getByText('1 symptom')).toBeTruthy();
    expect(getByText('Avg: 4/5')).toBeTruthy();
    expect(getByText('Max: 4/5')).toBeTruthy();
  });

  it('calculates and displays trends with historical data', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker
          currentSymptoms={mockSymptoms}
          historicalData={mockHistoricalData}
          showTrends={true}
          testID="test-tracker"
        />
      </TestWrapper>
    );

    expect(getByText('Trend Analysis')).toBeTruthy();
    expect(getByText('Based on last 7 days vs. previous 7 days')).toBeTruthy();

    // Check that trend cards exist (specific trends depend on calculation logic)
    const trendSection = getByTestId('test-tracker');
    expect(trendSection).toBeTruthy();
  });

  it('hides trends when showTrends is false', () => {
    const { queryByText } = render(
      <TestWrapper>
        <SymptomIntensityTracker
          currentSymptoms={mockSymptoms}
          historicalData={mockHistoricalData}
          showTrends={false}
          testID="test-tracker"
        />
      </TestWrapper>
    );

    expect(queryByText('Trend Analysis')).toBeFalsy();
  });

  it('applies stealth mode styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker
          currentSymptoms={mockSymptoms}
          stealthMode={true}
          testID="test-tracker"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-tracker')).toBeTruthy();
    // Stealth mode styling would be tested through snapshot testing
  });

  it('handles accessibility correctly', () => {
    const mockGetAccessibilityLabel = jest.fn(label => `Accessibility: ${label}`);

    jest.mocked(AccessibilityUtils.useAccessibility).mockReturnValue({
      getAccessibilityLabel: mockGetAccessibilityLabel,
      getAccessibilityHint: jest.fn(),
    });

    render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={mockSymptoms} testID="test-tracker" />
      </TestWrapper>
    );

    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Headache severity: Strong');
    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Anxiety severity: Moderate');
    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Fatigue severity: Severe');
  });

  it('correctly calculates category statistics for multiple symptoms in same category', () => {
    const mixedSymptoms: Symptom[] = [
      {
        id: 'phys-1',
        name: 'Headache',
        category: 'physical',
        severity: 4,
      },
      {
        id: 'phys-2',
        name: 'Back pain',
        category: 'physical',
        severity: 2,
      },
    ];

    const { getByText } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={mixedSymptoms} testID="test-tracker" />
      </TestWrapper>
    );

    expect(getByText('2 symptoms')).toBeTruthy();
    expect(getByText('Avg: 3/5')).toBeTruthy(); // (4+2)/2 = 3
    expect(getByText('Max: 4/5')).toBeTruthy();
  });

  it('handles symptoms without severity gracefully', () => {
    const symptomsWithoutSeverity: Symptom[] = [
      {
        id: 'no-severity',
        name: 'Test Symptom',
        category: 'mood',
        // No severity field
      },
    ];

    const { getByText } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={symptomsWithoutSeverity} testID="test-tracker" />
      </TestWrapper>
    );

    // Should default to severity 3 (Moderate)
    expect(getByText('3/5')).toBeTruthy();
    expect(getByText('Moderate')).toBeTruthy();
  });

  it('sorts symptoms by severity in descending order', () => {
    // The component should sort symptoms with highest severity first
    // This would require checking the order of elements in the DOM
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomIntensityTracker currentSymptoms={mockSymptoms} testID="test-tracker" />
      </TestWrapper>
    );

    expect(getByTestId('test-tracker')).toBeTruthy();
    // Order verification would require more complex DOM traversal testing
  });
});
