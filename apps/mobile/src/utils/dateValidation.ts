import { PeriodDayData } from '@aura/shared-types';

export interface DateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PeriodValidationOptions {
  maxPeriodLength?: number; // Maximum period length in days
  minCycleDays?: number; // Minimum cycle length in days
  maxCycleDays?: number; // Maximum cycle length in days
  allowFutureDates?: boolean; // Allow dates in the future
}

export class DateValidationService {
  private static readonly DEFAULT_OPTIONS: PeriodValidationOptions = {
    maxPeriodLength: 10, // 10 days max period length
    minCycleDays: 21, // Minimum 21-day cycle
    maxCycleDays: 35, // Maximum 35-day cycle
    allowFutureDates: false,
  };

  /**
   * Validate a single date entry
   */
  static validateDate(
    date: string,
    existingData: PeriodDayData[] = [],
    options: PeriodValidationOptions = {}
  ): DateValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse the date
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    // Basic date format validation
    if (isNaN(inputDate.getTime())) {
      errors.push('Invalid date format');
      return { isValid: false, errors, warnings };
    }

    // Future date validation
    if (!opts.allowFutureDates && inputDate > today) {
      errors.push('Future dates are not allowed');
    }

    // Check if date already exists
    const existingEntry = existingData.find(entry => entry.date === date);
    if (existingEntry) {
      warnings.push('Date already has existing data - will be updated');
    }

    // Reasonable date range (not too far in the past)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    if (inputDate < oneYearAgo) {
      warnings.push('Date is more than 1 year ago');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate period start and end dates
   */
  static validatePeriodRange(
    startDate: string,
    endDate: string,
    options: PeriodValidationOptions = {}
  ): DateValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Basic date validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format');
      return { isValid: false, errors, warnings };
    }

    // End date must be after start date
    if (end <= start) {
      errors.push('Period end date must be after start date');
    }

    // Calculate period length
    const periodLengthMs = end.getTime() - start.getTime();
    const periodLengthDays = Math.ceil(periodLengthMs / (1000 * 60 * 60 * 24));

    // Period length validation
    if (periodLengthDays > (opts.maxPeriodLength || 10)) {
      warnings.push(`Period length (${periodLengthDays} days) is longer than typical`);
    }

    if (periodLengthDays > 14) {
      errors.push('Period length cannot exceed 14 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate cycle consistency with previous cycles
   */
  static validateCycleConsistency(
    newPeriodStart: string,
    existingCycles: PeriodDayData[],
    options: PeriodValidationOptions = {}
  ): DateValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    if (existingCycles.length === 0) {
      return { isValid: true, errors, warnings };
    }

    // Find the most recent period start
    const periodStarts = existingCycles
      .filter(day => day.isPeriodStart)
      .map(day => new Date(day.date))
      .sort((a, b) => b.getTime() - a.getTime());

    if (periodStarts.length === 0) {
      return { isValid: true, errors, warnings };
    }

    const lastPeriodStart = periodStarts[0];
    const newStart = new Date(newPeriodStart);

    // Calculate cycle length
    const cycleLengthMs = newStart.getTime() - lastPeriodStart.getTime();
    const cycleLengthDays = Math.ceil(cycleLengthMs / (1000 * 60 * 60 * 24));

    // Cycle length validation
    if (cycleLengthDays < (opts.minCycleDays || 21)) {
      warnings.push(`Cycle length (${cycleLengthDays} days) is shorter than typical`);
    }

    if (cycleLengthDays > (opts.maxCycleDays || 35)) {
      warnings.push(`Cycle length (${cycleLengthDays} days) is longer than typical`);
    }

    // Very short cycles might indicate an error
    if (cycleLengthDays < 14) {
      errors.push('Cycle length cannot be less than 14 days');
    }

    // Very long cycles might indicate missed periods
    if (cycleLengthDays > 60) {
      warnings.push('Long cycle detected - you may have missed logging a period');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate period duration
   */
  static calculatePeriodDuration(startDate: string, endDate?: string): number {
    if (!endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const durationMs = end.getTime() - start.getTime();
    return Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }

  /**
   * Generate date range between start and end
   */
  static generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get next expected period date based on cycle history
   */
  static predictNextPeriod(existingCycles: PeriodDayData[]): string | null {
    const periodStarts = existingCycles
      .filter(day => day.isPeriodStart)
      .map(day => new Date(day.date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (periodStarts.length < 2) {
      return null; // Need at least 2 cycles to predict
    }

    // Calculate average cycle length
    const cycleLengths: number[] = [];
    for (let i = 1; i < periodStarts.length; i++) {
      const currentStart = periodStarts[i];
      const previousStart = periodStarts[i - 1];
      const lengthMs = currentStart.getTime() - previousStart.getTime();
      const lengthDays = Math.ceil(lengthMs / (1000 * 60 * 60 * 24));
      cycleLengths.push(lengthDays);
    }

    const averageCycleLength = Math.round(
      cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
    );

    // Predict next period
    const lastPeriodStart = periodStarts[periodStarts.length - 1];
    const nextPeriod = new Date(lastPeriodStart);
    nextPeriod.setDate(lastPeriodStart.getDate() + averageCycleLength);

    return nextPeriod.toISOString().split('T')[0];
  }
}
