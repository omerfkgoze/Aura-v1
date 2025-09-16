import React, { useState, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  XStack,
  YStack,
  Separator,
  RadioGroup,
  Checkbox,
  Sheet,
  H3,
  H4,
  Paragraph,
} from '@tamagui/core';
import {
  DataConflict,
  ConflictResolution,
  ResolutionStrategy,
  FieldChange,
  ConflictableData,
} from './types';
import { AlertTriangle, Check, X, Merge, Clock } from '@tamagui/lucide-icons';

interface ConflictResolutionInterfaceProps {
  conflicts: DataConflict[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  onResolveAll: (resolutions: Map<string, ConflictResolution>) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
}

export const ConflictResolutionInterface: React.FC<ConflictResolutionInterfaceProps> = ({
  conflicts,
  onResolveConflict,
  onResolveAll,
  onCancel,
  isVisible,
}) => {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>('merge-user-guided');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const currentConflict = conflicts[currentConflictIndex];
  const hasMoreConflicts = currentConflictIndex < conflicts.length - 1;
  const allResolved = resolutions.size === conflicts.length;

  const handleFieldSelection = useCallback(
    (field: string, selected: boolean) => {
      const newSelection = new Set(selectedFields);
      if (selected) {
        newSelection.add(field);
      } else {
        newSelection.delete(field);
      }
      setSelectedFields(newSelection);
    },
    [selectedFields]
  );

  const handleStrategyChange = useCallback(
    (strategy: ResolutionStrategy) => {
      setSelectedStrategy(strategy);

      // Auto-select appropriate fields based on strategy
      if (strategy === 'take-local') {
        setSelectedFields(new Set(currentConflict.conflictFields));
      } else if (strategy === 'take-remote') {
        setSelectedFields(new Set());
      } else if (strategy === 'merge-automatic') {
        // For automatic merge, select non-conflicting fields
        const autoMergeFields = currentConflict.conflictFields.filter(
          field => !['flowIntensity', 'medications', 'temperature'].includes(field)
        );
        setSelectedFields(new Set(autoMergeFields));
      }
    },
    [currentConflict]
  );

  const createResolution = useCallback((): ConflictResolution => {
    const resolvedData = mergeConflictData(
      currentConflict.localData,
      currentConflict.remoteData,
      selectedStrategy,
      selectedFields
    );

    const appliedChanges: FieldChange[] = currentConflict.conflictFields.map(field => ({
      field,
      oldValue: (currentConflict.localData as any)[field],
      newValue: (resolvedData as any)[field],
      source: selectedFields.has(field) ? 'local' : 'remote',
      timestamp: Date.now(),
    }));

    return {
      strategy: selectedStrategy,
      resolvedData,
      appliedChanges,
      metadata: {
        resolvedAt: Date.now(),
        resolvedBy: 'user',
        deviceId: currentConflict.localData.deviceId,
        resolutionVersion: 1,
        conflictHash: generateConflictHash(currentConflict),
      },
    };
  }, [currentConflict, selectedStrategy, selectedFields]);

  const handleResolveCurrentConflict = useCallback(async () => {
    try {
      setIsProcessing(true);
      const resolution = createResolution();

      // Store resolution for batch processing
      const newResolutions = new Map(resolutions);
      newResolutions.set(currentConflict.id, resolution);
      setResolutions(newResolutions);

      // Move to next conflict or finish
      if (hasMoreConflicts) {
        setCurrentConflictIndex(prev => prev + 1);
        setSelectedFields(new Set());
        setSelectedStrategy('merge-user-guided');
      } else {
        // All conflicts resolved, apply all at once
        await onResolveAll(newResolutions);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve conflict. Please try again.');
      console.error('Conflict resolution error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentConflict, createResolution, hasMoreConflicts, resolutions, onResolveAll]);

  const handleQuickResolve = useCallback(
    async (strategy: ResolutionStrategy) => {
      try {
        setIsProcessing(true);

        // Auto-select fields based on strategy
        let autoSelectedFields: Set<string>;
        if (strategy === 'take-local') {
          autoSelectedFields = new Set(currentConflict.conflictFields);
        } else if (strategy === 'take-remote') {
          autoSelectedFields = new Set();
        } else {
          autoSelectedFields = new Set(currentConflict.conflictFields);
        }

        const resolvedData = mergeConflictData(
          currentConflict.localData,
          currentConflict.remoteData,
          strategy,
          autoSelectedFields
        );

        const resolution: ConflictResolution = {
          strategy,
          resolvedData,
          appliedChanges: currentConflict.conflictFields.map(field => ({
            field,
            oldValue: (currentConflict.localData as any)[field],
            newValue: (resolvedData as any)[field],
            source: autoSelectedFields.has(field) ? 'local' : 'remote',
            timestamp: Date.now(),
          })),
          metadata: {
            resolvedAt: Date.now(),
            resolvedBy: 'user',
            deviceId: currentConflict.localData.deviceId,
            resolutionVersion: 1,
            conflictHash: generateConflictHash(currentConflict),
          },
        };

        await onResolveConflict(currentConflict.id, resolution);
      } catch (error) {
        Alert.alert('Error', 'Failed to resolve conflict. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [currentConflict, onResolveConflict]
  );

  if (!currentConflict) {
    return null;
  }

  return (
    <Sheet modal open={isVisible} onOpenChange={onCancel} snapPoints={[90]}>
      <Sheet.Frame>
        <Sheet.Handle />
        <ScrollView style={{ flex: 1 }}>
          <YStack padding="$4" space="$4">
            {/* Header */}
            <XStack alignItems="center" space="$3">
              <AlertTriangle color="$orange10" size="$1.5" />
              <YStack flex={1}>
                <H3>Data Conflict Detected</H3>
                <Text color="$gray11" fontSize="$3">
                  Conflict {currentConflictIndex + 1} of {conflicts.length}
                </Text>
              </YStack>
            </XStack>

            {/* Conflict Summary */}
            <Card padding="$3" backgroundColor="$orange2">
              <YStack space="$2">
                <Text fontWeight="600" color="$orange11">
                  {formatConflictType(currentConflict.type)}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  Conflicting fields: {currentConflict.conflictFields.join(', ')}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  Severity: {currentConflict.severity}
                </Text>
              </YStack>
            </Card>

            {/* Quick Resolution Options */}
            <Card padding="$3">
              <YStack space="$3">
                <H4>Quick Resolution</H4>
                <XStack space="$2" flexWrap="wrap">
                  <Button
                    size="$3"
                    onPress={() => handleQuickResolve('take-local')}
                    disabled={isProcessing}
                    theme="blue"
                  >
                    Keep This Device
                  </Button>
                  <Button
                    size="$3"
                    onPress={() => handleQuickResolve('take-remote')}
                    disabled={isProcessing}
                    theme="green"
                  >
                    Keep Other Device
                  </Button>
                  <Button
                    size="$3"
                    onPress={() => handleQuickResolve('merge-automatic')}
                    disabled={isProcessing}
                    theme="purple"
                  >
                    Auto Merge
                  </Button>
                </XStack>
              </YStack>
            </Card>

            <Separator />

            {/* Detailed Resolution */}
            <YStack space="$4">
              <H4>Custom Resolution</H4>

              {/* Strategy Selection */}
              <Card padding="$3">
                <YStack space="$3">
                  <Text fontWeight="600">Resolution Strategy</Text>
                  <RadioGroup value={selectedStrategy} onValueChange={handleStrategyChange}>
                    <XStack alignItems="center" space="$2">
                      <RadioGroup.Item value="take-local" id="local">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Text>Keep this device's data</Text>
                    </XStack>
                    <XStack alignItems="center" space="$2">
                      <RadioGroup.Item value="take-remote" id="remote">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Text>Keep other device's data</Text>
                    </XStack>
                    <XStack alignItems="center" space="$2">
                      <RadioGroup.Item value="merge-user-guided" id="merge">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Text>Merge selected fields</Text>
                    </XStack>
                  </RadioGroup>
                </YStack>
              </Card>

              {/* Field Selection */}
              {selectedStrategy === 'merge-user-guided' && (
                <Card padding="$3">
                  <YStack space="$3">
                    <Text fontWeight="600">Select fields to keep from this device</Text>
                    {currentConflict.conflictFields.map(field => (
                      <XStack key={field} alignItems="center" space="$3">
                        <Checkbox
                          checked={selectedFields.has(field)}
                          onCheckedChange={checked => handleFieldSelection(field, checked === true)}
                        />
                        <YStack flex={1}>
                          <Text fontWeight="500">{formatFieldName(field)}</Text>
                          <XStack space="$4">
                            <YStack flex={1}>
                              <Text fontSize="$2" color="$blue11">
                                This device:
                              </Text>
                              <Text fontSize="$3">
                                {formatFieldValue(currentConflict.localData, field)}
                              </Text>
                            </YStack>
                            <YStack flex={1}>
                              <Text fontSize="$2" color="$green11">
                                Other device:
                              </Text>
                              <Text fontSize="$3">
                                {formatFieldValue(currentConflict.remoteData, field)}
                              </Text>
                            </YStack>
                          </XStack>
                        </YStack>
                      </XStack>
                    ))}
                  </YStack>
                </Card>
              )}

              {/* Data Preview */}
              <Card padding="$3">
                <YStack space="$3">
                  <Text fontWeight="600">Data Comparison</Text>
                  <XStack space="$3">
                    <YStack flex={1} space="$2">
                      <Text fontSize="$4" fontWeight="500" color="$blue11">
                        This Device
                      </Text>
                      <Text fontSize="$2" color="$gray11">
                        Updated: {formatTimestamp(currentConflict.localData.updatedAt)}
                      </Text>
                      <DataPreview data={currentConflict.localData} />
                    </YStack>
                    <YStack flex={1} space="$2">
                      <Text fontSize="$4" fontWeight="500" color="$green11">
                        Other Device
                      </Text>
                      <Text fontSize="$2" color="$gray11">
                        Updated: {formatTimestamp(currentConflict.remoteData.updatedAt)}
                      </Text>
                      <DataPreview data={currentConflict.remoteData} />
                    </YStack>
                  </XStack>
                </YStack>
              </Card>
            </YStack>

            {/* Action Buttons */}
            <XStack space="$3" justifyContent="space-between">
              <Button onPress={onCancel} disabled={isProcessing} variant="outlined" flex={1}>
                Cancel
              </Button>
              <Button
                onPress={handleResolveCurrentConflict}
                disabled={isProcessing}
                theme="blue"
                flex={2}
                icon={hasMoreConflicts ? undefined : <Check size="$1" />}
              >
                {isProcessing
                  ? 'Processing...'
                  : hasMoreConflicts
                    ? 'Resolve & Next'
                    : 'Resolve All'}
              </Button>
            </XStack>

            {/* Progress Indicator */}
            <XStack space="$2" alignItems="center" justifyContent="center">
              {conflicts.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index <= currentConflictIndex ? '#007AFF' : '#E0E0E0',
                  }}
                />
              ))}
            </XStack>
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  );
};

const DataPreview: React.FC<{ data: ConflictableData }> = ({ data }) => (
  <YStack space="$1">
    {Object.entries(data)
      .filter(
        ([key]) =>
          ![
            'id',
            'version',
            'deviceId',
            'createdAt',
            'updatedAt',
            'syncedAt',
            'syncStatus',
          ].includes(key)
      )
      .slice(0, 5) // Show only first 5 fields
      .map(([key, value]) => (
        <XStack key={key} space="$2">
          <Text fontSize="$2" color="$gray10" minWidth={80}>
            {formatFieldName(key)}:
          </Text>
          <Text fontSize="$2" flex={1}>
            {formatFieldValue(data, key)}
          </Text>
        </XStack>
      ))}
  </YStack>
);

// Helper functions
function mergeConflictData(
  localData: ConflictableData,
  remoteData: ConflictableData,
  strategy: ResolutionStrategy,
  selectedFields: Set<string>
): ConflictableData {
  const merged = { ...remoteData };

  if (strategy === 'take-local') {
    return { ...localData, version: (localData.version || 1) + 1 };
  } else if (strategy === 'take-remote') {
    return { ...remoteData, version: (remoteData.version || 1) + 1 };
  } else {
    // Merge selected fields from local data
    for (const field of selectedFields) {
      (merged as any)[field] = (localData as any)[field];
    }
    merged.version = Math.max(localData.version || 1, remoteData.version || 1) + 1;
    merged.updatedAt = Date.now();
    return merged;
  }
}

function generateConflictHash(conflict: DataConflict): string {
  const hashSource = `${conflict.localData.id}_${conflict.localData.version}_${conflict.remoteData.version}_${conflict.timestamp}`;
  return btoa(hashSource).slice(0, 16);
}

function formatConflictType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatFieldName(field: string): string {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

function formatFieldValue(data: ConflictableData, field: string): string {
  const value = (data as any)[field];
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 50) + '...';
  return String(value).slice(0, 50);
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
