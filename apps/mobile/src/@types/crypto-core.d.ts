// Crypto Core type stubs for mobile
declare module '@aura/crypto-core/key_rotation/sync' {
  export interface DeviceSyncConfig {
    deviceId: string;
    timeout?: number;
    retryAttempts?: number;
    syncInterval?: number;
  }

  export interface SyncResult {
    success: boolean;
    syncedDevices: string[];
    failedDevices: string[];
    conflicts: any[];
    timestamp: Date;
  }

  export class CrossDeviceRotationSync {
    constructor(deviceId: string | null, config?: DeviceSyncConfig);

    initiateRotation(devices: string[], rotationType: 'Scheduled' | 'Emergency'): Promise<string>;
    resolveConflict(conflictType: string, resolution: string): Promise<boolean>;
    syncOfflineDevice(deviceId: string, strategy?: string): Promise<void>;
    refreshSyncStatus(): Promise<SyncResult>;
    getConnectedDevices(): string[];
    registerOfflineDevice(deviceId: string): Promise<void>;
    cleanup(): void;

    // Additional methods that are being called
    initiate_cross_device_rotation(
      devices: string[],
      rotationType: 'Scheduled' | 'Emergency'
    ): Promise<string>;
    resolve_rotation_conflict(conflictType: string, resolution: string): Promise<boolean>;
    handle_offline_device_sync(deviceId: string, strategy?: string): Promise<void>;
    process_delayed_sync(): Promise<void>;
  }
}

declare module '@aura/crypto-core/src/key_rotation/emergency' {
  export interface EmergencyRotationConfig {
    deviceId: string;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeout?: number;
  }

  export interface EmergencyRotationResult {
    success: boolean;
    rotationId: string;
    newKeys: string[];
    affectedDevices: string[];
    timestamp: Date;
    reason: string;
  }

  export class EmergencyKeyRotation {
    constructor(config: EmergencyRotationConfig);

    initiateEmergencyRotation(
      reason: string,
      priority: 'low' | 'medium' | 'high' | 'critical'
    ): Promise<EmergencyRotationResult>;
    validateEmergencyConditions(): Promise<boolean>;
    notifyDevices(devices: string[], message: string): Promise<void>;
    rollbackRotation(rotationId: string): Promise<boolean>;
    getRotationHistory(): Promise<EmergencyRotationResult[]>;
    cleanup(): void;
  }

  export class EmergencyRotationManager {
    constructor(config: EmergencyRotationConfig);

    initiateEmergencyRotation(
      reason: string,
      priority: 'low' | 'medium' | 'high' | 'critical'
    ): Promise<EmergencyRotationResult>;
    validateEmergencyConditions(): Promise<boolean>;
    notifyDevices(devices: string[], message: string): Promise<void>;
    rollbackRotation(rotationId: string): Promise<boolean>;
    getRotationHistory(): Promise<EmergencyRotationResult[]>;
    cleanup(): void;
  }
}
