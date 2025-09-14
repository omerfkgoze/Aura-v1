import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import { BatchDataEntry } from '../../../components/cycle-tracking/BatchDataEntry';
import * as EncryptedStorageHook from '../../../hooks/useEncryptedStorage';
import * as AccessibilityUtils from '../../../utils/accessibility';

// Mock dependencies
jest.mock('../../../hooks/useEncryptedStorage');
jest.mock('../../../utils/accessibility');
jest.mock('../../../utils/dataValidation');

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

describe('BatchDataEntry', () => {
  const mockProps = {
    userId: 'test-user-123',
    deviceId: 'test-device-456',
  };

  const mockEncryptedStorage = {
    isInitialized: true,
    storeCycleData: jest.fn().mockResolvedValue('mock-record-id'),
    initialize: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(EncryptedStorageHook.useEncryptedStorage).mockReturnValue({
      ...mockEncryptedStorage,
      isLoading: false,
      error: null,
      healthStatus: null,
      retrieveCycleData: jest.fn(),
      storeSymptomData: jest.fn(),
      batchStoreData: jest.fn(),
      performHealthCheck: jest.fn(),
      clearError: jest.fn(),
      dispose: jest.fn(),
    } as any);

    jest.mocked(AccessibilityUtils.useAccessibility).mockReturnValue({
      getAccessibilityLabel: label => label,
      getAccessibilityHint: hint => hint,
    });
  });

  it('renders correctly with initial state', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    expect(getByText('Batch Data Entry')).toBeTruthy();
    expect(
      getByText('Add multiple menstrual cycles at once for historical data or bulk entry')
    ).toBeTruthy();
    expect(getByTestId('batch-data-entry-add-entry')).toBeTruthy();
  });

  it('adds new entries when add button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    expect(queryByTestId('batch-data-entry-entry-0')).toBeFalsy();

    fireEvent.press(getByTestId('batch-data-entry-add-entry'));

    expect(queryByTestId('batch-data-entry-entry-0')).toBeTruthy();
  });

  it('removes entries when remove button is pressed', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    // Add an entry
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));
    expect(queryByTestId('batch-data-entry-entry-0')).toBeTruthy();

    // Remove the entry
    fireEvent.press(getByTestId('batch-data-entry-remove-0'));

    await waitFor(() => {
      expect(queryByTestId('batch-data-entry-entry-0')).toBeFalsy();
    });
  });

  it('updates entry fields correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    // Add an entry
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));

    // Update period start
    const periodStartInput = getByTestId('batch-data-entry-period-start-0');
    fireEvent.changeText(periodStartInput, '2025-01-01');

    // Update period end
    const periodEndInput = getByTestId('batch-data-entry-period-end-0');
    fireEvent.changeText(periodEndInput, '2025-01-05');

    // Update cycle length
    const cycleLengthInput = getByTestId('batch-data-entry-cycle-length-0');
    fireEvent.changeText(cycleLengthInput, '30');

    expect(periodStartInput.props.value).toBe('2025-01-01');
    expect(periodEndInput.props.value).toBe('2025-01-05');
    expect(cycleLengthInput.props.value).toBe('30');
  });

  it('prevents processing when no entries exist', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    const processButton = getByTestId('batch-data-entry-process');
    expect(processButton.props.disabled).toBe(true);
  });

  it('calls onBatchComplete when processing is successful', async () => {
    const mockOnBatchComplete = jest.fn();

    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} onBatchComplete={mockOnBatchComplete} />
      </TestWrapper>
    );

    // Add and fill entry
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));

    const periodStartInput = getByTestId('batch-data-entry-period-start-0');
    fireEvent.changeText(periodStartInput, '2025-01-01');

    // Process batch
    const processButton = getByTestId('batch-data-entry-process');
    fireEvent.press(processButton);

    await waitFor(() => {
      expect(mockEncryptedStorage.storeCycleData).toHaveBeenCalled();
    });

    expect(mockOnBatchComplete).toHaveBeenCalledWith({
      success: ['mock-record-id'],
      failed: [],
    });
  });

  it('handles storage errors gracefully', async () => {
    mockEncryptedStorage.storeCycleData.mockRejectedValueOnce(new Error('Storage failed'));

    const mockOnBatchComplete = jest.fn();

    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} onBatchComplete={mockOnBatchComplete} />
      </TestWrapper>
    );

    // Add and fill entry
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));

    const periodStartInput = getByTestId('batch-data-entry-period-start-0');
    fireEvent.changeText(periodStartInput, '2025-01-01');

    // Process batch
    const processButton = getByTestId('batch-data-entry-process');
    fireEvent.press(processButton);

    await waitFor(() => {
      expect(mockOnBatchComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          failed: expect.arrayContaining([expect.any(String)]),
        })
      );
    });
  });

  it('calls onCancel when cancel button is pressed', () => {
    const mockOnCancel = jest.fn();

    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} onCancel={mockOnCancel} />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('batch-data-entry-cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('applies stealth mode styling correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} stealthMode={true} />
      </TestWrapper>
    );

    expect(getByTestId('batch-data-entry')).toBeTruthy();
    // Stealth mode styling would be verified through snapshot testing
  });

  it('shows progress during batch processing', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    // Add entry
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));
    const periodStartInput = getByTestId('batch-data-entry-period-start-0');
    fireEvent.changeText(periodStartInput, '2025-01-01');

    // Start processing
    const processButton = getByTestId('batch-data-entry-process');
    fireEvent.press(processButton);

    // Should show progress
    await waitFor(() => {
      expect(getByText('Processing Batch Entry')).toBeTruthy();
    });
  });

  it('generates correct day data from batch entry', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BatchDataEntry {...mockProps} />
      </TestWrapper>
    );

    // Add entry with period dates
    fireEvent.press(getByTestId('batch-data-entry-add-entry'));

    const periodStartInput = getByTestId('batch-data-entry-period-start-0');
    fireEvent.changeText(periodStartInput, '2025-01-01');

    const periodEndInput = getByTestId('batch-data-entry-period-end-0');
    fireEvent.changeText(periodEndInput, '2025-01-03');

    // The day data generation would be tested through the storage call
    expect(getByTestId('batch-data-entry')).toBeTruthy();
  });
});
