import { randomBytes } from 'crypto';

export interface NonceManager {
  generate(): string;
  validate(nonce: string): boolean;
  cleanup(): void;
}

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

class ServerSideNonceManager implements NonceManager {
  private validNonces = new Map<string, number>(); // nonce -> expiresAt timestamp
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timer;

  constructor() {
    this.startCleanup();
  }

  generate(): string {
    const nonce = randomBytes(16).toString('base64');
    const expiresAt = Date.now() + this.maxAge;
    this.validNonces.set(nonce, expiresAt);
    return nonce;
  }

  validate(nonce: string): boolean {
    const expiresAt = this.validNonces.get(nonce);
    if (!expiresAt) return false;

    // Check if expired
    if (Date.now() > expiresAt) {
      this.validNonces.delete(nonce);
      return false;
    }

    return true;
  }

  cleanup(): void {
    this.validNonces.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiredNonces: string[] = [];

      // Collect expired nonces for deletion
      this.validNonces.forEach((expiresAt, nonce) => {
        if (now > expiresAt) {
          expiredNonces.push(nonce);
        }
      });

      // Remove expired nonces
      expiredNonces.forEach(nonce => {
        this.validNonces.delete(nonce);
      });

      // Safety net: clear all if too many accumulate
      if (this.validNonces.size > 1000) {
        this.validNonces.clear();
      }
    }, this.cleanupInterval);
  }
}

export const nonceManager = new ServerSideNonceManager();

export function generateSecureNonce(): string {
  return nonceManager.generate();
}

export function validateNonce(nonce: string): boolean {
  return nonceManager.validate(nonce);
}
