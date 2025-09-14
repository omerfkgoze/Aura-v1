import { DateValidationService } from '../../utils/dateValidation';
import { PeriodDayData, FlowIntensity } from '@aura/shared-types';

describe('DateValidationService', () => {
  const mockExistingData: PeriodDayData[] = [
    {
      date: '2024-01-01',
      flowIntensity: 'medium' as FlowIntensity,
      symptoms: [],
      isPeriodStart: true,
    },
    {
      date: '2024-01-02',
      flowIntensity: 'heavy' as FlowIntensity,
      symptoms: [],
    },
    {
      date: '2024-01-05',
      flowIntensity: 'light' as FlowIntensity,
      symptoms: [],
      isPeriodEnd: true,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateDate', () => {
    it('validates a correct date', () => {
      const result = DateValidationService.validateDate('2024-01-15');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid date format', () => {
      const result = DateValidationService.validateDate('invalid-date');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format');
    });

    it('rejects future dates by default', () => {
      const futureDate = '2024-01-20';
      const result = DateValidationService.validateDate(futureDate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Future dates are not allowed');
    });

    it('allows future dates when configured', () => {
      const futureDate = '2024-01-20';
      const result = DateValidationService.validateDate(futureDate, [], { allowFutureDates: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('warns about existing data', () => {
      const result = DateValidationService.validateDate('2024-01-01', mockExistingData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Date already has existing data - will be updated');
    });

    it('warns about dates more than 1 year ago', () => {
      const oldDate = '2022-01-15';
      const result = DateValidationService.validateDate(oldDate);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Date is more than 1 year ago');
    });
  });

  describe('validatePeriodRange', () => {
    it('validates a correct period range', () => {
      const result = DateValidationService.validatePeriodRange('2024-01-10', '2024-01-15');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects end date before start date', () => {
      const result = DateValidationService.validatePeriodRange('2024-01-15', '2024-01-10');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period end date must be after start date');
    });

    it('rejects equal start and end dates', () => {
      const result = DateValidationService.validatePeriodRange('2024-01-15', '2024-01-15');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period end date must be after start date');
    });

    it('rejects periods longer than 14 days', () => {
      const result = DateValidationService.validatePeriodRange(
        '2024-01-01',
        '2024-01-20' // 19 days
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period length cannot exceed 14 days');
    });

    it('warns about long periods', () => {
      const result = DateValidationService.validatePeriodRange(
        '2024-01-01',
        '2024-01-12' // 11 days
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('longer than typical'))).toBe(true);
    });

    it('rejects invalid date formats in range', () => {
      const result1 = DateValidationService.validatePeriodRange('invalid-date', '2024-01-15');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Invalid date format');

      const result2 = DateValidationService.validatePeriodRange('2024-01-10', 'invalid-date');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Invalid date format');
    });
  });

  describe('validateCycleConsistency', () => {
    it('validates first cycle without existing data', () => {
      const result = DateValidationService.validateCycleConsistency('2024-01-15', []);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates normal cycle length', () => {
      const existingCycles: PeriodDayData[] = [
        {
          date: '2023-12-18', // 28 days ago
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const result = DateValidationService.validateCycleConsistency('2024-01-15', existingCycles);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about short cycles', () => {
      const existingCycles: PeriodDayData[] = [
        {
          date: '2024-01-05', // 10 days ago
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const result = DateValidationService.validateCycleConsistency('2024-01-15', existingCycles);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('shorter than typical'))).toBe(true);
    });

    it('warns about long cycles', () => {
      const existingCycles: PeriodDayData[] = [
        {
          date: '2023-12-05', // 41 days ago
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const result = DateValidationService.validateCycleConsistency('2024-01-15', existingCycles);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('longer than typical'))).toBe(true);
    });

    it('rejects extremely short cycles', () => {
      const existingCycles: PeriodDayData[] = [
        {
          date: '2024-01-10', // 5 days ago
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const result = DateValidationService.validateCycleConsistency('2024-01-15', existingCycles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cycle length cannot be less than 14 days');
    });

    it('warns about very long cycles', () => {
      const existingCycles: PeriodDayData[] = [
        {
          date: '2023-10-15', // ~92 days ago
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const result = DateValidationService.validateCycleConsistency('2024-01-15', existingCycles);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('missed logging'))).toBe(true);
    });
  });

  describe('calculatePeriodDuration', () => {
    it('calculates correct duration', () => {
      const duration = DateValidationService.calculatePeriodDuration('2024-01-10', '2024-01-15');

      expect(duration).toBe(6); // 6 days including both start and end
    });

    it('returns 0 for missing end date', () => {
      const duration = DateValidationService.calculatePeriodDuration('2024-01-10');
      expect(duration).toBe(0);
    });

    it('handles same day period', () => {
      const duration = DateValidationService.calculatePeriodDuration('2024-01-15', '2024-01-15');

      expect(duration).toBe(1);
    });
  });

  describe('generateDateRange', () => {
    it('generates correct date range', () => {
      const dates = DateValidationService.generateDateRange('2024-01-10', '2024-01-12');

      expect(dates).toEqual(['2024-01-10', '2024-01-11', '2024-01-12']);
    });

    it('handles single day range', () => {
      const dates = DateValidationService.generateDateRange('2024-01-15', '2024-01-15');

      expect(dates).toEqual(['2024-01-15']);
    });
  });

  describe('predictNextPeriod', () => {
    it('returns null with insufficient data', () => {
      const result = DateValidationService.predictNextPeriod([]);
      expect(result).toBeNull();

      const oneStart: PeriodDayData[] = [
        {
          date: '2024-01-01',
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];
      const result2 = DateValidationService.predictNextPeriod(oneStart);
      expect(result2).toBeNull();
    });

    it('predicts next period with regular cycles', () => {
      const regularCycles: PeriodDayData[] = [
        {
          date: '2023-12-01',
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
        {
          date: '2023-12-29', // 28 days later
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
        {
          date: '2024-01-26', // 28 days later
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const prediction = DateValidationService.predictNextPeriod(regularCycles);
      expect(prediction).toBe('2024-02-23'); // 28 days after last start
    });

    it('handles irregular cycles by averaging', () => {
      const irregularCycles: PeriodDayData[] = [
        {
          date: '2023-12-01',
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
        {
          date: '2023-12-26', // 25 days later
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
        {
          date: '2024-01-27', // 32 days later
          flowIntensity: 'medium' as FlowIntensity,
          symptoms: [],
          isPeriodStart: true,
        },
      ];

      const prediction = DateValidationService.predictNextPeriod(irregularCycles);
      // Average: (25 + 32) / 2 = 28.5 → 29 days
      expect(prediction).toBe('2024-02-25');
    });
  });
});
