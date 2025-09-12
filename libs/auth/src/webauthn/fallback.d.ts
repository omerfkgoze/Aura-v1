/**
 * Graceful degradation system for unsupported platforms and failed authentication
 * Provides comprehensive fallback mechanisms with user-friendly error handling
 */
export declare class FallbackAuthenticationManager {
  private detectionManager;
  private opaqueManager;
  private recoveryManager;
  private fallbackChain;
  constructor(rpId: string, rpName: string);
  /**
   * Attempt authentication with automatic fallback through the chain
   */
  authenticateWithFallback(
    identifier: string,
    options?: {
      skipMethods?: string[];
      maxRetries?: number;
      userFriendly?: boolean;
    }
  ): Promise<FallbackResult>;
  /**
   * Register with automatic fallback through the chain
   */
  registerWithFallback(
    userId: string,
    username: string,
    displayName: string,
    options?: {
      skipMethods?: string[];
      preferredMethod?: string;
      userFriendly?: boolean;
    }
  ): Promise<FallbackResult>;
  /**
   * Get available authentication methods for current platform
   */
  getAvailableMethods(): Promise<{
    supported: string[];
    unsupported: string[];
    recommended: string[];
    fallback: string[];
  }>;
  /**
   * Test authentication method availability without attempting authentication
   */
  testMethodAvailability(methodName: string): Promise<{
    available: boolean;
    reason?: string;
    requirements?: string[];
    canEnable?: boolean;
  }>;
  private buildFallbackChain;
  private orderFallbackChain;
  private prioritizePreferredMethod;
  private isMethodRelevant;
  private isMethodSupported;
  private attemptMethod;
  private attemptRegistration;
  private getUserFriendlySuccessMessage;
  private getUserFriendlyFailureMessage;
  private getUserFriendlyRegistrationMessage;
  private getUnavailabilityReason;
  private getMethodRequirements;
  private canMethodBeEnabled;
  private getRecommendedNextSteps;
  private getRecoveryOptions;
}
interface FallbackMethod {
  name: string;
  priority: number;
  allowRetry: boolean;
  requiresSupport: string[];
  handler: string;
}
interface FallbackResult {
  success: boolean;
  method: string;
  result?: any;
  error?: string;
  attemptedMethods?: string[];
  errors?: string[];
  fallbacksUsed?: number;
  userMessage?: string;
  recoveryOptions?: string[];
  recommendedNextSteps?: string[];
}
export type { FallbackMethod, FallbackResult };
