// Encrypted Storage Hooks
export { default as useEncryptedStorage } from './useEncryptedStorage';

// Audit Trail Hooks
export { useAuditTrail } from './useAuditTrail';

// Cross-Platform Device Hooks
export { useCrossDeviceSync } from './useCrossDeviceSync';
export { useDeviceCapabilities } from './useDeviceCapabilities';
export { useMultiDevice } from './useMultiDevice';

// Security and Recovery Hooks
export { useEmergencyRotation } from './useEmergencyRotation';
export { useRecovery } from './useRecovery';

// Re-export hook-related types
export type { UseAuditTrailOptions, UseAuditTrailReturn } from './useAuditTrail';
