import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import { FlowIntensityTracker } from '../../../components/cycle-tracking/FlowIntensityTracker';
import { FlowIntensity, PeriodDayData } from '@aura/shared-types';
import { tamaguiConfig } from '../../../config/tamagui.config';

// Mock the accessibility utility
jest.mock('../../../utils/accessibility', () => ({
  useAccessibility: () => ({
    getAccessibilityLabel: (key: string, fallback: string) => fallback,
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: any, formatStr: string) => {
    if (formatStr === 'MMM dd') return 'Sep 14';
    if (formatStr === 'MMMM dd, yyyy') return 'September 14, 2025';
    return '2025-09-14';
  },
  parseISO: (dateStr: string) => new Date(dateStr),
  differenceInDays: (date1: any, date2: any) => 1,
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert');

const mockPeriodData: PeriodDayData[] = [
  {
    date: '2025-09-12',
    flowIntensity: 'light',
    symptoms: [],
    isPeriodStart: true,
  },
  {
    date: '2025-09-13',
    flowIntensity: 'medium',
    symptoms: [],
  },
  {
    date: '2025-09-14',
    flowIntensity: 'heavy',
    symptoms: [],
  },
];

const mockFlowConfig = [
  {
    intensity: 'light' as FlowIntensity,
    label: 'Light',
    description: 'Light flow',
    color: '#FF69B4',
    stealthColor: '#E8E8E8',
    icon: '◦',
  },
  {
    intensity: 'medium' as FlowIntensity,
    label: 'Medium',
    description: 'Medium flow',
    color: '#DC143C',
    stealthColor: '#DCDCDC',
    icon: '●',
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

describe('FlowIntensityTracker', () => {
  const mockOnFlowIntensityChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockImplementation(() => {});
  });

  describe('Basic Rendering', () => {
    it('should render flow intensity selector', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByText('Flow Intensity')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Heavy')).toBeTruthy();
    });

    it('should show current intensity for selected date', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      // Should show currently selected intensity
      expect(getByText(/Selected Intensity:/)).toBeTruthy();
      expect(getByText(/Heavy/)).toBeTruthy();
    });

    it('should render control buttons', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByText('Show History')).toBeTruthy();
      expect(getByText('Analytics')).toBeTruthy();
    });
  });

  describe('Flow Intensity Changes', () => {
    it('should call onFlowIntensityChange when intensity changes', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      expect(mockOnFlowIntensityChange).toHaveBeenCalledWith('2025-09-14', 'light');
    });

    it('should show change notification when intensity changes', async () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Flow Updated',
          'Flow intensity changed from Heavy to Light',
          [{ text: 'OK' }]
        );
      });
    });

    it('should show stealth mode notification', async () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
          stealthMode={true}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Level Updated', 'Changed from Heavy to Light', [
          { text: 'OK' },
        ]);
      });
    });

    it('should not show notification for initial selection', async () => {
      const emptyPeriodData = mockPeriodData.filter(d => d.date !== '2025-09-14');

      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={emptyPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      expect(mockOnFlowIntensityChange).toHaveBeenCalledWith('2025-09-14', 'light');

      // Should not show alert for initial selection
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  describe('Flow History', () => {
    it('should toggle history visibility', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      // Initially hidden
      expect(queryByText('Flow History')).toBeNull();

      // Show history
      fireEvent.press(getByText('Show History'));
      expect(getByText('Flow History')).toBeTruthy();

      // Hide history
      fireEvent.press(getByText('Hide History'));
      expect(queryByText('Flow History')).toBeNull();
    });

    it('should show stealth mode history title', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
          stealthMode={true}
        />
      );

      fireEvent.press(getByText('Show History'));
      expect(getByText('Recent Levels')).toBeTruthy();
    });

    it('should display historical data', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      fireEvent.press(getByText('Show History'));

      // Should show historical intensity labels
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Heavy')).toBeTruthy();
    });
  });

  describe('Flow Patterns and Analytics', () => {
    it('should show analytics dialog when analytics button is pressed', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      fireEvent.press(getByText('Analytics'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Flow Analytics',
        expect.stringContaining('September 14, 2025'),
        [{ text: 'OK' }]
      );
    });

    it('should show stealth mode analytics', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
          stealthMode={true}
        />
      );

      fireEvent.press(getByText('Analytics'));

      expect(mockAlert).toHaveBeenCalledWith('Level Analytics', expect.any(String), [
        { text: 'OK' },
      ]);
    });

    it('should display pattern analysis for sufficient data', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByText('Pattern Analysis')).toBeTruthy();
      expect(getByText('Days')).toBeTruthy();
      expect(getByText('Tracked')).toBeTruthy();
      expect(getByText('Peak')).toBeTruthy();
    });

    it('should show intensity distribution', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByText('Intensity Distribution:')).toBeTruthy();
      expect(getByText(/days/)).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('should disable intensity selection when disabled prop is true', () => {
      const { getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
          disabled={true}
        />
      );

      const lightButton = getByText('Light');
      fireEvent.press(lightButton);

      expect(mockOnFlowIntensityChange).not.toHaveBeenCalled();
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty period data gracefully', () => {
      const { getByText, queryByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={[]}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByText('Flow Intensity')).toBeTruthy();
      expect(queryByText('Pattern Analysis')).toBeNull();
    });

    it('should not show analytics button with empty data', () => {
      const { queryByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={[]}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(queryByText('Analytics')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for buttons', () => {
      const { getByLabelText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      expect(getByLabelText('Show flow history')).toBeTruthy();
      expect(getByLabelText('Show detailed flow analytics')).toBeTruthy();
    });

    it('should update accessibility labels when history is shown', () => {
      const { getByLabelText, getByText } = renderWithProvider(
        <FlowIntensityTracker
          selectedDate="2025-09-14"
          currentPeriodData={mockPeriodData}
          onFlowIntensityChange={mockOnFlowIntensityChange}
          flowConfig={mockFlowConfig}
        />
      );

      fireEvent.press(getByText('Show History'));
      expect(getByLabelText('Hide flow history')).toBeTruthy();
    });
  });
});
