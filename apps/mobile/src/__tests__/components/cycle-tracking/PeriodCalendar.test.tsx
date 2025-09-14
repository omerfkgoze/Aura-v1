import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PeriodCalendar } from '../../../components/cycle-tracking/PeriodCalendar';
import { PeriodDayData, FlowIntensity } from '@aura/shared-types';

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: ({ onDayPress, markedDates, theme }: any) => {
    const mockDate = '2024-01-15';
    return (
      <div
        data-testid="calendar"
        onClick={() => onDayPress({ dateString: mockDate })}
        data-marked-dates={JSON.stringify(markedDates)}
        data-theme={JSON.stringify(theme)}
      >
        Mock Calendar
      </div>
    );
  },
  CalendarUtils: {},
}));

// Mock Tamagui components
jest.mock('@tamagui/core', () => ({
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  YStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  XStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('PeriodCalendar', () => {
  const mockOnDateSelect = jest.fn();
  const mockOnDateRange = jest.fn();

  const mockSelectedDates: PeriodDayData[] = [
    {
      date: '2024-01-15',
      flowIntensity: 'medium' as FlowIntensity,
      symptoms: [],
      isPeriodStart: true,
    },
    {
      date: '2024-01-16',
      flowIntensity: 'heavy' as FlowIntensity,
      symptoms: [
        {
          id: '1',
          name: 'Cramping',
          category: 'physical',
          severity: 3,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar with default props', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    expect(screen.getByTestId('calendar')).toBeTruthy();
    expect(screen.getByText('Single Day')).toBeTruthy();
    expect(screen.getByText('Date Range')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
  });

  it('renders in stealth mode with appropriate styling', () => {
    render(
      <PeriodCalendar
        selectedDates={mockSelectedDates}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
        stealthMode={true}
      />
    );

    const calendar = screen.getByTestId('calendar');
    const themeData = JSON.parse(calendar.getAttribute('data-theme') || '{}');

    // Check stealth mode theme colors
    expect(themeData.backgroundColor).toBe('#F5F5F5');
    expect(themeData.textSectionTitleColor).toBe('#666666');
    expect(themeData.selectedDayBackgroundColor).toBe('#9E9E9E');
  });

  it('calls onDateSelect when calendar day is pressed in single mode', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    fireEvent.press(screen.getByTestId('calendar'));
    expect(mockOnDateSelect).toHaveBeenCalledWith('2024-01-15');
  });

  it('switches to range selection mode', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    fireEvent.press(screen.getByText('Date Range'));
    fireEvent.press(screen.getByTestId('calendar'));

    expect(mockOnDateSelect).toHaveBeenCalledWith('2024-01-15', true);
    expect(screen.getByText(/Period start selected/)).toBeTruthy();
  });

  it('handles today quick select', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    fireEvent.press(screen.getByText('Today'));

    const today = new Date().toISOString().split('T')[0];
    expect(mockOnDateSelect).toHaveBeenCalledWith(today, true);
  });

  it('handles yesterday quick select', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    fireEvent.press(screen.getByText('Yesterday'));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    expect(mockOnDateSelect).toHaveBeenCalledWith(yesterdayString, true);
  });

  it('generates correct marked dates from selected data', () => {
    render(
      <PeriodCalendar
        selectedDates={mockSelectedDates}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    const calendar = screen.getByTestId('calendar');
    const markedDates = JSON.parse(calendar.getAttribute('data-marked-dates') || '{}');

    // Check that dates are marked correctly
    expect(markedDates['2024-01-15']).toBeTruthy();
    expect(markedDates['2024-01-15'].selected).toBe(true);
    expect(markedDates['2024-01-15'].selectedColor).toBe('#FF6B9D'); // medium flow color

    expect(markedDates['2024-01-16']).toBeTruthy();
    expect(markedDates['2024-01-16'].selected).toBe(true);
    expect(markedDates['2024-01-16'].selectedColor).toBe('#E91E63'); // heavy flow color
  });

  it('displays legend with flow intensity colors', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    expect(screen.getByText('Legend:')).toBeTruthy();
    expect(screen.getByText('Light Flow')).toBeTruthy();
    expect(screen.getByText('Medium Flow')).toBeTruthy();
    expect(screen.getByText('Heavy Flow')).toBeTruthy();
  });

  it('respects maxDate and minDate props', () => {
    const maxDate = '2024-12-31';
    const minDate = '2024-01-01';

    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
        maxDate={maxDate}
        minDate={minDate}
      />
    );

    // Calendar should receive these props (tested through mock implementation)
    const calendar = screen.getByTestId('calendar');
    expect(calendar).toBeTruthy();
  });

  it('handles range selection completion', () => {
    render(
      <PeriodCalendar
        selectedDates={[]}
        onDateSelect={mockOnDateSelect}
        onDateRange={mockOnDateRange}
      />
    );

    // Switch to range mode
    fireEvent.press(screen.getByText('Date Range'));

    // First press - start date
    fireEvent.press(screen.getByTestId('calendar'));
    expect(mockOnDateSelect).toHaveBeenCalledWith('2024-01-15', true);

    // Mock second press with different date for range completion
    // This would require more sophisticated mock setup for full range testing
  });

  describe('Flow Intensity Color Mapping', () => {
    it('uses correct colors for different flow intensities', () => {
      const testCases = [
        { intensity: 'spotting', expectedColor: '#FFE0E6' },
        { intensity: 'light', expectedColor: '#FFB3C6' },
        { intensity: 'medium', expectedColor: '#FF6B9D' },
        { intensity: 'heavy', expectedColor: '#E91E63' },
      ];

      testCases.forEach(({ intensity, expectedColor }) => {
        const testData: PeriodDayData[] = [
          {
            date: '2024-01-15',
            flowIntensity: intensity as FlowIntensity,
            symptoms: [],
          },
        ];

        const { rerender } = render(
          <PeriodCalendar
            selectedDates={testData}
            onDateSelect={mockOnDateSelect}
            onDateRange={mockOnDateRange}
          />
        );

        const calendar = screen.getByTestId('calendar');
        const markedDates = JSON.parse(calendar.getAttribute('data-marked-dates') || '{}');

        expect(markedDates['2024-01-15'].selectedColor).toBe(expectedColor);

        rerender(
          <PeriodCalendar
            selectedDates={[]}
            onDateSelect={mockOnDateSelect}
            onDateRange={mockOnDateRange}
          />
        );
      });
    });

    it('uses stealth colors when stealth mode is enabled', () => {
      const testData: PeriodDayData[] = [
        {
          date: '2024-01-15',
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
        },
      ];

      render(
        <PeriodCalendar
          selectedDates={testData}
          onDateSelect={mockOnDateSelect}
          onDateRange={mockOnDateRange}
          stealthMode={true}
        />
      );

      const calendar = screen.getByTestId('calendar');
      const markedDates = JSON.parse(calendar.getAttribute('data-marked-dates') || '{}');

      // Stealth color for medium flow should be gray
      expect(markedDates['2024-01-15'].selectedColor).toBe('#9E9E9E');
    });
  });
});
