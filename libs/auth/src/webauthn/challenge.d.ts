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
export declare class ChallengeManager {
  private config;
  protected challenges: Map<string, WebAuthnChallenge>;
  constructor(config?: Partial<ChallengeConfig>);
  generateChallenge(userId?: string): string;
  validateChallenge(challenge: string, userId?: string): ChallengeValidationResult;
  consumeChallenge(challenge: string, userId?: string): ChallengeValidationResult;
  revokeChallenge(challenge: string, userId?: string): boolean;
  revokeAllChallenges(userId?: string): number;
  getActiveChallenges(userId?: string): WebAuthnChallenge[];
  private generateCryptoChallenge;
  private generateRandomChallenge;
  private uint8ArrayToBase64Url;
  protected getChallengeKey(challenge: string, userId?: string): string;
  private cleanupExpiredChallenges;
}
export declare class ServerChallengeManager extends ChallengeManager {
  private databaseAdapter;
  constructor(config?: Partial<ChallengeConfig>, databaseAdapter?: ChallengeStorageAdapter);
  generateChallengeAsync(userId?: string): Promise<string>;
  validateChallengeAsync(challenge: string, userId?: string): Promise<ChallengeValidationResult>;
  consumeChallengeAsync(challenge: string, userId?: string): Promise<ChallengeValidationResult>;
  getChallengeKey(challenge: string, userId?: string): string;
}
export interface ChallengeStorageAdapter {
  storeChallenge(challenge: WebAuthnChallenge): Promise<void>;
  retrieveChallenge(challenge: string, userId?: string): Promise<WebAuthnChallenge | null>;
  removeChallenge(challenge: string, userId?: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<number>;
}
export declare class SupabaseChallengeAdapter implements ChallengeStorageAdapter {
  private supabaseClient;
  constructor(supabaseClient: any);
  storeChallenge(challenge: WebAuthnChallenge): Promise<void>;
  retrieveChallenge(challenge: string, userId?: string): Promise<WebAuthnChallenge | null>;
  removeChallenge(challenge: string, userId?: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<number>;
}
