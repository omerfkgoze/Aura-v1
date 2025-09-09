# Integration Patterns for Future Development

This document provides comprehensive integration patterns and guidelines for future story implementations using the crypto-core foundation.

## Overview

The crypto-core package provides a foundation for all cryptographic operations in the Aura application. This document outlines how future stories should integrate with the crypto-core to maintain security, performance, and maintainability.

## Core Integration Principles

### 1. Zero-Knowledge Architecture

All integrations must maintain the zero-knowledge principle:

- Server never accesses plaintext health data
- All encryption/decryption happens client-side
- Crypto envelopes are validated but never opened server-side

### 2. Memory Safety

All integrations must follow memory safety patterns:

- Use `SecureBuffer` for sensitive data
- Implement automatic zeroization
- Monitor memory leaks with provided utilities

### 3. Type Safety

All integrations must maintain type safety:

- Use TypeScript interfaces from `packages/shared-types`
- Leverage auto-generated WASM bindings
- Implement proper error handling

## Integration Patterns by Story

### Story 1.3: Authentication System Integration

#### Pattern: Authenticated Crypto Operations

```typescript
import { createCryptoCoreIntegration, AuthContext } from '@aura/crypto-core';

class AuthenticatedCryptoService {
  private integration: CryptoCoreIntegration;

  constructor(cryptoCore: CryptoCore) {
    this.integration = createCryptoCoreIntegration(cryptoCore);
  }

  async initializeWithAuth(authConfig: AuthIntegrationConfig): Promise<void> {
    await this.integration.initializeAuthIntegration(authConfig);
  }

  async performAuthenticatedEncryption(
    data: Uint8Array,
    authContext: AuthContext
  ): Promise<EncryptedData> {
    // Validate authentication context
    const isValid = await this.integration.validateAuthContext(authContext);
    if (!isValid) {
      throw new Error('Invalid authentication context');
    }

    // Create crypto operation context
    const opContext = await this.integration.createCryptoOperationContext(authContext, 'encrypt');

    // Perform encryption with validated context
    return await this.cryptoCore.encrypt(data, {
      authContext: opContext,
      auditTrail: true,
    });
  }
}
```

#### Key Integration Points:

1. **Authentication Validation**: All crypto operations must validate auth context
2. **Audit Trail**: All operations must be logged for security compliance
3. **Session Management**: Handle token refresh and expiration
4. **Error Handling**: Distinguish between auth and crypto errors

#### Required Interfaces:

- `AuthSystemIntegration` - Main authentication integration interface
- `AuthContext` - Authentication context with user and session info
- `CryptoOperationContext` - Context for authenticated crypto operations

### Story 1.4: Device-Specific Key Management

#### Pattern: Secure Device Storage

```typescript
import { createCryptoCoreIntegration, DeviceKeyManagementConfig } from '@aura/crypto-core';

class DeviceKeyService {
  private integration: CryptoCoreIntegration;

  constructor(cryptoCore: CryptoCore) {
    this.integration = createCryptoCoreIntegration(cryptoCore);
  }

  async initializeDeviceStorage(): Promise<void> {
    // Get device capabilities
    const capabilities = await this.integration.getDeviceCapabilities();

    // Configure based on platform
    const config: DeviceKeyManagementConfig = {
      deviceSalt: await this.generateDeviceSalt(),
      hsmAvailable: capabilities.hsmAvailable,
      biometricSupported: capabilities.biometricSupported,
      secureEnclaveAvailable: capabilities.secureEnclaveAvailable,
    };

    await this.integration.initializeDeviceKeyManagement(config);
  }

  async storeUserKey(userId: string, keyData: Uint8Array): Promise<void> {
    const keyId = `user_key_${userId}`;
    await this.integration.storeKeySecurely(keyId, keyData);
  }

  private async generateDeviceSalt(): Promise<Uint8Array> {
    // Platform-specific device identification
    // iOS: Use device ID + keychain
    // Android: Use Android ID + keystore
    // Web: Use fingerprinting + localStorage
  }
}
```

#### Key Integration Points:

1. **Platform Detection**: Identify device capabilities at runtime
2. **Secure Storage**: Use platform-specific secure storage (Keychain, Keystore)
3. **Device Fingerprinting**: Generate device-specific salts safely
4. **Biometric Integration**: Support fingerprint/face unlock where available

#### Required Interfaces:

- `DeviceKeyManagementIntegration` - Main device key management interface
- `DeviceKeyManagementConfig` - Device capabilities configuration
- `DeviceKeyStorage` - Abstract interface for platform-specific storage

### Story 1.5: Key Rotation Support

#### Pattern: Versioned Key Management

```typescript
import { createCryptoCoreIntegration, KeyRotationConfig } from '@aura/crypto-core';

class KeyRotationService {
  private integration: CryptoCoreIntegration;

  constructor(cryptoCore: CryptoCore) {
    this.integration = createCryptoCoreIntegration(cryptoCore);
  }

  async initializeKeyRotation(): Promise<void> {
    const config: KeyRotationConfig = {
      rotationInterval: 7 * 24 * 3600, // 7 days
      maxKeyAge: 30 * 24 * 3600, // 30 days max
      oldKeyRetentionCount: 3, // Keep 3 old versions
      autoRotationEnabled: true,
    };

    await this.integration.initializeKeyRotation(config);
  }

  async checkAndRotateKey(keyId: string): Promise<void> {
    const history = await this.integration.getKeyVersionHistory(keyId);
    const currentVersion = history[0];

    const needsRotation = await this.integration.isRotationNeeded(currentVersion);

    if (needsRotation) {
      const result = await this.integration.rotateKey(keyId, 'scheduled_rotation');

      // Migrate existing data in background
      await this.migrateDataToNewKey(keyId, result.newKeyId);
    }
  }

  async decryptWithKeyVersion(
    encryptedData: Uint8Array,
    envelope: CryptoEnvelope
  ): Promise<Uint8Array> {
    // Validate envelope for key rotation support
    const validation = await this.integration.validateEnvelopeForRotation(envelope);

    if (!validation.valid) {
      throw new Error(`Invalid envelope: ${validation.validationErrors.join(', ')}`);
    }

    // Use appropriate key version for decryption
    const keyId = this.extractKeyIdFromEnvelope(envelope);
    return await this.cryptoCore.decryptWithKeyVersion(encryptedData, keyId, validation.keyVersion);
  }
}
```

#### Key Integration Points:

1. **Version Management**: Track key versions with metadata
2. **Backward Compatibility**: Support decryption with old key versions
3. **Migration Strategy**: Gradually migrate data to new keys
4. **Rotation Triggers**: Support scheduled and forced rotation

#### Required Interfaces:

- `KeyRotationIntegration` - Main key rotation interface
- `KeyVersion` - Key version metadata and status
- `KeyRotationResult` - Results of key rotation operation

### Story 1.6: Health-Check and Validation

#### Pattern: Continuous Health Monitoring

```typescript
import { createCryptoCoreIntegration, HealthCheckConfig } from '@aura/crypto-core';

class CryptoHealthMonitor {
  private integration: CryptoCoreIntegration;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(cryptoCore: CryptoCore) {
    this.integration = createCryptoCoreIntegration(cryptoCore);
  }

  async initializeHealthMonitoring(): Promise<void> {
    const config: HealthCheckConfig = {
      enabled: true,
      checkInterval: 60, // 1 minute
      includePerformance: true,
      includeSecurity: true,
    };

    await this.integration.initializeHealthCheck(config);
    await this.startContinuousMonitoring();
  }

  async startContinuousMonitoring(): Promise<void> {
    await this.integration.startHealthMonitoring(60);

    // Register callback for health status changes
    this.integration.registerHealthCheckCallback(status => {
      this.handleHealthStatusChange(status);
    });
  }

  async performComprehensiveHealthCheck(): Promise<HealthCheckResult> {
    const result = await this.integration.performHealthCheck();

    // Log health check results (without PII)
    console.log('Crypto Health Check:', {
      status: result.status,
      timestamp: result.timestamp,
      cryptoHealth: result.cryptoHealth,
      memoryHealth: result.memoryHealth,
    });

    return result;
  }

  private handleHealthStatusChange(status: HealthStatus): void {
    if (status.overall === 'unhealthy') {
      // Trigger emergency procedures
      this.handleCryptoEmergency(status);
    } else if (status.overall === 'degraded') {
      // Log warning and attempt recovery
      this.handleCryptoDegradation(status);
    }
  }

  private async handleCryptoEmergency(status: HealthStatus): Promise<void> {
    // Emergency response procedures
    console.error('Crypto system emergency detected:', status);

    // Stop all crypto operations
    // Activate backup systems
    // Notify user of system issues
  }
}
```

#### Key Integration Points:

1. **Continuous Monitoring**: Regular health checks with configurable intervals
2. **Performance Tracking**: Monitor crypto operation performance
3. **Memory Monitoring**: Track memory usage and detect leaks
4. **Emergency Response**: Handle degraded or unhealthy states

#### Required Interfaces:

- `HealthCheckIntegration` - Main health monitoring interface
- `HealthCheckResult` - Health check results and metrics
- `HealthStatus` - Current system health status

## Cross-Story Integration Patterns

### Pattern: Unified Crypto Service

```typescript
import {
  createCryptoCoreIntegration,
  UnifiedIntegrationConfig,
  CryptoCoreIntegration,
} from '@aura/crypto-core';

class UnifiedCryptoService {
  private cryptoCore: CryptoCore;
  private integration: CryptoCoreIntegration;

  constructor() {
    this.cryptoCore = new CryptoCore();
    this.integration = createCryptoCoreIntegration(this.cryptoCore);
  }

  async initialize(config: UnifiedIntegrationConfig): Promise<void> {
    // Initialize crypto core
    await this.cryptoCore.initialize();

    // Initialize all integration modules
    await this.integration.initializeAllIntegrations(config);

    // Verify initialization
    const status = await this.integration.getIntegrationStatus();
    if (!status.initialized) {
      throw new Error(`Integration failed: ${status.errors.join(', ')}`);
    }
  }

  async performSecureCryptoOperation(
    operation: 'encrypt' | 'decrypt',
    data: Uint8Array,
    context: {
      authContext?: AuthContext;
      keyRotation?: boolean;
      healthCheck?: boolean;
    }
  ): Promise<Uint8Array> {
    // Pre-operation health check
    if (context.healthCheck) {
      const health = await this.integration.getCurrentHealthStatus();
      if (health.overall === 'unhealthy') {
        throw new Error('Crypto system unhealthy - operation aborted');
      }
    }

    // Authentication validation
    if (context.authContext) {
      const isValid = await this.integration.validateAuthContext(context.authContext);
      if (!isValid) {
        throw new Error('Invalid authentication context');
      }
    }

    // Key rotation check
    if (context.keyRotation && operation === 'encrypt') {
      // Use latest key version for encryption
      // Will be handled automatically by key rotation service
    }

    // Perform operation with full monitoring
    const startTime = performance.now();

    try {
      const result =
        operation === 'encrypt'
          ? await this.cryptoCore.encrypt(data)
          : await this.cryptoCore.decrypt(data);

      // Update performance metrics
      const duration = performance.now() - startTime;
      await this.updateOperationMetrics(operation, duration);

      return result;
    } catch (error) {
      // Log error (without sensitive data)
      await this.logCryptoError(operation, error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    await this.integration.shutdownIntegrations();
    await this.cryptoCore.cleanup();
  }
}
```

## Error Handling Patterns

### Pattern: Hierarchical Error Handling

```typescript
// Base crypto error
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

// Authentication errors
export class AuthenticationError extends CryptoError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, operation, cause);
    this.name = 'AuthenticationError';
  }
}

// Key management errors
export class KeyManagementError extends CryptoError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, operation, cause);
    this.name = 'KeyManagementError';
  }
}

// Health check errors
export class HealthCheckError extends CryptoError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, operation, cause);
    this.name = 'HealthCheckError';
  }
}

// Error handling utility
export function handleCryptoError(error: unknown, operation: string): never {
  if (error instanceof CryptoError) {
    // Log structured error (without sensitive data)
    console.error('Crypto operation failed:', {
      name: error.name,
      operation: error.operation,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }

  // Wrap unknown errors
  throw new CryptoError(
    `Unknown error in ${operation}`,
    operation,
    error instanceof Error ? error : new Error(String(error))
  );
}
```

## Performance Optimization Patterns

### Pattern: Operation Batching

```typescript
class BatchedCryptoOperations {
  private pendingOperations: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  async batchOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pendingOperations.push({ operation, resolve, reject });

      // Process batch on next tick
      process.nextTick(() => this.processBatch());
    });
  }

  private async processBatch(): Promise<void> {
    if (this.pendingOperations.length === 0) return;

    const batch = this.pendingOperations.splice(0);

    // Execute all operations in parallel
    const results = await Promise.allSettled(batch.map(item => item.operation()));

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batch[index].resolve(result.value);
      } else {
        batch[index].reject(result.reason);
      }
    });
  }
}
```

## Testing Patterns

### Pattern: Integration Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Crypto Integration Tests', () => {
  let cryptoService: UnifiedCryptoService;

  beforeEach(async () => {
    cryptoService = new UnifiedCryptoService();

    const config: UnifiedIntegrationConfig = {
      authSystem: {
        providerType: 'test',
        tokenValidationUrl: 'http://test.local',
        publicKey: new Uint8Array(32),
        expirationTolerance: 300,
      },
      healthCheck: {
        enabled: true,
        checkInterval: 5,
        includePerformance: true,
        includeSecurity: true,
      },
    };

    await cryptoService.initialize(config);
  });

  afterEach(async () => {
    await cryptoService.shutdown();
  });

  it('should perform authenticated encryption', async () => {
    const authContext: AuthContext = {
      userId: 'test-user',
      sessionToken: 'test-token',
      expiresAt: Date.now() + 3600000, // 1 hour
      authLevel: 'basic',
    };

    const data = new TextEncoder().encode('test data');

    const encrypted = await cryptoService.performSecureCryptoOperation('encrypt', data, {
      authContext,
      healthCheck: true,
    });

    expect(encrypted).toBeInstanceOf(Uint8Array);
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('should handle health check failures gracefully', async () => {
    // Mock unhealthy system
    jest.spyOn(cryptoService.integration, 'getCurrentHealthStatus').mockResolvedValue({
      overall: 'unhealthy',
      details: {
        crypto: 'unhealthy',
        memory: 'healthy',
        performance: 'healthy',
        security: 'healthy',
      },
      lastCheck: Date.now(),
    });

    const data = new TextEncoder().encode('test data');

    await expect(
      cryptoService.performSecureCryptoOperation('encrypt', data, { healthCheck: true })
    ).rejects.toThrow('Crypto system unhealthy - operation aborted');
  });
});
```

## Best Practices for Future Development

### 1. Security First

- Always validate inputs before crypto operations
- Use constant-time operations where possible
- Implement proper memory zeroization
- Never log sensitive data

### 2. Error Handling

- Use structured error types
- Provide clear error messages
- Implement retry mechanisms for transient failures
- Log errors safely (without PII)

### 3. Performance

- Batch operations when possible
- Use appropriate data structures
- Monitor memory usage
- Implement caching for expensive operations

### 4. Testing

- Write comprehensive integration tests
- Test error conditions thoroughly
- Use property-based testing for crypto functions
- Mock external dependencies appropriately

### 5. Documentation

- Document all public interfaces
- Provide usage examples
- Explain security considerations
- Update integration patterns as needed

## Conclusion

These integration patterns provide a solid foundation for implementing Stories 1.3-1.6 while maintaining security, performance, and maintainability. Each pattern addresses specific integration challenges and provides concrete examples for implementation.

Key principles to remember:

- Maintain zero-knowledge architecture
- Implement proper error handling
- Monitor performance and health
- Follow type safety practices
- Test thoroughly with realistic scenarios

For questions or clarifications on these patterns, refer to the specific interface documentation in the `integration.ts` and `integration.rs` modules.
