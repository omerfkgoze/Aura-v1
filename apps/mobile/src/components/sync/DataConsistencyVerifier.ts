/**
 * Data Consistency Verification Service
 *
 * Verifies data integrity and consistency across synchronized devices
 * while maintaining zero-knowledge architecture and privacy protection.
 *
 * Features:
 * - Cross-device data consistency verification
 * - Conflict detection and reporting
 * - Integrity verification using checksums
 * - Privacy-safe verification without exposing content
 * - Automated and manual consistency checks
 */

import {
  ConsistencyState,
  ConsistencyCheckResult,
  InconsistencyReport,
  DeviceSyncState,
  SyncEvent,
  ConsistencyCheckListener,
} from './types';
import { CryptoEnvelope } from '../../services/EncryptedDataService';

export interface DataRecord {
  readonly id: string;
  readonly type: 'cycle_data' | 'user_prefs' | 'device_keys';
  readonly version: number;
  readonly deviceId: string;
  readonly lastModified: Date;
  readonly checksum: string;
  readonly size: number; // bytes, for verification without content access
}

export interface ConsistencyCheckOptions {
  readonly deviceIds?: string[]; // specific devices to check, or all if undefined
  readonly recordTypes?: string[]; // specific record types to check, or all if undefined
  readonly includeDeleted?: boolean; // include deleted records in consistency check
  readonly maxAge?: number; // only check records newer than this (milliseconds)
  readonly batchSize?: number; // number of records to process per batch
}

export interface VerificationProgress {
  readonly totalRecords: number;
  readonly processedRecords: number;
  readonly currentBatch: number;
  readonly totalBatches: number;
  readonly inconsistenciesFound: number;
  readonly estimatedTimeRemaining: number; // milliseconds
}

export class DataConsistencyVerifier {
  private verificationInProgress: boolean = false;
  private currentProgress: VerificationProgress | null = null;
  private listeners: Set<ConsistencyCheckListener> = new Set();

  constructor() {
    // Initialize verifier
  }

  /**
   * Perform comprehensive data consistency check across devices
   */
  public async performConsistencyCheck(
    deviceStates: DeviceSyncState[],
    options: ConsistencyCheckOptions = {}
  ): Promise<ConsistencyCheckResult> {
    if (this.verificationInProgress) {
      throw new Error('Consistency check already in progress');
    }

    this.verificationInProgress = true;
    const startTime = Date.now();

    try {
      // Filter devices based on options
      const targetDevices = this.filterTargetDevices(deviceStates, options);

      if (targetDevices.length < 2) {
        return this.createEmptyResult(
          targetDevices.map(d => d.deviceId),
          Date.now() - startTime
        );
      }

      // Get data records from each device for comparison
      const deviceRecords = await this.gatherDeviceRecords(targetDevices, options);

      // Perform consistency verification
      const inconsistencies = await this.verifyConsistency(deviceRecords, options);

      // Calculate final result
      const result: ConsistencyCheckResult = {
        isConsistent: inconsistencies.length === 0,
        checkedRecords: this.calculateTotalRecords(deviceRecords),
        inconsistencies,
        duration: Date.now() - startTime,
        devicesCovered: targetDevices.map(d => d.deviceId),
        completionPercentage: 100,
      };

      this.notifyListeners(result);
      return result;
    } finally {
      this.verificationInProgress = false;
      this.currentProgress = null;
    }
  }

  /**
   * Verify consistency for a specific record across devices
   */
  public async verifyRecordConsistency(
    recordId: string,
    deviceStates: DeviceSyncState[]
  ): Promise<InconsistencyReport[]> {
    const inconsistencies: InconsistencyReport[] = [];
    const recordVersions = new Map<string, DataRecord>();

    // Gather record versions from all devices
    for (const device of deviceStates) {
      if (!device.isOnline) continue;

      try {
        const record = await this.getRecordFromDevice(recordId, device.deviceId);
        if (record) {
          recordVersions.set(device.deviceId, record);
        }
      } catch (error) {
        console.error(`Error getting record ${recordId} from device ${device.deviceId}:`, error);
      }
    }

    if (recordVersions.size < 2) {
      return inconsistencies; // Cannot verify consistency with less than 2 versions
    }

    // Compare record versions
    const versions = Array.from(recordVersions.values());
    const baseRecord = versions[0];

    for (let i = 1; i < versions.length; i++) {
      const compareRecord = versions[i];
      const inconsistency = this.compareRecords(baseRecord, compareRecord);

      if (inconsistency) {
        inconsistencies.push(inconsistency);
      }
    }

    return inconsistencies;
  }

  /**
   * Generate consistency state for a device
   */
  public async generateConsistencyState(
    deviceId: string,
    allDeviceStates: DeviceSyncState[]
  ): Promise<ConsistencyState> {
    const onlineDevices = allDeviceStates.filter(d => d.isOnline && d.deviceId !== deviceId);

    if (onlineDevices.length === 0) {
      return {
        isConsistent: true, // No other devices to compare with
        lastVerified: new Date(),
        inconsistencies: [],
        verificationProgress: 100,
        recordsChecked: 0,
        totalRecords: 0,
      };
    }

    // Perform quick consistency check for this device
    const quickCheckResult = await this.performQuickConsistencyCheck(deviceId, onlineDevices);

    return {
      isConsistent: quickCheckResult.inconsistencies.length === 0,
      lastVerified: new Date(),
      inconsistencies: quickCheckResult.inconsistencies,
      verificationProgress: 100,
      recordsChecked: quickCheckResult.checkedRecords,
      totalRecords: quickCheckResult.checkedRecords,
    };
  }

  /**
   * Get current verification progress
   */
  public getVerificationProgress(): VerificationProgress | null {
    return this.currentProgress;
  }

  /**
   * Check if verification is in progress
   */
  public isVerificationInProgress(): boolean {
    return this.verificationInProgress;
  }

  /**
   * Register consistency check listener
   */
  public addListener(listener: ConsistencyCheckListener): void {
    this.listeners.add(listener);
  }

  /**
   * Unregister consistency check listener
   */
  public removeListener(listener: ConsistencyCheckListener): void {
    this.listeners.delete(listener);
  }

  // Private methods

  private filterTargetDevices(
    deviceStates: DeviceSyncState[],
    options: ConsistencyCheckOptions
  ): DeviceSyncState[] {
    let filtered = deviceStates.filter(d => d.isOnline);

    if (options.deviceIds) {
      filtered = filtered.filter(d => options.deviceIds!.includes(d.deviceId));
    }

    return filtered;
  }

  private async gatherDeviceRecords(
    devices: DeviceSyncState[],
    options: ConsistencyCheckOptions
  ): Promise<Map<string, DataRecord[]>> {
    const deviceRecords = new Map<string, DataRecord[]>();

    for (const device of devices) {
      try {
        const records = await this.getRecordsFromDevice(device.deviceId, options);
        deviceRecords.set(device.deviceId, records);
      } catch (error) {
        console.error(`Error gathering records from device ${device.deviceId}:`, error);
        deviceRecords.set(device.deviceId, []);
      }
    }

    return deviceRecords;
  }

  private async getRecordsFromDevice(
    deviceId: string,
    options: ConsistencyCheckOptions
  ): Promise<DataRecord[]> {
    // In a real implementation, this would fetch actual records from the device
    // For now, we'll simulate record retrieval

    const mockRecords: DataRecord[] = [
      {
        id: 'record_1',
        type: 'cycle_data',
        version: 1,
        deviceId: deviceId,
        lastModified: new Date(Date.now() - 86400000), // 1 day ago
        checksum: 'abc123',
        size: 1024,
      },
      {
        id: 'record_2',
        type: 'user_prefs',
        version: 2,
        deviceId: deviceId,
        lastModified: new Date(Date.now() - 3600000), // 1 hour ago
        checksum: 'def456',
        size: 512,
      },
    ];

    // Apply filters based on options
    let filteredRecords = mockRecords;

    if (options.recordTypes) {
      filteredRecords = filteredRecords.filter(r => options.recordTypes!.includes(r.type));
    }

    if (options.maxAge) {
      const cutoffTime = Date.now() - options.maxAge;
      filteredRecords = filteredRecords.filter(r => r.lastModified.getTime() > cutoffTime);
    }

    return filteredRecords;
  }

  private async getRecordFromDevice(
    recordId: string,
    deviceId: string
  ): Promise<DataRecord | null> {
    // In a real implementation, this would fetch a specific record from the device
    // For now, we'll simulate record retrieval

    return {
      id: recordId,
      type: 'cycle_data',
      version: 1,
      deviceId: deviceId,
      lastModified: new Date(),
      checksum: 'abc123',
      size: 1024,
    };
  }

  private async verifyConsistency(
    deviceRecords: Map<string, DataRecord[]>,
    options: ConsistencyCheckOptions
  ): Promise<InconsistencyReport[]> {
    const inconsistencies: InconsistencyReport[] = [];
    const allRecordIds = new Set<string>();

    // Collect all unique record IDs
    for (const records of deviceRecords.values()) {
      for (const record of records) {
        allRecordIds.add(record.id);
      }
    }

    const totalRecords = allRecordIds.size;
    let processedRecords = 0;

    // Update progress
    this.updateProgress({
      totalRecords,
      processedRecords: 0,
      currentBatch: 1,
      totalBatches: Math.ceil(totalRecords / (options.batchSize || 100)),
      inconsistenciesFound: 0,
      estimatedTimeRemaining: 0,
    });

    // Check consistency for each record
    for (const recordId of allRecordIds) {
      const recordInconsistencies = await this.verifyRecordAcrossDevices(recordId, deviceRecords);

      inconsistencies.push(...recordInconsistencies);
      processedRecords++;

      // Update progress periodically
      if (processedRecords % 10 === 0) {
        this.updateProgress({
          totalRecords,
          processedRecords,
          currentBatch: Math.ceil(processedRecords / (options.batchSize || 100)),
          totalBatches: Math.ceil(totalRecords / (options.batchSize || 100)),
          inconsistenciesFound: inconsistencies.length,
          estimatedTimeRemaining: this.estimateTimeRemaining(processedRecords, totalRecords),
        });
      }
    }

    return inconsistencies;
  }

  private async verifyRecordAcrossDevices(
    recordId: string,
    deviceRecords: Map<string, DataRecord[]>
  ): Promise<InconsistencyReport[]> {
    const inconsistencies: InconsistencyReport[] = [];
    const recordVersions: DataRecord[] = [];

    // Collect all versions of this record
    for (const [deviceId, records] of deviceRecords) {
      const record = records.find(r => r.id === recordId);
      if (record) {
        recordVersions.push(record);
      }
    }

    if (recordVersions.length < 2) {
      return inconsistencies; // Cannot verify consistency with less than 2 versions
    }

    // Check for inconsistencies between versions
    const baseRecord = recordVersions[0];

    for (let i = 1; i < recordVersions.length; i++) {
      const compareRecord = recordVersions[i];
      const inconsistency = this.compareRecords(baseRecord, compareRecord);

      if (inconsistency) {
        inconsistencies.push(inconsistency);
      }
    }

    return inconsistencies;
  }

  private compareRecords(record1: DataRecord, record2: DataRecord): InconsistencyReport | null {
    // Check for version mismatch
    if (record1.version !== record2.version) {
      return {
        recordId: record1.id,
        recordType: record1.type,
        conflictType: 'version_mismatch',
        timestamp: new Date(),
        affectedDevices: [record1.deviceId, record2.deviceId],
        severity: 'medium',
        autoResolvable: true,
      };
    }

    // Check for checksum mismatch (data corruption)
    if (record1.checksum !== record2.checksum) {
      return {
        recordId: record1.id,
        recordType: record1.type,
        conflictType: 'data_corruption',
        timestamp: new Date(),
        affectedDevices: [record1.deviceId, record2.deviceId],
        severity: 'high',
        autoResolvable: false,
      };
    }

    // Check for significant timestamp differences
    const timeDiff = Math.abs(record1.lastModified.getTime() - record2.lastModified.getTime());
    if (timeDiff > 300000) {
      // 5 minutes threshold
      return {
        recordId: record1.id,
        recordType: record1.type,
        conflictType: 'version_mismatch',
        timestamp: new Date(),
        affectedDevices: [record1.deviceId, record2.deviceId],
        severity: 'low',
        autoResolvable: true,
      };
    }

    return null; // Records are consistent
  }

  private async performQuickConsistencyCheck(
    deviceId: string,
    otherDevices: DeviceSyncState[]
  ): Promise<ConsistencyCheckResult> {
    // Perform a quick consistency check by comparing record counts and latest timestamps
    // This is used for real-time consistency state updates

    const inconsistencies: InconsistencyReport[] = [];
    let checkedRecords = 0;

    try {
      // In a real implementation, this would perform actual quick checks
      // For now, we'll simulate a quick check result

      checkedRecords = 50; // Simulated number of checked records

      return {
        isConsistent: true,
        checkedRecords,
        inconsistencies,
        duration: 100, // 100ms for quick check
        devicesCovered: [deviceId, ...otherDevices.map(d => d.deviceId)],
        completionPercentage: 100,
      };
    } catch (error) {
      console.error('Error performing quick consistency check:', error);

      return {
        isConsistent: false,
        checkedRecords,
        inconsistencies,
        duration: 100,
        devicesCovered: [deviceId],
        completionPercentage: 100,
      };
    }
  }

  private calculateTotalRecords(deviceRecords: Map<string, DataRecord[]>): number {
    const allRecordIds = new Set<string>();

    for (const records of deviceRecords.values()) {
      for (const record of records) {
        allRecordIds.add(record.id);
      }
    }

    return allRecordIds.size;
  }

  private createEmptyResult(deviceIds: string[], duration: number): ConsistencyCheckResult {
    return {
      isConsistent: true,
      checkedRecords: 0,
      inconsistencies: [],
      duration,
      devicesCovered: deviceIds,
      completionPercentage: 100,
    };
  }

  private updateProgress(progress: VerificationProgress): void {
    this.currentProgress = progress;

    // Notify progress to listeners (would be implemented in a real scenario)
    // this.emit('verification_progress', progress);
  }

  private estimateTimeRemaining(processed: number, total: number): number {
    if (processed === 0) return 0;

    const progress = processed / total;
    const elapsedTime = Date.now() - (this.currentProgress?.estimatedTimeRemaining || Date.now());

    return Math.round(elapsedTime / progress - elapsedTime);
  }

  private notifyListeners(result: ConsistencyCheckResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('Error notifying consistency check listener:', error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.verificationInProgress = false;
    this.currentProgress = null;
    this.listeners.clear();
  }
}
