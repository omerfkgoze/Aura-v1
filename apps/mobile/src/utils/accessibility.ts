import { FlowIntensity, PeriodDayData } from '@aura/shared-types';

export interface AccessibilityLabels {
  calendarDay: (date: string, data?: PeriodDayData) => string;
  flowIntensity: (intensity: FlowIntensity) => string;
  dateSelection: (date: string, isSelected: boolean) => string;
  periodRange: (startDate: string, endDate?: string) => string;
}

export class AccessibilityService {
  private static stealthMode = false;

  static setStealthMode(enabled: boolean): void {
    this.stealthMode = enabled;
  }

  /**
   * Generate accessible label for calendar day
   */
  static getCalendarDayLabel(date: string, data?: PeriodDayData): string {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    if (!data) {
      return `${formattedDate}, no data recorded`;
    }

    const parts = [formattedDate];

    // Flow intensity
    if (data.flowIntensity !== 'none') {
      if (this.stealthMode) {
        parts.push('data recorded');
      } else {
        parts.push(`${this.getFlowIntensityLabel(data.flowIntensity)} flow`);
      }
    }

    // Period markers
    if (data.isPeriodStart) {
      parts.push(this.stealthMode ? 'cycle start' : 'period start');
    }
    if (data.isPeriodEnd) {
      parts.push(this.stealthMode ? 'cycle end' : 'period end');
    }

    // Symptoms
    if (data.symptoms.length > 0) {
      if (this.stealthMode) {
        parts.push(`${data.symptoms.length} items tracked`);
      } else {
        parts.push(`${data.symptoms.length} symptoms recorded`);
      }
    }

    // Notes
    if (data.notes) {
      parts.push('notes available');
    }

    return parts.join(', ');
  }

  /**
   * Generate accessible label for flow intensity
   */
  static getFlowIntensityLabel(intensity: FlowIntensity): string {
    if (this.stealthMode) {
      const stealthLabels: Record<FlowIntensity, string> = {
        none: 'no data',
        spotting: 'level 1',
        light: 'level 2',
        medium: 'level 3',
        heavy: 'level 4',
      };
      return stealthLabels[intensity];
    }

    const normalLabels: Record<FlowIntensity, string> = {
      none: 'no flow',
      spotting: 'spotting',
      light: 'light flow',
      medium: 'medium flow',
      heavy: 'heavy flow',
    };
    return normalLabels[intensity];
  }

  /**
   * Generate accessible label for date selection
   */
  static getDateSelectionLabel(date: string, isSelected: boolean): string {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    const action = isSelected ? 'selected' : 'available for selection';
    return `${formattedDate}, ${action}`;
  }

  /**
   * Generate accessible label for period range
   */
  static getPeriodRangeLabel(startDate: string, endDate?: string): string {
    const startObj = new Date(startDate);
    const startFormatted = startObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    if (!endDate) {
      return this.stealthMode
        ? `Cycle start: ${startFormatted}`
        : `Period start: ${startFormatted}`;
    }

    const endObj = new Date(endDate);
    const endFormatted = endObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    const duration = Math.ceil((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return this.stealthMode
      ? `Cycle: ${startFormatted} to ${endFormatted}, ${duration} days`
      : `Period: ${startFormatted} to ${endFormatted}, ${duration} days`;
  }

  /**
   * Generate accessible hints for calendar navigation
   */
  static getCalendarNavigationHints(): string[] {
    return [
      'Use swipe gestures to navigate between months',
      'Double tap a date to select it',
      'Use voice control to select specific dates',
      this.stealthMode
        ? 'Stealth mode: sensitive information hidden'
        : 'All period information visible',
    ];
  }

  /**
   * Generate screen reader announcements
   */
  static getScreenReaderAnnouncement(
    action: 'dateSelected' | 'rangeCompleted' | 'dataUpdated',
    data: any
  ): string {
    switch (action) {
      case 'dateSelected':
        return this.stealthMode
          ? `Date ${data.date} selected for data entry`
          : `${data.date} selected for period tracking`;

      case 'rangeCompleted':
        const duration =
          Math.ceil(
            (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        return this.stealthMode
          ? `Date range selected: ${duration} days`
          : `Period range selected: ${duration} days from ${data.startDate} to ${data.endDate}`;

      case 'dataUpdated':
        return this.stealthMode ? 'Data updated successfully' : 'Period data updated successfully';

      default:
        return 'Action completed';
    }
  }
}
