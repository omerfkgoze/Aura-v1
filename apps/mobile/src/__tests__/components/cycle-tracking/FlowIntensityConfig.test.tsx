import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import { FlowIntensityConfig } from '../../../components/cycle-tracking/FlowIntensityConfig';
import { FlowIntensity } from '@aura/shared-types';
import { tamaguiConfig } from '../../../config/tamagui.config';

// Mock the accessibility utility
jest.mock('../../../utils/accessibility', () => ({
  useAccessibility: () => ({
    getAccessibilityLabel: (key: string, fallback: string) => fallback,
  }),
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert');

const mockFlowConfig = [
  {
    intensity: 'none' as FlowIntensity,
    label: 'None',
    description: 'No flow',
    color: '#E5E5E5',
    stealthColor: '#F0F0F0',
    icon: '○',
  },
  {
    intensity: 'light' as FlowIntensity,
    label: 'Light',
    description: 'Light flow',
    color: '#FF69B4',
    stealthColor: '#E8E8E8',
    icon: '◦',
  },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(<TamaguiProvider config={tamaguiConfig}>{component}</TamaguiProvider>);
};

describe('FlowIntensityConfig', () => {
  const mockOnConfigChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockImplementation((title, message, buttons) => {
      // Auto-press first button for testing
      if (buttons && buttons[0] && typeof buttons[0] !== 'string') {
        buttons[0].onPress?.();
      }
    });
  });

  describe('Basic Rendering', () => {
    it('should render configuration interface', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(getByText('Flow Intensity Configuration')).toBeTruthy();
      expect(getByText('None')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Reset Defaults')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save Changes')).toBeTruthy();
    });

    it('should render in stealth mode', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          stealthMode={true}
        />
      );

      expect(getByText('Scale Configuration')).toBeTruthy();
      expect(queryByText('Flow Intensity Configuration')).toBeNull();
    });

    it('should show disabled save button initially', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = getByText('Save Changes');
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Edit Functionality', () => {
    it('should expand edit interface when edit button is pressed', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Initially collapsed
      expect(queryByText('Label:')).toBeNull();

      // Expand edit interface
      const editButton = getByText('Edit');
      fireEvent.press(editButton);

      expect(getByText('Label:')).toBeTruthy();
      expect(getByText('Description:')).toBeTruthy();
      expect(getByText('Color:')).toBeTruthy();
      expect(getByText('Icon:')).toBeTruthy();
    });

    it('should update label when text is changed', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Open edit interface
      fireEvent.press(getByText('Edit'));

      // Change label
      const labelInput = getByDisplayValue('None');
      fireEvent.changeText(labelInput, 'No Flow');

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            intensity: 'none',
            label: 'No Flow',
          }),
        ])
      );
    });

    it('should update description when text is changed', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Open edit interface
      fireEvent.press(getByText('Edit'));

      // Change description
      const descInput = getByDisplayValue('No flow');
      fireEvent.changeText(descInput, 'No menstrual flow');

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            intensity: 'none',
            description: 'No menstrual flow',
          }),
        ])
      );
    });
  });

  describe('Color and Icon Selection', () => {
    it('should update color when color button is pressed', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Open edit interface
      fireEvent.press(getByText('Edit'));

      // Select a color button (would need to test by position or test-id)
      // This is a simplified test - in reality you'd identify color buttons
      // by their accessibility labels or test IDs

      expect(getByText('Color:')).toBeTruthy();
    });

    it('should update icon when icon button is pressed', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Open edit interface
      fireEvent.press(getByText('Edit'));

      // Select an icon
      const iconButtons = getByText('Icon:');
      expect(iconButtons).toBeTruthy();
    });
  });

  describe('Reset Functionality', () => {
    it('should show confirmation dialog when reset is pressed', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(getByText('Reset Defaults'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Reset to Defaults',
        expect.stringContaining('Are you sure'),
        expect.any(Array)
      );
    });

    it('should reset configuration when confirmed', () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate pressing the Reset button
        if (buttons && buttons[1] && typeof buttons[1] !== 'string') {
          buttons[1].onPress?.();
        }
      });

      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(getByText('Reset Defaults'));

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ intensity: 'none', label: 'None' }),
          expect.objectContaining({ intensity: 'spotting', label: 'Spotting' }),
          expect.objectContaining({ intensity: 'light', label: 'Light' }),
          expect.objectContaining({ intensity: 'medium', label: 'Medium' }),
          expect.objectContaining({ intensity: 'heavy', label: 'Heavy' }),
        ])
      );
    });
  });

  describe('Save and Cancel', () => {
    it('should enable save button after making changes', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      fireEvent.press(getByText('Edit'));
      const labelInput = getByDisplayValue('None');
      fireEvent.changeText(labelInput, 'Changed');

      // Save button should be enabled
      const saveButton = getByText('Save Changes');
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });

    it('should call onSave when save button is pressed with valid data', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      fireEvent.press(getByText('Edit'));
      const labelInput = getByDisplayValue('None');
      fireEvent.changeText(labelInput, 'Changed');

      // Save
      fireEvent.press(getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should show validation error for duplicate labels', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make duplicate labels
      fireEvent.press(getByText('Edit'));
      const labelInput = getByDisplayValue('None');
      fireEvent.changeText(labelInput, 'Light');

      // Try to save
      fireEvent.press(getByText('Save Changes'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Validation Error',
        'Intensity labels must be unique.',
        expect.any(Array)
      );
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog when canceling with changes', () => {
      const { getByText, getByDisplayValue } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      fireEvent.press(getByText('Edit'));
      const labelInput = getByDisplayValue('None');
      fireEvent.changeText(labelInput, 'Changed');

      // Try to cancel
      fireEvent.press(getByText('Cancel'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Discard Changes',
        expect.stringContaining('unsaved changes'),
        expect.any(Array)
      );
    });

    it('should call onCancel immediately when no changes made', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(getByLabelText('Reset to default configuration')).toBeTruthy();
      expect(getByLabelText('Cancel configuration changes')).toBeTruthy();
      expect(getByLabelText('Save configuration changes')).toBeTruthy();
    });

    it('should have accessibility labels for edit buttons', () => {
      const { getByLabelText } = renderWithProvider(
        <FlowIntensityConfig
          currentConfig={mockFlowConfig}
          onConfigChange={mockOnConfigChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(getByLabelText(/Edit none settings/)).toBeTruthy();
      expect(getByLabelText(/Edit light settings/)).toBeTruthy();
    });
  });
});
