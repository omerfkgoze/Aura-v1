import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Button, Card, XStack, YStack, Separator, H4, H5 } from '@tamagui/core';
import { Search, Filter, RotateCcw, Calendar, Info } from '@tamagui/lucide-icons';
import { ModificationRecord, AuditLogQueryOptions, AuditSummary } from '@aura/shared-types/data';
import { auditTrailService } from '../../services/auditTrailService';
import { useAccessibility } from '../../utils/accessibility';

interface AuditLogViewerProps {
  userId: string;
  onRestoreRequest?: (entityType: string, entityId: string, timestamp: string) => void;
}

interface FilterState {
  entityType?: 'cycle' | 'period_day' | 'symptom' | 'preference';
  action?: 'create' | 'update' | 'delete' | 'restore';
  startDate?: string;
  endDate?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ userId, onRestoreRequest }) => {
  const [modifications, setModifications] = useState<ModificationRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedEntry, setSelectedEntry] = useState<ModificationRecord | null>(null);

  const { getAccessibilityLabel, announceChange } = useAccessibility();

  useEffect(() => {
    loadAuditData();
  }, [userId, filters]);

  const loadAuditData = async () => {
    try {
      setIsLoading(true);

      const queryOptions: AuditLogQueryOptions = {
        userId,
        ...filters,
        limit: 100,
      };

      const [auditModifications, auditSummary] = await Promise.all([
        auditTrailService.queryAuditLog(queryOptions),
        auditTrailService.getAuditSummary(userId),
      ]);

      setModifications(auditModifications);
      setSummary(auditSummary);
    } catch (error) {
      console.error('Failed to load audit data:', error);
      Alert.alert('Error', 'Failed to load audit trail data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAuditData();
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
    announceChange('Filters cleared');
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'restore':
        return '↩️';
      default:
        return '📝';
    }
  };

  const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
      case 'cycle':
        return 'Menstrual Cycle';
      case 'period_day':
        return 'Period Day';
      case 'symptom':
        return 'Symptom';
      case 'preference':
        return 'Preference';
      default:
        return entityType;
    }
  };

  const handleRestoreRequest = (modification: ModificationRecord) => {
    Alert.alert(
      'Restore Data',
      `Do you want to restore ${getEntityTypeLabel(modification.entityType)} to the state from ${formatTimestamp(modification.timestamp)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            onRestoreRequest?.(
              modification.entityType,
              modification.entityId,
              modification.timestamp
            );
            announceChange(
              `Restoration requested for ${getEntityTypeLabel(modification.entityType)}`
            );
          },
        },
      ]
    );
  };

  const renderSummaryCard = () => {
    if (!summary) return null;

    return (
      <Card padding="$4" marginBottom="$4" backgroundColor="$background">
        <H4 marginBottom="$2">Audit Summary</H4>
        <XStack justifyContent="space-between" marginBottom="$2">
          <Text>Total Modifications:</Text>
          <Text fontWeight="bold">{summary.totalModifications}</Text>
        </XStack>
        <XStack justifyContent="space-between" marginBottom="$2">
          <Text>Data Integrity:</Text>
          <Text
            color={
              summary.dataIntegrityStatus === 'valid'
                ? '$green10'
                : summary.dataIntegrityStatus === 'warning'
                  ? '$yellow10'
                  : '$red10'
            }
            fontWeight="bold"
          >
            {summary.dataIntegrityStatus.toUpperCase()}
          </Text>
        </XStack>
      </Card>
    );
  };

  const renderFilterControls = () => {
    if (!showFilters) return null;

    return (
      <Card padding="$4" marginBottom="$4" backgroundColor="$gray1">
        <H5 marginBottom="$3">Filters</H5>

        <YStack space="$3">
          <XStack space="$2" flexWrap="wrap">
            <Button
              size="$3"
              variant={filters.entityType === 'cycle' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  entityType: filters.entityType === 'cycle' ? undefined : 'cycle',
                })
              }
            >
              Cycles
            </Button>
            <Button
              size="$3"
              variant={filters.entityType === 'symptom' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  entityType: filters.entityType === 'symptom' ? undefined : 'symptom',
                })
              }
            >
              Symptoms
            </Button>
            <Button
              size="$3"
              variant={filters.entityType === 'preference' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  entityType: filters.entityType === 'preference' ? undefined : 'preference',
                })
              }
            >
              Settings
            </Button>
          </XStack>

          <XStack space="$2" flexWrap="wrap">
            <Button
              size="$3"
              variant={filters.action === 'create' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  action: filters.action === 'create' ? undefined : 'create',
                })
              }
            >
              Created
            </Button>
            <Button
              size="$3"
              variant={filters.action === 'update' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  action: filters.action === 'update' ? undefined : 'update',
                })
              }
            >
              Updated
            </Button>
            <Button
              size="$3"
              variant={filters.action === 'delete' ? 'solid' : 'outlined'}
              onPress={() =>
                handleFilterChange({
                  action: filters.action === 'delete' ? undefined : 'delete',
                })
              }
            >
              Deleted
            </Button>
          </XStack>

          <Button size="$3" variant="outlined" onPress={clearFilters}>
            Clear Filters
          </Button>
        </YStack>
      </Card>
    );
  };

  const renderModificationEntry = (modification: ModificationRecord, index: number) => {
    const isSelected = selectedEntry?.id === modification.id;

    return (
      <TouchableOpacity
        key={modification.id}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel(
          `audit-entry-${index}`,
          `${getActionIcon(modification.action)} ${modification.action} ${getEntityTypeLabel(modification.entityType)} at ${formatTimestamp(modification.timestamp)}`
        )}
        onPress={() => setSelectedEntry(isSelected ? null : modification)}
      >
        <Card
          padding="$4"
          marginBottom="$2"
          backgroundColor={isSelected ? '$blue2' : '$background'}
          borderColor={isSelected ? '$blue8' : '$borderColor'}
          borderWidth={1}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <XStack alignItems="center" space="$2">
              <Text fontSize="$6">{getActionIcon(modification.action)}</Text>
              <YStack>
                <Text fontWeight="bold" color="$color">
                  {modification.action.toUpperCase()} {getEntityTypeLabel(modification.entityType)}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  {formatTimestamp(modification.timestamp)}
                </Text>
              </YStack>
            </XStack>

            {onRestoreRequest && modification.action !== 'delete' && (
              <TouchableOpacity
                onPress={() => handleRestoreRequest(modification)}
                accessibilityRole="button"
                accessibilityLabel="Restore to this version"
              >
                <RotateCcw size={20} color="$blue10" />
              </TouchableOpacity>
            )}
          </XStack>

          {isSelected && (
            <YStack space="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="$borderColor">
              <Text fontWeight="bold">Field: {modification.field}</Text>

              {modification.oldValue !== null && modification.oldValue !== undefined && (
                <YStack>
                  <Text fontSize="$3" color="$gray10">
                    Previous Value:
                  </Text>
                  <Text fontFamily="$mono" backgroundColor="$red2" padding="$2" borderRadius="$2">
                    {formatValue(modification.oldValue)}
                  </Text>
                </YStack>
              )}

              <YStack>
                <Text fontSize="$3" color="$gray10">
                  New Value:
                </Text>
                <Text fontFamily="$mono" backgroundColor="$green2" padding="$2" borderRadius="$2">
                  {formatValue(modification.newValue)}
                </Text>
              </YStack>

              {modification.reason && (
                <YStack>
                  <Text fontSize="$3" color="$gray10">
                    Reason:
                  </Text>
                  <Text fontStyle="italic">{modification.reason}</Text>
                </YStack>
              )}

              <XStack justifyContent="space-between">
                <Text fontSize="$2" color="$gray10">
                  Device: {modification.deviceId}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  ID: {modification.entityId.substring(0, 8)}
                </Text>
              </XStack>
            </YStack>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text marginTop="$4">Loading audit trail...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <YStack padding="$4">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <H4>Data Audit Trail</H4>
          <XStack space="$2">
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              accessibilityRole="button"
              accessibilityLabel="Toggle filters"
            >
              <Filter size={24} color="$blue10" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                /* Open audit info modal */
              }}
              accessibilityRole="button"
              accessibilityLabel="Audit trail information"
            >
              <Info size={24} color="$gray10" />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {renderSummaryCard()}
        {renderFilterControls()}

        {modifications.length === 0 ? (
          <Card padding="$6" alignItems="center">
            <Calendar size={48} color="$gray8" marginBottom="$4" />
            <Text fontSize="$5" color="$gray10" textAlign="center">
              No audit records found
            </Text>
            <Text fontSize="$3" color="$gray8" textAlign="center" marginTop="$2">
              Data modifications will appear here
            </Text>
          </Card>
        ) : (
          <YStack>
            <Text fontSize="$3" color="$gray10" marginBottom="$3">
              {modifications.length} modification{modifications.length !== 1 ? 's' : ''} found
            </Text>
            {modifications.map(renderModificationEntry)}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
};

export default AuditLogViewer;
