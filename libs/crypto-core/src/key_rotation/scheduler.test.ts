import { describe, it, expect, beforeEach } from 'vitest';
import {
  KeyRotationScheduler,
  RotationPolicy,
  UserRotationPreferences,
  SecurityEvent,
} from './scheduler';
import { SecurityEventType, RotationTrigger, RotationTiming } from './types';

describe('KeyRotationScheduler', () => {
  let scheduler: KeyRotationScheduler;
  let policy: RotationPolicy;

  beforeEach(() => {
    scheduler = new KeyRotationScheduler();
    policy = new RotationPolicy(90); // 90 days default
  });

  describe('Basic Scheduling', () => {
    it('should create scheduler with default settings', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.getUserPreferences().allow_automatic_rotation).toBe(true);
    });

    it('should set and retrieve rotation policies', () => {
      scheduler.setRotationPolicy('cycle_data', policy);
      expect(scheduler.isRotationDue('cycle_data')).toBe(false);
      expect(scheduler.getNextRotationTime('cycle_data')).toBeGreaterThan(Date.now());
    });

    it('should handle manual rotation forcing', () => {
      scheduler.setRotationPolicy('cycle_data', policy);
      scheduler.forceRotation('cycle_data');
      expect(scheduler.isRotationDue('cycle_data')).toBe(true);
    });
  });

  describe('Advanced Policy Configuration', () => {
    it('should configure time-based rotation policy', () => {
      policy.setTriggerType(RotationTrigger.TimeBased);
      policy.setTimingPreference(RotationTiming.Scheduled);

      scheduler.setRotationPolicy('cycle_data', policy);

      expect(policy.trigger_type()).toBe(RotationTrigger.TimeBased);
      expect(policy.timing_preference()).toBe(RotationTiming.Scheduled);
    });

    it('should configure usage-based rotation policy', () => {
      policy.setTriggerType(RotationTrigger.UsageBased);
      policy.setMaxUsageCount(1000);

      scheduler.setRotationPolicy('cycle_data', policy);

      // Track usage and verify rotation triggering
      for (let i = 0; i < 999; i++) {
        scheduler.trackKeyUsage('cycle_data');
      }
      expect(scheduler.isRotationDue('cycle_data')).toBe(false);

      scheduler.trackKeyUsage('cycle_data'); // 1000th use
      expect(scheduler.isRotationDue('cycle_data')).toBe(true);
    });

    it('should configure event-based rotation policy', () => {
      policy.setTriggerType(RotationTrigger.EventBased);
      policy.addSecurityEventTrigger(SecurityEventType.DeviceCompromise);

      scheduler.setRotationPolicy('cycle_data', policy);

      expect(policy.hasSecurityEventTrigger(SecurityEventType.DeviceCompromise)).toBe(true);
    });
  });

  describe('User Preferences', () => {
    it('should set and update user preferences', () => {
      const preferences = new UserRotationPreferences();
      preferences.set_preferred_rotation_time_hour(2);
      preferences.set_allow_automatic_rotation(false);

      scheduler.setUserPreferences(preferences);

      const retrieved = scheduler.getUserPreferences();
      expect(retrieved.preferred_rotation_time_hour).toBe(2);
      expect(retrieved.allow_automatic_rotation).toBe(false);
    });

    it('should schedule rotations respecting user preferences', () => {
      scheduler.setRotationPolicy('cycle_data', policy);

      const rotationTime = scheduler.scheduleRotationWithPreferences('cycle_data');
      expect(rotationTime).toBeGreaterThan(Date.now());

      // Verify rotation is scheduled at preferred hour (3 AM default)
      const scheduledDate = new Date(rotationTime);
      expect(scheduledDate.getHours()).toBe(3);
    });

    it('should respect rotation timing preferences', () => {
      scheduler.setRotationPolicy('cycle_data', policy);

      expect(scheduler.isRotationAllowedNow('cycle_data', true)).toBe(false); // User active
      expect(scheduler.isRotationAllowedNow('cycle_data', false)).toBe(true); // User inactive

      // Disable automatic rotation
      scheduler.updateUserPreference('allow_automatic', 'false');
      expect(scheduler.isRotationAllowedNow('cycle_data', false)).toBe(false);
    });
  });

  describe('Security Event Handling', () => {
    it('should report and handle security events', () => {
      policy.addSecurityEventTrigger(SecurityEventType.DeviceCompromise);
      scheduler.setRotationPolicy('cycle_data', policy);

      const event = new SecurityEvent(
        SecurityEventType.DeviceCompromise,
        9,
        'Device potentially compromised'
      );

      const shouldRotate = scheduler.reportSecurityEvent(event);
      expect(shouldRotate).toBe(true);
      expect(scheduler.isRotationDue('cycle_data')).toBe(true);
    });

    it('should track recent security events', () => {
      const event1 = new SecurityEvent(
        SecurityEventType.UnauthorizedAccess,
        7,
        'Unauthorized access attempt'
      );
      const event2 = new SecurityEvent(
        SecurityEventType.SuspiciousActivity,
        5,
        'Suspicious activity detected'
      );

      scheduler.reportSecurityEvent(event1);
      scheduler.reportSecurityEvent(event2);

      const recentEvents = scheduler.getRecentSecurityEvents(24);
      expect(recentEvents.length).toBe(2);
    });

    it('should handle emergency rotation requirements', () => {
      const emergencyEvent = new SecurityEvent(
        SecurityEventType.DataBreach,
        10,
        'Critical data breach detected'
      );

      expect(emergencyEvent.requiresImmedateAction()).toBe(true);
      expect(emergencyEvent.isHighSeverity()).toBe(true);
    });
  });

  describe('Usage Tracking', () => {
    it('should track key usage counts', () => {
      expect(scheduler.getUsageCount('cycle_data')).toBe(0);

      scheduler.trackKeyUsage('cycle_data');
      scheduler.trackKeyUsage('cycle_data');

      expect(scheduler.getUsageCount('cycle_data')).toBe(2);
    });

    it('should reset usage counts', () => {
      scheduler.trackKeyUsage('cycle_data');
      expect(scheduler.getUsageCount('cycle_data')).toBe(1);

      scheduler.resetUsageCount('cycle_data');
      expect(scheduler.getUsageCount('cycle_data')).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide rotation statistics', () => {
      scheduler.setRotationPolicy('cycle_data', policy);
      scheduler.setRotationPolicy('user_prefs', policy);

      const stats = scheduler.getRotationStatistics();
      expect(stats.totalScheduled).toBe(2);
      expect(stats.dueNow).toBe(0);
      expect(stats.nextRotationPurpose).toBeDefined();
    });

    it('should identify rotations due within timeframe', () => {
      scheduler.setRotationPolicy('cycle_data', policy);
      scheduler.forceRotation('cycle_data'); // Make it due now

      const dueWithin24h = scheduler.getRotationsDueWithin(24);
      expect(dueWithin24h.length).toBe(1);
      expect(dueWithin24h[0].purpose).toBe('cycle_data');
    });

    it('should cleanup expired schedules', () => {
      scheduler.setRotationPolicy('old_key', policy);

      const cleanedCount = scheduler.cleanupExpiredSchedules();
      // Since we just created the schedule, it shouldn't be cleaned up
      expect(cleanedCount).toBe(0);
    });
  });
});
