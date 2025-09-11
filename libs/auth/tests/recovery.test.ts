/**
 * Recovery System Test Suite
 *
 * Comprehensive tests for the account recovery system including:
 * - Recovery phrase generation and validation
 * - Shamir secret sharing
 * - Emergency access codes
 * - Recovery validation flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  phraseToSeed,
  createShamirShares,
  reconstructSecret,
  validateShamirShares,
  generateEmergencyCode,
  validateEmergencyCode,
  RecoveryValidator,
  RecoveryManager,
  createRecoveryManager,
  RECOVERY_DEFAULTS,
} from '../src/recovery';

import type {
  RecoveryStorage,
  RecoveryEvents,
  EmergencyAccessCode,
  RecoveryPhrase,
  ShamirShare,
} from '../src/recovery';

// Mock storage implementation for testing
class MockRecoveryStorage implements RecoveryStorage {
  private phrases = new Map<string, RecoveryPhrase>();
  private shamirShares = new Map<string, ShamirShare[]>();
  private emergencyCodes = new Map<string, EmergencyAccessCode>();

  async storeRecoveryPhrase(userId: string, phrase: RecoveryPhrase): Promise<void> {
    this.phrases.set(userId, phrase);
  }

  async getRecoveryPhrase(userId: string): Promise<RecoveryPhrase | null> {
    return this.phrases.get(userId) || null;
  }

  async storeShamirShares(userId: string, shares: ShamirShare[]): Promise<void> {
    this.shamirShares.set(userId, shares);
  }

  async getShamirShares(userId: string): Promise<ShamirShare[]> {
    return this.shamirShares.get(userId) || [];
  }

  async storeEmergencyCode(code: EmergencyAccessCode): Promise<void> {
    this.emergencyCodes.set(code.codeId, code);
  }

  async validateEmergencyCode(codeId: string, code: string): Promise<EmergencyAccessCode | null> {
    // Simple implementation for testing
    for (const [id, storedCode] of this.emergencyCodes) {
      if (storedCode.userId === codeId || id === codeId) {
        return storedCode;
      }
    }
    return null;
  }

  async markCodeAsUsed(codeId: string, usedFromIp?: string): Promise<void> {
    const code = this.emergencyCodes.get(codeId);
    if (code) {
      code.used = true;
      code.usedAt = new Date();
      code.usedFromIp = usedFromIp;
    }
  }

  async cleanupExpiredCodes(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, code] of this.emergencyCodes) {
      if (code.expiresAt < now) {
        this.emergencyCodes.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

describe('Recovery Phrase Generation', () => {
  it('should generate a valid 12-word recovery phrase', async () => {
    const phrase = await generateRecoveryPhrase(12);

    expect(phrase.words).toHaveLength(12);
    expect(phrase.wordCount).toBe(12);
    expect(phrase.entropy).toMatch(/^[0-9a-f]+$/);
    expect(phrase.checksum).toMatch(/^[01]+$/);
    expect(phrase.language).toBe('english');
    expect(phrase.createdAt).toBeInstanceOf(Date);
  });

  it('should generate phrases with different word counts', async () => {
    const wordCounts: Array<12 | 15 | 18 | 21 | 24> = [12, 15, 18, 21, 24];

    for (const count of wordCounts) {
      const phrase = await generateRecoveryPhrase(count);
      expect(phrase.words).toHaveLength(count);
      expect(phrase.wordCount).toBe(count);
    }
  });

  it('should generate unique phrases', async () => {
    const phrase1 = await generateRecoveryPhrase();
    const phrase2 = await generateRecoveryPhrase();

    expect(phrase1.words).not.toEqual(phrase2.words);
    expect(phrase1.entropy).not.toBe(phrase2.entropy);
  });
});

describe('Recovery Phrase Validation', () => {
  it('should validate a correct recovery phrase', async () => {
    const phrase = await generateRecoveryPhrase();
    const isValid = await validateRecoveryPhrase(phrase.words);
    expect(isValid).toBe(true);
  });

  it('should reject invalid word counts', async () => {
    const shortPhrase = ['word1', 'word2', 'word3'];
    const isValid = await validateRecoveryPhrase(shortPhrase);
    expect(isValid).toBe(false);
  });

  it('should reject phrases with invalid words', async () => {
    const invalidPhrase = [
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'invalidword',
    ];
    const isValid = await validateRecoveryPhrase(invalidPhrase);
    expect(isValid).toBe(false);
  });

  it('should reject empty phrases', async () => {
    const isValid = await validateRecoveryPhrase([]);
    expect(isValid).toBe(false);
  });
});

describe('Phrase to Seed Conversion', () => {
  it('should convert phrase to consistent seed', async () => {
    const phrase = await generateRecoveryPhrase();
    const seed1 = await phraseToSeed(phrase);
    const seed2 = await phraseToSeed(phrase);

    expect(seed1).toEqual(seed2);
    expect(seed1).toHaveLength(64); // 512 bits / 8 = 64 bytes
  });

  it('should produce different seeds with passphrases', async () => {
    const phrase = await generateRecoveryPhrase();
    const seed1 = await phraseToSeed(phrase, '');
    const seed2 = await phraseToSeed(phrase, 'passphrase');

    expect(seed1).not.toEqual(seed2);
  });
});

describe('Shamir Secret Sharing', () => {
  it('should create and reconstruct secrets correctly', () => {
    const secret = 'deadbeefcafebabe';
    const shares = createShamirShares({
      totalShares: 5,
      threshold: 3,
      secret,
    });

    expect(shares).toHaveLength(5);
    expect(shares[0].threshold).toBe(3);
    expect(shares[0].totalShares).toBe(5);

    // Test reconstruction with minimum threshold
    const selectedShares = shares.slice(0, 3);
    const reconstructed = reconstructSecret(selectedShares);
    expect(reconstructed).toBe(secret);
  });

  it('should work with different threshold combinations', () => {
    const secret = 'abcdef1234567890';
    const shares = createShamirShares({
      totalShares: 7,
      threshold: 4,
      secret,
    });

    // Try different combinations of shares
    const combinations = [
      shares.slice(0, 4),
      shares.slice(1, 5),
      shares.slice(3, 7),
      [shares[0], shares[2], shares[4], shares[6]],
    ];

    for (const combination of combinations) {
      const reconstructed = reconstructSecret(combination);
      expect(reconstructed).toBe(secret);
    }
  });

  it('should fail with insufficient shares', () => {
    const secret = 'testSecret123';
    const shares = createShamirShares({
      totalShares: 5,
      threshold: 3,
      secret,
    });

    const insufficientShares = shares.slice(0, 2);
    expect(() => reconstructSecret(insufficientShares)).toThrow();
  });

  it('should validate shares correctly', () => {
    const shares = createShamirShares({
      totalShares: 3,
      threshold: 2,
      secret: 'test',
    });

    const validation = validateShamirShares(shares);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid share configurations', () => {
    const shares = createShamirShares({
      totalShares: 3,
      threshold: 2,
      secret: 'test',
    });

    // Modify share to create inconsistency
    shares[1].threshold = 3;

    const validation = validateShamirShares(shares);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('Emergency Access Codes', () => {
  it('should generate valid emergency codes', async () => {
    const userId = 'test-user-123';
    const result = await generateEmergencyCode(userId);

    expect(result.code.userId).toBe(userId);
    expect(result.code.codeId).toMatch(/^[0-9a-z]+-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(result.plainTextCode).toHaveLength(12);
    expect(result.code.used).toBe(false);
    expect(result.code.attempts).toBe(0);
    expect(result.code.expiresAt > new Date()).toBe(true);
  });

  it('should validate correct emergency codes', async () => {
    const userId = 'test-user-456';
    const result = await generateEmergencyCode(userId);

    const validation = await validateEmergencyCode(result.plainTextCode, result.code);

    expect(validation.valid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it('should reject incorrect emergency codes', async () => {
    const userId = 'test-user-789';
    const result = await generateEmergencyCode(userId);

    const validation = await validateEmergencyCode('WRONGCODE123', result.code);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should respect attempt limits', async () => {
    const userId = 'test-user-limits';
    const result = await generateEmergencyCode(userId, {
      maxAttempts: 2,
    });

    // First wrong attempt
    await validateEmergencyCode('WRONG1', result.code);
    result.code.attempts = 1;

    // Second wrong attempt
    await validateEmergencyCode('WRONG2', result.code);
    result.code.attempts = 2;

    // Third attempt should be rejected due to limits
    const validation = await validateEmergencyCode('WRONG3', result.code);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('attempts');
  });

  it('should reject expired codes', async () => {
    const userId = 'test-user-expired';
    const result = await generateEmergencyCode(userId, {
      validityDuration: -1000, // Already expired
    });

    const validation = await validateEmergencyCode(result.plainTextCode, result.code);

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('expired');
  });
});

describe('Recovery Validation System', () => {
  let storage: MockRecoveryStorage;
  let validator: RecoveryValidator;

  beforeEach(() => {
    storage = new MockRecoveryStorage();
    validator = new RecoveryValidator(storage);
  });

  it('should validate recovery phrase requests', async () => {
    const userId = 'recovery-user-1';
    const phrase = await generateRecoveryPhrase();
    await storage.storeRecoveryPhrase(userId, phrase);

    const result = await validator.validateRecovery({
      type: 'phrase',
      phrase: phrase.words,
      userId,
    });

    expect(result.success).toBe(true);
    expect(result.recoveredData?.userId).toBe(userId);
    expect(result.recoveredData?.masterKey).toBeDefined();
  });

  it('should validate Shamir share requests', async () => {
    const secret = 'recoverySecret123';
    const shares = createShamirShares({
      totalShares: 5,
      threshold: 3,
      secret,
    });

    const result = await validator.validateRecovery({
      type: 'shamir',
      shamirShares: shares.slice(0, 3),
    });

    expect(result.success).toBe(true);
    expect(result.recoveredData?.masterKey).toBe(secret);
  });

  it('should handle rate limiting', async () => {
    const userId = 'rate-limited-user';
    const phrase = await generateRecoveryPhrase();

    // Make multiple failed attempts
    for (let i = 0; i < 6; i++) {
      await validator.validateRecovery({
        type: 'phrase',
        phrase: [
          'wrong',
          'phrase',
          'words',
          'here',
          'invalid',
          'test',
          'wrong',
          'bad',
          'fake',
          'error',
          'fail',
          'no',
        ],
        userId,
      });
    }

    // Next attempt should be rate limited
    const result = await validator.validateRecovery({
      type: 'phrase',
      phrase: phrase.words,
      userId,
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOO_MANY_ATTEMPTS');
  });
});

describe('Recovery Manager Integration', () => {
  let storage: MockRecoveryStorage;
  let manager: RecoveryManager;
  let events: RecoveryEvents;

  beforeEach(() => {
    storage = new MockRecoveryStorage();
    events = {
      onPhraseGenerated: vi.fn(),
      onShamirSharesCreated: vi.fn(),
      onEmergencyCodeGenerated: vi.fn(),
      onRecoveryAttempted: vi.fn(),
      onRecoverySuccessful: vi.fn(),
      onRecoveryFailed: vi.fn(),
    };
    manager = createRecoveryManager(storage, events);
  });

  it('should generate and store recovery phrases', async () => {
    const phrase = await manager.generatePhrase();
    expect(phrase.words).toHaveLength(RECOVERY_DEFAULTS.WORD_COUNT);

    await manager.storeRecoveryPhrase('test-user', phrase);
    const storedPhrase = await storage.getRecoveryPhrase('test-user');
    expect(storedPhrase).toEqual(phrase);

    expect(events.onPhraseGenerated).toHaveBeenCalled();
  });

  it('should create and manage Shamir shares', async () => {
    const secret = 'managerTestSecret';
    const shares = manager.createShamirShares(secret);

    expect(shares).toHaveLength(RECOVERY_DEFAULTS.SHAMIR_CONFIG.totalShares);
    expect(shares[0].threshold).toBe(RECOVERY_DEFAULTS.SHAMIR_CONFIG.threshold);

    const reconstructed = manager.reconstructFromShares(shares.slice(0, 3));
    expect(reconstructed).toBe(secret);

    expect(events.onShamirSharesCreated).toHaveBeenCalled();
  });

  it('should generate emergency code sets', async () => {
    const userId = 'emergency-user';
    const codeSet = await manager.generateEmergencyCodeSet(userId);

    expect(codeSet.emergency.code.type).toBe('emergency');
    expect(codeSet.recovery.code.type).toBe('recovery');
    expect(codeSet.backup.code.type).toBe('backup');

    expect(events.onEmergencyCodeGenerated).toHaveBeenCalledTimes(3);
  });

  it('should provide comprehensive guidance', () => {
    const guidance = manager.getStorageGuidance();
    expect(guidance.storageRecommendations.digital).toBeInstanceOf(Array);
    expect(guidance.storageRecommendations.physical).toBeInstanceOf(Array);
    expect(guidance.storageRecommendations.distributed).toBeInstanceOf(Array);

    const shamirGuidance = manager.getShamirGuidance(5, 3);
    expect(shamirGuidance.distribution).toBeInstanceOf(Array);

    const emergencyGuidance = manager.getEmergencyGuidance();
    expect(emergencyGuidance.storage).toBeInstanceOf(Array);

    const checklist = manager.getSecurityChecklist();
    expect(checklist.setup).toBeInstanceOf(Array);
  });

  it('should perform health checks', async () => {
    const userId = 'health-check-user';

    // Initial health check - should show missing components
    let health = await manager.healthCheck(userId);
    expect(health.phraseStored).toBe(false);
    expect(health.recommendations.length).toBeGreaterThan(0);

    // Add recovery phrase
    const phrase = await manager.generatePhrase();
    await manager.storeRecoveryPhrase(userId, phrase);

    // Health check should now show phrase is stored
    health = await manager.healthCheck(userId);
    expect(health.phraseStored).toBe(true);
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle invalid Shamir configurations', () => {
    expect(() =>
      createShamirShares({
        totalShares: 2,
        threshold: 3, // Invalid: threshold > total
        secret: 'test',
      })
    ).toThrow();

    expect(() =>
      createShamirShares({
        totalShares: 5,
        threshold: 1, // Invalid: threshold too low
        secret: 'test',
      })
    ).toThrow();
  });

  it('should handle empty or invalid secrets', () => {
    expect(() =>
      createShamirShares({
        totalShares: 3,
        threshold: 2,
        secret: '', // Empty secret
      })
    ).toThrow();
  });

  it('should handle malformed recovery requests', async () => {
    const storage = new MockRecoveryStorage();
    const validator = new RecoveryValidator(storage);

    const result = await validator.validateRecovery({
      type: 'phrase',
      // Missing phrase
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_PHRASE');
  });
});
