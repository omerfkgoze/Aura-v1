import React, { useState, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  Progress,
  RadioGroup,
  Checkbox,
  AlertDialog,
  Separator,
  Spinner,
  LinearGradient,
} from '@tamagui/core';
import {
  Calendar,
  Upload,
  Download,
  AlertTriangle,
  Check,
  X,
  FileText,
  Smartphone,
  Clock,
} from '@tamagui/lucide-icons';
import type { EncryptedCycleData } from '@aura/shared-types';
import { DataValidationService } from '../../utils/dataValidation';
import { useEncryptedStorage } from '../../hooks/useEncryptedStorage';
import { useAccessibility } from '../../utils/accessibility';

export interface ImportSource {
  type: 'csv' | 'json' | 'app_export' | 'manual';
  name: string;
  description: string;
  icon: React.ReactNode;
  supported: boolean;
}

export interface ImportConflict {
  existingCycle: EncryptedCycleData;
  importedCycle: Partial<EncryptedCycleData>;
  conflictType: 'date_overlap' | 'duplicate_cycle' | 'data_mismatch';
  resolution: 'keep_existing' | 'replace_with_import' | 'merge_data' | 'skip_import';
}

export interface ImportProgress {
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
  conflicts: number;
  currentOperation?: string;
}

interface HistoricalDataImportProps {
  userId: string;
  deviceId: string;
  existingCycles?: EncryptedCycleData[];
  onImportComplete?: (result: {
    imported: number;
    skipped: number;
    errors: number;
    conflicts: ImportConflict[];
  }) => void;
  onCancel?: () => void;
  stealthMode?: boolean;
  testID?: string;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    type: 'csv',
    name: 'CSV File',
    description: 'Import from spreadsheet or exported CSV data',
    icon: <FileText size="$2" />,
    supported: true,
  },
  {
    type: 'json',
    name: 'JSON Export',
    description: 'Import from JSON backup file',
    icon: <Download size="$2" />,
    supported: true,
  },
  {
    type: 'app_export',
    name: 'Other Apps',
    description: 'Import from other period tracking apps',
    icon: <Smartphone size="$2" />,
    supported: false, // Will be implemented later
  },
  {
    type: 'manual',
    name: 'Manual Entry',
    description: 'Enter historical data manually',
    icon: <Calendar size="$2" />,
    supported: true,
  },
];

export const HistoricalDataImport: React.FC<HistoricalDataImportProps> = ({
  userId,
  deviceId,
  existingCycles = [],
  onImportComplete,
  onCancel,
  stealthMode = false,
  testID = 'historical-data-import',
}) => {
  const [selectedSource, setSelectedSource] = useState<ImportSource['type']>('csv');
  const [importData, setImportData] = useState<Partial<EncryptedCycleData>[]>([]);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    conflicts: 0,
  });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<'source' | 'preview' | 'conflicts' | 'import'>(
    'source'
  );
  const [importOptions, setImportOptions] = useState({
    validateData: true,
    allowOverwrite: false,
    skipInvalidEntries: true,
    preserveModificationHistory: true,
  });

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
        previousCycles: existingCycles,
      }),
    [userId, deviceId, existingCycles]
  );

  // Analyze imported data for conflicts
  const analyzeImportData = async (data: Partial<EncryptedCycleData>[]) => {
    setIsAnalyzing(true);
    const detectedConflicts: ImportConflict[] = [];

    for (const importedCycle of data) {
      if (!importedCycle.periodStartDate) continue;

      // Check for date overlaps
      for (const existingCycle of existingCycles) {
        const importStart = new Date(importedCycle.periodStartDate);
        const existingStart = new Date(existingCycle.periodStartDate);
        const existingEnd = existingCycle.periodEndDate
          ? new Date(existingCycle.periodEndDate)
          : new Date(existingStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Check for overlap
        const importEnd = importedCycle.periodEndDate
          ? new Date(importedCycle.periodEndDate)
          : new Date(importStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (
          (importStart >= existingStart && importStart <= existingEnd) ||
          (importEnd >= existingStart && importEnd <= existingEnd) ||
          (importStart <= existingStart && importEnd >= existingEnd)
        ) {
          detectedConflicts.push({
            existingCycle,
            importedCycle,
            conflictType:
              Math.abs(importStart.getTime() - existingStart.getTime()) < 24 * 60 * 60 * 1000
                ? 'duplicate_cycle'
                : 'date_overlap',
            resolution: 'keep_existing',
          });
        }
      }
    }

    setConflicts(detectedConflicts);
    setIsAnalyzing(false);

    if (detectedConflicts.length > 0) {
      setCurrentStep('conflicts');
      setShowConflictDialog(true);
    } else {
      setCurrentStep('import');
    }
  };

  // Handle file upload simulation (would be implemented with actual file picker)
  const handleFileUpload = async (sourceType: ImportSource['type']) => {
    // Simulate file upload and parsing
    Alert.alert(
      'File Import',
      `${sourceType.toUpperCase()} import will be implemented with native file picker.\n\nFor now, using sample data for demonstration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Sample Data', onPress: () => loadSampleData(sourceType) },
      ]
    );
  };

  // Load sample data for demonstration
  const loadSampleData = (sourceType: ImportSource['type']) => {
    const sampleData: Partial<EncryptedCycleData>[] = [
      {
        userId,
        cycleNumber: 1,
        periodStartDate: '2024-12-01',
        periodEndDate: '2024-12-05',
        dayData: [
          { date: '2024-12-01', flowIntensity: 'medium', symptoms: [] },
          { date: '2024-12-02', flowIntensity: 'heavy', symptoms: [] },
          { date: '2024-12-03', flowIntensity: 'medium', symptoms: [] },
          { date: '2024-12-04', flowIntensity: 'light', symptoms: [] },
          { date: '2024-12-05', flowIntensity: 'spotting', symptoms: [] },
        ],
        version: 1,
        deviceId,
        modificationHistory: [],
      },
      {
        userId,
        cycleNumber: 2,
        periodStartDate: '2024-12-29',
        periodEndDate: '2025-01-02',
        dayData: [
          { date: '2024-12-29', flowIntensity: 'light', symptoms: [] },
          { date: '2024-12-30', flowIntensity: 'medium', symptoms: [] },
          { date: '2024-12-31', flowIntensity: 'heavy', symptoms: [] },
          { date: '2025-01-01', flowIntensity: 'medium', symptoms: [] },
          { date: '2025-01-02', flowIntensity: 'light', symptoms: [] },
        ],
        version: 1,
        deviceId,
        modificationHistory: [],
      },
    ];

    setImportData(sampleData);
    setCurrentStep('preview');
    analyzeImportData(sampleData);
  };

  // Update conflict resolution
  const updateConflictResolution = (index: number, resolution: ImportConflict['resolution']) => {
    setConflicts(prev =>
      prev.map((conflict, i) => (i === index ? { ...conflict, resolution } : conflict))
    );
  };

  // Process import with conflict resolutions
  const processImport = async () => {
    if (!encryptedStorage.isInitialized) {
      Alert.alert('Error', 'Encrypted storage not initialized');
      return;
    }

    setIsImporting(true);
    setProgress({
      total: importData.length,
      processed: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      conflicts: conflicts.length,
    });

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const finalConflicts: ImportConflict[] = [];

    for (let i = 0; i < importData.length; i++) {
      const cycleData = importData[i];

      setProgress(prev => ({
        ...prev,
        processed: i + 1,
        currentOperation: `Processing cycle ${i + 1}/${importData.length}`,
      }));

      try {
        // Check if this cycle has conflicts
        const conflict = conflicts.find(c => c.importedCycle === cycleData);

        if (conflict) {
          switch (conflict.resolution) {
            case 'keep_existing':
              skipped++;
              break;
            case 'replace_with_import':
              // Would implement replacement logic
              imported++;
              break;
            case 'skip_import':
              skipped++;
              break;
            case 'merge_data':
              // Would implement merge logic
              imported++;
              break;
            default:
              skipped++;
          }
          finalConflicts.push(conflict);
        } else {
          // No conflict, proceed with import
          if (importOptions.validateData) {
            const validation = validationService.validateCycleData(cycleData as any);
            if (!validation.isValid && !importOptions.skipInvalidEntries) {
              errors++;
              continue;
            }
          }

          // Store the cycle data
          const completeCycleData = {
            ...cycleData,
            id: `imported-${Date.now()}-${i}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as EncryptedCycleData;

          await encryptedStorage.storeCycleData(completeCycleData);
          imported++;
        }

        setProgress(prev => ({
          ...prev,
          imported,
          skipped,
          errors,
        }));
      } catch (error) {
        console.error(`Failed to import cycle ${i}:`, error);
        errors++;
        setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsImporting(false);

    if (onImportComplete) {
      onImportComplete({
        imported,
        skipped,
        errors,
        conflicts: finalConflicts,
      });
    }
  };

  const selectedSourceInfo = IMPORT_SOURCES.find(source => source.type === selectedSource);

  return (
    <YStack space="$4" testID={testID}>
      {/* Header */}
      <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$background'}>
        <YStack space="$3">
          <XStack alignItems="center" space="$3">
            <Clock size="$2" color={stealthMode ? '$gray10' : '$blue10'} />
            <Text fontSize="$6" fontWeight="600">
              Historical Data Import
            </Text>
          </XStack>
          <Text fontSize="$3" color="$gray10">
            Import your historical cycle data from various sources with automatic conflict detection
          </Text>
        </YStack>
      </Card>

      {/* Step Indicator */}
      <Card padding="$3" backgroundColor={stealthMode ? '$gray2' : '$blue1'}>
        <XStack justifyContent="space-around">
          {[
            { key: 'source', label: 'Source', active: currentStep === 'source' },
            { key: 'preview', label: 'Preview', active: currentStep === 'preview' },
            { key: 'conflicts', label: 'Conflicts', active: currentStep === 'conflicts' },
            { key: 'import', label: 'Import', active: currentStep === 'import' },
          ].map((step, index, steps) => (
            <XStack key={step.key} alignItems="center" space="$2">
              <Text
                fontSize="$3"
                fontWeight={step.active ? '600' : '400'}
                color={step.active ? '$blue10' : '$gray8'}
              >
                {step.label}
              </Text>
              {index < steps.length - 1 && <Text color="$gray6">→</Text>}
            </XStack>
          ))}
        </XStack>
      </Card>

      {/* Source Selection */}
      {currentStep === 'source' && (
        <YStack space="$3">
          <Text fontSize="$5" fontWeight="500">
            Choose Import Source
          </Text>

          <RadioGroup value={selectedSource} onValueChange={setSelectedSource}>
            <YStack space="$2">
              {IMPORT_SOURCES.map(source => (
                <Card
                  key={source.type}
                  padding="$3"
                  pressStyle={{ opacity: 0.8 }}
                  backgroundColor={
                    selectedSource === source.type
                      ? stealthMode
                        ? '$gray4'
                        : '$blue2'
                      : stealthMode
                        ? '$gray2'
                        : '$background'
                  }
                  borderColor={selectedSource === source.type ? '$blue6' : '$borderColor'}
                  borderWidth={selectedSource === source.type ? 2 : 1}
                  opacity={source.supported ? 1 : 0.5}
                  testID={`${testID}-source-${source.type}`}
                >
                  <XStack alignItems="center" space="$3">
                    <RadioGroup.Item
                      value={source.type}
                      disabled={!source.supported}
                      testID={`${testID}-radio-${source.type}`}
                    >
                      <RadioGroup.Indicator />
                    </RadioGroup.Item>

                    {source.icon}

                    <YStack flex={1}>
                      <XStack alignItems="center" space="$2">
                        <Text fontSize="$4" fontWeight="500">
                          {source.name}
                        </Text>
                        {!source.supported && (
                          <Text
                            fontSize="$2"
                            color="$gray8"
                            backgroundColor="$gray4"
                            paddingHorizontal="$2"
                            paddingVertical="$1"
                            borderRadius="$2"
                          >
                            Coming Soon
                          </Text>
                        )}
                      </XStack>
                      <Text fontSize="$3" color="$gray10">
                        {source.description}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              ))}
            </YStack>
          </RadioGroup>

          {/* Import Options */}
          <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$gray1'}>
            <YStack space="$3">
              <Text fontSize="$4" fontWeight="500">
                Import Options
              </Text>

              <XStack alignItems="center" space="$3">
                <Checkbox
                  checked={importOptions.validateData}
                  onCheckedChange={checked =>
                    setImportOptions(prev => ({ ...prev, validateData: checked }))
                  }
                  testID={`${testID}-validate-data`}
                />
                <YStack flex={1}>
                  <Text fontSize="$3">Validate imported data</Text>
                  <Text fontSize="$2" color="$gray8">
                    Check for impossible dates and inconsistent entries
                  </Text>
                </YStack>
              </XStack>

              <XStack alignItems="center" space="$3">
                <Checkbox
                  checked={importOptions.skipInvalidEntries}
                  onCheckedChange={checked =>
                    setImportOptions(prev => ({ ...prev, skipInvalidEntries: checked }))
                  }
                  testID={`${testID}-skip-invalid`}
                />
                <YStack flex={1}>
                  <Text fontSize="$3">Skip invalid entries</Text>
                  <Text fontSize="$2" color="$gray8">
                    Continue import even if some entries have errors
                  </Text>
                </YStack>
              </XStack>

              <XStack alignItems="center" space="$3">
                <Checkbox
                  checked={importOptions.preserveModificationHistory}
                  onCheckedChange={checked =>
                    setImportOptions(prev => ({ ...prev, preserveModificationHistory: checked }))
                  }
                  testID={`${testID}-preserve-history`}
                />
                <YStack flex={1}>
                  <Text fontSize="$3">Preserve modification history</Text>
                  <Text fontSize="$2" color="$gray8">
                    Keep original creation and modification dates if available
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          <XStack space="$3" justifyContent="flex-end">
            <Button variant="outlined" onPress={onCancel} testID={`${testID}-cancel`}>
              Cancel
            </Button>

            <Button
              size="$4"
              onPress={() =>
                selectedSourceInfo?.supported
                  ? handleFileUpload(selectedSource)
                  : Alert.alert(
                      'Not Supported',
                      'This import source will be available in a future version'
                    )
              }
              disabled={!selectedSourceInfo?.supported}
              backgroundColor={stealthMode ? '$gray8' : '$blue9'}
              testID={`${testID}-next`}
            >
              <Upload size="$1" />
              <Text>Choose File</Text>
            </Button>
          </XStack>
        </YStack>
      )}

      {/* Import Preview */}
      {currentStep === 'preview' && (
        <YStack space="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$5" fontWeight="500">
              Import Preview
            </Text>
            {isAnalyzing && <Spinner size="small" />}
          </XStack>

          <Card padding="$4" backgroundColor={stealthMode ? '$gray2' : '$green1'}>
            <YStack space="$2">
              <Text fontSize="$4" fontWeight="500">
                {importData.length} cycles found for import
              </Text>
              <Text fontSize="$3" color="$gray10">
                Data will be encrypted and stored locally
              </Text>
            </YStack>
          </Card>

          {/* Data Preview */}
          <ScrollView maxHeight={300}>
            <YStack space="$2">
              {importData.map((cycle, index) => (
                <Card
                  key={index}
                  padding="$3"
                  backgroundColor={stealthMode ? '$gray2' : '$background'}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text fontSize="$3" fontWeight="500">
                        Cycle {cycle.cycleNumber || index + 1}
                      </Text>
                      <Text fontSize="$2" color="$gray8">
                        {cycle.periodStartDate} - {cycle.periodEndDate || 'Ongoing'}
                      </Text>
                    </YStack>
                    <Text fontSize="$2" color="$gray8">
                      {cycle.dayData?.length || 0} days
                    </Text>
                  </XStack>
                </Card>
              ))}
            </YStack>
          </ScrollView>
        </YStack>
      )}

      {/* Import Progress */}
      {isImporting && (
        <Card padding="$4" backgroundColor="$blue1">
          <YStack space="$3" alignItems="center">
            <Spinner size="large" />
            <Text fontSize="$4" fontWeight="500">
              Importing Historical Data
            </Text>
            {progress.currentOperation && (
              <Text fontSize="$3" color="$gray10">
                {progress.currentOperation}
              </Text>
            )}
            <Progress value={(progress.processed / progress.total) * 100} width="100%">
              <Progress.Indicator backgroundColor="$blue9" />
            </Progress>
            <XStack justifyContent="space-around" width="100%">
              <YStack alignItems="center">
                <Text fontSize="$2" color="$green10" fontWeight="600">
                  {progress.imported}
                </Text>
                <Text fontSize="$1" color="$gray8">
                  Imported
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize="$2" color="$yellow10" fontWeight="600">
                  {progress.skipped}
                </Text>
                <Text fontSize="$1" color="$gray8">
                  Skipped
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize="$2" color="$red10" fontWeight="600">
                  {progress.errors}
                </Text>
                <Text fontSize="$1" color="$gray8">
                  Errors
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Final Import Button */}
      {currentStep === 'import' && !isImporting && (
        <XStack space="$3" justifyContent="flex-end">
          <Button
            variant="outlined"
            onPress={() => setCurrentStep('source')}
            testID={`${testID}-back`}
          >
            Back
          </Button>

          <Button
            size="$4"
            onPress={processImport}
            backgroundColor={stealthMode ? '$gray8' : '$green9'}
            testID={`${testID}-import`}
          >
            <Check size="$1" />
            <Text>Import {importData.length} Cycles</Text>
          </Button>
        </XStack>
      )}

      {/* Conflict Resolution Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content maxWidth={500} maxHeight="80%">
            <ScrollView>
              <YStack space="$3">
                <AlertDialog.Title>
                  <XStack alignItems="center" space="$2">
                    <AlertTriangle size="$1" color="$yellow10" />
                    Data Conflicts Detected
                  </XStack>
                </AlertDialog.Title>

                <AlertDialog.Description>
                  {conflicts.length} conflicts found. Choose how to resolve each conflict:
                </AlertDialog.Description>

                <YStack space="$3">
                  {conflicts.map((conflict, index) => (
                    <Card key={index} padding="$3" borderColor="$yellow6" borderWidth={1}>
                      <YStack space="$2">
                        <Text fontSize="$3" fontWeight="500">
                          Conflict #{index + 1}: {conflict.conflictType.replace('_', ' ')}
                        </Text>
                        <Text fontSize="$2" color="$gray8">
                          Existing: {conflict.existingCycle.periodStartDate}
                        </Text>
                        <Text fontSize="$2" color="$gray8">
                          Import: {conflict.importedCycle.periodStartDate}
                        </Text>

                        <RadioGroup
                          value={conflict.resolution}
                          onValueChange={value => updateConflictResolution(index, value as any)}
                        >
                          <YStack space="$1">
                            <XStack alignItems="center" space="$2">
                              <RadioGroup.Item value="keep_existing">
                                <RadioGroup.Indicator />
                              </RadioGroup.Item>
                              <Text fontSize="$2">Keep existing data</Text>
                            </XStack>
                            <XStack alignItems="center" space="$2">
                              <RadioGroup.Item value="replace_with_import">
                                <RadioGroup.Indicator />
                              </RadioGroup.Item>
                              <Text fontSize="$2">Replace with import</Text>
                            </XStack>
                            <XStack alignItems="center" space="$2">
                              <RadioGroup.Item value="skip_import">
                                <RadioGroup.Indicator />
                              </RadioGroup.Item>
                              <Text fontSize="$2">Skip this import</Text>
                            </XStack>
                          </YStack>
                        </RadioGroup>
                      </YStack>
                    </Card>
                  ))}
                </YStack>

                <XStack space="$3" justifyContent="flex-end">
                  <AlertDialog.Cancel asChild>
                    <Button variant="outlined">Cancel Import</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button
                      backgroundColor="$blue9"
                      onPress={() => {
                        setShowConflictDialog(false);
                        setCurrentStep('import');
                      }}
                    >
                      Continue with Resolutions
                    </Button>
                  </AlertDialog.Action>
                </XStack>
              </YStack>
            </ScrollView>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  );
};
