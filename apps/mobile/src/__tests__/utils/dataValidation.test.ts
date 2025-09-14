import { DataValidationService, ValidationContext } from '../../utils/dataValidation';
import type { EncryptedCycleData, PeriodDayData, Symptom } from '@aura/shared-types';

describe('DataValidationService', () => {
  let validationService: DataValidationService;
  let mockContext: ValidationContext;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user-123',
      deviceId: 'test-device-456',
      timezone: 'UTC',
      culturalPreset: 'default',
    };
    validationService = new DataValidationService(mockContext);
  });

  describe('validateCycleData', () => {
    const createValidCycleData = (): Omit<
      EncryptedCycleData,
      'id' | 'createdAt' | 'updatedAt'
    > => ({
      userId: 'test-user-123',
      cycleNumber: 1,
      periodStartDate: '2025-01-01',
      periodEndDate: '2025-01-05',
      expectedNextPeriod: '2025-02-01',
      dayData: [
        {
          date: '2025-01-01',
          flowIntensity: 'medium',
          symptoms: [{ id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 }],
          isPeriodStart: true,
        },
        {
          date: '2025-01-02',
          flowIntensity: 'heavy',
          symptoms: [],
          notes: 'Heavy flow day',
        },
      ],
      version: 1,
      deviceId: 'test-device-456',
      modificationHistory: [],
    });

    it('validates correct cycle data successfully', () => {
      const cycleData = createValidCycleData();
      const result = validationService.validateCycleData(cycleData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing required fields', () => {
      const cycleData = {
        ...createValidCycleData(),
        userId: '',
        cycleNumber: -1,
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'userId',
          code: 'MISSING_USER_ID',
          severity: 'critical',
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'cycleNumber',
          code: 'INVALID_CYCLE_NUMBER',
          severity: 'medium',
        })
      );
    });

    it('validates date relationships', () => {
      const cycleData = {
        ...createValidCycleData(),
        periodStartDate: '2025-01-05',
        periodEndDate: '2025-01-01', // End before start
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'periodEndDate',
          code: 'INVALID_DATE_RANGE',
          severity: 'critical',
        })
      );
    });

    it('detects unusually long periods', () => {
      const cycleData = {
        ...createValidCycleData(),
        periodStartDate: '2025-01-01',
        periodEndDate: '2025-01-20', // 19 days
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'periodEndDate',
          code: 'UNUSUALLY_LONG_PERIOD',
          severity: 'medium',
        })
      );
    });

    it('validates future dates are not allowed', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const cycleData = {
        ...createValidCycleData(),
        periodStartDate: futureDateString,
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'periodStartDate',
          code: 'FUTURE_PERIOD_START',
          severity: 'high',
        })
      );
    });

    it('validates cycle length within reasonable range', () => {
      const cycleData = {
        ...createValidCycleData(),
        periodStartDate: '2025-01-01',
        expectedNextPeriod: '2025-01-10', // 9 days - too short
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'expectedNextPeriod',
          code: 'ATYPICAL_CYCLE_LENGTH',
          severity: 'low',
        })
      );
    });

    it('detects period data inconsistencies', () => {
      const cycleData = {
        ...createValidCycleData(),
        periodStartDate: '2025-01-01',
        dayData: [
          {
            date: '2025-01-03', // First flow day doesn't match declared start
            flowIntensity: 'medium',
            symptoms: [],
            isPeriodStart: true,
          },
        ] as PeriodDayData[],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'consistency',
          code: 'PERIOD_START_MISMATCH',
          severity: 'medium',
        })
      );
    });
  });

  describe('validatePeriodDay', () => {
    it('validates correct period day data', () => {
      const dayData: PeriodDayData = {
        date: '2025-01-01',
        flowIntensity: 'medium',
        symptoms: [{ id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 }],
      };

      const result = validationService.validatePeriodDay(dayData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects invalid date formats', () => {
      const dayData: PeriodDayData = {
        date: 'invalid-date',
        flowIntensity: 'medium',
        symptoms: [],
      };

      const result = validationService.validatePeriodDay(dayData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'date',
          code: 'INVALID_DATE_FORMAT',
          severity: 'critical',
        })
      );
    });

    it('prevents future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const dayData: PeriodDayData = {
        date: futureDateString,
        flowIntensity: 'medium',
        symptoms: [],
      };

      const result = validationService.validatePeriodDay(dayData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'date',
          code: 'FUTURE_DATE_NOT_ALLOWED',
          severity: 'high',
        })
      );
    });

    it('validates flow intensity values', () => {
      const dayData: PeriodDayData = {
        date: '2025-01-01',
        flowIntensity: 'invalid' as any,
        symptoms: [],
      };

      const result = validationService.validatePeriodDay(dayData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'flowIntensity',
          code: 'INVALID_FLOW_INTENSITY',
          severity: 'medium',
        })
      );
    });

    it('detects inconsistent flow and symptoms', () => {
      const dayData: PeriodDayData = {
        date: '2025-01-01',
        flowIntensity: 'none',
        symptoms: [{ id: 'symptom-1', name: 'Heavy Flow', category: 'physical', severity: 3 }],
      };

      const result = validationService.validatePeriodDay(dayData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'consistency',
          code: 'INCONSISTENT_FLOW_SYMPTOMS',
        })
      );
    });
  });

  describe('validateSymptoms', () => {
    it('validates correct symptoms', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 },
        { id: 'symptom-2', name: 'Headache', category: 'physical', severity: 4 },
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toHaveLength(0);
    });

    it('detects missing symptom fields', () => {
      const symptoms: Symptom[] = [{ id: '', name: '', category: 'physical', severity: 3 } as any];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[0].id',
          code: 'MISSING_SYMPTOM_ID',
          severity: 'critical',
        })
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[0].name',
          code: 'MISSING_SYMPTOM_NAME',
          severity: 'critical',
        })
      );
    });

    it('validates symptom categories', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Test', category: 'invalid' as any, severity: 3 },
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[0].category',
          code: 'INVALID_SYMPTOM_CATEGORY',
          severity: 'medium',
        })
      );
    });

    it('validates severity range', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Test', category: 'physical', severity: 0 },
        { id: 'symptom-2', name: 'Test2', category: 'physical', severity: 6 },
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[0].severity',
          code: 'INVALID_SYMPTOM_SEVERITY',
          severity: 'medium',
        })
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[1].severity',
          code: 'INVALID_SYMPTOM_SEVERITY',
          severity: 'medium',
        })
      );
    });

    it('validates custom symptom names', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'A', category: 'custom', severity: 3 }, // Too short
        { id: 'symptom-2', name: 'A'.repeat(60), category: 'custom', severity: 3 }, // Too long
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[0].name',
          code: 'CUSTOM_SYMPTOM_NAME_TOO_SHORT',
          severity: 'medium',
        })
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms[1].name',
          code: 'CUSTOM_SYMPTOM_NAME_TOO_LONG',
          severity: 'medium',
        })
      );
    });

    it('detects duplicate symptoms', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 },
        { id: 'symptom-2', name: 'CRAMPS', category: 'physical', severity: 4 }, // Duplicate (case insensitive)
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'symptoms',
          code: 'DUPLICATE_SYMPTOMS',
          severity: 'medium',
        })
      );
    });
  });

  describe('business rules validation', () => {
    it('warns about extended heavy flow periods', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: Array.from({ length: 8 }, (_, i) => ({
          date: `2025-01-${String(i + 1).padStart(2, '0')}`,
          flowIntensity: 'heavy' as const,
          symptoms: [],
        })),
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'dayData',
          code: 'EXTENDED_HEAVY_FLOW',
          suggestion: 'Consider consulting with a healthcare provider',
        })
      );
    });

    it('warns about high severity symptoms', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: Array.from({ length: 5 }, (_, i) => ({
          date: `2025-01-${String(i + 1).padStart(2, '0')}`,
          flowIntensity: 'medium' as const,
          symptoms: [
            {
              id: `symptom-${i}-1`,
              name: `Severe Pain ${i}`,
              category: 'physical' as const,
              severity: 4,
            },
            {
              id: `symptom-${i}-2`,
              name: `Intense Cramps ${i}`,
              category: 'physical' as const,
              severity: 5,
            },
          ],
        })) as PeriodDayData[],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'symptoms',
          code: 'HIGH_SEVERITY_SYMPTOMS',
          suggestion: 'Consider tracking patterns and discussing with healthcare provider',
        })
      );
    });
  });

  describe('historical consistency validation', () => {
    const mockPreviousCycles: EncryptedCycleData[] = [
      {
        id: 'cycle-1',
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2024-12-01',
        periodEndDate: '2024-12-05',
        expectedNextPeriod: '2024-12-29',
        dayData: [
          {
            date: '2024-12-01',
            flowIntensity: 'medium',
            symptoms: [{ id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 }],
          },
        ],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
        modificationHistory: [],
      },
      {
        id: 'cycle-2',
        userId: 'test-user',
        cycleNumber: 2,
        periodStartDate: '2024-12-29',
        periodEndDate: '2025-01-02',
        dayData: [
          {
            date: '2024-12-29',
            flowIntensity: 'light',
            symptoms: [{ id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 2 }],
          },
        ],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2024-12-29T00:00:00Z',
        updatedAt: '2024-12-29T00:00:00Z',
        modificationHistory: [],
      },
    ];

    beforeEach(() => {
      mockContext.previousCycles = mockPreviousCycles;
      validationService = new DataValidationService(mockContext);
    });

    it('warns about cycle length deviations', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 3,
        periodStartDate: '2025-01-27',
        expectedNextPeriod: '2025-02-10', // 14 days vs avg 28 days
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'expectedNextPeriod',
          code: 'CYCLE_LENGTH_DEVIATION',
        })
      );
    });

    it('warns about new symptom patterns', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 3,
        periodStartDate: '2025-01-27',
        dayData: [
          {
            date: '2025-01-27',
            flowIntensity: 'medium',
            symptoms: [
              { id: 'new-1', name: 'New Symptom 1', category: 'mood', severity: 3 },
              { id: 'new-2', name: 'New Symptom 2', category: 'energy', severity: 3 },
              { id: 'new-3', name: 'New Symptom 3', category: 'sleep', severity: 3 },
              { id: 'new-4', name: 'New Symptom 4', category: 'skin', severity: 3 },
            ],
          },
        ] as PeriodDayData[],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'symptoms',
          code: 'NEW_SYMPTOM_PATTERN',
        })
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty day data array', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      // Should not crash and should validate other fields
      expect(result.isValid).toBe(true);
    });

    it('handles malformed day data structure', () => {
      const cycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: 'not-an-array' as any,
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'dayData',
          code: 'INVALID_DAY_DATA_TYPE',
          severity: 'critical',
        })
      );
    });

    it('handles symptoms without severity', () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Cramps', category: 'physical' }, // No severity
      ];

      const errors = validationService.validateSymptoms(symptoms);

      expect(errors).toHaveLength(0); // Should be valid without severity
    });
  });
});
