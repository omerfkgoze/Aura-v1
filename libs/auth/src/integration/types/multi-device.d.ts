/**
 * Multi-Device Context and Management Types
 */
export interface MultiDeviceContext {
  userId: string;
  primaryDeviceId: string;
  registeredDevices: DeviceRegistration[];
  trustedDevices: string[];
  pendingDevices: DevicePendingRegistration[];
  deviceSyncEnabled: boolean;
  syncEncryptionKey?: string;
  lastSyncTimestamp?: Date;
  deviceTrustMatrix: DeviceTrustLevel[];
  secureChannels: SecureDeviceChannel[];
  handoffEnabled: boolean;
  handoffHistory: AuthenticationHandoff[];
}
export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: DevicePlatform;
  registeredAt: Date;
  registrationMethod: DeviceRegistrationMethod;
  verificationCompleted: boolean;
  capabilities: DeviceCapability[];
  hardwareSecurityLevel: HardwareSecurityLevel;
  biometricCapabilities: BiometricCapability[];
  trustLevel: DeviceTrustLevel;
  status: DeviceStatus;
  lastSeenAt: Date;
  deviceKeys: DeviceKeyInfo[];
}
export interface DevicePendingRegistration {
  deviceId: string;
  deviceFingerprint: string;
  registrationToken: string;
  initiatedAt: Date;
  expiresAt: Date;
  verificationRequired: VerificationRequirement[];
  userApprovalRequired: boolean;
  approvalMethod: DeviceApprovalMethod[];
}
export interface SecureDeviceChannel {
  channelId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  encryptionKey: string;
  macKey: string;
  establishedAt: Date;
  channelType: 'sync' | 'handoff' | 'recovery' | 'notification';
  bidirectional: boolean;
  persistent: boolean;
  lastUsed: Date;
  messageCount: number;
  errorCount: number;
}
export interface AuthenticationHandoff {
  handoffId: string;
  fromDeviceId: string;
  toDeviceId: string;
  initiatedAt: Date;
  completedAt?: Date;
  handoffType: HandoffType;
  userVerificationRequired: boolean;
  biometricVerificationCompleted: boolean;
  proximityVerified: boolean;
  sessionContext: SessionContextHandoff;
  dataAccessMaintained: boolean;
  status: HandoffStatus;
  failureReason?: string;
}
export interface DeviceKeyInfo {
  keyId: string;
  keyType: DeviceKeyType;
  keyPurpose: DeviceKeyPurpose;
  algorithm: string;
  keyLength: number;
  hardwareBacked: boolean;
  createdAt: Date;
  expiresAt?: Date;
  rotationRequired: boolean;
  usageCount: number;
  lastUsed?: Date;
}
export interface SessionContextHandoff {
  sessionId: string;
  authenticationLevel: number;
  dataAccessPermissions: string[];
  temporaryKeys: string[];
  contextValidUntil: Date;
  requiresRefresh: boolean;
}
export type DeviceType = 'smartphone' | 'tablet' | 'desktop' | 'laptop' | 'wearable' | 'iot';
export type DevicePlatform = 'ios' | 'android' | 'web' | 'macos' | 'windows' | 'linux';
export type DeviceRegistrationMethod =
  | 'qr_code'
  | 'push_notification'
  | 'email_link'
  | 'proximity_pairing'
  | 'recovery_phrase'
  | 'admin_approval';
export type DeviceCapability =
  | 'biometric_auth'
  | 'hardware_security'
  | 'secure_storage'
  | 'push_notifications'
  | 'proximity_detection'
  | 'nfc'
  | 'bluetooth';
export type HardwareSecurityLevel =
  | 'none'
  | 'software'
  | 'trusted_execution'
  | 'secure_element'
  | 'strongbox';
export type BiometricCapability =
  | 'fingerprint'
  | 'face_recognition'
  | 'voice_recognition'
  | 'iris_scan'
  | 'palm_print';
export type DeviceTrustLevel =
  | 'untrusted'
  | 'pending_verification'
  | 'basic_trust'
  | 'verified'
  | 'high_trust'
  | 'full_trust';
export type DeviceStatus = 'active' | 'inactive' | 'suspended' | 'compromised' | 'deregistered';
export type VerificationRequirement =
  | 'biometric_verification'
  | 'push_notification_approval'
  | 'email_confirmation'
  | 'sms_verification'
  | 'proximity_verification'
  | 'admin_approval';
export type DeviceApprovalMethod =
  | 'automatic'
  | 'user_approval'
  | 'admin_approval'
  | 'multi_device_consensus';
export type HandoffType =
  | 'user_initiated'
  | 'automatic_proximity'
  | 'scheduled_transfer'
  | 'emergency_handoff'
  | 'maintenance_handoff';
export type HandoffStatus =
  | 'initiated'
  | 'pending_verification'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type DeviceKeyType =
  | 'device_identity'
  | 'encryption'
  | 'signing'
  | 'attestation'
  | 'recovery';
export type DeviceKeyPurpose =
  | 'device_authentication'
  | 'data_encryption'
  | 'communication_signing'
  | 'key_agreement'
  | 'backup_recovery';
