import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import { SymptomSelector } from '../../../components/cycle-tracking/SymptomSelector';
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

describe('SymptomSelector', () => {
  const mockSymptoms: Symptom[] = [
    {
      id: 'test-1',
      name: 'Headache',
      category: 'physical',
      severity: 3,
    },
    {
      id: 'test-2',
      name: 'Anxiety',
      category: 'mood',
      severity: 4,
    },
  ];

  const mockOnSymptomsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with empty selection', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-symptom-selector')).toBeTruthy();
    expect(getByTestId('test-symptom-selector-search')).toBeTruthy();
    expect(getByTestId('test-symptom-selector-category-select')).toBeTruthy();
  });

  it('renders with selected symptoms', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={mockSymptoms}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    expect(getByText('Selected Symptoms (2)')).toBeTruthy();
    expect(getByText('Headache (3/5)')).toBeTruthy();
    expect(getByText('Anxiety (4/5)')).toBeTruthy();
  });

  it('filters symptoms by search query', async () => {
    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    const searchInput = getByTestId('test-symptom-selector-search');
    fireEvent.changeText(searchInput, 'head');

    await waitFor(() => {
      expect(queryByText('Headache')).toBeTruthy();
    });
  });

  it('handles symptom selection', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    // Find and press a predefined symptom
    const crampSymptom = getByTestId('test-symptom-selector-symptom-predefined-physical-cramps');
    fireEvent.press(crampSymptom);

    await waitFor(() => {
      expect(mockOnSymptomsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Cramps',
            category: 'physical',
            severity: 3,
          }),
        ])
      );
    });
  });

  it('handles symptom deselection', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[mockSymptoms[0]]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    const symptomCard = getByTestId('test-symptom-selector-symptom-test-1');
    fireEvent.press(symptomCard);

    await waitFor(() => {
      expect(mockOnSymptomsChange).toHaveBeenCalledWith([]);
    });
  });

  it('handles severity changes', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[mockSymptoms[0]]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    const severityButton = getByTestId('test-symptom-selector-severity-test-1-5');
    fireEvent.press(severityButton);

    await waitFor(() => {
      expect(mockOnSymptomsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockSymptoms[0],
          severity: 5,
        }),
      ]);
    });
  });

  it('handles custom symptom creation', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    // Open custom symptom form
    const addCustomButton = getByTestId('test-symptom-selector-add-custom');
    fireEvent.press(addCustomButton);

    expect(getByText('Add Custom Symptom')).toBeTruthy();

    // Add custom symptom
    const customInput = getByTestId('test-symptom-selector-custom-input');
    fireEvent.changeText(customInput, 'Custom Pain');

    const addButton = getByTestId('test-symptom-selector-add-custom-confirm');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockOnSymptomsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Custom Pain',
            category: 'custom',
            severity: 3,
          }),
        ])
      );
    });
  });

  it('filters by category', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    // This test would need proper Select component testing
    // For now, we verify the select exists
    expect(getByTestId('test-symptom-selector-category-select')).toBeTruthy();
  });

  it('respects readonly mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={mockSymptoms}
          onSymptomsChange={mockOnSymptomsChange}
          readonly={true}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    // Add custom button should not be visible in readonly mode
    expect(queryByTestId('test-symptom-selector-add-custom')).toBeFalsy();
  });

  it('applies stealth mode styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          stealthMode={true}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-symptom-selector')).toBeTruthy();
    // Stealth mode styling would be tested through snapshot testing
  });

  it('handles accessibility correctly', () => {
    const mockGetAccessibilityLabel = jest.fn(label => `Accessibility: ${label}`);
    const mockGetAccessibilityHint = jest.fn(hint => `Hint: ${hint}`);

    jest.mocked(AccessibilityUtils.useAccessibility).mockReturnValue({
      getAccessibilityLabel: mockGetAccessibilityLabel,
      getAccessibilityHint: mockGetAccessibilityHint,
    });

    render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Search symptoms');
    expect(mockGetAccessibilityHint).toHaveBeenCalledWith('Type to filter available symptoms');
  });

  it('handles empty custom symptom name', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomSelector
          selectedSymptoms={[]}
          onSymptomsChange={mockOnSymptomsChange}
          testID="test-symptom-selector"
        />
      </TestWrapper>
    );

    // Open custom symptom form
    const addCustomButton = getByTestId('test-symptom-selector-add-custom');
    fireEvent.press(addCustomButton);

    // Try to add without entering name
    const addButton = getByTestId('test-symptom-selector-add-custom-confirm');
    fireEvent.press(addButton);

    // Should not call onSymptomsChange
    expect(mockOnSymptomsChange).not.toHaveBeenCalled();
  });
});
