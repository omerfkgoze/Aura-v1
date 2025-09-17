/**
 * Emergency Access Codes
 *
 * Implements one-time emergency access codes with time-limited validity.
 * Provides secure emergency access when primary authentication methods fail.
 */
import { __awaiter } from 'tslib';
/**
 * Characters allowed in emergency codes
 * Excludes ambiguous characters (0, O, I, l, 1)
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
/**
 * Generate cryptographically secure random bytes
 */
function getSecureRandomBytes(length) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  } else if (typeof require !== 'undefined') {
    try {
      const nodeCrypto = require('crypto');
      return new Uint8Array(nodeCrypto.randomBytes(length));
    } catch (error) {
      throw new Error('No secure random number generator available');
    }
  } else {
    throw new Error('No secure random number generator available');
  }
}
/**
 * Generate a cryptographically secure random code
 */
function generateSecureCode(length) {
  const randomBytes = getSecureRandomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = randomBytes[i] % CODE_ALPHABET.length;
    code += CODE_ALPHABET[index];
  }
  return code;
}
/**
 * Generate a unique code identifier
 */
function generateCodeId() {
  const timestamp = Date.now().toString(36);
  const random = generateSecureCode(8);
  return `${timestamp}-${random}`;
}
/**
 * Hash a code for secure storage
 */
function hashCode(code, salt) {
  return __awaiter(this, void 0, void 0, function* () {
    const encoder = new TextEncoder();
    const data = encoder.encode(code + salt);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = yield crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    } else if (typeof require !== 'undefined') {
      try {
        const nodeCrypto = require('crypto');
        const hash = nodeCrypto.createHash('sha256');
        hash.update(data);
        return hash.digest('hex');
      } catch (error) {
        throw new Error('Hashing not available');
      }
    } else {
      throw new Error('Hashing not available');
    }
  });
}
/**
 * Verify a code against its hash
 */
function verifyCodeHash(code, hash, salt) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const computedHash = yield hashCode(code, salt);
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  });
}
/**
 * Default emergency code configuration
 */
export const DEFAULT_EMERGENCY_CONFIG = {
  codeLength: 12,
  validityDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxAttempts: 3,
  type: 'emergency',
};
/**
 * Generate an emergency access code
 */
export function generateEmergencyCode(userId, config = {}) {
  return __awaiter(this, void 0, void 0, function* () {
    const finalConfig = Object.assign(Object.assign({}, DEFAULT_EMERGENCY_CONFIG), config);
    if (finalConfig.codeLength < 8) {
      throw new Error('Code length must be at least 8 characters');
    }
    // Allow negative values for testing expired codes
    if (finalConfig.validityDuration >= 0 && finalConfig.validityDuration < 60 * 1000) {
      throw new Error('Validity duration must be at least 1 minute');
    }
    const codeId = generateCodeId();
    const plainTextCode = generateSecureCode(finalConfig.codeLength);
    const salt = generateSecureCode(16);
    const hashedCode = yield hashCode(plainTextCode, salt);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + finalConfig.validityDuration);
    const code = {
      codeId,
      code: `${hashedCode}:${salt}`, // Store hash and salt together
      userId,
      type: finalConfig.type,
      expiresAt,
      createdAt: now,
      used: false,
      attempts: 0,
      maxAttempts: finalConfig.maxAttempts,
    };
    return { code, plainTextCode };
  });
}
/**
 * Validate an emergency access code
 */
export function validateEmergencyCode(providedCode, storedCode) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      // Check if code is already used
      if (storedCode.used) {
        return {
          valid: false,
          error: 'Code has already been used',
          remainingAttempts: 0,
        };
      }
      // Check if code has expired
      if (storedCode.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'Code has expired',
          remainingAttempts: Math.max(0, storedCode.maxAttempts - storedCode.attempts),
        };
      }
      // Check attempt limits
      if (storedCode.attempts >= storedCode.maxAttempts) {
        return {
          valid: false,
          error: 'Maximum attempts exceeded',
          remainingAttempts: 0,
        };
      }
      // Extract hash and salt from stored code
      const [hash, salt] = storedCode.code.split(':');
      if (!hash || !salt) {
        return {
          valid: false,
          error: 'Invalid stored code format',
          remainingAttempts: Math.max(0, storedCode.maxAttempts - storedCode.attempts - 1),
        };
      }
      // Verify the code
      const isValid = yield verifyCodeHash(providedCode.toUpperCase(), hash, salt);
      if (isValid) {
        return {
          valid: true,
          remainingAttempts: storedCode.maxAttempts - storedCode.attempts - 1,
        };
      } else {
        return {
          valid: false,
          error: 'Invalid code',
          remainingAttempts: Math.max(0, storedCode.maxAttempts - storedCode.attempts - 1),
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        remainingAttempts: Math.max(0, storedCode.maxAttempts - storedCode.attempts),
      };
    }
  });
}
/**
 * Mark an emergency code as used
 */
export function markCodeAsUsed(code, usedFromIp) {
  const result = Object.assign(Object.assign({}, code), {
    used: true,
    usedAt: new Date(),
    attempts: code.attempts + 1,
  });
  if (usedFromIp !== undefined) {
    result.usedFromIp = usedFromIp;
  }
  return result;
}
/**
 * Increment attempt counter for a code
 */
export function incrementAttempts(code) {
  return Object.assign(Object.assign({}, code), { attempts: code.attempts + 1 });
}
/**
 * Check if a code is still valid (not expired, not used, attempts remaining)
 */
export function isCodeValid(code) {
  return !code.used && code.expiresAt > new Date() && code.attempts < code.maxAttempts;
}
/**
 * Get time remaining until code expires
 */
export function getTimeRemaining(code) {
  const now = new Date();
  const remaining = code.expiresAt.getTime() - now.getTime();
  if (remaining <= 0) {
    return {
      milliseconds: 0,
      minutes: 0,
      hours: 0,
      expired: true,
    };
  }
  return {
    milliseconds: remaining,
    minutes: Math.floor(remaining / (60 * 1000)),
    hours: Math.floor(remaining / (60 * 60 * 1000)),
    expired: false,
  };
}
/**
 * Generate multiple emergency codes for different scenarios
 */
export function generateEmergencyCodeSet(userId, configs) {
  return __awaiter(this, void 0, void 0, function* () {
    const emergencyConfig = Object.assign(
      Object.assign(Object.assign({}, DEFAULT_EMERGENCY_CONFIG), {
        type: 'emergency',
        validityDuration: 2 * 60 * 60 * 1000,
      }),
      configs === null || configs === void 0 ? void 0 : configs.emergency
    );
    const recoveryConfig = Object.assign(
      Object.assign(Object.assign({}, DEFAULT_EMERGENCY_CONFIG), {
        type: 'recovery',
        validityDuration: 7 * 24 * 60 * 60 * 1000,
      }),
      configs === null || configs === void 0 ? void 0 : configs.recovery
    );
    const backupConfig = Object.assign(
      Object.assign(Object.assign({}, DEFAULT_EMERGENCY_CONFIG), {
        type: 'backup',
        validityDuration: 30 * 24 * 60 * 60 * 1000,
      }),
      configs === null || configs === void 0 ? void 0 : configs.backup
    );
    const [emergency, recovery, backup] = yield Promise.all([
      generateEmergencyCode(userId, emergencyConfig),
      generateEmergencyCode(userId, recoveryConfig),
      generateEmergencyCode(userId, backupConfig),
    ]);
    return { emergency, recovery, backup };
  });
}
/**
 * Format emergency code for display (with spaces for readability)
 */
export function formatCodeForDisplay(code) {
  var _a;
  // Add spaces every 4 characters for readability
  return ((_a = code.match(/.{1,4}/g)) === null || _a === void 0 ? void 0 : _a.join(' ')) || code;
}
/**
 * Parse and clean user input code
 */
export function parseUserInputCode(input) {
  // Remove spaces, convert to uppercase, remove invalid characters
  return input
    .replace(/\s/g, '')
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, '');
}
/**
 * Get security recommendations for emergency codes
 */
export function getEmergencyCodeRecommendations() {
  return {
    storage: [
      'Print emergency codes immediately after generation',
      'Store printed codes in a secure physical location',
      'Do not store codes digitally on connected devices',
      'Consider storing codes in a safety deposit box',
    ],
    usage: [
      'Use emergency codes only when primary authentication fails',
      'Each code can only be used once',
      'Enter codes carefully - limited attempts allowed',
      'Generate new codes after using any emergency code',
    ],
    security: [
      'Emergency codes have limited validity periods',
      'Codes are case-insensitive but exclude ambiguous characters',
      'Failed attempts are logged for security monitoring',
      'Codes are cryptographically secure and cannot be guessed',
    ],
    warnings: [
      'Anyone with access to your emergency code can access your account',
      'Do not share emergency codes with anyone',
      'Emergency codes expire automatically - check validity regularly',
      'Treat emergency codes with the same security as passwords',
    ],
  };
}
//# sourceMappingURL=emergency.js.map
