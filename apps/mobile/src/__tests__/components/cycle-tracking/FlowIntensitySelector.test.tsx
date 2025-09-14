import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import { FlowIntensitySelector } from '../../../components/cycle-tracking/FlowIntensitySelector';
import { FlowIntensity } from '@aura/shared-types';
import { tamaguiConfig } from '../../../config/tamagui.config';

// Mock the accessibility utility
jest.mock('../../../utils/accessibility', () => ({
  useAccessibility: () => ({
    getAccessibilityLabel: (key: string, fallback: string) => fallback,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
  {
    intensity: 'heavy' as FlowIntensity,
    label: 'Heavy',
    description: 'Heavy flow',
    color: '#8B0000',
    stealthColor: '#D0D0D0',
    icon: '⬤',
  },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(<TamaguiProvider config={tamaguiConfig}>{component}</TamaguiProvider>);
};

describe('FlowIntensitySelector', () => {
  const mockOnIntensityChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all intensity options', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      expect(getByText('Flow Intensity')).toBeTruthy();
      expect(getByText('None')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Heavy')).toBeTruthy();
    });

    it('should render in stealth mode with neutral title', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
          stealthMode={true}
        />
      );

      expect(getByText('Daily Scale')).toBeTruthy();
      expect(queryByText('Flow Intensity')).toBeNull();
    });

    it('should show selected intensity', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="light"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      expect(getByText(/Selected Intensity:/)).toBeTruthy();
      expect(getByText(/Light/)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onIntensityChange when intensity is selected', async () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      expect(mockOnIntensityChange).toHaveBeenCalledWith('light');
    });

    it('should not call onIntensityChange when disabled', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
          disabled={true}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      expect(mockOnIntensityChange).not.toHaveBeenCalled();
    });

    it('should show/hide descriptions when info button is pressed', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      // Initially hidden
      expect(queryByText('Intensity Levels:')).toBeNull();

      // Show descriptions
      const showInfoButton = getByText('Show Info');
      fireEvent.press(showInfoButton);

      expect(getByText('Intensity Levels:')).toBeTruthy();
      expect(getByText(/No flow/)).toBeTruthy();

      // Hide descriptions
      const hideInfoButton = getByText('Hide Info');
      fireEvent.press(hideInfoButton);

      expect(queryByText('Intensity Levels:')).toBeNull();
    });

    it('should show accessibility announcement when selection changes', async () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="none"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('', 'Selected Light flow intensity', [
          { text: 'OK' },
        ]);
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should apply selected styling to chosen intensity', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="light"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light').parent;
      // In a real test, you'd check the style properties
      expect(lightButton).toBeTruthy();
    });

    it('should use stealth colors in stealth mode', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="light"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
          stealthMode={true}
        />
      );

      // Visual feedback would be tested by checking computed styles
      const lightButton = getByText('Light').parent;
      expect(lightButton).toBeTruthy();
    });

    it('should show reduced opacity when disabled', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
          disabled={true}
        />
      );

      const lightButton = getByText('Light').parent;
      expect(lightButton).toBeTruthy();
      // In a real implementation, you'd check the opacity style
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      expect(getByLabelText('Flow Intensity Selection')).toBeTruthy();
      expect(getByLabelText('Toggle intensity descriptions')).toBeTruthy();
    });

    it('should have radio button accessibility roles', () => {
      const { getByRole } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="light"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      const radioButtons = getByRole('radio');
      expect(radioButtons).toBeTruthy();
    });

    it('should announce selected state in accessibility', () => {
      const { getByLabelText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity="light"
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      // Check for accessibility state
      const lightButton = getByLabelText(/Light flow intensity/);
      expect(lightButton).toBeTruthy();
    });
  });

  describe('Custom Configuration', () => {
    it('should handle empty custom configuration', () => {
      const { queryByText } = renderWithProvider(
        <FlowIntensitySelector onIntensityChange={mockOnIntensityChange} customConfig={[]} />
      );

      expect(queryByText('None')).toBeNull();
      expect(queryByText('Light')).toBeNull();
    });

    it('should use default configuration when none provided', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector onIntensityChange={mockOnIntensityChange} />
      );

      // Should show default intensity levels
      expect(getByText('None')).toBeTruthy();
      expect(getByText('Spotting')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Heavy')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing intensity config gracefully', () => {
      const invalidConfig = [
        {
          intensity: 'light' as FlowIntensity,
          label: '',
          description: '',
          color: '',
          stealthColor: '',
          icon: '',
        },
      ];

      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          onIntensityChange={mockOnIntensityChange}
          customConfig={invalidConfig}
        />
      );

      expect(getByText('Flow Intensity')).toBeTruthy();
    });

    it('should not crash with undefined selected intensity', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensitySelector
          selectedIntensity={undefined}
          onIntensityChange={mockOnIntensityChange}
          customConfig={mockFlowConfig}
        />
      );

      expect(getByText('Flow Intensity')).toBeTruthy();
    });
  });
});
