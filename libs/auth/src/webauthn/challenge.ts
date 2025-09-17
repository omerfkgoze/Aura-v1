import type { WebAuthnChallenge } from './types';

export interface ChallengeConfig {
  length: number;
  expirationMinutes: number;
  algorithm: 'random' | 'crypto';
}

export interface ChallengeValidationResult {
  isValid: boolean;
  isExpired: boolean;
  challenge?: WebAuthnChallenge;
  error?: string;
}

export class ChallengeManager {
  private config: ChallengeConfig;
  protected challenges: Map<string, WebAuthnChallenge>;

  constructor(config?: Partial<ChallengeConfig>) {
    this.config = {
      length: 32,
      expirationMinutes: 5,
      algorithm: 'crypto',
      ...config,
    };
    this.challenges = new Map();
  }

  generateChallenge(userId?: string): string {
    let challenge: string;

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
    const challengeData: WebAuthnChallenge = {
      challenge,
      ...(userId && { userId }),
      expiresAt: new Date(Date.now() + this.config.expirationMinutes * 60 * 1000),
    };

    const key = this.getChallengeKey(challenge, userId);
    this.challenges.set(key, challengeData);

    // Clean up expired challenges periodically
    this.cleanupExpiredChallenges();

    return challenge;
  }

  validateChallenge(challenge: string, userId?: string): ChallengeValidationResult {
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

  consumeChallenge(challenge: string, userId?: string): ChallengeValidationResult {
    const validationResult = this.validateChallenge(challenge, userId);

    if (validationResult.isValid) {
      // Remove challenge after successful validation (one-time use)
      const key = this.getChallengeKey(challenge, userId);
      this.challenges.delete(key);
    }

    return validationResult;
  }

  revokeChallenge(challenge: string, userId?: string): boolean {
    const key = this.getChallengeKey(challenge, userId);
    return this.challenges.delete(key);
  }

  revokeAllChallenges(userId?: string): number {
    let removedCount = 0;

    for (const [key, challengeData] of this.challenges.entries()) {
      if (userId === undefined || challengeData.userId === userId) {
        this.challenges.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  getActiveChallenges(userId?: string): WebAuthnChallenge[] {
    const challenges: WebAuthnChallenge[] = [];

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

  private generateCryptoChallenge(): string {
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

  private generateRandomChallenge(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';

    for (let i = 0; i < this.config.length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  private uint8ArrayToBase64Url(array: Uint8Array): string {
    // Convert Uint8Array to base64url string
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  protected getChallengeKey(challenge: string, userId?: string): string {
    return userId ? `${challenge}:${userId}` : challenge;
  }

  private cleanupExpiredChallenges(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, challengeData] of this.challenges.entries()) {
      if (now > challengeData.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.challenges.delete(key));
  }
}

export class ServerChallengeManager extends ChallengeManager {
  // Server-side challenge management with database storage
  private databaseAdapter: ChallengeStorageAdapter | undefined;

  constructor(config?: Partial<ChallengeConfig>, databaseAdapter?: ChallengeStorageAdapter) {
    super(config);
    this.databaseAdapter = databaseAdapter;
  }

  async generateChallengeAsync(userId?: string): Promise<string> {
    const challenge = this.generateChallenge(userId);

    if (this.databaseAdapter) {
      const challengeData = this.challenges.get(this.getChallengeKey(challenge, userId));
      if (challengeData) {
        await this.databaseAdapter.storeChallenge(challengeData);
      }
    }

    return challenge;
  }

  async validateChallengeAsync(
    challenge: string,
    userId?: string
  ): Promise<ChallengeValidationResult> {
    // First check in-memory cache
    let result = this.validateChallenge(challenge, userId);

    // If not found in memory and database adapter available, check database
    if (!result.isValid && this.databaseAdapter) {
      const challengeData = await this.databaseAdapter.retrieveChallenge(challenge, userId);

      if (challengeData) {
        const now = new Date();
        const isExpired = now > challengeData.expiresAt;

        if (isExpired) {
          await this.databaseAdapter.removeChallenge(challenge, userId);
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
  }

  async consumeChallengeAsync(
    challenge: string,
    userId?: string
  ): Promise<ChallengeValidationResult> {
    const result = await this.validateChallengeAsync(challenge, userId);

    if (result.isValid) {
      // Remove from memory
      const key = this.getChallengeKey(challenge, userId);
      this.challenges.delete(key);

      // Remove from database
      if (this.databaseAdapter) {
        await this.databaseAdapter.removeChallenge(challenge, userId);
      }
    }

    return result;
  }

  override getChallengeKey(challenge: string, userId?: string): string {
    return userId ? `${challenge}:${userId}` : challenge;
  }
}

export interface ChallengeStorageAdapter {
  storeChallenge(challenge: WebAuthnChallenge): Promise<void>;
  retrieveChallenge(challenge: string, userId?: string): Promise<WebAuthnChallenge | null>;
  removeChallenge(challenge: string, userId?: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<number>;
}

// Example implementation for Supabase
export class SupabaseChallengeAdapter implements ChallengeStorageAdapter {
  private supabaseClient: any; // Supabase client type

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async storeChallenge(challenge: WebAuthnChallenge): Promise<void> {
    const { error } = await this.supabaseClient.from('webauthn_challenges').insert({
      challenge: challenge.challenge,
      user_id: challenge.userId,
      expires_at: challenge.expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to store challenge: ${error.message}`);
    }
  }

  async retrieveChallenge(challenge: string, userId?: string): Promise<WebAuthnChallenge | null> {
    let query = this.supabaseClient
      .from('webauthn_challenges')
      .select('*')
      .eq('challenge', challenge);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return {
      challenge: data.challenge,
      userId: data.user_id,
      expiresAt: new Date(data.expires_at),
    };
  }

  async removeChallenge(challenge: string, userId?: string): Promise<void> {
    let query = this.supabaseClient.from('webauthn_challenges').delete().eq('challenge', challenge);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to remove challenge: ${error.message}`);
    }
  }

  async cleanupExpiredChallenges(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('challenge');

    if (error) {
      throw new Error(`Failed to cleanup expired challenges: ${error.message}`);
    }

    return data?.length || 0;
  }
}
