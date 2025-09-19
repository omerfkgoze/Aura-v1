import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StyleSheet,
} from 'react-native';
import { PrivacySafeAuditService } from '../services/PrivacySafeAuditService';

interface AuditLogEntry {
  id: string;
  timestamp: number;
  deviceIdHash: string;
  operationType: string;
  dataType: string;
  recordCount: number;
  dataSize?: number;
  networkType?: string;
  duration?: number;
  errorCode?: string;
  conflictResolution?: string;
  sessionId: string;
}

interface AuditSession {
  id: string;
  startTime: number;
  endTime?: number;
  deviceIdHash: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  conflictCount: number;
  dataSynced: number;
}

interface PrivacyMetrics {
  totalSyncSessions: number;
  averageSessionDuration: number;
  dataTransferredLast30Days: number;
  conflictResolutionRate: number;
  deviceConnectivityReliability: number;
  privacyComplianceScore: number;
}

/**
 * Audit log viewer component for user transparency
 * Shows sync operations without exposing sensitive content
 */
export const AuditLogViewer: React.FC = () => {
  const [auditService] = useState(() => new PrivacySafeAuditService());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [privacyMetrics, setPrivacyMetrics] = useState<PrivacyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'sessions' | 'metrics'>('logs');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadAuditData();

    return () => {
      auditService.dispose();
    };
  }, []);

  const loadAuditData = async () => {
    try {
      setLoading(true);

      const [logs, sessions, metrics] = await Promise.all([
        auditService.getAuditLog({ limit: 100 }),
        auditService.getAuditSessions(50),
        auditService.getPrivacyMetrics(),
      ]);

      setAuditLogs(logs);
      setAuditSessions(sessions as AuditSession[]);
      setPrivacyMetrics(metrics);
    } catch (error) {
      console.error('Failed to load audit data:', error);
      Alert.alert('Error', 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAuditData();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return 'N/A';

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const formatDataSize = (size?: number): string => {
    if (!size) return 'N/A';

    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getOperationIcon = (operationType: string): string => {
    switch (operationType) {
      case 'sync_start':
        return '🔄';
      case 'sync_complete':
        return '✅';
      case 'sync_failed':
        return '❌';
      case 'conflict_detected':
        return '⚠️';
      case 'conflict_resolved':
        return '🔧';
      case 'p2p_connect':
        return '🔗';
      case 'p2p_disconnect':
        return '🔌';
      default:
        return '📝';
    }
  };

  const getStatusColor = (operationType: string): string => {
    switch (operationType) {
      case 'sync_complete':
        return '#4CAF50';
      case 'sync_failed':
        return '#F44336';
      case 'conflict_detected':
        return '#FF9800';
      case 'conflict_resolved':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const renderLogEntry = ({ item }: { item: AuditLogEntry }) => (
    <TouchableOpacity
      style={styles.logEntry}
      onPress={() => {
        setSelectedEntry(item);
        setShowDetails(true);
      }}
    >
      <View style={styles.logHeader}>
        <Text style={styles.operationIcon}>{getOperationIcon(item.operationType)}</Text>
        <View style={styles.logInfo}>
          <Text style={styles.operationType}>
            {item.operationType.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <View
          style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.operationType) }]}
        />
      </View>

      <View style={styles.logDetails}>
        <Text style={styles.dataType}>Data Type: {item.dataType}</Text>
        <Text style={styles.recordCount}>Records: {item.recordCount}</Text>
        {item.dataSize && (
          <Text style={styles.dataSize}>Size: {formatDataSize(item.dataSize)}</Text>
        )}
        {item.duration && (
          <Text style={styles.duration}>Duration: {formatDuration(item.duration)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSession = ({ item }: { item: AuditSession }) => (
    <View style={styles.sessionEntry}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionId}>Session {item.id.substring(0, 8)}...</Text>
        <Text style={styles.sessionTime}>
          {formatTimestamp(item.startTime)}
          {item.endTime && ` - ${formatTimestamp(item.endTime)}`}
        </Text>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalOperations}</Text>
          <Text style={styles.statLabel}>Total Ops</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{item.successfulOperations}</Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{item.failedOperations}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{item.conflictCount}</Text>
          <Text style={styles.statLabel}>Conflicts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDataSize(item.dataSynced)}</Text>
          <Text style={styles.statLabel}>Data</Text>
        </View>
      </View>
    </View>
  );

  const renderMetrics = () => {
    if (!privacyMetrics) return null;

    return (
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Sync Activity (Last 30 Days)</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Sessions:</Text>
            <Text style={styles.metricValue}>{privacyMetrics.totalSyncSessions}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Average Duration:</Text>
            <Text style={styles.metricValue}>
              {formatDuration(privacyMetrics.averageSessionDuration)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Data Transferred:</Text>
            <Text style={styles.metricValue}>
              {formatDataSize(privacyMetrics.dataTransferredLast30Days)}
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Quality Metrics</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Conflict Rate:</Text>
            <Text style={styles.metricValue}>
              {privacyMetrics.conflictResolutionRate.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Connectivity Reliability:</Text>
            <Text style={styles.metricValue}>
              {privacyMetrics.deviceConnectivityReliability.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Privacy Compliance</Text>
          <View style={styles.privacyScore}>
            <Text
              style={[
                styles.privacyScoreValue,
                { color: privacyMetrics.privacyComplianceScore >= 90 ? '#4CAF50' : '#FF9800' },
              ]}
            >
              {privacyMetrics.privacyComplianceScore.toFixed(0)}%
            </Text>
            <Text style={styles.privacyScoreLabel}>
              {privacyMetrics.privacyComplianceScore >= 90 ? 'Excellent' : 'Good'}
            </Text>
          </View>
          <Text style={styles.privacyNote}>
            This score reflects adherence to privacy-first principles in sync operations. No
            sensitive health data is exposed in audit trails.
          </Text>
        </View>
      </View>
    );
  };

  const renderDetailsModal = () => (
    <Modal visible={showDetails} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Operation Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedEntry && (
            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Operation:</Text>
                <Text style={styles.detailValue}>
                  {getOperationIcon(selectedEntry.operationType)}{' '}
                  {selectedEntry.operationType.replace(/_/g, ' ')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp:</Text>
                <Text style={styles.detailValue}>{formatTimestamp(selectedEntry.timestamp)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data Type:</Text>
                <Text style={styles.detailValue}>{selectedEntry.dataType}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Record Count:</Text>
                <Text style={styles.detailValue}>{selectedEntry.recordCount}</Text>
              </View>

              {selectedEntry.dataSize && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Data Size:</Text>
                  <Text style={styles.detailValue}>{formatDataSize(selectedEntry.dataSize)}</Text>
                </View>
              )}

              {selectedEntry.duration && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{formatDuration(selectedEntry.duration)}</Text>
                </View>
              )}

              {selectedEntry.networkType && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Network:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.networkType}</Text>
                </View>
              )}

              {selectedEntry.errorCode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Error:</Text>
                  <Text style={[styles.detailValue, { color: '#F44336' }]}>
                    {selectedEntry.errorCode}
                  </Text>
                </View>
              )}

              {selectedEntry.conflictResolution && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resolution:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.conflictResolution}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Session ID:</Text>
                <Text style={styles.detailValue}>{selectedEntry.sessionId}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Device Hash:</Text>
                <Text style={styles.detailValue}>{selectedEntry.deviceIdHash}</Text>
              </View>

              <View style={styles.privacyNotice}>
                <Text style={styles.privacyNoticeText}>
                  🔒 Privacy Notice: This audit log contains no sensitive health data. Only metadata
                  about sync operations is recorded for transparency.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading audit data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Audit Trail</Text>
        <Text style={styles.subtitle}>
          Transparent view of data movement without content exposure
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
            Logs ({auditLogs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.activeTab]}
          onPress={() => setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.activeTabText]}>
            Sessions ({auditSessions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'metrics' && styles.activeTab]}
          onPress={() => setActiveTab('metrics')}
        >
          <Text style={[styles.tabText, activeTab === 'metrics' && styles.activeTabText]}>
            Metrics
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'logs' && (
          <FlatList
            data={auditLogs}
            renderItem={renderLogEntry}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No audit logs available</Text>
              </View>
            }
          />
        )}

        {activeTab === 'sessions' && (
          <FlatList
            data={auditSessions}
            renderItem={renderSession}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No audit sessions available</Text>
              </View>
            }
          />
        )}

        {activeTab === 'metrics' && renderMetrics()}
      </View>

      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  logEntry: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  operationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  operationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataType: {
    fontSize: 12,
    color: '#666666',
  },
  recordCount: {
    fontSize: 12,
    color: '#666666',
  },
  dataSize: {
    fontSize: 12,
    color: '#666666',
  },
  duration: {
    fontSize: 12,
    color: '#666666',
  },
  sessionEntry: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  sessionTime: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  metricsContainer: {
    padding: 16,
  },
  metricCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  privacyScore: {
    alignItems: 'center',
    marginBottom: 12,
  },
  privacyScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  privacyScoreLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  privacyNote: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
  },
  detailsContent: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    fontWeight: '500',
  },
  privacyNotice: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: '#0066CC',
    textAlign: 'center',
  },
});
