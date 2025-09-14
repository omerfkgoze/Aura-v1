import type {
  PeriodDayData,
  FlowIntensity,
  Symptom,
  SymptomCategory,
  EncryptedCycleData,
} from '@aura/shared-types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

export interface ValidationContext {
  userId: string;
  deviceId: string;
  timezone?: string;
  culturalPreset?: string;
  previousCycles?: EncryptedCycleData[];
}

/**
 * Comprehensive data validation system
 * Prevents impossible dates, inconsistent entries, and validates business rules
 */
export class DataValidationService {
  private context: ValidationContext;

  constructor(context: ValidationContext) {
    this.context = context;
  }

  /**
   * Validate complete cycle data entry
   */
  validateCycleData(
    cycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic structure validation
    errors.push(...this.validateBasicStructure(cycleData));

    // Date validation
    errors.push(...this.validateDates(cycleData));

    // Day data validation
    errors.push(...this.validateDayData(cycleData.dayData));

    // Cross-field consistency validation
    errors.push(...this.validateConsistency(cycleData));

    // Business rules validation
    warnings.push(...this.validateBusinessRules(cycleData));

    // Historical consistency validation
    if (this.context.previousCycles?.length) {
      warnings.push(...this.validateHistoricalConsistency(cycleData, this.context.previousCycles));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual period day data
   */
  validatePeriodDay(dayData: PeriodDayData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Date validation
    if (!this.isValidDateString(dayData.date)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format',
        code: 'INVALID_DATE_FORMAT',
        severity: 'critical',
      });
    }

    // Future date validation
    if (this.isFutureDate(dayData.date)) {
      errors.push({
        field: 'date',
        message: 'Cannot log data for future dates',
        code: 'FUTURE_DATE_NOT_ALLOWED',
        severity: 'high',
      });
    }

    // Flow intensity validation
    if (dayData.flowIntensity && !this.isValidFlowIntensity(dayData.flowIntensity)) {
      errors.push({
        field: 'flowIntensity',
        message: 'Invalid flow intensity value',
        code: 'INVALID_FLOW_INTENSITY',
        severity: 'medium',
      });
    }

    // Symptoms validation
    errors.push(...this.validateSymptoms(dayData.symptoms));

    // Logical consistency
    if (
      dayData.flowIntensity === 'none' &&
      dayData.symptoms.some(
        s => s.name.toLowerCase().includes('flow') || s.name.toLowerCase().includes('period')
      )
    ) {
      warnings.push({
        field: 'consistency',
        message: 'No flow intensity but period-related symptoms selected',
        code: 'INCONSISTENT_FLOW_SYMPTOMS',
        suggestion: 'Consider adjusting flow intensity or removing period-related symptoms',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate symptom data
   */
  validateSymptoms(symptoms: Symptom[]): ValidationError[] {
    const errors: ValidationError[] = [];

    symptoms.forEach((symptom, index) => {
      // Basic structure validation
      if (!symptom.id || typeof symptom.id !== 'string') {
        errors.push({
          field: `symptoms[${index}].id`,
          message: 'Symptom ID is required',
          code: 'MISSING_SYMPTOM_ID',
          severity: 'critical',
        });
      }

      if (!symptom.name || typeof symptom.name !== 'string') {
        errors.push({
          field: `symptoms[${index}].name`,
          message: 'Symptom name is required',
          code: 'MISSING_SYMPTOM_NAME',
          severity: 'critical',
        });
      }

      if (!this.isValidSymptomCategory(symptom.category)) {
        errors.push({
          field: `symptoms[${index}].category`,
          message: 'Invalid symptom category',
          code: 'INVALID_SYMPTOM_CATEGORY',
          severity: 'medium',
        });
      }

      // Severity validation
      if (symptom.severity !== undefined) {
        if (!Number.isInteger(symptom.severity) || symptom.severity < 1 || symptom.severity > 5) {
          errors.push({
            field: `symptoms[${index}].severity`,
            message: 'Symptom severity must be between 1 and 5',
            code: 'INVALID_SYMPTOM_SEVERITY',
            severity: 'medium',
          });
        }
      }

      // Custom symptom name validation
      if (symptom.category === 'custom') {
        if (symptom.name.length < 2) {
          errors.push({
            field: `symptoms[${index}].name`,
            message: 'Custom symptom name must be at least 2 characters',
            code: 'CUSTOM_SYMPTOM_NAME_TOO_SHORT',
            severity: 'medium',
          });
        }

        if (symptom.name.length > 50) {
          errors.push({
            field: `symptoms[${index}].name`,
            message: 'Custom symptom name must be less than 50 characters',
            code: 'CUSTOM_SYMPTOM_NAME_TOO_LONG',
            severity: 'medium',
          });
        }
      }
    });

    // Duplicate symptom validation
    const symptomNames = symptoms.map(s => s.name.toLowerCase());
    const duplicates = symptomNames.filter((name, index) => symptomNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push({
        field: 'symptoms',
        message: 'Duplicate symptoms are not allowed',
        code: 'DUPLICATE_SYMPTOMS',
        severity: 'medium',
      });
    }

    return errors;
  }

  /**
   * Validate date ranges and relationships
   */
  private validateDates(
    cycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Period start date validation
    if (!this.isValidDateString(cycleData.periodStartDate)) {
      errors.push({
        field: 'periodStartDate',
        message: 'Invalid period start date format',
        code: 'INVALID_PERIOD_START_DATE',
        severity: 'critical',
      });
      return errors; // Can't validate further without valid start date
    }

    // Period end date validation
    if (cycleData.periodEndDate) {
      if (!this.isValidDateString(cycleData.periodEndDate)) {
        errors.push({
          field: 'periodEndDate',
          message: 'Invalid period end date format',
          code: 'INVALID_PERIOD_END_DATE',
          severity: 'critical',
        });
      } else {
        // End date must be after start date
        const startDate = new Date(cycleData.periodStartDate);
        const endDate = new Date(cycleData.periodEndDate);

        if (endDate <= startDate) {
          errors.push({
            field: 'periodEndDate',
            message: 'Period end date must be after start date',
            code: 'INVALID_DATE_RANGE',
            severity: 'critical',
          });
        }

        // Period duration validation (typically 1-10 days)
        const durationDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (durationDays > 15) {
          errors.push({
            field: 'periodEndDate',
            message: 'Period duration seems unusually long (>15 days)',
            code: 'UNUSUALLY_LONG_PERIOD',
            severity: 'medium',
          });
        }
      }
    }

    // Expected next period validation
    if (cycleData.expectedNextPeriod) {
      if (!this.isValidDateString(cycleData.expectedNextPeriod)) {
        errors.push({
          field: 'expectedNextPeriod',
          message: 'Invalid expected next period date format',
          code: 'INVALID_EXPECTED_DATE',
          severity: 'medium',
        });
      } else {
        const startDate = new Date(cycleData.periodStartDate);
        const nextExpected = new Date(cycleData.expectedNextPeriod);

        if (nextExpected <= startDate) {
          errors.push({
            field: 'expectedNextPeriod',
            message: 'Expected next period must be after current period start',
            code: 'INVALID_NEXT_PERIOD_DATE',
            severity: 'medium',
          });
        }

        // Cycle length validation (typically 21-35 days)
        const cycleDays = Math.ceil(
          (nextExpected.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (cycleDays < 15 || cycleDays > 50) {
          errors.push({
            field: 'expectedNextPeriod',
            message: `Cycle length of ${cycleDays} days is outside typical range (21-35 days)`,
            code: 'ATYPICAL_CYCLE_LENGTH',
            severity: 'low',
          });
        }
      }
    }

    // Future date validation
    if (this.isFutureDate(cycleData.periodStartDate)) {
      errors.push({
        field: 'periodStartDate',
        message: 'Cannot log period data for future dates',
        code: 'FUTURE_PERIOD_START',
        severity: 'high',
      });
    }

    return errors;
  }

  /**
   * Validate day-by-day data consistency
   */
  private validateDayData(dayData: PeriodDayData[]): ValidationError[] {
    const errors: ValidationError[] = [];

    dayData.forEach((day, index) => {
      const dayErrors = this.validatePeriodDay(day);
      errors.push(...dayErrors.errors);
    });

    // Sort dates to check sequence
    const sortedDays = [...dayData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check for date gaps in period days
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1].date);
      const currentDate = new Date(sortedDays[i].date);
      const daysDiff = Math.ceil(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 1) {
        // Check if there's a flow intensity gap during period
        const prevDay = sortedDays[i - 1];
        const currentDay = sortedDays[i];

        if (
          prevDay.flowIntensity &&
          prevDay.flowIntensity !== 'none' &&
          currentDay.flowIntensity &&
          currentDay.flowIntensity !== 'none'
        ) {
          errors.push({
            field: 'dayData',
            message: `Gap in period data between ${prevDay.date} and ${currentDay.date}`,
            code: 'PERIOD_DATA_GAP',
            severity: 'low',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate cross-field consistency
   */
  private validateConsistency(
    cycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if day data aligns with period dates
    const periodDays = cycleData.dayData.filter(
      day => day.flowIntensity && day.flowIntensity !== 'none'
    );

    if (periodDays.length > 0) {
      const earliestFlowDate = periodDays.reduce((earliest, day) =>
        new Date(day.date) < new Date(earliest.date) ? day : earliest
      );

      const latestFlowDate = periodDays.reduce((latest, day) =>
        new Date(day.date) > new Date(latest.date) ? day : latest
      );

      // Check alignment with declared period start
      if (
        new Date(earliestFlowDate.date).toDateString() !==
        new Date(cycleData.periodStartDate).toDateString()
      ) {
        errors.push({
          field: 'consistency',
          message: 'First flow day does not match declared period start date',
          code: 'PERIOD_START_MISMATCH',
          severity: 'medium',
        });
      }

      // Check alignment with declared period end
      if (cycleData.periodEndDate) {
        if (
          new Date(latestFlowDate.date).toDateString() !==
          new Date(cycleData.periodEndDate).toDateString()
        ) {
          errors.push({
            field: 'consistency',
            message: 'Last flow day does not match declared period end date',
            code: 'PERIOD_END_MISMATCH',
            severity: 'medium',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    cycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for extremely heavy flow for extended periods
    const heavyFlowDays = cycleData.dayData.filter(day => day.flowIntensity === 'heavy').length;
    if (heavyFlowDays > 7) {
      warnings.push({
        field: 'dayData',
        message: 'Extended heavy flow period detected',
        code: 'EXTENDED_HEAVY_FLOW',
        suggestion: 'Consider consulting with a healthcare provider',
      });
    }

    // Check for unusual symptom severity patterns
    const highSeveritySymptoms = cycleData.dayData.flatMap(day =>
      day.symptoms.filter(s => s.severity && s.severity >= 4)
    );

    if (highSeveritySymptoms.length > 10) {
      warnings.push({
        field: 'symptoms',
        message: 'High number of severe symptoms detected',
        code: 'HIGH_SEVERITY_SYMPTOMS',
        suggestion: 'Consider tracking patterns and discussing with healthcare provider',
      });
    }

    return warnings;
  }

  /**
   * Validate against historical data patterns
   */
  private validateHistoricalConsistency(
    cycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>,
    previousCycles: EncryptedCycleData[]
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (previousCycles.length === 0) return warnings;

    // Calculate average cycle length
    const cycleLengths = this.calculateCycleLengths(previousCycles);
    if (cycleLengths.length > 0) {
      const avgCycleLength =
        cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;

      if (cycleData.expectedNextPeriod) {
        const currentCycleLength = Math.ceil(
          (new Date(cycleData.expectedNextPeriod).getTime() -
            new Date(cycleData.periodStartDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const deviation = Math.abs(currentCycleLength - avgCycleLength);
        if (deviation > 7) {
          warnings.push({
            field: 'expectedNextPeriod',
            message: `Cycle length differs significantly from average (${Math.round(avgCycleLength)} days)`,
            code: 'CYCLE_LENGTH_DEVIATION',
            suggestion:
              'This variation may be normal, but consider tracking factors that might affect your cycle',
          });
        }
      }
    }

    // Check for symptom pattern changes
    const historicalSymptoms = this.getCommonSymptoms(previousCycles);
    const currentSymptoms = new Set(
      cycleData.dayData.flatMap(day => day.symptoms.map(s => s.name))
    );

    const newSymptoms = Array.from(currentSymptoms).filter(
      symptom => !historicalSymptoms.has(symptom)
    );

    if (newSymptoms.length > 3) {
      warnings.push({
        field: 'symptoms',
        message: 'Several new symptoms not seen in recent cycles',
        code: 'NEW_SYMPTOM_PATTERN',
        suggestion: 'Monitor these new symptoms and consider factors that might have changed',
      });
    }

    return warnings;
  }

  /**
   * Helper methods for validation
   */
  private validateBasicStructure(cycleData: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!cycleData.userId) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
        severity: 'critical',
      });
    }

    if (!cycleData.deviceId) {
      errors.push({
        field: 'deviceId',
        message: 'Device ID is required',
        code: 'MISSING_DEVICE_ID',
        severity: 'critical',
      });
    }

    if (typeof cycleData.cycleNumber !== 'number' || cycleData.cycleNumber < 1) {
      errors.push({
        field: 'cycleNumber',
        message: 'Cycle number must be a positive integer',
        code: 'INVALID_CYCLE_NUMBER',
        severity: 'medium',
      });
    }

    if (!Array.isArray(cycleData.dayData)) {
      errors.push({
        field: 'dayData',
        message: 'Day data must be an array',
        code: 'INVALID_DAY_DATA_TYPE',
        severity: 'critical',
      });
    }

    return errors;
  }

  private isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }

  private isFutureDate(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  private isValidFlowIntensity(intensity: FlowIntensity): boolean {
    const validIntensities: FlowIntensity[] = ['none', 'spotting', 'light', 'medium', 'heavy'];
    return validIntensities.includes(intensity);
  }

  private isValidSymptomCategory(category: SymptomCategory): boolean {
    const validCategories: SymptomCategory[] = [
      'mood',
      'physical',
      'energy',
      'sleep',
      'skin',
      'digestive',
      'custom',
    ];
    return validCategories.includes(category);
  }

  private calculateCycleLengths(cycles: EncryptedCycleData[]): number[] {
    const sortedCycles = cycles
      .filter(cycle => cycle.periodStartDate)
      .sort(
        (a, b) => new Date(a.periodStartDate).getTime() - new Date(b.periodStartDate).getTime()
      );

    const lengths: number[] = [];
    for (let i = 1; i < sortedCycles.length; i++) {
      const prevStart = new Date(sortedCycles[i - 1].periodStartDate);
      const currentStart = new Date(sortedCycles[i].periodStartDate);
      const length = Math.ceil(
        (currentStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      lengths.push(length);
    }

    return lengths;
  }

  private getCommonSymptoms(cycles: EncryptedCycleData[]): Set<string> {
    const allSymptoms = cycles.flatMap(cycle =>
      cycle.dayData.flatMap(day => day.symptoms.map(s => s.name))
    );

    // Count occurrences
    const symptomCounts = new Map<string, number>();
    allSymptoms.forEach(symptom => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
    });

    // Return symptoms that appear in at least 2 cycles
    const threshold = Math.max(2, Math.ceil(cycles.length * 0.3));
    return new Set(
      Array.from(symptomCounts.entries())
        .filter(([_, count]) => count >= threshold)
        .map(([symptom, _]) => symptom)
    );
  }
}
