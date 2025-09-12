import { __awaiter } from 'tslib';
export class ChallengeManager {
  constructor(config) {
    this.config = Object.assign({ length: 32, expirationMinutes: 5, algorithm: 'crypto' }, config);
    this.challenges = new Map();
  }
  generateChallenge(userId) {
    let challenge;
    switch (this.config.algorithm) {
      case 'crypto':
        challenge = this.generateCryptoChallenge();
        break;
      case 'random':
        challenge = this.generateRandomChallenge();
        break;
      default:
        challenge = this.generateCryptoChallenge();
    }
    // Store challenge with metadata
    const challengeData = {
      challenge,
      userId,
      expiresAt: new Date(Date.now() + this.config.expirationMinutes * 60 * 1000),
    };
    const key = this.getChallengeKey(challenge, userId);
    this.challenges.set(key, challengeData);
    // Clean up expired challenges periodically
    this.cleanupExpiredChallenges();
    return challenge;
  }
  validateChallenge(challenge, userId) {
    const key = this.getChallengeKey(challenge, userId);
    const challengeData = this.challenges.get(key);
    if (!challengeData) {
      return {
        isValid: false,
        isExpired: false,
        error: 'Challenge not found',
      };
    }
    const now = new Date();
    const isExpired = now > challengeData.expiresAt;
    if (isExpired) {
      // Remove expired challenge
      this.challenges.delete(key);
      return {
        isValid: false,
        isExpired: true,
        error: 'Challenge expired',
      };
    }
    // Challenge is valid
    return {
      isValid: true,
      isExpired: false,
      challenge: challengeData,
    };
  }
  consumeChallenge(challenge, userId) {
    const validationResult = this.validateChallenge(challenge, userId);
    if (validationResult.isValid) {
      // Remove challenge after successful validation (one-time use)
      const key = this.getChallengeKey(challenge, userId);
      this.challenges.delete(key);
    }
    return validationResult;
  }
  revokeChallenge(challenge, userId) {
    const key = this.getChallengeKey(challenge, userId);
    return this.challenges.delete(key);
  }
  revokeAllChallenges(userId) {
    let removedCount = 0;
    for (const [key, challengeData] of this.challenges.entries()) {
      if (userId === undefined || challengeData.userId === userId) {
        this.challenges.delete(key);
        removedCount++;
      }
    }
    return removedCount;
  }
  getActiveChallenges(userId) {
    const challenges = [];
    for (const challengeData of this.challenges.values()) {
      if (userId === undefined || challengeData.userId === userId) {
        const now = new Date();
        if (now <= challengeData.expiresAt) {
          challenges.push(challengeData);
        }
      }
    }
    return challenges;
  }
  generateCryptoChallenge() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment with Web Crypto API
      const array = new Uint8Array(this.config.length);
      crypto.getRandomValues(array);
      return this.uint8ArrayToBase64Url(array);
    } else if (typeof require !== 'undefined') {
      // Node.js environment
      try {
        const crypto = require('crypto');
        const buffer = crypto.randomBytes(this.config.length);
        return buffer.toString('base64url');
      } catch (error) {
        // Fallback to random challenge
        return this.generateRandomChallenge();
      }
    } else {
      // Fallback for environments without crypto
      return this.generateRandomChallenge();
    }
  }
  generateRandomChallenge() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < this.config.length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  uint8ArrayToBase64Url(array) {
    // Convert Uint8Array to base64url string
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  getChallengeKey(challenge, userId) {
    return userId ? `${challenge}:${userId}` : challenge;
  }
  cleanupExpiredChallenges() {
    const now = new Date();
    const expiredKeys = [];
    for (const [key, challengeData] of this.challenges.entries()) {
      if (now > challengeData.expiresAt) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach(key => this.challenges.delete(key));
  }
}
export class ServerChallengeManager extends ChallengeManager {
  constructor(config, databaseAdapter) {
    super(config);
    this.databaseAdapter = databaseAdapter;
  }
  generateChallengeAsync(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const challenge = this.generateChallenge(userId);
      if (this.databaseAdapter) {
        const challengeData = this.challenges.get(this.getChallengeKey(challenge, userId));
        if (challengeData) {
          yield this.databaseAdapter.storeChallenge(challengeData);
        }
      }
      return challenge;
    });
  }
  validateChallengeAsync(challenge, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      // First check in-memory cache
      let result = this.validateChallenge(challenge, userId);
      // If not found in memory and database adapter available, check database
      if (!result.isValid && this.databaseAdapter) {
        const challengeData = yield this.databaseAdapter.retrieveChallenge(challenge, userId);
        if (challengeData) {
          const now = new Date();
          const isExpired = now > challengeData.expiresAt;
          if (isExpired) {
            yield this.databaseAdapter.removeChallenge(challenge, userId);
            result = {
              isValid: false,
              isExpired: true,
              error: 'Challenge expired',
            };
          } else {
            result = {
              isValid: true,
              isExpired: false,
              challenge: challengeData,
            };
          }
        }
      }
      return result;
    });
  }
  consumeChallengeAsync(challenge, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const result = yield this.validateChallengeAsync(challenge, userId);
      if (result.isValid) {
        // Remove from memory
        const key = this.getChallengeKey(challenge, userId);
        this.challenges.delete(key);
        // Remove from database
        if (this.databaseAdapter) {
          yield this.databaseAdapter.removeChallenge(challenge, userId);
        }
      }
      return result;
    });
  }
  getChallengeKey(challenge, userId) {
    return userId ? `${challenge}:${userId}` : challenge;
  }
}
// Example implementation for Supabase
export class SupabaseChallengeAdapter {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
  }
  storeChallenge(challenge) {
    return __awaiter(this, void 0, void 0, function* () {
      const { error } = yield this.supabaseClient.from('webauthn_challenges').insert({
        challenge: challenge.challenge,
        user_id: challenge.userId,
        expires_at: challenge.expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) {
        throw new Error(`Failed to store challenge: ${error.message}`);
      }
    });
  }
  retrieveChallenge(challenge, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      let query = this.supabaseClient
        .from('webauthn_challenges')
        .select('*')
        .eq('challenge', challenge);
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      const { data, error } = yield query.single();
      if (error || !data) {
        return null;
      }
      return {
        challenge: data.challenge,
        userId: data.user_id,
        expiresAt: new Date(data.expires_at),
      };
    });
  }
  removeChallenge(challenge, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      let query = this.supabaseClient
        .from('webauthn_challenges')
        .delete()
        .eq('challenge', challenge);
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      const { error } = yield query;
      if (error) {
        throw new Error(`Failed to remove challenge: ${error.message}`);
      }
    });
  }
  cleanupExpiredChallenges() {
    return __awaiter(this, void 0, void 0, function* () {
      const { data, error } = yield this.supabaseClient
        .from('webauthn_challenges')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('challenge');
      if (error) {
        throw new Error(`Failed to cleanup expired challenges: ${error.message}`);
      }
      return (data === null || data === void 0 ? void 0 : data.length) || 0;
    });
  }
}
//# sourceMappingURL=challenge.js.map
