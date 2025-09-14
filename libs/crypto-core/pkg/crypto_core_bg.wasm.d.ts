/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_rotationpolicy_free: (a: number, b: number) => void;
export const rotationpolicy_new: (a: number) => number;
export const rotationpolicy_max_age_days: (a: number) => number;
export const rotationpolicy_set_max_usage_count: (a: number, b: bigint) => void;
export const rotationpolicy_set_requires_user_confirmation: (a: number, b: number) => void;
export const rotationpolicy_requires_user_confirmation: (a: number) => number;
export const rotationpolicy_force_rotation_on_compromise: (a: number) => number;
export const rotationpolicy_setTriggerType: (a: number, b: number) => void;
export const rotationpolicy_trigger_type: (a: number) => number;
export const rotationpolicy_setTimingPreference: (a: number, b: number) => void;
export const rotationpolicy_timing_preference: (a: number) => number;
export const rotationpolicy_addSecurityEventTrigger: (a: number, b: number) => void;
export const rotationpolicy_removeSecurityEventTrigger: (a: number, b: number) => void;
export const rotationpolicy_hasSecurityEventTrigger: (a: number, b: number) => number;
export const rotationpolicy_setLowUsageThresholdHours: (a: number, b: number) => void;
export const rotationpolicy_low_usage_threshold_hours: (a: number) => number;
export const rotationpolicy_setEmergencyRotationEnabled: (a: number, b: number) => void;
export const rotationpolicy_emergency_rotation_enabled: (a: number) => number;
export const rotationpolicy_shouldTriggerRotation: (
  a: number,
  b: number,
  c: bigint,
  d: number
) => number;
export const __wbg_userrotationpreferences_free: (a: number, b: number) => void;
export const userrotationpreferences_new: () => number;
export const userrotationpreferences_preferred_rotation_time_hour: (a: number) => number;
export const userrotationpreferences_set_preferred_rotation_time_hour: (
  a: number,
  b: number
) => void;
export const userrotationpreferences_allow_automatic_rotation: (a: number) => number;
export const userrotationpreferences_set_allow_automatic_rotation: (a: number, b: number) => void;
export const userrotationpreferences_notification_advance_hours: (a: number) => number;
export const userrotationpreferences_set_notification_advance_hours: (a: number, b: number) => void;
export const userrotationpreferences_pause_during_active_usage: (a: number) => number;
export const userrotationpreferences_set_pause_during_active_usage: (a: number, b: number) => void;
export const userrotationpreferences_emergency_rotation_requires_confirmation: (
  a: number
) => number;
export const userrotationpreferences_set_emergency_rotation_requires_confirmation: (
  a: number,
  b: number
) => void;
export const __wbg_securityevent_free: (a: number, b: number) => void;
export const securityevent_new: (a: number, b: number, c: number, d: number) => number;
export const securityevent_event_type: (a: number) => number;
export const securityevent_severity: (a: number) => number;
export const securityevent_timestamp: (a: number) => number;
export const securityevent_description: (a: number) => [number, number];
export const securityevent_setDeviceId: (a: number, b: number, c: number) => void;
export const securityevent_device_id: (a: number) => [number, number];
export const securityevent_isHighSeverity: (a: number) => number;
export const securityevent_requiresImmedateAction: (a: number) => number;
export const __wbg_keyrotationscheduler_free: (a: number, b: number) => void;
export const keyrotationscheduler_new: () => number;
export const keyrotationscheduler_set_rotation_policy: (
  a: number,
  b: number,
  c: number,
  d: number
) => void;
export const keyrotationscheduler_is_rotation_due: (a: number, b: number, c: number) => number;
export const keyrotationscheduler_get_next_rotation_time: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const keyrotationscheduler_get_time_until_rotation: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const keyrotationscheduler_force_rotation: (a: number, b: number, c: number) => void;
export const keyrotationscheduler_update_next_rotation: (a: number, b: number, c: number) => void;
export const keyrotationscheduler_get_all_scheduled_rotations: (a: number) => any;
export const keyrotationscheduler_get_rotations_due_within: (a: number, b: number) => any;
export const keyrotationscheduler_postpone_rotation: (
  a: number,
  b: number,
  c: number,
  d: number
) => [number, number];
export const keyrotationscheduler_schedule_rotation_at: (
  a: number,
  b: number,
  c: number,
  d: number
) => [number, number];
export const keyrotationscheduler_enable_automatic_rotation: (
  a: number,
  b: number,
  c: number,
  d: number
) => [number, number];
export const keyrotationscheduler_get_rotation_statistics: (a: number) => any;
export const keyrotationscheduler_cleanup_expired_schedules: (a: number) => number;
export const keyrotationscheduler_setUserPreferences: (a: number, b: number) => void;
export const keyrotationscheduler_getUserPreferences: (a: number) => number;
export const keyrotationscheduler_updateUserPreference: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number];
export const keyrotationscheduler_reportSecurityEvent: (
  a: number,
  b: number
) => [number, number, number];
export const keyrotationscheduler_getRecentSecurityEvents: (a: number, b: number) => any;
export const keyrotationscheduler_trackKeyUsage: (a: number, b: number, c: number) => void;
export const keyrotationscheduler_getUsageCount: (a: number, b: number, c: number) => bigint;
export const keyrotationscheduler_resetUsageCount: (a: number, b: number, c: number) => void;
export const keyrotationscheduler_scheduleRotationWithPreferences: (
  a: number,
  b: number,
  c: number
) => [number, number, number];
export const keyrotationscheduler_isRotationAllowedNow: (
  a: number,
  b: number,
  c: number,
  d: number
) => number;
export const keyrotationscheduler_triggerEmergencyIncident: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
) => [number, number, number, number];
export const keyrotationscheduler_detectSecurityIncident: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number];
export const keyrotationscheduler_getActiveIncidents: (
  a: number
) => [number, number, number, number];
export const keyrotationscheduler_updateIncidentDetectionThresholds: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const __wbg_cryptoerror_free: (a: number, b: number) => void;
export const cryptoerror_new: (a: number, b: number, c: number, d: number) => number;
export const cryptoerror_message: (a: number) => [number, number];
export const cryptoerror_error_type: (a: number) => [number, number];
export const __wbg_moduleintegrity_free: (a: number, b: number) => void;
export const moduleintegrity_verify_module: () => number;
export const moduleintegrity_checksum: (a: number) => [number, number];
export const moduleintegrity_verified: (a: number) => number;
export const __wbg_asynccryptooperation_free: (a: number, b: number) => void;
export const asynccryptooperation_new: (a: number, b: number) => number;
export const asynccryptooperation_operation_id: (a: number) => [number, number];
export const asynccryptooperation_status: (a: number) => [number, number];
export const asynccryptooperation_set_status: (a: number, b: number, c: number) => void;
export const asynccryptooperation_is_complete: (a: number) => number;
export const __wbg_asynccrypto_free: (a: number, b: number) => void;
export const asynccrypto_create_envelope_async: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => any;
export const asynccrypto_generate_key_async: (a: number, b: number) => any;
export const asynccrypto_create_aad_async: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => any;
export const init_crypto_core_with_verification: () => [number, number, number];
export const __wbg_healthcheck_free: (a: number, b: number) => void;
export const healthcheck_run_health_check: () => number;
export const healthcheck_crypto_status: (a: number) => [number, number];
export const healthcheck_memory_status: (a: number) => [number, number];
export const healthcheck_binding_status: (a: number) => [number, number];
export const healthcheck_is_healthy: (a: number) => number;
export const healthcheck_to_json: (a: number) => [number, number];
export const __wbg_debuginterface_free: (a: number, b: number) => void;
export const debuginterface_new: (a: number) => number;
export const debuginterface_debug_log: (a: number, b: number, c: number) => void;
export const debuginterface_get_memory_stats: (a: number) => [number, number];
export const debuginterface_debug_enabled: (a: number) => number;
export const debuginterface_set_debug_enabled: (a: number, b: number) => void;
export const get_crypto_core_version: () => [number, number];
export const get_build_info: () => [number, number];
export const __wbg_wasmmemoryutils_free: (a: number, b: number) => void;
export const wasmmemoryutils_get_memory_stats: () => any;
export const wasmmemoryutils_cleanup_memory: () => void;
export const wasmmemoryutils_detect_leaks: () => number;
export const __wbg_typedefinitions_free: (a: number, b: number) => void;
export const typedefinitions_generate_type_definitions: () => [number, number];
export const __wbg_recoveryphrase_free: (a: number, b: number) => void;
export const recoveryphrase_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
) => number;
export const recoveryphrase_generate: (a: number, b: number) => [number, number, number];
export const recoveryphrase_validate: (a: number) => number;
export const recoveryphrase_to_seed: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const recoveryphrase_words: (a: number) => [number, number];
export const recoveryphrase_entropy_hex: (a: number) => [number, number];
export const recoveryphrase_checksum: (a: number) => [number, number];
export const recoveryphrase_language: (a: number) => number;
export const recoveryphrase_word_count: (a: number) => number;
export const recoveryphrase_phrase_string: (a: number) => [number, number];
export const __wbg_keybackup_free: (a: number, b: number) => void;
export const keybackup_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: bigint,
  l: number,
  m: number,
  n: number
) => number;
export const keybackup_backup_id: (a: number) => [number, number];
export const keybackup_device_id: (a: number) => [number, number];
export const keybackup_encrypted_master_key: (a: number) => [number, number];
export const keybackup_recovery_phrase_hash: (a: number) => [number, number];
export const keybackup_passkey_challenge: (a: number) => [number, number];
export const keybackup_backup_timestamp: (a: number) => bigint;
export const keybackup_version: (a: number) => number;
export const keybackup_metadata: (a: number) => [number, number];
export const __wbg_recoverysystem_free: (a: number, b: number) => void;
export const recoverysystem_new: (a: number, b: number, c: number, d: number, e: bigint) => number;
export const recoverysystem_create_backup: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number];
export const recoverysystem_initiate_recovery: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => [number, number, number, number];
export const recoverysystem_complete_recovery: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => [number, number, number, number];
export const recoverysystem_emergency_recovery: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
) => [number, number, number, number];
export const recoverysystem_validate_emergency_delay: (a: number, b: number, c: number) => number;
export const recoverysystem_list_backups: (a: number) => [number, number];
export const recoverysystem_remove_backup: (a: number, b: number, c: number) => [number, number];
export const recoverysystem_get_attempt_count: (a: number, b: number, c: number) => number;
export const recoverysystem_is_backup_locked: (a: number, b: number, c: number) => number;
export const recoverysystem_reset_attempt_count: (a: number, b: number, c: number) => void;
export const recoverysystem_get_stats: (a: number) => any;
export const __wbg_aadvalidator_free: (a: number, b: number) => void;
export const aadvalidator_new: (a: number, b: number) => number;
export const aadvalidator_set_user_id: (a: number, b: number, c: number) => void;
export const aadvalidator_set_timestamp: (a: number, b: bigint) => void;
export const aadvalidator_generate_aad: (a: number) => [number, number];
export const aadvalidator_validate_aad: (a: number, b: number, c: number) => number;
export const aadvalidator_cached_hash: (a: number) => [number, number];
export const aadvalidator_clear_cache: (a: number) => void;
export const aadvalidator_context: (a: number) => [number, number];
export const create_cycle_data_aad: (a: number, b: number, c: bigint) => [number, number];
export const create_healthcare_share_aad: (
  a: number,
  b: number,
  c: number,
  d: number
) => [number, number];
export const __wbg_securestorageconfig_free: (a: number, b: number) => void;
export const securestorageconfig_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number
) => number;
export const securestorageconfig_platform: (a: number) => number;
export const securestorageconfig_keychain_service: (a: number) => [number, number];
export const securestorageconfig_require_authentication: (a: number) => number;
export const securestorageconfig_require_biometrics: (a: number) => number;
export const securestorageconfig_accessibility_level: (a: number) => [number, number];
export const securestorageconfig_encryption_algorithm: (a: number) => [number, number];
export const __wbg_masterkeystorageinfo_free: (a: number, b: number) => void;
export const masterkeystorageinfo_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number
) => number;
export const masterkeystorageinfo_key_id: (a: number) => [number, number];
export const masterkeystorageinfo_device_id: (a: number) => [number, number];
export const masterkeystorageinfo_storage_location: (a: number) => [number, number];
export const masterkeystorageinfo_created_at: (a: number) => number;
export const masterkeystorageinfo_last_accessed: (a: number) => number;
export const masterkeystorageinfo_access_count: (a: number) => number;
export const masterkeystorageinfo_platform: (a: number) => number;
export const masterkeystorageinfo_is_hardware_backed: (a: number) => number;
export const __wbg_entropysource_free: (a: number, b: number) => void;
export const entropysource_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => number;
export const entropysource_source_type: (a: number) => [number, number];
export const entropysource_entropy_bytes: (a: number) => number;
export const entropysource_quality_score: (a: number) => number;
export const entropysource_is_hardware_based: (a: number) => number;
export const entropysource_timestamp: (a: number) => number;
export const __wbg_hsmcapabilities_free: (a: number, b: number) => void;
export const hsmcapabilities_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number
) => number;
export const hsmcapabilities_has_hsm: (a: number) => number;
export const hsmcapabilities_hsm_type: (a: number) => [number, number];
export const hsmcapabilities_supports_key_generation: (a: number) => number;
export const hsmcapabilities_supports_key_storage: (a: number) => number;
export const hsmcapabilities_supports_attestation: (a: number) => number;
export const hsmcapabilities_max_key_size: (a: number) => number;
export const hsmcapabilities_supported_algorithms: (a: number) => [number, number];
export const __wbg_platformsecurestorage_free: (a: number, b: number) => void;
export const platformsecurestorage_new: (a: number) => number;
export const platformsecurestorage_initialize: (a: number) => any;
export const platformsecurestorage_generate_master_key: (a: number, b: number, c: number) => any;
export const platformsecurestorage_store_master_key: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => any;
export const platformsecurestorage_retrieve_master_key: (a: number, b: number, c: number) => any;
export const platformsecurestorage_delete_master_key: (a: number, b: number, c: number) => any;
export const platformsecurestorage_key_exists: (a: number, b: number, c: number) => any;
export const platformsecurestorage_get_hsm_capabilities: (a: number) => number;
export const platformsecurestorage_is_hardware_backed: (a: number) => number;
export const __wbg_derivationpath_free: (a: number, b: number) => void;
export const derivationpath_new: () => number;
export const derivationpath_toString: (a: number) => [number, number];
export const derivationpath_child: (a: number, b: number) => number;
export const derivationpath_hardenedChild: (a: number, b: number) => number;
export const __wbg_extendedkey_free: (a: number, b: number) => void;
export const extendedkey_deriveChild: (a: number, b: number) => [number, number, number];
export const extendedkey_depth: (a: number) => number;
export const extendedkey_getKeyBytes: (a: number) => [number, number, number, number];
export const __wbg_hierarchicalkeyderivation_free: (a: number, b: number) => void;
export const hierarchicalkeyderivation_new: () => number;
export const hierarchicalkeyderivation_initializeWithSeed: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const hierarchicalkeyderivation_deriveDataCategoryKey: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number, number];
export const hierarchicalkeyderivation_deriveKeyAtPath: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const hierarchicalkeyderivation_rotateKeys: (a: number) => [number, number];
export const hierarchicalkeyderivation_keyVersion: (a: number) => number;
export const hierarchicalkeyderivation_verifyKeyIsolation: (
  a: number,
  b: number,
  c: number
) => [number, number, number];
export const create_derivation_path: (a: number, b: number) => [number, number, number];
export const create_master_key_from_seed: (a: number, b: number) => [number, number, number];
export const derivationpath_fromString: (a: number, b: number) => [number, number, number];
export const extendedkey_fromSeed: (a: number, b: number) => [number, number, number];
export const __wbg_kdfparams_free: (a: number, b: number) => void;
export const __wbg_cryptoenvelope_free: (a: number, b: number) => void;
export const kdfparams_new: (a: number, b: number, c: number) => number;
export const kdfparams_algorithm: (a: number) => [number, number];
export const kdfparams_iterations: (a: number) => number;
export const kdfparams_set_memory_cost: (a: number, b: number) => void;
export const kdfparams_set_parallelism: (a: number, b: number) => void;
export const cryptoenvelope_new: () => number;
export const cryptoenvelope_version: (a: number) => number;
export const cryptoenvelope_algorithm: (a: number) => number;
export const cryptoenvelope_salt: (a: number) => [number, number];
export const cryptoenvelope_nonce: (a: number) => [number, number];
export const cryptoenvelope_key_id: (a: number) => [number, number];
export const cryptoenvelope_encrypted_data: (a: number) => [number, number];
export const cryptoenvelope_tag: (a: number) => [number, number];
export const cryptoenvelope_aad_hash: (a: number) => [number, number];
export const cryptoenvelope_set_version: (a: number, b: number) => [number, number];
export const cryptoenvelope_set_algorithm: (a: number, b: number) => [number, number];
export const cryptoenvelope_set_kdf_params: (a: number, b: number) => void;
export const cryptoenvelope_set_salt: (a: number, b: number, c: number) => void;
export const cryptoenvelope_set_nonce: (a: number, b: number, c: number) => void;
export const cryptoenvelope_set_key_id: (a: number, b: number, c: number) => void;
export const cryptoenvelope_set_encrypted_data: (a: number, b: number, c: number) => void;
export const cryptoenvelope_set_tag: (a: number, b: number, c: number) => void;
export const cryptoenvelope_set_aad_hash: (a: number, b: number, c: number) => void;
export const cryptoenvelope_is_valid: (a: number) => number;
export const cryptoenvelope_validate_integrity: (a: number) => [number, number, number];
export const create_envelope_with_metadata: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number
) => [number, number, number];
export const create_envelope: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => number;
export const serialize_envelope: (a: number) => [number, number, number, number];
export const deserialize_envelope: (a: number, b: number) => [number, number, number];
export const __wbg_memorymanager_free: (a: number, b: number) => void;
export const memorymanager_new: () => number;
export const memorymanager_emergency_cleanup: (a: number) => void;
export const memorymanager_get_stats: (a: number) => [number, number];
export const __wbg_securetempdata_free: (a: number, b: number) => void;
export const securetempdata_new: (a: number) => number;
export const securetempdata_from_bytes: (a: number, b: number) => number;
export const securetempdata_length: (a: number) => number;
export const securetempdata_is_active: (a: number) => number;
export const securetempdata_zeroize: (a: number) => void;
export const __wbg_emergencyrotationmanager_free: (a: number, b: number) => void;
export const emergencyrotationmanager_new: () => number;
export const emergencyrotationmanager_triggerEmergencyRotation: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
) => [number, number, number, number];
export const emergencyrotationmanager_initiateEmergencyResponse: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const emergencyrotationmanager_isolateDevice: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number];
export const emergencyrotationmanager_invalidateKey: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number];
export const emergencyrotationmanager_executeEmergencyRotation: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number, number];
export const emergencyrotationmanager_initiateRecovery: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const emergencyrotationmanager_getIncidentStatus: (
  a: number,
  b: number,
  c: number
) => [number, number, number, number];
export const emergencyrotationmanager_isDeviceIsolated: (a: number, b: number, c: number) => number;
export const emergencyrotationmanager_isKeyInvalidated: (a: number, b: number, c: number) => number;
export const emergencyrotationmanager_restoreDeviceAccess: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number];
export const constant_time_compare: (a: number, b: number, c: number, d: number) => number;
export const __wbg_securerandom_free: (a: number, b: number) => void;
export const securerandom_generate_bytes: (a: number) => [number, number, number, number];
export const securerandom_generate_nonce: () => [number, number, number, number];
export const securerandom_generate_salt: () => [number, number, number, number];
export const securerandom_generate_key: (a: number) => [number, number, number, number];
export const __wbg_memoryprotection_free: (a: number, b: number) => void;
export const memoryprotection_new: () => number;
export const memoryprotection_check_canary: (a: number, b: bigint) => number;
export const memoryprotection_canary_value: (a: number) => bigint;
export const memoryprotection_validate_bounds: (a: number, b: number, c: number) => number;
export const __wbg_sidechannelprotection_free: (a: number, b: number) => void;
export const sidechannelprotection_conditional_select: (a: number, b: number, c: number) => number;
export const sidechannelprotection_conditional_select_array: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number, number];
export const sidechannelprotection_add_timing_noise: () => void;
export const __wbg_audittrail_free: (a: number, b: number) => void;
export const audittrail_new: (a: number) => number;
export const audittrail_log_operation: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => void;
export const audittrail_get_operation_count: (a: number, b: number, c: number) => number;
export const audittrail_get_recent_operations: (a: number, b: number) => [number, number];
export const audittrail_clear: (a: number) => void;
export const audittrail_total_operations: (a: number) => number;
export const __wbg_securekdf_free: (a: number, b: number) => void;
export const securekdf_derive_key: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
) => [number, number, number, number];
export const __wbg_platformentropy_free: (a: number, b: number) => void;
export const platformentropy_collect_entropy: () => [number, number];
export const platformentropy_estimate_entropy_quality: (a: number, b: number) => number;
export const get_memory_limit_for_class: (a: number) => number;
export const get_argon2_iterations_for_class: (a: number) => number;
export const get_argon2_memory_for_class: (a: number) => number;
export const get_argon2_parallelism_for_class: (a: number) => number;
export const __wbg_devicecapabilities_free: (a: number, b: number) => void;
export const devicecapabilities_new: (
  a: number,
  b: bigint,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number
) => number;
export const devicecapabilities_device_class: (a: number) => number;
export const devicecapabilities_available_memory: (a: number) => bigint;
export const devicecapabilities_cpu_cores: (a: number) => number;
export const devicecapabilities_has_secure_enclave: (a: number) => number;
export const devicecapabilities_platform: (a: number) => [number, number];
export const devicecapabilities_performance_score: (a: number) => number;
export const __wbg_argon2params_free: (a: number, b: number) => void;
export const argon2params_new: (a: number, b: number, c: number, d: number, e: number) => number;
export const argon2params_memory_kb: (a: number) => number;
export const argon2params_iterations: (a: number) => number;
export const argon2params_parallelism: (a: number) => number;
export const argon2params_salt_length: (a: number) => number;
export const argon2params_key_length: (a: number) => number;
export const __wbg_benchmarkresult_free: (a: number, b: number) => void;
export const benchmarkresult_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => number;
export const benchmarkresult_duration_ms: (a: number) => number;
export const benchmarkresult_memory_used_mb: (a: number) => number;
export const benchmarkresult_iterations_tested: (a: number) => number;
export const benchmarkresult_success: (a: number) => number;
export const benchmarkresult_error_message: (a: number) => [number, number];
export const __wbg_devicecapabilitydetector_free: (a: number, b: number) => void;
export const devicecapabilitydetector_new: () => number;
export const devicecapabilitydetector_detect_capabilities: (
  a: number,
  b: bigint,
  c: number,
  d: number,
  e: number,
  f: number
) => number;
export const devicecapabilitydetector_get_optimal_argon2_params: (a: number, b: number) => number;
export const devicecapabilitydetector_benchmark_argon2_performance: (
  a: number,
  b: number,
  c: number
) => any;
export const devicecapabilitydetector_select_adaptive_parameters: (
  a: number,
  b: number,
  c: number
) => any;
export const init: () => void;
export const test_crypto_core: () => [number, number];
export const __wbg_legacykeyretentionpolicy_free: (a: number, b: number) => void;
export const legacykeyretentionpolicy_new: (a: number, b: number) => number;
export const legacykeyretentionpolicy_max_legacy_versions: (a: number) => number;
export const legacykeyretentionpolicy_min_retention_days: (a: number) => number;
export const legacykeyretentionpolicy_set_auto_cleanup_enabled: (a: number, b: number) => void;
export const legacykeyretentionpolicy_auto_cleanup_enabled: (a: number) => number;
export const legacykeyretentionpolicy_set_require_migration_completion: (
  a: number,
  b: number
) => void;
export const legacykeyretentionpolicy_require_migration_completion: (a: number) => number;
export const __wbg_versionedkey_free: (a: number, b: number) => void;
export const versionedkey_new: (a: number, b: number, c: number) => number;
export const versionedkey_key: (a: number) => number;
export const versionedkey_version: (a: number) => number;
export const versionedkey_status: (a: number) => number;
export const versionedkey_purpose: (a: number) => number;
export const versionedkey_migration_progress: (a: number) => number;
export const versionedkey_creation_time: (a: number) => number;
export const versionedkey_last_used_time: (a: number) => [number, number];
export const versionedkey_usage_count: (a: number) => bigint;
export const versionedkey_integrity_hash: (a: number) => [number, number];
export const versionedkey_get_audit_log: (a: number) => any;
export const versionedkey_set_status: (a: number, b: number) => void;
export const versionedkey_set_migration_progress: (a: number, b: number) => void;
export const versionedkey_is_usable: (a: number) => number;
export const versionedkey_can_decrypt_data_from_version: (a: number, b: number) => number;
export const versionedkey_supports_backward_compatibility_to: (a: number, b: number) => number;
export const versionedkey_get_backward_compatibility_versions: (a: number) => any;
export const versionedkey_addPredecessorVersion: (a: number, b: number) => void;
export const versionedkey_getPredecessorVersions: (a: number) => any;
export const versionedkey_getSupportedDecryptionVersions: (a: number) => any;
export const versionedkey_addSupportedDecryptionVersion: (a: number, b: number) => [number, number];
export const versionedkey_validateVersionCompatibility: (
  a: number,
  b: number
) => [number, number, number];
export const versionedkey_validateKeyIntegrity: (a: number) => [number, number, number];
export const versionedkey_updateUsageTracking: (a: number) => void;
export const versionedkey_checkRetentionEligibility: (a: number, b: number) => number;
export const versionedkey_transitionToVersion: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const versionedkey_setPredecessorVersion: (a: number, b: number) => void;
export const __wbg_cryptokey_free: (a: number, b: number) => void;
export const cryptokey_new: (a: number, b: number) => number;
export const cryptokey_key_type: (a: number) => [number, number];
export const cryptokey_generate: (a: number) => [number, number];
export const cryptokey_length: (a: number) => number;
export const cryptokey_is_initialized: (a: number) => number;
export const cryptokey_constant_time_equals: (a: number, b: number) => [number, number, number];
export const cryptokey_validate_memory_protection: (a: number) => number;
export const cryptokey_zeroize_key: (a: number) => void;
export const generate_encryption_key: () => [number, number, number];
export const generate_signing_key: () => [number, number, number];
export const __wbg_keymigrationhelper_free: (a: number, b: number) => void;
export const __wbg_progressivemigrationmanager_free: (a: number, b: number) => void;
export const __wbg_batchconfig_free: (a: number, b: number) => void;
export const __wbg_migrationprogress_free: (a: number, b: number) => void;
export const keymigrationhelper_parse_version_string: (a: number, b: number) => number;
export const keymigrationhelper_validate_version_format: (a: number, b: number) => number;
export const keymigrationhelper_calculate_migration_progress: (
  a: number,
  b: number,
  c: number
) => any;
export const keymigrationhelper_validate_migration_readiness: (a: number, b: number) => any;
export const keymigrationhelper_create_migration_batch: (a: any, b: number, c: number) => any;
export const keymigrationhelper_validate_rollback_safety: (a: number, b: number) => number;
export const progressivemigrationmanager_new: (a: number, b: number) => number;
export const progressivemigrationmanager_start_migration: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
) => any;
export const progressivemigrationmanager_resume_migration: (a: number, b: number, c: number) => any;
export const progressivemigrationmanager_process_next_batch: (
  a: number,
  b: number,
  c: number,
  d: any,
  e: number,
  f: number
) => any;
export const progressivemigrationmanager_get_migration_progress: (
  a: number,
  b: number,
  c: number
) => any;
export const progressivemigrationmanager_validate_rollback_safety: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => any;
export const progressivemigrationmanager_clear_migration: (
  a: number,
  b: number,
  c: number
) => number;
export const progressivemigrationmanager_calculate_optimal_batch_size: (
  a: number,
  b: number,
  c: number,
  d: number
) => number;
export const batchconfig_new: (a: number, b: number, c: number, d: number) => number;
export const batchconfig_size: (a: number) => number;
export const batchconfig_max_concurrent: (a: number) => number;
export const batchconfig_integrity_validation: (a: number) => number;
export const batchconfig_performance_monitoring: (a: number) => number;
export const migrationprogress_new: (a: number, b: number, c: number) => number;
export const migrationprogress_update_progress: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => void;
export const migrationprogress_get_completion_percentage: (a: number) => number;
export const migrationprogress_get_progress_summary: (a: number) => any;
export const __wbg_devicepairingrequest_free: (a: number, b: number) => void;
export const devicepairingrequest_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: bigint
) => number;
export const devicepairingrequest_device_id: (a: number) => [number, number];
export const devicepairingrequest_device_name: (a: number) => [number, number];
export const devicepairingrequest_device_type: (a: number) => [number, number];
export const devicepairingrequest_public_key: (a: number) => [number, number];
export const devicepairingrequest_challenge_nonce: (a: number) => [number, number];
export const devicepairingrequest_timestamp: (a: number) => bigint;
export const __wbg_devicepairingresponse_free: (a: number, b: number) => void;
export const devicepairingresponse_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: bigint
) => number;
export const devicepairingresponse_device_id: (a: number) => [number, number];
export const devicepairingresponse_response_signature: (a: number) => [number, number];
export const devicepairingresponse_shared_secret_hash: (a: number) => [number, number];
export const devicepairingresponse_device_trust_token: (a: number) => [number, number];
export const devicepairingresponse_timestamp: (a: number) => bigint;
export const __wbg_deviceregistryentry_free: (a: number, b: number) => void;
export const deviceregistryentry_new: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: bigint,
  m: number,
  n: bigint,
  o: bigint
) => number;
export const deviceregistryentry_device_id: (a: number) => [number, number];
export const deviceregistryentry_device_name: (a: number) => [number, number];
export const deviceregistryentry_device_type: (a: number) => [number, number];
export const deviceregistryentry_status: (a: number) => number;
export const deviceregistryentry_set_status: (a: number, b: number) => void;
export const deviceregistryentry_trust_token: (a: number) => [number, number];
export const deviceregistryentry_public_key: (a: number) => [number, number];
export const deviceregistryentry_last_sync: (a: number) => bigint;
export const deviceregistryentry_set_last_sync: (a: number, b: bigint) => void;
export const deviceregistryentry_trust_score: (a: number) => number;
export const deviceregistryentry_set_trust_score: (a: number, b: number) => void;
export const deviceregistryentry_created_at: (a: number) => bigint;
export const deviceregistryentry_updated_at: (a: number) => bigint;
export const deviceregistryentry_is_expired: (a: number, b: bigint) => number;
export const deviceregistryentry_is_trusted: (a: number) => number;
export const deviceregistryentry_is_revoked: (a: number) => number;
export const __wbg_multideviceprotocol_free: (a: number, b: number) => void;
export const multideviceprotocol_new: (a: number, b: number, c: number, d: number) => number;
export const multideviceprotocol_initialize: (a: number, b: number) => [number, number];
export const multideviceprotocol_generate_pairing_request: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => [number, number, number];
export const multideviceprotocol_process_pairing_request: (
  a: number,
  b: number
) => [number, number, number];
export const multideviceprotocol_finalize_pairing: (
  a: number,
  b: number,
  c: number,
  d: number
) => [number, number];
export const multideviceprotocol_revoke_device: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const multideviceprotocol_reenroll_device: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const multideviceprotocol_update_device_sync: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const multideviceprotocol_get_device_status: (a: number, b: number, c: number) => number;
export const multideviceprotocol_get_trusted_devices: (a: number) => [number, number];
export const multideviceprotocol_cleanup_expired_devices: (a: number, b: bigint) => number;
export const multideviceprotocol_get_registry_stats: (a: number) => any;
export const multideviceprotocol_validate_device_auth: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number
) => number;
export const multideviceprotocol_device_count: (a: number) => number;
export const multideviceprotocol_is_device_limit_reached: (a: number) => number;
export const __wbg_keyversion_free: (a: number, b: number) => void;
export const keyversion_new: (a: number, b: number, c: number) => number;
export const keyversion_major: (a: number) => number;
export const keyversion_minor: (a: number) => number;
export const keyversion_patch: (a: number) => number;
export const keyversion_created_at: (a: number) => number;
export const keyversion_expires_at: (a: number) => [number, number];
export const keyversion_setExpiration: (a: number, b: number) => [number, number];
export const keyversion_isExpired: (a: number) => number;
export const keyversion_toString: (a: number) => [number, number];
export const keyversion_compareVersion: (a: number, b: number) => number;
export const __wbg_keyrotationmanager_free: (a: number, b: number) => void;
export const keyrotationmanager_new: (a: number) => number;
export const keyrotationmanager_get_active_key: (a: number, b: number) => number;
export const keyrotationmanager_get_key_by_version: (a: number, b: number, c: number) => number;
export const keyrotationmanager_create_new_key_version: (
  a: number,
  b: number
) => [number, number, number];
export const keyrotationmanager_complete_key_migration: (a: number, b: number) => [number, number];
export const keyrotationmanager_get_scheduler: (a: number) => number;
export const keyrotationmanager_set_rotation_policy: (a: number, b: number, c: number) => void;
export const keyrotationmanager_check_rotation_due: (a: number) => any;
export const keyrotationmanager_get_key_versions_for_purpose: (a: number, b: number) => any;
export const keyrotationmanager_cleanup_expired_keys: (a: number) => number;
export const keyrotationmanager_get_key_rotation_analytics: (a: number) => any;
export const keyrotationmanager_force_rotate_key: (
  a: number,
  b: number
) => [number, number, number];
export const keyrotationmanager_get_migration_progress: (a: number, b: number) => number;
export const keyrotationmanager_update_migration_progress: (
  a: number,
  b: number,
  c: number
) => [number, number];
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __wbindgen_export_3: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __externref_drop_slice: (a: number, b: number) => void;
export const closure169_externref_shim: (a: number, b: number, c: any) => void;
export const closure197_externref_shim: (a: number, b: number, c: any, d: any) => void;
export const __wbindgen_start: () => void;
