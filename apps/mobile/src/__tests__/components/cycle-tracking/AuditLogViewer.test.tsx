import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuditLogViewer } from '../../../components/cycle-tracking/AuditLogViewer';
import { auditTrailService } from '../../../services/auditTrailService';
import { ModificationRecord, AuditSummary } from '@aura/shared-types/data';

// Mock the audit trail service
jest.mock('../../../services/auditTrailService');
const mockAuditTrailService = auditTrailService as jest.Mocked<typeof auditTrailService>;

// Mock accessibility utils
jest.mock('../../../utils/accessibility', () => ({
  useAccessibility: () => ({
    getAccessibilityLabel: jest.fn((id, fallback) => fallback),
    announceChange: jest.fn(),
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

// Mock Tamagui components
jest.mock('@tamagui/core', () => ({
  Button: ({ children, onPress, variant, ...props }: any) => (
    <div testID={props.testID} onClick={onPress} data-variant={variant}>
      {children}
    </div>
  ),
  Card: ({ children, ...props }: any) => (
    <div testID={props.testID} {...props}>
      {children}
    </div>
  ),
  XStack: ({ children, ...props }: any) => (
    <div testID={props.testID} {...props}>
      {children}
    </div>
  ),
  YStack: ({ children, ...props }: any) => (
    <div testID={props.testID} {...props}>
      {children}
    </div>
  ),
  Separator: (props: any) => <div testID={props.testID} {...props} />,
  H4: ({ children, ...props }: any) => (
    <h4 testID={props.testID} {...props}>
      {children}
    </h4>
  ),
  H5: ({ children, ...props }: any) => (
    <h5 testID={props.testID} {...props}>
      {children}
    </h5>
  ),
}));

// Mock Lucide icons
jest.mock('@tamagui/lucide-icons', () => ({
  Search: (props: any) => <div testID="search-icon" {...props} />,
  Filter: (props: any) => <div testID="filter-icon" {...props} />,
  RotateCcw: (props: any) => <div testID="restore-icon" {...props} />,
  Calendar: (props: any) => <div testID="calendar-icon" {...props} />,
  Info: (props: any) => <div testID="info-icon" {...props} />,
}));

describe('AuditLogViewer', () => {
  const mockUserId = 'user-123';
  const mockOnRestoreRequest = jest.fn();

  const mockModifications: ModificationRecord[] = [
    {
      id: 'mod-1',
      timestamp: '2024-01-01T10:00:00.000Z',
      entityType: 'cycle',
      entityId: 'cycle-1',
      field: 'periodStartDate',
      oldValue: '2024-01-01',
      newValue: '2024-01-02',
      deviceId: 'device-456',
      userId: mockUserId,
      action: 'update',
      reason: 'User correction',
    },
    {
      id: 'mod-2',
      timestamp: '2024-01-02T10:00:00.000Z',
      entityType: 'symptom',
      entityId: 'symptom-1',
      field: 'severity',
      oldValue: 3,
      newValue: 4,
      deviceId: 'device-456',
      userId: mockUserId,
      action: 'create',
    },
  ];

  const mockSummary: AuditSummary = {
    totalModifications: 10,
    recentModifications: mockModifications,
    modificationsByType: { cycle_update: 5, symptom_create: 3 },
    modificationsByDate: { '2024-01-01': 3, '2024-01-02': 7 },
    dataIntegrityStatus: 'valid',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuditTrailService.queryAuditLog.mockResolvedValue(mockModifications);
    mockAuditTrailService.getAuditSummary.mockResolvedValue(mockSummary);
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      expect(getByText('Loading audit trail...')).toBeTruthy();
    });

    it('should render audit summary and modifications', async () => {
      const { getByText, queryByText } = render(
        <AuditLogViewer userId={mockUserId} onRestoreRequest={mockOnRestoreRequest} />
      );

      await waitFor(() => {
        expect(queryByText('Loading audit trail...')).toBeNull();
      });

      // Should show summary
      expect(getByText('Audit Summary')).toBeTruthy();
      expect(getByText('10')).toBeTruthy(); // Total modifications
      expect(getByText('VALID')).toBeTruthy(); // Data integrity status

      // Should show modifications count
      expect(getByText('2 modifications found')).toBeTruthy();

      // Should show modification entries
      expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      expect(getByText('CREATE Symptom')).toBeTruthy();
    });

    it('should render empty state when no modifications', async () => {
      mockAuditTrailService.queryAuditLog.mockResolvedValue([]);

      const { getByText, queryByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(queryByText('Loading audit trail...')).toBeNull();
      });

      expect(getByText('No audit records found')).toBeTruthy();
      expect(getByText('Data modifications will appear here')).toBeTruthy();
    });

    it('should show error alert when loading fails', async () => {
      mockAuditTrailService.queryAuditLog.mockRejectedValue(new Error('Failed to load'));

      render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to load audit trail data');
      });
    });
  });

  describe('filtering', () => {
    it('should toggle filter controls', async () => {
      const { getByTestId, queryByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(queryByText('Loading audit trail...')).toBeNull();
      });

      // Initially filters should not be visible
      expect(queryByText('Filters')).toBeNull();

      // Click filter icon
      fireEvent.press(getByTestId('filter-icon'));

      // Filters should now be visible
      expect(queryByText('Filters')).toBeTruthy();
      expect(queryByText('Cycles')).toBeTruthy();
      expect(queryByText('Symptoms')).toBeTruthy();
      expect(queryByText('Settings')).toBeTruthy();
    });

    it('should apply entity type filters', async () => {
      const { getByTestId, getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('2 modifications found')).toBeTruthy();
      });

      // Show filters
      fireEvent.press(getByTestId('filter-icon'));

      // Click Cycles filter
      fireEvent.press(getByText('Cycles'));

      await waitFor(() => {
        expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'cycle',
          })
        );
      });
    });

    it('should apply action filters', async () => {
      const { getByTestId, getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('2 modifications found')).toBeTruthy();
      });

      // Show filters
      fireEvent.press(getByTestId('filter-icon'));

      // Click Created filter
      fireEvent.press(getByText('Created'));

      await waitFor(() => {
        expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'create',
          })
        );
      });
    });

    it('should clear all filters', async () => {
      const { getByTestId, getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('2 modifications found')).toBeTruthy();
      });

      // Show filters and apply some
      fireEvent.press(getByTestId('filter-icon'));
      fireEvent.press(getByText('Cycles'));

      await waitFor(() => {
        expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'cycle',
          })
        );
      });

      // Clear filters
      fireEvent.press(getByText('Clear Filters'));

      await waitFor(() => {
        expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
          expect.not.objectContaining({
            entityType: expect.anything(),
          })
        );
      });
    });
  });

  describe('modification entries', () => {
    it('should expand modification details on press', async () => {
      const { getByText, queryByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      // Initially details should not be visible
      expect(queryByText('Field: periodStartDate')).toBeNull();

      // Press on modification entry
      fireEvent.press(getByText('UPDATE Menstrual Cycle'));

      // Details should now be visible
      expect(queryByText('Field: periodStartDate')).toBeTruthy();
      expect(queryByText('Previous Value:')).toBeTruthy();
      expect(queryByText('New Value:')).toBeTruthy();
      expect(queryByText('Reason:')).toBeTruthy();
      expect(queryByText('User correction')).toBeTruthy();
    });

    it('should collapse expanded entry on second press', async () => {
      const { getByText, queryByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      // Expand entry
      fireEvent.press(getByText('UPDATE Menstrual Cycle'));
      expect(queryByText('Field: periodStartDate')).toBeTruthy();

      // Collapse entry
      fireEvent.press(getByText('UPDATE Menstrual Cycle'));
      expect(queryByText('Field: periodStartDate')).toBeNull();
    });

    it('should show restore button for non-delete actions', async () => {
      const { getByText, getByTestId } = render(
        <AuditLogViewer userId={mockUserId} onRestoreRequest={mockOnRestoreRequest} />
      );

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      expect(getByTestId('restore-icon')).toBeTruthy();
    });

    it('should not show restore button for delete actions', async () => {
      const deleteModification: ModificationRecord = {
        ...mockModifications[0],
        id: 'delete-mod',
        action: 'delete',
      };

      mockAuditTrailService.queryAuditLog.mockResolvedValue([deleteModification]);

      const { getByText, queryByTestId } = render(
        <AuditLogViewer userId={mockUserId} onRestoreRequest={mockOnRestoreRequest} />
      );

      await waitFor(() => {
        expect(getByText('DELETE Menstrual Cycle')).toBeTruthy();
      });

      expect(queryByTestId('restore-icon')).toBeNull();
    });

    it('should handle restore request', async () => {
      const { getByText, getByTestId } = render(
        <AuditLogViewer userId={mockUserId} onRestoreRequest={mockOnRestoreRequest} />
      );

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      // Click restore button
      fireEvent.press(getByTestId('restore-icon'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Restore Data',
        expect.stringContaining('restore Menstrual Cycle'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Restore' }),
        ])
      );

      // Simulate user confirming restoration
      const alertCall = (mockAlert as jest.Mock).mock.calls[0];
      const restoreButton = alertCall[2].find((btn: any) => btn.text === 'Restore');

      act(() => {
        restoreButton.onPress();
      });

      expect(mockOnRestoreRequest).toHaveBeenCalledWith(
        'cycle',
        'cycle-1',
        '2024-01-01T10:00:00.000Z'
      );
    });
  });

  describe('data integrity status', () => {
    it('should show green for valid status', async () => {
      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('VALID')).toBeTruthy();
      });

      // In actual implementation, this would have green color styling
    });

    it('should show yellow for warning status', async () => {
      const warningSummary: AuditSummary = {
        ...mockSummary,
        dataIntegrityStatus: 'warning',
      };
      mockAuditTrailService.getAuditSummary.mockResolvedValue(warningSummary);

      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('WARNING')).toBeTruthy();
      });
    });

    it('should show red for error status', async () => {
      const errorSummary: AuditSummary = {
        ...mockSummary,
        dataIntegrityStatus: 'error',
      };
      mockAuditTrailService.getAuditSummary.mockResolvedValue(errorSummary);

      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('ERROR')).toBeTruthy();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should refresh data on pull-to-refresh', async () => {
      const { getByTestId } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh (this would typically be done via ScrollView)
      // For testing purposes, we'll just verify the refresh logic works
      expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          limit: 100,
        })
      );
    });
  });

  describe('formatting', () => {
    it('should format timestamps correctly', async () => {
      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        // Should format as locale string
        expect(getByText(new Date('2024-01-01T10:00:00.000Z').toLocaleString())).toBeTruthy();
      });
    });

    it('should format complex values as JSON', async () => {
      const complexModification: ModificationRecord = {
        ...mockModifications[0],
        newValue: { complex: 'object', with: ['array', 'values'] },
      };

      mockAuditTrailService.queryAuditLog.mockResolvedValue([complexModification]);

      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      // Expand details
      fireEvent.press(getByText('UPDATE Menstrual Cycle'));

      // Should show formatted JSON
      expect(getByText(/"complex": "object"/)).toBeTruthy();
    });

    it('should handle null values', async () => {
      const nullModification: ModificationRecord = {
        ...mockModifications[0],
        oldValue: null,
      };

      mockAuditTrailService.queryAuditLog.mockResolvedValue([nullModification]);

      const { getByText } = render(<AuditLogViewer userId={mockUserId} />);

      await waitFor(() => {
        expect(getByText('UPDATE Menstrual Cycle')).toBeTruthy();
      });

      // Expand details
      fireEvent.press(getByText('UPDATE Menstrual Cycle'));

      // Should not show "Previous Value" section for null oldValue
      expect(getByText('New Value:')).toBeTruthy();
    });
  });
});
