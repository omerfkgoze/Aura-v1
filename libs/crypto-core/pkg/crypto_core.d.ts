/* tslint:disable */
/* eslint-disable */
export function generate_encryption_key(): CryptoKey;
export function generate_signing_key(): CryptoKey;
/**
 * WASM initialization with integrity check
 */
export function init_crypto_core_with_verification(): ModuleIntegrity;
/**
 * Export version information
 */
export function get_crypto_core_version(): string;
/**
 * Export build information
 */
export function get_build_info(): string;
/**
 * Security hardening and attack mitigation module
 * Implements constant-time operations, side-channel attack prevention,
 * and secure random number generation
 * Constant-time comparison to prevent timing attacks
 */
export function constant_time_compare(a: Uint8Array, b: Uint8Array): boolean;
export function get_memory_limit_for_class(_class: DeviceClass): number;
export function get_argon2_iterations_for_class(_class: DeviceClass): number;
export function get_argon2_memory_for_class(_class: DeviceClass): number;
export function get_argon2_parallelism_for_class(_class: DeviceClass): number;
export function init(): void;
export function test_crypto_core(): string;
export function create_envelope_with_metadata(version: number, algorithm: number, salt: Uint8Array, nonce: Uint8Array, encrypted_data: Uint8Array, tag: Uint8Array, aad_hash: Uint8Array): CryptoEnvelope;
export function create_envelope(encrypted_data: Uint8Array, nonce: Uint8Array, tag: Uint8Array): CryptoEnvelope;
export function serialize_envelope(envelope: CryptoEnvelope): string;
export function deserialize_envelope(json_str: string): CryptoEnvelope;
export function create_cycle_data_aad(user_id: string, timestamp: bigint): Uint8Array;
export function create_healthcare_share_aad(user_id: string, share_token: string): Uint8Array;
export function create_derivation_path(path_str: string): DerivationPath;
export function create_master_key_from_seed(seed: Uint8Array): ExtendedKey;
export enum CryptoAlgorithm {
  AES256GCM = 1,
  ChaCha20Poly1305 = 2,
}
export enum DataCategory {
  CycleData = 0,
  Preferences = 1,
  HealthcareSharing = 2,
  DeviceSync = 3,
}
export enum DeviceClass {
  MobileHigh = 0,
  MobileLow = 1,
  WebStandard = 2,
  WebLimited = 3,
}
/**
 * Device trust status and synchronization state
 */
export enum DeviceStatus {
  Unknown = 0,
  Pending = 1,
  Trusted = 2,
  Revoked = 3,
  Expired = 4,
}
export enum EnvelopeVersion {
  V1 = 1,
  V2 = 2,
}
/**
 * Error types for key rotation operations
 */
export enum KeyRotationError {
  InvalidVersion = 0,
  KeyNotFound = 1,
  MigrationInProgress = 2,
  PolicyViolation = 3,
  CryptoError = 4,
  StorageError = 5,
  NetworkError = 6,
  SecurityEventProcessingError = 7,
  InvalidRotationTiming = 8,
  UserPreferencesNotFound = 9,
}
/**
 * Key lifecycle status enumeration
 */
export enum KeyStatus {
  Active = 0,
  Deprecated = 1,
  Revoked = 2,
  Migrating = 3,
  Expired = 4,
}
/**
 * Recovery validation levels for emergency procedures
 */
export enum RecoveryValidationLevel {
  Basic = 0,
  Standard = 1,
  Enhanced = 2,
  Emergency = 3,
}
/**
 * Result type for key rotation operations
 */
export enum RotationResult {
  Success = 0,
  Failed = 1,
  Pending = 2,
  RequiresUserConfirmation = 3,
  PolicyViolation = 4,
}
/**
 * User timing preferences for rotation operations
 */
export enum RotationTiming {
  Immediate = 0,
  LowUsage = 1,
  Scheduled = 2,
  UserControlled = 3,
  Background = 4,
}
/**
 * Rotation trigger types for policy-based scheduling
 */
export enum RotationTrigger {
  TimeBased = 0,
  UsageBased = 1,
  EventBased = 2,
  Manual = 3,
  Emergency = 4,
}
export enum SecureStoragePlatform {
  IOSKeychain = 0,
  AndroidKeystore = 1,
  AndroidStrongBox = 2,
  WebCryptoAPI = 3,
  WebIndexedDB = 4,
}
/**
 * Security event types that can trigger emergency key rotations
 */
export enum SecurityEventType {
  DeviceCompromise = 0,
  UnauthorizedAccess = 1,
  SuspiciousActivity = 2,
  DataBreach = 3,
  NetworkIntrusion = 4,
  MalwareDetected = 5,
  UserReported = 6,
}
/**
 * BIP39 wordlist languages supported for recovery phrases
 */
export enum WordlistLanguage {
  English = 0,
  Japanese = 1,
  Korean = 2,
  Spanish = 3,
  Chinese = 4,
  French = 5,
}
export class AADValidator {
  free(): void;
  constructor(context: string);
  set_user_id(user_id: string): void;
  set_timestamp(timestamp: bigint): void;
  generate_aad(): Uint8Array;
  validate_aad(provided_aad: Uint8Array): boolean;
  clear_cache(): void;
  readonly cached_hash: Uint8Array | undefined;
  readonly context: string;
}
export class Argon2Params {
  free(): void;
  constructor(memory_kb: number, iterations: number, parallelism: number, salt_length: number, key_length: number);
  readonly memory_kb: number;
  readonly iterations: number;
  readonly parallelism: number;
  readonly salt_length: number;
  readonly key_length: number;
}
/**
 * Async crypto operations with Promise support
 */
export class AsyncCrypto {
  private constructor();
  free(): void;
  /**
   * Async envelope creation returning a Promise
   */
  static create_envelope_async(encrypted_data: Uint8Array, nonce: Uint8Array, tag: Uint8Array): Promise<any>;
  /**
   * Async key generation returning a Promise
   */
  static generate_key_async(key_type: string): Promise<any>;
  /**
   * Async AAD generation returning a Promise
   */
  static create_aad_async(context: string, user_id: string, timestamp: string): Promise<any>;
}
/**
 * Promise-based async interface support
 */
export class AsyncCryptoOperation {
  free(): void;
  constructor(operation_id: string);
  set_status(status: string): void;
  is_complete(): boolean;
  readonly operation_id: string;
  readonly status: string;
}
/**
 * Cryptographic operation audit trail
 */
export class AuditTrail {
  free(): void;
  constructor(max_entries: number);
  /**
   * Log a cryptographic operation (privacy-safe)
   */
  log_operation(operation_type: string, algorithm: string): void;
  /**
   * Get operation count for a specific type
   */
  get_operation_count(operation_type: string): number;
  /**
   * Get recent operations (returns JSON string)
   */
  get_recent_operations(limit: number): string;
  /**
   * Clear audit trail (emergency function)
   */
  clear(): void;
  /**
   * Get total operation count
   */
  total_operations(): number;
}
/**
 * Batch processing configuration
 */
export class BatchConfig {
  free(): void;
  /**
   * Create new batch configuration
   */
  constructor(size: number, max_concurrent: number, integrity_validation: boolean, performance_monitoring: boolean);
  /**
   * Get batch size
   */
  readonly size: number;
  /**
   * Get max concurrent batches
   */
  readonly max_concurrent: number;
  /**
   * Get integrity validation setting
   */
  readonly integrity_validation: boolean;
  /**
   * Get performance monitoring setting
   */
  readonly performance_monitoring: boolean;
}
export class BenchmarkResult {
  free(): void;
  constructor(duration_ms: number, memory_used_mb: number, iterations_tested: number, success: boolean, error_message?: string | null);
  readonly duration_ms: number;
  readonly memory_used_mb: number;
  readonly iterations_tested: number;
  readonly success: boolean;
  readonly error_message: string | undefined;
}
export class CryptoEnvelope {
  free(): void;
  constructor();
  set_version(version: number): void;
  set_algorithm(algorithm: number): void;
  set_kdf_params(params: KDFParams): void;
  set_salt(salt: Uint8Array): void;
  set_nonce(nonce: Uint8Array): void;
  set_key_id(key_id: string): void;
  set_encrypted_data(data: Uint8Array): void;
  set_tag(tag: Uint8Array): void;
  set_aad_hash(aad_hash: Uint8Array): void;
  is_valid(): boolean;
  validate_integrity(): boolean;
  readonly version: number;
  readonly algorithm: number;
  readonly salt: Uint8Array;
  readonly nonce: Uint8Array;
  readonly key_id: string | undefined;
  readonly encrypted_data: Uint8Array;
  readonly tag: Uint8Array;
  readonly aad_hash: Uint8Array;
}
/**
 * WASM binding exports for JavaScript/TypeScript integration
 * This module handles the interface between Rust and JavaScript
 * Error types for crypto operations
 */
export class CryptoError {
  free(): void;
  constructor(message: string, error_type: string);
  readonly message: string;
  readonly error_type: string;
}
export class CryptoKey {
  free(): void;
  constructor(key_type: string);
  generate(): void;
  length(): number;
  is_initialized(): boolean;
  constant_time_equals(other: CryptoKey): boolean;
  validate_memory_protection(): boolean;
  zeroize_key(): void;
  readonly key_type: string;
}
/**
 * Debug interface for development
 */
export class DebugInterface {
  free(): void;
  constructor(debug_enabled: boolean);
  /**
   * Log debug information if enabled
   */
  debug_log(message: string): void;
  /**
   * Get memory statistics for debugging
   */
  get_memory_stats(): string;
  set_debug_enabled(enabled: boolean): void;
  readonly debug_enabled: boolean;
}
export class DerivationPath {
  free(): void;
  constructor();
  static fromString(path_str: string): DerivationPath;
  toString(): string;
  child(index: number): DerivationPath;
  hardenedChild(index: number): DerivationPath;
}
export class DeviceCapabilities {
  free(): void;
  constructor(device_class: DeviceClass, available_memory: bigint, cpu_cores: number, has_secure_enclave: boolean, platform: string, performance_score: number);
  readonly device_class: DeviceClass;
  readonly available_memory: bigint;
  readonly cpu_cores: number;
  readonly has_secure_enclave: boolean;
  readonly platform: string;
  readonly performance_score: number;
}
export class DeviceCapabilityDetector {
  free(): void;
  constructor();
  detect_capabilities(available_memory_mb: bigint, cpu_cores: number, platform: string, has_secure_enclave: boolean): DeviceCapabilities;
  get_optimal_argon2_params(capabilities: DeviceCapabilities): Argon2Params;
  benchmark_argon2_performance(test_params: Argon2Params, target_duration_ms: number): Promise<BenchmarkResult>;
  select_adaptive_parameters(capabilities: DeviceCapabilities, target_duration_ms: number): Promise<Argon2Params>;
}
/**
 * Device pairing request containing public key and device metadata
 */
export class DevicePairingRequest {
  free(): void;
  constructor(device_id: string, device_name: string, device_type: string, public_key: Uint8Array, challenge_nonce: Uint8Array, timestamp: bigint);
  readonly device_id: string;
  readonly device_name: string;
  readonly device_type: string;
  readonly public_key: Uint8Array;
  readonly challenge_nonce: Uint8Array;
  readonly timestamp: bigint;
}
/**
 * Device pairing response with authentication proof
 */
export class DevicePairingResponse {
  free(): void;
  constructor(device_id: string, response_signature: Uint8Array, shared_secret_hash: Uint8Array, device_trust_token: string, timestamp: bigint);
  readonly device_id: string;
  readonly response_signature: Uint8Array;
  readonly shared_secret_hash: Uint8Array;
  readonly device_trust_token: string;
  readonly timestamp: bigint;
}
/**
 * Device registry entry containing trust information
 */
export class DeviceRegistryEntry {
  free(): void;
  constructor(device_id: string, device_name: string, device_type: string, status: number, trust_token: string, public_key: Uint8Array, last_sync: bigint, trust_score: number, created_at: bigint, updated_at: bigint);
  /**
   * Check if device entry is expired based on timestamp
   */
  is_expired(ttl_seconds: bigint): boolean;
  /**
   * Check if device is in trusted state
   */
  is_trusted(): boolean;
  /**
   * Check if device is revoked
   */
  is_revoked(): boolean;
  readonly device_id: string;
  readonly device_name: string;
  readonly device_type: string;
  status: number;
  readonly trust_token: string;
  readonly public_key: Uint8Array;
  last_sync: bigint;
  trust_score: number;
  readonly created_at: bigint;
  readonly updated_at: bigint;
}
export class EmergencyRotationManager {
  free(): void;
  constructor();
  triggerEmergencyRotation(trigger_type: string, description: string, affected_devices: string[], severity: number): string;
  initiateEmergencyResponse(incident_id: string): void;
  isolateDevice(device_id: string, incident_id: string): void;
  invalidateKey(key_id: string, incident_id: string): void;
  executeEmergencyRotation(incident_id: string, device_ids: string[]): string[];
  initiateRecovery(incident_id: string): void;
  getIncidentStatus(incident_id: string): string;
  isDeviceIsolated(device_id: string): boolean;
  isKeyInvalidated(key_id: string): boolean;
  restoreDeviceAccess(device_id: string, incident_id: string): void;
}
export class EntropySource {
  free(): void;
  constructor(source_type: string, entropy_bytes: number, quality_score: number, is_hardware_based: boolean, timestamp: number);
  readonly source_type: string;
  readonly entropy_bytes: number;
  readonly quality_score: number;
  readonly is_hardware_based: boolean;
  readonly timestamp: number;
}
export class ExtendedKey {
  private constructor();
  free(): void;
  static fromSeed(seed: Uint8Array): ExtendedKey;
  deriveChild(index: number): ExtendedKey;
  getKeyBytes(): Uint8Array;
  readonly depth: number;
}
export class HSMCapabilities {
  free(): void;
  constructor(has_hsm: boolean, hsm_type: string, supports_key_generation: boolean, supports_key_storage: boolean, supports_attestation: boolean, max_key_size: number);
  supported_algorithms(): string[];
  readonly has_hsm: boolean;
  readonly hsm_type: string;
  readonly supports_key_generation: boolean;
  readonly supports_key_storage: boolean;
  readonly supports_attestation: boolean;
  readonly max_key_size: number;
}
/**
 * Health check interface for validation
 */
export class HealthCheck {
  private constructor();
  free(): void;
  /**
   * Perform comprehensive health check
   */
  static run_health_check(): HealthCheck;
  is_healthy(): boolean;
  to_json(): string;
  readonly crypto_status: string;
  readonly memory_status: string;
  readonly binding_status: string;
}
export class HierarchicalKeyDerivation {
  free(): void;
  constructor();
  initializeWithSeed(seed: Uint8Array): void;
  deriveDataCategoryKey(category_str: string, device_id: string): Uint8Array;
  deriveKeyAtPath(path_str: string): Uint8Array;
  rotateKeys(): void;
  verifyKeyIsolation(device_id: string): boolean;
  readonly keyVersion: number;
}
export class KDFParams {
  free(): void;
  constructor(algorithm: string, iterations: number);
  set_memory_cost(memory_cost: number): void;
  set_parallelism(parallelism: number): void;
  readonly algorithm: string;
  readonly iterations: number;
}
/**
 * Key backup information for secure escrow
 */
export class KeyBackup {
  free(): void;
  constructor(backup_id: string, device_id: string, encrypted_master_key: Uint8Array, recovery_phrase_hash: Uint8Array, passkey_challenge: Uint8Array, backup_timestamp: bigint, version: number, metadata: string);
  readonly backup_id: string;
  readonly device_id: string;
  readonly encrypted_master_key: Uint8Array;
  readonly recovery_phrase_hash: Uint8Array;
  readonly passkey_challenge: Uint8Array;
  readonly backup_timestamp: bigint;
  readonly version: number;
  readonly metadata: string;
}
/**
 * Migration utilities for progressive key transitions
 */
export class KeyMigrationHelper {
  private constructor();
  free(): void;
  /**
   * Parse version string to KeyVersion
   */
  static parse_version_string(version_str: string): KeyVersion | undefined;
  /**
   * Validate version format
   */
  static validate_version_format(version_str: string): boolean;
  /**
   * Calculate migration progress based on data reencryption
   */
  static calculate_migration_progress(total_records: number, migrated_records: number, failed_records: number): object;
  /**
   * Validate migration readiness
   */
  static validate_migration_readiness(current_key: VersionedKey, new_key: VersionedKey): object;
  /**
   * Create migration batch for progressive processing
   */
  static create_migration_batch(data_identifiers: Array<any>, batch_size: number, start_index: number): object;
  /**
   * Validate migration rollback safety
   */
  static validate_rollback_safety(current_key: VersionedKey, rollback_version: KeyVersion): boolean;
}
/**
 * Main key rotation manager orchestrating the entire lifecycle
 */
export class KeyRotationManager {
  free(): void;
  constructor(hd_derivation: HierarchicalKeyDerivation);
  get_active_key(purpose: DataCategory): VersionedKey | undefined;
  get_key_by_version(purpose: DataCategory, version: KeyVersion): VersionedKey | undefined;
  create_new_key_version(purpose: DataCategory): VersionedKey;
  complete_key_migration(purpose: DataCategory): void;
  get_scheduler(): KeyRotationScheduler;
  set_rotation_policy(purpose: DataCategory, policy: RotationPolicy): void;
  check_rotation_due(): Array<any>;
  get_key_versions_for_purpose(purpose: DataCategory): Array<any>;
  cleanup_expired_keys(): number;
  get_key_rotation_analytics(): object;
  force_rotate_key(purpose: DataCategory): VersionedKey;
  get_migration_progress(purpose: DataCategory): number | undefined;
  update_migration_progress(purpose: DataCategory, progress: number): void;
}
/**
 * Automated key rotation scheduler with policy-based management
 */
export class KeyRotationScheduler {
  free(): void;
  constructor();
  set_rotation_policy(purpose: string, policy: RotationPolicy): void;
  is_rotation_due(purpose: string): boolean;
  get_next_rotation_time(purpose: string): number | undefined;
  get_time_until_rotation(purpose: string): number | undefined;
  force_rotation(purpose: string): void;
  update_next_rotation(purpose: string): void;
  get_all_scheduled_rotations(): Array<any>;
  get_rotations_due_within(hours: number): Array<any>;
  postpone_rotation(purpose: string, additional_days: number): void;
  schedule_rotation_at(purpose: string, timestamp_ms: number): void;
  enable_automatic_rotation(purpose: string, enabled: boolean): void;
  get_rotation_statistics(): object;
  cleanup_expired_schedules(): number;
  setUserPreferences(preferences: UserRotationPreferences): void;
  getUserPreferences(): UserRotationPreferences;
  updateUserPreference(preference_type: string, value: string): void;
  reportSecurityEvent(event: SecurityEvent): boolean;
  getRecentSecurityEvents(hours: number): Array<any>;
  trackKeyUsage(purpose: string): void;
  getUsageCount(purpose: string): bigint;
  resetUsageCount(purpose: string): void;
  scheduleRotationWithPreferences(purpose: string): number;
  isRotationAllowedNow(purpose: string, is_user_active: boolean): boolean;
  triggerEmergencyIncident(trigger_type: string, description: string, affected_devices: string[], severity: number): string;
  detectSecurityIncident(device_id: string, event_data: string): boolean;
  getActiveIncidents(): string;
  updateIncidentDetectionThresholds(thresholds: string): void;
}
/**
 * Version information for cryptographic keys
 */
export class KeyVersion {
  free(): void;
  constructor(major: number, minor: number, patch: number);
  setExpiration(duration_days: number): void;
  isExpired(): boolean;
  toString(): string;
  compareVersion(other: KeyVersion): number;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly created_at: number;
  readonly expires_at: number | undefined;
}
/**
 * Legacy key retention policy for cleanup management
 */
export class LegacyKeyRetentionPolicy {
  free(): void;
  constructor(max_legacy_versions: number, min_retention_days: number);
  readonly max_legacy_versions: number;
  readonly min_retention_days: number;
  auto_cleanup_enabled: boolean;
  require_migration_completion: boolean;
}
export class MasterKeyStorageInfo {
  free(): void;
  constructor(key_id: string, device_id: string, storage_location: string, created_at: number, last_accessed: number, access_count: number, platform: SecureStoragePlatform, is_hardware_backed: boolean);
  readonly key_id: string;
  readonly device_id: string;
  readonly storage_location: string;
  readonly created_at: number;
  readonly last_accessed: number;
  readonly access_count: number;
  readonly platform: SecureStoragePlatform;
  readonly is_hardware_backed: boolean;
}
/**
 * WASM-exposed memory utilities
 */
export class MemoryManager {
  free(): void;
  constructor();
  /**
   * Force cleanup of all memory pools (emergency function)
   */
  emergency_cleanup(): void;
  /**
   * Get memory usage statistics
   */
  get_stats(): string;
}
/**
 * Memory protection utilities
 */
export class MemoryProtection {
  free(): void;
  constructor();
  /**
   * Check stack canary for buffer overflow detection
   */
  check_canary(canary: bigint): boolean;
  /**
   * Validate buffer bounds to prevent overflow
   */
  static validate_bounds(buffer_size: number, offset: number, length: number): boolean;
  /**
   * Get current canary value
   */
  readonly canary_value: bigint;
}
/**
 * Migration progress tracking
 */
export class MigrationProgress {
  free(): void;
  /**
   * Create new migration progress tracker
   */
  constructor(migration_id: string, total_records: number);
  /**
   * Update progress with batch results
   */
  update_progress(processed: number, failed: number, batch_number: number, processing_time_ms: number): void;
  /**
   * Get current progress as percentage
   */
  get_completion_percentage(): number;
  /**
   * Get progress summary object
   */
  get_progress_summary(): object;
}
/**
 * Integrity verification for WASM module
 */
export class ModuleIntegrity {
  private constructor();
  free(): void;
  /**
   * Verify module integrity
   */
  static verify_module(): ModuleIntegrity;
  readonly checksum: string;
  readonly verified: boolean;
}
/**
 * Multi-device key exchange protocol manager
 */
export class MultiDeviceProtocol {
  free(): void;
  /**
   * Create new multi-device protocol manager
   */
  constructor(current_device_id: string, trust_threshold: number, max_devices: number);
  /**
   * Initialize protocol with hierarchical master key
   */
  initialize(master_key: CryptoKey): void;
  /**
   * Generate device pairing request for initiating device pairing
   */
  generate_pairing_request(device_name: string, device_type: string): DevicePairingRequest;
  /**
   * Process incoming pairing request and generate response
   */
  process_pairing_request(request: DevicePairingRequest): DevicePairingResponse;
  /**
   * Finalize device pairing after successful response validation
   */
  finalize_pairing(device_id: string, validated: boolean): void;
  /**
   * Revoke device access and remove from trusted devices
   */
  revoke_device(device_id: string): void;
  /**
   * Re-enroll previously revoked device
   */
  reenroll_device(device_id: string): void;
  /**
   * Update device synchronization timestamp
   */
  update_device_sync(device_id: string): void;
  /**
   * Get device trust status
   */
  get_device_status(device_id: string): number;
  /**
   * Get list of trusted devices
   */
  get_trusted_devices(): any[];
  /**
   * Clean up expired devices from registry
   */
  cleanup_expired_devices(ttl_seconds: bigint): number;
  /**
   * Get device registry statistics
   */
  get_registry_stats(): any;
  /**
   * Validate device authentication for cross-device operations
   */
  validate_device_auth(device_id: string, auth_token: string): boolean;
  /**
   * Get device count
   */
  device_count(): number;
  /**
   * Check if device limit is reached
   */
  is_device_limit_reached(): boolean;
}
/**
 * Platform-specific entropy collection
 */
export class PlatformEntropy {
  private constructor();
  free(): void;
  /**
   * Collect additional entropy from available sources
   */
  static collect_entropy(): Uint8Array;
  /**
   * Estimate entropy quality (0-100 score)
   */
  static estimate_entropy_quality(data: Uint8Array): number;
}
export class PlatformSecureStorage {
  free(): void;
  constructor(config: SecureStorageConfig);
  initialize(): Promise<boolean>;
  generate_master_key(key_id: string): Promise<MasterKeyStorageInfo>;
  store_master_key(key_id: string, key_material: Uint8Array): Promise<string>;
  retrieve_master_key(key_id: string): Promise<Uint8Array>;
  delete_master_key(key_id: string): Promise<boolean>;
  key_exists(key_id: string): Promise<boolean>;
  get_hsm_capabilities(): HSMCapabilities | undefined;
  is_hardware_backed(): boolean;
}
/**
 * Progressive data migration system for batch re-encryption
 */
export class ProgressiveMigrationManager {
  free(): void;
  /**
   * Create new progressive migration manager
   */
  constructor(batch_size: number, max_concurrent_batches: number);
  /**
   * Start new progressive migration with user timing preferences
   */
  start_migration(migration_id: string, total_records: number, timing_preferences: string): object;
  /**
   * Resume migration from checkpoint
   */
  resume_migration(migration_id: string): object;
  /**
   * Process next batch with integrity validation
   */
  process_next_batch(migration_id: string, batch_data: Array<any>, processed_count: number, failed_count: number): object;
  /**
   * Get migration progress status
   */
  get_migration_progress(migration_id: string): object;
  /**
   * Validate migration can be safely rolled back
   */
  validate_rollback_safety(migration_id: string, current_key: VersionedKey, rollback_version: KeyVersion): object;
  /**
   * Clear completed migration state
   */
  clear_migration(migration_id: string): boolean;
  /**
   * Get optimal batch size based on system performance
   */
  calculate_optimal_batch_size(total_records: number, available_memory_mb: number, target_processing_time_ms: number): number;
}
/**
 * Recovery phrase with BIP39 compatibility
 */
export class RecoveryPhrase {
  free(): void;
  /**
   * Create new recovery phrase from entropy
   */
  constructor(words: string[], entropy_hex: string, checksum: string, language: number, word_count: number);
  /**
   * Generate new recovery phrase with specified entropy
   */
  static generate(entropy_bits: number, language: number): RecoveryPhrase;
  /**
   * Validate recovery phrase checksum
   */
  validate(): boolean;
  /**
   * Convert recovery phrase to seed
   */
  to_seed(passphrase: string): Uint8Array;
  /**
   * Get recovery phrase as space-separated string
   */
  phrase_string(): string;
  readonly words: string[];
  readonly entropy_hex: string;
  readonly checksum: string;
  readonly language: number;
  readonly word_count: number;
}
/**
 * Recovery system manager integrating with Passkeys authentication
 */
export class RecoverySystem {
  free(): void;
  /**
   * Create new recovery system
   */
  constructor(device_id: string, validation_level: number, max_attempts: number, lockout_duration_ms: bigint);
  /**
   * Create key backup with recovery phrase and passkey integration
   */
  create_backup(hierarchical_key: CryptoKey, recovery_phrase: RecoveryPhrase, passkey_challenge: Uint8Array): KeyBackup;
  /**
   * Initiate recovery process with Passkeys authentication
   */
  initiate_recovery(backup_id: string, recovery_phrase: RecoveryPhrase, passkey_response: Uint8Array): string;
  /**
   * Complete recovery and restore hierarchical key
   */
  complete_recovery(backup_id: string, recovery_token: string, recovery_phrase: RecoveryPhrase): Uint8Array;
  /**
   * Emergency recovery with enhanced validation
   */
  emergency_recovery(backup_id: string, recovery_phrase: RecoveryPhrase, emergency_code: string, passkey_response: Uint8Array): string;
  /**
   * Validate emergency delay has passed
   */
  validate_emergency_delay(delay_token: string): boolean;
  /**
   * List available backups for device
   */
  list_backups(): any[];
  /**
   * Remove old backup
   */
  remove_backup(backup_id: string): void;
  /**
   * Get recovery attempt count for backup
   */
  get_attempt_count(backup_id: string): number;
  /**
   * Check if backup is locked due to too many attempts
   */
  is_backup_locked(backup_id: string): boolean;
  /**
   * Reset attempt count for backup (admin function)
   */
  reset_attempt_count(backup_id: string): void;
  /**
   * Get system statistics
   */
  get_stats(): any;
}
/**
 * Rotation policy configuration for automated key management
 */
export class RotationPolicy {
  free(): void;
  constructor(max_age_days: number);
  setTriggerType(trigger_type: RotationTrigger): void;
  setTimingPreference(timing: RotationTiming): void;
  addSecurityEventTrigger(event_type: SecurityEventType): void;
  removeSecurityEventTrigger(event_type: SecurityEventType): void;
  hasSecurityEventTrigger(event_type: SecurityEventType): boolean;
  setLowUsageThresholdHours(hours: number): void;
  setEmergencyRotationEnabled(enabled: boolean): void;
  shouldTriggerRotation(current_age_hours: number, usage_count: bigint, security_event?: SecurityEventType | null): boolean;
  readonly max_age_days: number;
  set max_usage_count(value: bigint);
  requires_user_confirmation: boolean;
  readonly force_rotation_on_compromise: boolean;
  readonly trigger_type: RotationTrigger;
  readonly timing_preference: RotationTiming;
  readonly low_usage_threshold_hours: number;
  readonly emergency_rotation_enabled: boolean;
}
/**
 * Secure key derivation with timing attack protection
 */
export class SecureKDF {
  private constructor();
  free(): void;
  /**
   * Derive key using Argon2id with constant-time validation
   */
  static derive_key(password: Uint8Array, salt: Uint8Array, iterations: number, memory_cost: number, parallelism: number, output_length: number): Uint8Array;
}
/**
 * Secure random number generator using platform entropy
 */
export class SecureRandom {
  private constructor();
  free(): void;
  /**
   * Generate secure random bytes
   */
  static generate_bytes(size: number): Uint8Array;
  /**
   * Generate secure random nonce for crypto operations
   */
  static generate_nonce(): Uint8Array;
  /**
   * Generate secure salt for key derivation
   */
  static generate_salt(): Uint8Array;
  /**
   * Generate secure key material
   */
  static generate_key(size: number): Uint8Array;
}
export class SecureStorageConfig {
  free(): void;
  constructor(platform: SecureStoragePlatform, keychain_service: string, require_authentication: boolean, require_biometrics: boolean, accessibility_level: string, encryption_algorithm: string);
  readonly platform: SecureStoragePlatform;
  readonly keychain_service: string;
  readonly require_authentication: boolean;
  readonly require_biometrics: boolean;
  readonly accessibility_level: string;
  readonly encryption_algorithm: string;
}
/**
 * Secure temporary data holder that auto-zeroizes
 */
export class SecureTempData {
  free(): void;
  constructor(size: number);
  /**
   * Create from bytes
   */
  static from_bytes(data: Uint8Array): SecureTempData;
  /**
   * Get data length
   */
  length(): number;
  /**
   * Check if data is active
   */
  is_active(): boolean;
  /**
   * Manually zeroize data
   */
  zeroize(): void;
}
/**
 * Security event for triggering rotations
 */
export class SecurityEvent {
  free(): void;
  constructor(event_type: SecurityEventType, severity: number, description: string);
  setDeviceId(device_id?: string | null): void;
  isHighSeverity(): boolean;
  requiresImmedateAction(): boolean;
  readonly event_type: SecurityEventType;
  readonly severity: number;
  readonly timestamp: number;
  readonly description: string;
  readonly device_id: string | undefined;
}
/**
 * Side-channel attack prevention utilities
 */
export class SideChannelProtection {
  private constructor();
  free(): void;
  /**
   * Constant-time conditional select
   */
  static conditional_select(condition: boolean, true_val: number, false_val: number): number;
  /**
   * Constant-time array conditional select
   */
  static conditional_select_array(condition: boolean, true_array: Uint8Array, false_array: Uint8Array): Uint8Array;
  /**
   * Add timing noise to prevent timing analysis
   */
  static add_timing_noise(): void;
}
/**
 * TypeScript type definition generator
 */
export class TypeDefinitions {
  private constructor();
  free(): void;
  /**
   * Generate comprehensive TypeScript definitions
   */
  static generate_type_definitions(): string;
}
/**
 * User preferences for rotation timing and behavior
 */
export class UserRotationPreferences {
  free(): void;
  constructor();
  preferred_rotation_time_hour: number;
  allow_automatic_rotation: boolean;
  notification_advance_hours: number;
  pause_during_active_usage: boolean;
  emergency_rotation_requires_confirmation: boolean;
}
/**
 * A versioned cryptographic key with lifecycle management
 */
export class VersionedKey {
  free(): void;
  constructor(key: CryptoKey, version: KeyVersion, purpose: DataCategory);
  get_audit_log(): Array<any>;
  set_status(status: KeyStatus): void;
  set_migration_progress(progress: number): void;
  is_usable(): boolean;
  can_decrypt_data_from_version(data_version: KeyVersion): boolean;
  supports_backward_compatibility_to(target_version: KeyVersion): boolean;
  get_backward_compatibility_versions(): Array<any>;
  addPredecessorVersion(predecessor: KeyVersion): void;
  getPredecessorVersions(): Array<any>;
  setPredecessorVersion(version: KeyVersion): void;
  getSupportedDecryptionVersions(): Array<any>;
  addSupportedDecryptionVersion(version: KeyVersion): void;
  validateVersionCompatibility(version: KeyVersion): boolean;
  validateKeyIntegrity(): boolean;
  updateUsageTracking(): void;
  checkRetentionEligibility(policy: LegacyKeyRetentionPolicy): boolean;
  transitionToVersion(new_version: KeyVersion, new_key: CryptoKey): void;
  readonly key: CryptoKey;
  readonly version: KeyVersion;
  readonly status: KeyStatus;
  readonly purpose: DataCategory;
  readonly migration_progress: number;
  readonly creation_time: number;
  readonly last_used_time: number | undefined;
  readonly usage_count: bigint;
  readonly integrity_hash: string | undefined;
}
/**
 * WASM memory utilities wrapper
 */
export class WasmMemoryUtils {
  private constructor();
  free(): void;
  /**
   * Get current WASM memory statistics
   */
  static get_memory_stats(): object;
  /**
   * Force garbage collection of WASM memory
   */
  static cleanup_memory(): void;
  /**
   * Check for memory leaks
   */
  static detect_leaks(): boolean;
}
