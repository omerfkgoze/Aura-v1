/**
 * Authentication Event Types and Data Structures
 * Defines authentication-specific event types and context data
 */
import type { BaseEvent } from './types.js';
import type { RiskLevel, AuthenticationMethod } from '../types/index.js';
export interface AuthenticationEvent extends BaseEvent {
  eventType:
    | 'authentication_started'
    | 'authentication_completed'
    | 'authentication_failed'
    | 'credential_created'
    | 'credential_updated'
    | 'credential_revoked'
    | 'user_verification_started'
    | 'user_verification_completed'
    | 'user_verification_failed'
    | 'biometric_verification'
    | 'hardware_attestation'
    | 'multi_factor_completed';
  authMethod: AuthenticationMethod;
  authStrength: number;
  hardwareVerified: boolean;
  biometricVerified: boolean;
  credentialId?: string;
  credentialType?: string;
  challengeId?: string;
  responseValid?: boolean;
  deviceInfo: DeviceEventInfo;
  locationInfo?: LocationEventInfo;
  riskLevel: RiskLevel;
  riskFactors: string[];
  failureReason?: string;
  failureCode?: string;
  retryCount?: number;
}
export interface DeviceEventInfo {
  deviceId: string;
  deviceType: string;
  platform: string;
  hardwareFingerprint: string;
  softwareVersion: string;
  trustLevel: number;
  hardwareCapabilities: string[];
  securityFeatures: string[];
  screenLocked: boolean;
  networkType: string;
  batteryLevel?: number;
}
export interface LocationEventInfo {
  countryCode: string;
  regionCode?: string;
  cityCode?: string;
  timezone: string;
  ipGeolocation: boolean;
  vpnDetected: boolean;
  torDetected: boolean;
  accuracyLevel: 'country' | 'region' | 'city' | 'precise';
  privacyMode: boolean;
  locationConsentGiven: boolean;
}
