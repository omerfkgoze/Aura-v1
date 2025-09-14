import React, { useState, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  Progress,
  Input,
  Select,
  Adapt,
  Sheet,
  AlertDialog,
  Separator,
  Spinner,
} from '@tamagui/core';
import { Calendar, Upload, Check, X, AlertCircle, Plus, Minus } from '@tamagui/lucide-icons';
import type { EncryptedCycleData, PeriodDayData, FlowIntensity } from '@aura/shared-types';
import { DataValidationService, ValidationResult } from '../../utils/dataValidation';
import { useEncryptedStorage } from '../../hooks/useEncryptedStorage';
import { useAccessibility } from '../../utils/accessibility';

export interface BatchCycleEntry {
  id: string;
  periodStart: string;
  periodEnd?: string;
  cycleLength?: number;
  averageFlow?: FlowIntensity;
  notes?: string;
  validated?: ValidationResult;
}

export interface BatchEntryProgress {
  total: number;
  completed: number;
  errors: number;
  current?: string;
}

interface BatchDataEntryProps {
  userId: string;
  deviceId: string;
  onBatchComplete?: (results: { success: string[]; failed: string[] }) => void;
  onCancel?: () => void;
  stealthMode?: boolean;
  testID?: string;
}

export const BatchDataEntry: React.FC<BatchDataEntryProps> = ({
  userId,
  deviceId,
  onBatchComplete,
  onCancel,
  stealthMode = false,
  testID = 'batch-data-entry',
}) => {
  const [entries, setEntries] = useState<BatchCycleEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchEntryProgress>({
    total: 0,
    completed: 0,
    errors: 0,
  });
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importMode, setImportMode] = useState<'manual' | 'csv'>('manual');

  const { getAccessibilityLabel, getAccessibilityHint } = useAccessibility();
  const encryptedStorage = useEncryptedStorage({
    userId,
    deviceId,
    enableAAD: true,
    enableAuditTrail: true,
    autoInitialize: true,
  });

  const validationService = useMemo(
    () =>
      new DataValidationService({
        userId,
        deviceId,
        enableAAD: true,
        enableAuditTrail: true,
      }),
    [userId, deviceId]
  );

  // Add new empty entry
  const addEntry = () => {
    const newEntry: BatchCycleEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      periodStart: '',
      periodEnd: '',
      cycleLength: 28,
      averageFlow: 'medium',
    };
    setEntries(prev => [...prev, newEntry]);
  };

  // Remove entry
  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Update entry field
  const updateEntry = (id: string, field: keyof BatchCycleEntry, value: any) => {
    setEntries(prev => prev.map(entry => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  // Validate all entries
  const validateEntries = async () => {
    const results: ValidationResult[] = [];

    for (const entry of entries) {
      if (!entry.periodStart) {
        results.push({
          isValid: false,
          errors: [
            {
              field: 'periodStart',
              message: 'Period start date is required',
              code: 'MISSING_PERIOD_START',
              severity: 'critical',
            },
          ],
          warnings: [],
        });
        continue;
      }

      // Create cycle data for validation
      const cycleData = {
        userId,
        cycleNumber: entries.indexOf(entry) + 1,
        periodStartDate: entry.periodStart,
        periodEndDate: entry.periodEnd,
        expectedNextPeriod: entry.cycleLength
          ? new Date(
              new Date(entry.periodStart).getTime() + entry.cycleLength * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split('T')[0]
          : undefined,
        dayData: entry.periodEnd ? generateDayData(entry) : [],
        version: 1,
        deviceId,
        modificationHistory: [],
      };

      const result = validationService.validateCycleData(cycleData);
      results.push(result);
    }

    setValidationResults(results);

    // Update entries with validation results
    setEntries(prev =>
      prev.map((entry, index) => ({
        ...entry,
        validated: results[index],
      }))
    );

    return results;
  };

  // Generate day data from batch entry
  const generateDayData = (entry: BatchCycleEntry): PeriodDayData[] => {
    if (!entry.periodStart || !entry.periodEnd) return [];

    const startDate = new Date(entry.periodStart);
    const endDate = new Date(entry.periodEnd);
    const dayData: PeriodDayData[] = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dayData.push({
        date: date.toISOString().split('T')[0],
        flowIntensity: entry.averageFlow || 'medium',
        symptoms: [],
        isPeriodStart: date.getTime() === startDate.getTime(),
        isPeriodEnd: date.getTime() === endDate.getTime(),
      });
    }

    return dayData;
  };

  // Process batch entries
  const processBatchEntries = async () => {
    if (!encryptedStorage.isInitialized) {
      Alert.alert('Error', 'Encrypted storage not initialized');
      return;
    }

    setIsProcessing(true);
    setProgress({ total: entries.length, completed: 0, errors: 0 });

    const results = { success: [] as string[], failed: [] as string[] };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      setProgress(prev => ({
        ...prev,
        current: `Processing cycle ${i + 1}/${entries.length}`,
      }));

      try {
        const cycleData = {
          userId,
          cycleNumber: i + 1,
          periodStartDate: entry.periodStart,
          periodEndDate: entry.periodEnd,
          expectedNextPeriod: entry.cycleLength
            ? new Date(
                new Date(entry.periodStart).getTime() + entry.cycleLength * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split('T')[0]
            : undefined,
          dayData: generateDayData(entry),
          version: 1,
          deviceId,
          modificationHistory: [],
        };

        const recordId = await encryptedStorage.storeCycleData(cycleData);
        results.success.push(recordId);

        setProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      } catch (error) {
        console.error(`Failed to process entry ${entry.id}:`, error);
        results.failed.push(entry.id);

        setProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          errors: prev.errors + 1,
        }));
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsProcessing(false);

    if (onBatchComplete) {
      onBatchComplete(results);
    }
  };

  // Handle validation before processing
  const handleProcessBatch = async () => {
    if (entries.length === 0) {
      Alert.alert('No Data', 'Please add at least one cycle entry');
      return;
    }

    const results = await validateEntries();
    const hasErrors = results.some(result => !result.isValid);
    const hasWarnings = results.some(result => result.warnings.length > 0);

    if (hasErrors || hasWarnings) {
      setShowValidationDialog(true);
    } else {
      await processBatchEntries();
    }
  };

  // CSV Import placeholder
  const handleCSVImport = () => {
    Alert.alert(
      'CSV Import',
      'CSV import functionality will be implemented in future version.\n\nExpected format:\nperiod_start,period_end,cycle_length,notes',
      [{ text: 'OK' }]
    );
  };

  const validEntries = entries.filter(entry => entry.periodStart);
  const hasValidationErrors = validationResults.some(result => !result.isValid);
  const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);

  return (
    <YStack space="$4" testID={testID}>
      {/* Header */}
      <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$background'}>
        <YStack space="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$6" fontWeight="600">
              Batch Data Entry
            </Text>
            <XStack space="$2">
              <Select value={importMode} onValueChange={setImportMode} disabled={isProcessing}>
                <Select.Trigger width={120}>
                  <Select.Value />
                </Select.Trigger>

                <Adapt when="sm" platform="touch">
                  <Sheet modal dismissOnSnapToBottom>
                    <Sheet.Frame>
                      <Sheet.ScrollView>
                        <Adapt.Contents />
                      </Sheet.ScrollView>
                    </Sheet.Frame>
                    <Sheet.Overlay />
                  </Sheet>
                </Adapt>

                <Select.Content>
                  <Select.Item index={0} value="manual">
                    <Select.ItemText>Manual Entry</Select.ItemText>
                  </Select.Item>
                  <Select.Item index={1} value="csv">
                    <Select.ItemText>CSV Import</Select.ItemText>
                  </Select.Item>
                </Select.Content>
              </Select>
            </XStack>
          </XStack>

          <Text fontSize="$3" color="$gray10">
            Add multiple menstrual cycles at once for historical data or bulk entry
          </Text>
        </YStack>
      </Card>

      {/* Import Mode Content */}
      {importMode === 'csv' ? (
        <Card padding="$4">
          <YStack space="$3" alignItems="center">
            <Upload size="$4" color="$blue10" />
            <Text fontSize="$5" fontWeight="500">
              CSV Import
            </Text>
            <Text fontSize="$3" color="$gray10" textAlign="center">
              Import cycle data from a CSV file
            </Text>
            <Button
              size="$4"
              onPress={handleCSVImport}
              backgroundColor={stealthMode ? '$gray8' : '$blue9'}
              disabled={isProcessing}
              testID={`${testID}-csv-import`}
            >
              <Upload size="$1" />
              <Text>Choose CSV File</Text>
            </Button>
          </YStack>
        </Card>
      ) : (
        <>
          {/* Manual Entry */}
          <YStack space="$3">
            {entries.map((entry, index) => (
              <Card
                key={entry.id}
                padding="$4"
                backgroundColor={
                  entry.validated?.isValid === false
                    ? '$red1'
                    : entry.validated?.warnings.length
                      ? '$yellow1'
                      : stealthMode
                        ? '$gray2'
                        : '$background'
                }
                borderColor={
                  entry.validated?.isValid === false
                    ? '$red6'
                    : entry.validated?.warnings.length
                      ? '$yellow6'
                      : '$borderColor'
                }
                borderWidth={entry.validated ? 2 : 1}
                testID={`${testID}-entry-${index}`}
              >
                <YStack space="$3">
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize="$4" fontWeight="500">
                      Cycle {index + 1}
                    </Text>
                    <XStack alignItems="center" space="$2">
                      {entry.validated?.isValid === false && (
                        <AlertCircle size="$1" color="$red10" />
                      )}
                      {entry.validated?.isValid && entry.validated.warnings.length > 0 && (
                        <AlertCircle size="$1" color="$yellow10" />
                      )}
                      <Button
                        size="$2"
                        variant="outlined"
                        onPress={() => removeEntry(entry.id)}
                        disabled={isProcessing}
                        borderColor="$red8"
                        testID={`${testID}-remove-${index}`}
                      >
                        <X size="$1" color="$red10" />
                      </Button>
                    </XStack>
                  </XStack>

                  <XStack space="$3" flexWrap="wrap">
                    <YStack flex={1} minWidth={150}>
                      <Text fontSize="$3" color="$gray10">
                        Period Start *
                      </Text>
                      <Input
                        value={entry.periodStart}
                        onChangeText={value => updateEntry(entry.id, 'periodStart', value)}
                        placeholder="YYYY-MM-DD"
                        disabled={isProcessing}
                        testID={`${testID}-period-start-${index}`}
                      />
                    </YStack>

                    <YStack flex={1} minWidth={150}>
                      <Text fontSize="$3" color="$gray10">
                        Period End
                      </Text>
                      <Input
                        value={entry.periodEnd || ''}
                        onChangeText={value => updateEntry(entry.id, 'periodEnd', value)}
                        placeholder="YYYY-MM-DD"
                        disabled={isProcessing}
                        testID={`${testID}-period-end-${index}`}
                      />
                    </YStack>
                  </XStack>

                  <XStack space="$3" flexWrap="wrap">
                    <YStack flex={1} minWidth={100}>
                      <Text fontSize="$3" color="$gray10">
                        Cycle Length (days)
                      </Text>
                      <Input
                        value={entry.cycleLength?.toString() || '28'}
                        onChangeText={value =>
                          updateEntry(entry.id, 'cycleLength', parseInt(value) || 28)
                        }
                        keyboardType="numeric"
                        disabled={isProcessing}
                        testID={`${testID}-cycle-length-${index}`}
                      />
                    </YStack>

                    <YStack flex={1} minWidth={120}>
                      <Text fontSize="$3" color="$gray10">
                        Average Flow
                      </Text>
                      <Select
                        value={entry.averageFlow || 'medium'}
                        onValueChange={value => updateEntry(entry.id, 'averageFlow', value)}
                        disabled={isProcessing}
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="spotting">
                            <Select.ItemText>Spotting</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="light">
                            <Select.ItemText>Light</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="medium">
                            <Select.ItemText>Medium</Select.ItemText>
                          </Select.Item>
                          <Select.Item value="heavy">
                            <Select.ItemText>Heavy</Select.ItemText>
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </YStack>
                  </XStack>

                  <YStack>
                    <Text fontSize="$3" color="$gray10">
                      Notes
                    </Text>
                    <Input
                      value={entry.notes || ''}
                      onChangeText={value => updateEntry(entry.id, 'notes', value)}
                      placeholder="Optional notes about this cycle..."
                      multiline
                      disabled={isProcessing}
                      testID={`${testID}-notes-${index}`}
                    />
                  </YStack>

                  {/* Validation Messages */}
                  {entry.validated && !entry.validated.isValid && (
                    <YStack space="$1">
                      {entry.validated.errors.map((error, errorIndex) => (
                        <Text key={errorIndex} fontSize="$2" color="$red10">
                          • {error.message}
                        </Text>
                      ))}
                    </YStack>
                  )}

                  {entry.validated && entry.validated.warnings.length > 0 && (
                    <YStack space="$1">
                      {entry.validated.warnings.map((warning, warningIndex) => (
                        <Text key={warningIndex} fontSize="$2" color="$yellow10">
                          ⚠ {warning.message}
                        </Text>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Card>
            ))}

            {/* Add Entry Button */}
            <Button
              size="$4"
              variant="outlined"
              onPress={addEntry}
              disabled={isProcessing}
              borderColor={stealthMode ? '$gray6' : '$blue8'}
              testID={`${testID}-add-entry`}
            >
              <Plus size="$1" />
              <Text>Add Another Cycle</Text>
            </Button>
          </YStack>
        </>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card padding="$4" backgroundColor="$blue1">
          <YStack space="$3" alignItems="center">
            <Spinner size="large" />
            <Text fontSize="$4" fontWeight="500">
              Processing Batch Entry
            </Text>
            {progress.current && (
              <Text fontSize="$3" color="$gray10">
                {progress.current}
              </Text>
            )}
            <Progress value={(progress.completed / progress.total) * 100} width="100%">
              <Progress.Indicator backgroundColor="$blue9" />
            </Progress>
            <Text fontSize="$2" color="$gray8">
              {progress.completed}/{progress.total} completed
              {progress.errors > 0 && ` (${progress.errors} errors)`}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Summary */}
      {validEntries.length > 0 && !isProcessing && (
        <Card padding="$3" backgroundColor={stealthMode ? '$gray2' : '$blue1'}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" fontWeight="500">
                {validEntries.length} cycles ready
              </Text>
              {totalWarnings > 0 && (
                <Text fontSize="$2" color="$yellow10">
                  {totalWarnings} warnings detected
                </Text>
              )}
            </YStack>
            <Text fontSize="$2" color="$gray8">
              Will be encrypted before storage
            </Text>
          </XStack>
        </Card>
      )}

      {/* Action Buttons */}
      <XStack space="$3" justifyContent="flex-end">
        <Button
          variant="outlined"
          onPress={onCancel}
          disabled={isProcessing}
          testID={`${testID}-cancel`}
        >
          Cancel
        </Button>

        <Button
          size="$4"
          onPress={handleProcessBatch}
          disabled={isProcessing || entries.length === 0}
          backgroundColor={stealthMode ? '$gray8' : '$blue9'}
          testID={`${testID}-process`}
          accessibilityLabel={getAccessibilityLabel('Process batch entries')}
        >
          {isProcessing ? <Spinner size="small" /> : <Check size="$1" />}
          <Text>Process {validEntries.length} Cycles</Text>
        </Button>
      </XStack>

      {/* Validation Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content maxWidth={400}>
            <YStack space="$3">
              <AlertDialog.Title>Validation Results</AlertDialog.Title>
              <AlertDialog.Description>
                {hasValidationErrors
                  ? 'Some entries have validation errors that must be fixed before processing.'
                  : 'Some entries have warnings. You can proceed or review the warnings first.'}
              </AlertDialog.Description>

              <ScrollView maxHeight={200}>
                <YStack space="$2">
                  {validationResults.map((result, index) => (
                    <YStack key={index} space="$1">
                      <Text fontSize="$3" fontWeight="500">
                        Cycle {index + 1}:
                      </Text>
                      {result.errors.map((error, errorIndex) => (
                        <Text key={errorIndex} fontSize="$2" color="$red10">
                          • {error.message}
                        </Text>
                      ))}
                      {result.warnings.map((warning, warningIndex) => (
                        <Text key={warningIndex} fontSize="$2" color="$yellow10">
                          ⚠ {warning.message}
                        </Text>
                      ))}
                    </YStack>
                  ))}
                </YStack>
              </ScrollView>

              <XStack space="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button variant="outlined">Review</Button>
                </AlertDialog.Cancel>
                {!hasValidationErrors && (
                  <AlertDialog.Action asChild>
                    <Button
                      backgroundColor="$blue9"
                      onPress={() => {
                        setShowValidationDialog(false);
                        processBatchEntries();
                      }}
                    >
                      Proceed Anyway
                    </Button>
                  </AlertDialog.Action>
                )}
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  );
};
