import { randomBytes } from 'crypto';

export interface NonceManager {
  generate(): string;
  validate(nonce: string): boolean;
  cleanup(): void;
}

class ServerSideNonceManager implements NonceManager {
  private validNonces = new Set<string>();
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timer;

  constructor() {
    this.startCleanup();
  }

  generate(): string {
    const nonce = randomBytes(16).toString('base64');
    this.validNonces.add(nonce);

    // Auto-remove after maxAge
    setTimeout(() => {
      this.validNonces.delete(nonce);
    }, this.maxAge);

    return nonce;
  }

  validate(nonce: string): boolean {
    return this.validNonces.has(nonce);
  }

  cleanup(): void {
    this.validNonces.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // Cleanup happens automatically via setTimeout in generate()
      // This is just a safety net
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
