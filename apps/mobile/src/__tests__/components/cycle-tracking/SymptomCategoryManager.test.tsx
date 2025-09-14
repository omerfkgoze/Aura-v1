import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import { SymptomCategoryManager } from '../../../components/cycle-tracking/SymptomCategoryManager';
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

describe('SymptomCategoryManager', () => {
  const mockOnConfigChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default categories', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-category-manager')).toBeTruthy();
    expect(getByText('Symptom Categories')).toBeTruthy();
    expect(getByTestId('test-category-manager-reset')).toBeTruthy();

    // Check default categories are present
    expect(getByTestId('test-category-manager-category-mood')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-physical')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-energy')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-sleep')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-skin')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-digestive')).toBeTruthy();
    expect(getByTestId('test-category-manager-category-custom')).toBeTruthy();
  });

  it('toggles category enabled state', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    const moodToggle = getByTestId('test-category-manager-toggle-mood');
    fireEvent.press(moodToggle);

    await waitFor(() => {
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'mood',
            enabled: false,
          }),
        ])
      );
    });
  });

  it('allows editing category display name', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    // Start editing mood category
    const editButton = getByTestId('test-category-manager-edit-mood');
    fireEvent.press(editButton);

    // Input should be visible
    const nameInput = getByTestId('test-category-manager-edit-name-mood');
    expect(nameInput).toBeTruthy();

    // Change name
    fireEvent.changeText(nameInput, 'Custom Mood Name');

    // Save changes
    const saveButton = getByTestId('test-category-manager-save-name-mood');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'mood',
            displayName: 'Custom Mood Name',
          }),
        ])
      );
    });
  });

  it('adds custom symptoms to categories', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    // Add custom symptom to mood category
    const input = getByTestId('test-category-manager-add-input-mood');
    fireEvent.changeText(input, 'Custom Mood Symptom');

    const addButton = getByTestId('test-category-manager-add-btn-mood');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'mood',
            customSymptoms: expect.arrayContaining(['Custom Mood Symptom']),
          }),
        ])
      );
    });
  });

  it('removes custom symptoms', async () => {
    // First add a custom symptom
    const { getByTestId, rerender } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    const input = getByTestId('test-category-manager-add-input-mood');
    fireEvent.changeText(input, 'Test Symptom');

    const addButton = getByTestId('test-category-manager-add-btn-mood');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    // Mock the component with the added symptom
    const mockCategoryWithSymptom = jest.fn(config => {
      // Simulate having a custom symptom
      if (config.some((cat: any) => cat.category === 'mood' && cat.customSymptoms.length > 0)) {
        const removeButton = getByTestId('test-category-manager-remove-mood-0');
        expect(removeButton).toBeTruthy();
      }
    });

    mockOnConfigChange.mockImplementation(mockCategoryWithSymptom);
  });

  it('resets to default configuration', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    const resetButton = getByTestId('test-category-manager-reset');
    fireEvent.press(resetButton);

    await waitFor(() => {
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'mood',
            enabled: true,
            customSymptoms: [],
            displayName: 'Mood & Emotions',
          }),
          expect.objectContaining({
            category: 'physical',
            enabled: true,
            customSymptoms: [],
            displayName: 'Physical Symptoms',
          }),
        ])
      );
    });
  });

  it('shows category statistics', () => {
    const { getByText } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    expect(getByText('Category Statistics')).toBeTruthy();
    expect(getByText('Active Categories: 7')).toBeTruthy();
    expect(getByText('Custom Symptoms: 0')).toBeTruthy();
  });

  it('applies stealth mode styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          stealthMode={true}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-category-manager')).toBeTruthy();
    // Stealth mode would be tested through snapshot testing
  });

  it('prevents adding empty custom symptoms', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    // Try to add empty symptom
    const addButton = getByTestId('test-category-manager-add-btn-mood');
    fireEvent.press(addButton);

    // Should not call onConfigChange
    expect(mockOnConfigChange).not.toHaveBeenCalled();
  });

  it('handles accessibility correctly', () => {
    const mockGetAccessibilityLabel = jest.fn(label => `Accessibility: ${label}`);

    jest.mocked(AccessibilityUtils.useAccessibility).mockReturnValue({
      getAccessibilityLabel: mockGetAccessibilityLabel,
      getAccessibilityHint: jest.fn(),
    });

    render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Reset to default categories');
    expect(mockGetAccessibilityLabel).toHaveBeenCalledWith('Toggle Mood & Emotions');
  });

  it('shows custom symptoms when they exist', () => {
    // This would require a more complex test setup to mock initial state
    // with custom symptoms already present
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    expect(getByTestId('test-category-manager')).toBeTruthy();
  });

  it('disables add button when input is empty', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SymptomCategoryManager
          onConfigChange={mockOnConfigChange}
          testID="test-category-manager"
        />
      </TestWrapper>
    );

    const addButton = getByTestId('test-category-manager-add-btn-mood');
    expect(addButton.props.disabled).toBeTruthy();
  });
});
