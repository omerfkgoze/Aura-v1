/**
 * Authentication Event Types and Data Structures
 * Defines authentication-specific event types and context data
 */

import type { BaseEvent, EventType } from './types.js';
import type { RiskLevel, AuthenticationMethod } from '../types.js';

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

  // Authentication-specific data
  authMethod: AuthenticationMethod;
  authStrength: number;
  hardwareVerified: boolean;
  biometricVerified: boolean;

  // Credential information (privacy-safe)
  credentialId?: string;
  credentialType?: string;

  // Challenge/response context
  challengeId?: string;
  responseValid?: boolean;

  // Device and location
  deviceInfo: DeviceEventInfo;
  locationInfo?: LocationEventInfo;

  // Risk assessment
  riskLevel: RiskLevel;
  riskFactors: string[];

  // Failure details (if applicable)
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

  // Privacy-safe device characteristics
  hardwareCapabilities: string[];
  securityFeatures: string[];

  // Device state
  screenLocked: boolean;
  networkType: string;
  batteryLevel?: number;
}

export interface LocationEventInfo {
  // Privacy-preserving location data
  countryCode: string;
  regionCode?: string;
  cityCode?: string;
  timezone: string;

  // Network-based location
  ipGeolocation: boolean;
  vpnDetected: boolean;
  torDetected: boolean;

  // Location accuracy and privacy
  accuracyLevel: 'country' | 'region' | 'city' | 'precise';
  privacyMode: boolean;
  locationConsentGiven: boolean;
}
