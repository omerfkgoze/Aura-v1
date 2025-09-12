/**
 * Authentication Integration - Main Export File
 * Central export point for all authentication integration components
 */
// Session management - explicit exports
export { SessionManager } from './session/core.js';
export { SessionMonitor, SessionSecurityMetrics } from './session/monitoring.js';
// Event logging - explicit exports
export {
  SecurityEventLogger,
  AuthenticationEvent,
  SessionEvent,
  DeviceEvent,
} from './event-logging/security-events.js';
export {
  ComplianceEventLogger,
  ComplianceEvent,
  AuditEvent,
  ComplianceFramework as AuditComplianceFramework,
} from './event-logging/compliance-reporting.js';
export { DataEventLogger, DataEvent, DataModificationEvent } from './event-logging/data-events.js';
// Crypto core integration hooks (if exists)
export * from './crypto-core-hooks.js';
// Types are already exported above via explicit exports
//# sourceMappingURL=index.js.map
