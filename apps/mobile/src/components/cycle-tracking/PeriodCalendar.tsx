import React, { useState, useCallback } from 'react';
import { View, Text, Button } from 'react-native';
import { Calendar, CalendarUtils } from 'react-native-calendars';
import { PeriodDayData, FlowIntensity } from '@aura/shared-types';

export interface PeriodCalendarProps {
  selectedDates: PeriodDayData[];
  onDateSelect: (date: string, isPeriodStart?: boolean, isPeriodEnd?: boolean) => void;
  onDateRange: (startDate: string, endDate?: string) => void;
  maxDate?: string;
  minDate?: string;
  stealthMode?: boolean;
}

export interface CalendarDayState {
  selected: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  marked?: boolean;
  dotColor?: string;
  disabled?: boolean;
}

export interface MarkedDates {
  [date: string]: CalendarDayState;
}

export const PeriodCalendar: React.FC<PeriodCalendarProps> = ({
  selectedDates,
  onDateSelect,
  onDateRange,
  maxDate = new Date().toISOString().split('T')[0],
  minDate,
  stealthMode = false,
}) => {
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');
  const [rangeStart, setRangeStart] = useState<string | null>(null);

  // Convert PeriodDayData to marked dates for calendar
  const getMarkedDates = useCallback((): MarkedDates => {
    const marked: MarkedDates = {};

    selectedDates.forEach(dayData => {
      const flowColor = getFlowIntensityColor(dayData.flowIntensity, stealthMode);

      marked[dayData.date] = {
        selected: true,
        selectedColor: flowColor,
        selectedTextColor: '#FFFFFF',
        marked: dayData.symptoms.length > 0,
        dotColor: stealthMode ? '#666666' : '#FF6B9D',
      };

      // Mark period start/end with special indicators
      if (dayData.isPeriodStart) {
        marked[dayData.date] = {
          ...marked[dayData.date],
          marked: true,
          dotColor: stealthMode ? '#333333' : '#FF1744',
        };
      }

      if (dayData.isPeriodEnd) {
        marked[dayData.date] = {
          ...marked[dayData.date],
          marked: true,
          dotColor: stealthMode ? '#666666' : '#FF8A95',
        };
      }
    });

    return marked;
  }, [selectedDates, stealthMode]);

  // Get color based on flow intensity with stealth mode support
  const getFlowIntensityColor = (intensity: FlowIntensity, stealth: boolean): string => {
    if (stealth) {
      const stealthColors = {
        none: '#F5F5F5',
        spotting: '#E0E0E0',
        light: '#BDBDBD',
        medium: '#9E9E9E',
        heavy: '#616161',
      };
      return stealthColors[intensity];
    }

    const normalColors = {
      none: '#F8F9FA',
      spotting: '#FFE0E6',
      light: '#FFB3C6',
      medium: '#FF6B9D',
      heavy: '#E91E63',
    };
    return normalColors[intensity];
  };

  // Handle day press based on selection mode
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const dateString = day.dateString;

      if (selectionMode === 'single') {
        onDateSelect(dateString);
      } else if (selectionMode === 'range') {
        if (!rangeStart) {
          setRangeStart(dateString);
          onDateSelect(dateString, true); // Mark as period start
        } else {
          const startDate = new Date(rangeStart);
          const endDate = new Date(dateString);

          if (endDate >= startDate) {
            onDateRange(rangeStart, dateString);
            onDateSelect(dateString, false, true); // Mark as period end
            setRangeStart(null);
          } else {
            // If end date is before start date, reset selection
            setRangeStart(dateString);
            onDateSelect(dateString, true);
          }
        }
      }
    },
    [selectionMode, rangeStart, onDateSelect, onDateRange]
  );

  // Quick select handlers
  const handleTodaySelect = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateSelect(today, true);
  };

  const handleYesterdaySelect = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    onDateSelect(yesterdayString, true);
  };

  return (
    <YStack space="$4" padding="$4">
      {/* Selection Mode Toggle */}
      <XStack space="$2" justifyContent="center">
        <Button
          size="$3"
          variant={selectionMode === 'single' ? 'active' : 'outlined'}
          onPress={() => {
            setSelectionMode('single');
            setRangeStart(null);
          }}
        >
          Single Day
        </Button>
        <Button
          size="$3"
          variant={selectionMode === 'range' ? 'active' : 'outlined'}
          onPress={() => {
            setSelectionMode('range');
            setRangeStart(null);
          }}
        >
          Date Range
        </Button>
      </XStack>

      {/* Quick Select Options */}
      <XStack space="$2" justifyContent="center">
        <Button size="$2" variant="outlined" onPress={handleTodaySelect}>
          Today
        </Button>
        <Button size="$2" variant="outlined" onPress={handleYesterdaySelect}>
          Yesterday
        </Button>
      </XStack>

      {/* Calendar Component */}
      <Calendar
        onDayPress={handleDayPress}
        markedDates={getMarkedDates()}
        maxDate={maxDate}
        minDate={minDate}
        theme={{
          backgroundColor: stealthMode ? '#F5F5F5' : '#FFFFFF',
          calendarBackground: stealthMode ? '#F5F5F5' : '#FFFFFF',
          textSectionTitleColor: stealthMode ? '#666666' : '#FF6B9D',
          selectedDayBackgroundColor: stealthMode ? '#9E9E9E' : '#FF6B9D',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: stealthMode ? '#333333' : '#FF6B9D',
          dayTextColor: stealthMode ? '#333333' : '#2D3748',
          textDisabledColor: '#CBD5E0',
          dotColor: stealthMode ? '#666666' : '#FF6B9D',
          selectedDotColor: '#FFFFFF',
          arrowColor: stealthMode ? '#666666' : '#FF6B9D',
          monthTextColor: stealthMode ? '#333333' : '#2D3748',
          indicatorColor: stealthMode ? '#666666' : '#FF6B9D',
        }}
        markingType="dot"
        enableSwipeMonths={true}
      />

      {/* Selection Status */}
      {rangeStart && selectionMode === 'range' && (
        <Text color={stealthMode ? '#666666' : '#FF6B9D'} textAlign="center">
          Period start selected: {rangeStart}. Select end date.
        </Text>
      )}

      {/* Legend */}
      <YStack space="$2">
        <Text fontWeight="bold" color={stealthMode ? '#333333' : '#2D3748'}>
          Legend:
        </Text>
        <XStack space="$4" flexWrap="wrap">
          <XStack space="$1" alignItems="center">
            <View
              width={12}
              height={12}
              borderRadius={6}
              backgroundColor={getFlowIntensityColor('light', stealthMode)}
            />
            <Text fontSize="$2">Light Flow</Text>
          </XStack>
          <XStack space="$1" alignItems="center">
            <View
              width={12}
              height={12}
              borderRadius={6}
              backgroundColor={getFlowIntensityColor('medium', stealthMode)}
            />
            <Text fontSize="$2">Medium Flow</Text>
          </XStack>
          <XStack space="$1" alignItems="center">
            <View
              width={12}
              height={12}
              borderRadius={6}
              backgroundColor={getFlowIntensityColor('heavy', stealthMode)}
            />
            <Text fontSize="$2">Heavy Flow</Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
};
