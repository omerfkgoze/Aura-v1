/**
 * Event Logging Integration - Main Export File
 * Central exports for authentication event logging system
 */

// Core interfaces and types
export * from './types.js';

// Event type definitions
export * from './authentication-events.js';
export * from './security-events.js';
export * from './data-events.js';
export * from './compliance-events.js';
export * from './system-events.js';
export * from './forensic-events.js';

// Analytics and pattern analysis
export * from './analytics.js';

// Compliance reporting and retention
export * from './compliance-reporting.js';

// Forensic analysis and timeline reconstruction
export * from './forensic-analysis.js';

// Re-export main event logger interfaces for convenience
export type { SecurityEventLogger, ComplianceEventLogger, ForensicEventLogger } from './types.js';

// Re-export key event types
export type {
  AuthenticationEvent,
  SecurityEvent,
  DataAccessEvent,
  SystemEvent,
  GDPREvent,
  HIPAAEvent,
  DataProcessingEvent,
  ConsentEvent,
  ForensicEvent,
} from './types.js';
