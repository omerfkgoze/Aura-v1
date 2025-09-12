/**
 * Emergency Access Codes
 *
 * Implements one-time emergency access codes with time-limited validity.
 * Provides secure emergency access when primary authentication methods fail.
 */
import { EmergencyAccessCode } from './types';
/**
 * Configuration for emergency code generation
 */
export interface EmergencyCodeConfig {
  /** Length of the generated code */
  codeLength: number;
  /** Validity duration in milliseconds */
  validityDuration: number;
  /** Maximum number of usage attempts */
  maxAttempts: number;
  /** Code type */
  type: EmergencyAccessCode['type'];
}
/**
 * Default emergency code configuration
 */
export declare const DEFAULT_EMERGENCY_CONFIG: EmergencyCodeConfig;
/**
 * Generate an emergency access code
 */
export declare function generateEmergencyCode(
  userId: string,
  config?: Partial<EmergencyCodeConfig>
): Promise<{
  code: EmergencyAccessCode;
  plainTextCode: string;
}>;
/**
 * Validate an emergency access code
 */
export declare function validateEmergencyCode(
  providedCode: string,
  storedCode: EmergencyAccessCode
): Promise<{
  valid: boolean;
  error?: string;
  remainingAttempts?: number;
}>;
/**
 * Mark an emergency code as used
 */
export declare function markCodeAsUsed(
  code: EmergencyAccessCode,
  usedFromIp?: string
): EmergencyAccessCode;
/**
 * Increment attempt counter for a code
 */
export declare function incrementAttempts(code: EmergencyAccessCode): EmergencyAccessCode;
/**
 * Check if a code is still valid (not expired, not used, attempts remaining)
 */
export declare function isCodeValid(code: EmergencyAccessCode): boolean;
/**
 * Get time remaining until code expires
 */
export declare function getTimeRemaining(code: EmergencyAccessCode): {
  milliseconds: number;
  minutes: number;
  hours: number;
  expired: boolean;
};
/**
 * Generate multiple emergency codes for different scenarios
 */
export declare function generateEmergencyCodeSet(
  userId: string,
  configs?: {
    emergency?: Partial<EmergencyCodeConfig>;
    recovery?: Partial<EmergencyCodeConfig>;
    backup?: Partial<EmergencyCodeConfig>;
  }
): Promise<{
  emergency: {
    code: EmergencyAccessCode;
    plainTextCode: string;
  };
  recovery: {
    code: EmergencyAccessCode;
    plainTextCode: string;
  };
  backup: {
    code: EmergencyAccessCode;
    plainTextCode: string;
  };
}>;
/**
 * Format emergency code for display (with spaces for readability)
 */
export declare function formatCodeForDisplay(code: string): string;
/**
 * Parse and clean user input code
 */
export declare function parseUserInputCode(input: string): string;
/**
 * Get security recommendations for emergency codes
 */
export declare function getEmergencyCodeRecommendations(): {
  storage: string[];
  usage: string[];
  security: string[];
  warnings: string[];
};
