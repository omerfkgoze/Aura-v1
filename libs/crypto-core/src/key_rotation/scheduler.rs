use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use chrono::{DateTime, Duration, Utc, Timelike};
use crate::key_rotation::types::{SecurityEventType, RotationTrigger, RotationTiming}; // KeyRotationError removed - unused
use crate::key_rotation::emergency::EmergencyRotationManager; // EmergencyTriggerType removed - unused
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Rotation policy configuration for automated key management
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RotationPolicy {
    max_age_days: u32,
    max_usage_count: Option<u64>,
    force_rotation_on_compromise: bool,
    requires_user_confirmation: bool,
    trigger_type: RotationTrigger,
    timing_preference: RotationTiming,
    security_event_triggers: Vec<SecurityEventType>,
    low_usage_threshold_hours: u32,
    emergency_rotation_enabled: bool,
}

#[wasm_bindgen]
impl RotationPolicy {
    #[wasm_bindgen(constructor)]
    pub fn new(max_age_days: u32) -> Self {
        Self {
            max_age_days,
            max_usage_count: None,
            force_rotation_on_compromise: true,
            requires_user_confirmation: false,
            trigger_type: RotationTrigger::TimeBased,
            timing_preference: RotationTiming::LowUsage,
            security_event_triggers: vec![
                SecurityEventType::DeviceCompromise,
                SecurityEventType::DataBreach,
                SecurityEventType::UnauthorizedAccess,
            ],
            low_usage_threshold_hours: 4,
            emergency_rotation_enabled: true,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn max_age_days(&self) -> u32 {
        self.max_age_days
    }

    #[wasm_bindgen(setter)]
    pub fn set_max_usage_count(&mut self, count: u64) {
        self.max_usage_count = Some(count);
    }

    #[wasm_bindgen(setter)]
    pub fn set_requires_user_confirmation(&mut self, requires: bool) {
        self.requires_user_confirmation = requires;
    }

    #[wasm_bindgen(getter)]
    pub fn requires_user_confirmation(&self) -> bool {
        self.requires_user_confirmation
    }

    #[wasm_bindgen(getter)]
    pub fn force_rotation_on_compromise(&self) -> bool {
        self.force_rotation_on_compromise
    }

    #[wasm_bindgen(js_name = setTriggerType)]
    pub fn set_trigger_type(&mut self, trigger_type: RotationTrigger) {
        self.trigger_type = trigger_type;
    }

    #[wasm_bindgen(getter)]
    pub fn trigger_type(&self) -> RotationTrigger {
        self.trigger_type.clone()
    }

    #[wasm_bindgen(js_name = setTimingPreference)]
    pub fn set_timing_preference(&mut self, timing: RotationTiming) {
        self.timing_preference = timing;
    }

    #[wasm_bindgen(getter)]
    pub fn timing_preference(&self) -> RotationTiming {
        self.timing_preference.clone()
    }

    #[wasm_bindgen(js_name = addSecurityEventTrigger)]
    pub fn add_security_event_trigger(&mut self, event_type: SecurityEventType) {
        if !self.security_event_triggers.contains(&event_type) {
            self.security_event_triggers.push(event_type);
        }
    }

    #[wasm_bindgen(js_name = removeSecurityEventTrigger)]
    pub fn remove_security_event_trigger(&mut self, event_type: SecurityEventType) {
        self.security_event_triggers.retain(|e| *e != event_type);
    }

    #[wasm_bindgen(js_name = hasSecurityEventTrigger)]
    pub fn has_security_event_trigger(&self, event_type: SecurityEventType) -> bool {
        self.security_event_triggers.contains(&event_type)
    }

    #[wasm_bindgen(js_name = setLowUsageThresholdHours)]
    pub fn set_low_usage_threshold_hours(&mut self, hours: u32) {
        self.low_usage_threshold_hours = hours;
    }

    #[wasm_bindgen(getter)]
    pub fn low_usage_threshold_hours(&self) -> u32 {
        self.low_usage_threshold_hours
    }

    #[wasm_bindgen(js_name = setEmergencyRotationEnabled)]
    pub fn set_emergency_rotation_enabled(&mut self, enabled: bool) {
        self.emergency_rotation_enabled = enabled;
    }

    #[wasm_bindgen(getter)]
    pub fn emergency_rotation_enabled(&self) -> bool {
        self.emergency_rotation_enabled
    }

    #[wasm_bindgen(js_name = shouldTriggerRotation)]
    pub fn should_trigger_rotation(&self, 
        current_age_hours: u32, 
        usage_count: u64, 
        security_event: Option<SecurityEventType>
    ) -> bool {
        // Check emergency security events
        if let Some(ref event) = security_event {
            if self.emergency_rotation_enabled && self.security_event_triggers.contains(event) {
                return true;
            }
        }

        match self.trigger_type {
            RotationTrigger::TimeBased => {
                current_age_hours >= (self.max_age_days * 24)
            },
            RotationTrigger::UsageBased => {
                if let Some(max_count) = self.max_usage_count {
                    usage_count >= max_count
                } else {
                    false
                }
            },
            RotationTrigger::EventBased => {
                security_event.is_some()
            },
            RotationTrigger::Manual => false,
            RotationTrigger::Emergency => true,
        }
    }
}

/// User preferences for rotation timing and behavior
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct UserRotationPreferences {
    preferred_rotation_time_hour: u8, // 0-23
    allow_automatic_rotation: bool,
    notification_advance_hours: u32,
    pause_during_active_usage: bool,
    emergency_rotation_requires_confirmation: bool,
}

#[wasm_bindgen]
impl UserRotationPreferences {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            preferred_rotation_time_hour: 3, // 3 AM default
            allow_automatic_rotation: true,
            notification_advance_hours: 24,
            pause_during_active_usage: true,
            emergency_rotation_requires_confirmation: false,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn preferred_rotation_time_hour(&self) -> u8 {
        self.preferred_rotation_time_hour
    }

    #[wasm_bindgen(setter)]
    pub fn set_preferred_rotation_time_hour(&mut self, hour: u8) {
        if hour <= 23 {
            self.preferred_rotation_time_hour = hour;
        }
    }

    #[wasm_bindgen(getter)]
    pub fn allow_automatic_rotation(&self) -> bool {
        self.allow_automatic_rotation
    }

    #[wasm_bindgen(setter)]
    pub fn set_allow_automatic_rotation(&mut self, allow: bool) {
        self.allow_automatic_rotation = allow;
    }

    #[wasm_bindgen(getter)]
    pub fn notification_advance_hours(&self) -> u32 {
        self.notification_advance_hours
    }

    #[wasm_bindgen(setter)]
    pub fn set_notification_advance_hours(&mut self, hours: u32) {
        self.notification_advance_hours = hours;
    }

    #[wasm_bindgen(getter)]
    pub fn pause_during_active_usage(&self) -> bool {
        self.pause_during_active_usage
    }

    #[wasm_bindgen(setter)]
    pub fn set_pause_during_active_usage(&mut self, pause: bool) {
        self.pause_during_active_usage = pause;
    }

    #[wasm_bindgen(getter)]
    pub fn emergency_rotation_requires_confirmation(&self) -> bool {
        self.emergency_rotation_requires_confirmation
    }

    #[wasm_bindgen(setter)]
    pub fn set_emergency_rotation_requires_confirmation(&mut self, requires: bool) {
        self.emergency_rotation_requires_confirmation = requires;
    }
}

/// Security event for triggering rotations
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SecurityEvent {
    event_type: SecurityEventType,
    severity: u8, // 1-10 scale
    timestamp: DateTime<Utc>,
    device_id: Option<String>,
    description: String,
}

#[wasm_bindgen]
impl SecurityEvent {
    #[wasm_bindgen(constructor)]
    pub fn new(event_type: SecurityEventType, severity: u8, description: String) -> Self {
        Self {
            event_type,
            severity: if severity > 10 { 10 } else if severity < 1 { 1 } else { severity },
            timestamp: Utc::now(),
            device_id: None,
            description,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn event_type(&self) -> SecurityEventType {
        self.event_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn severity(&self) -> u8 {
        self.severity
    }

    #[wasm_bindgen(getter)]
    pub fn timestamp(&self) -> f64 {
        self.timestamp.timestamp_millis() as f64
    }

    #[wasm_bindgen(getter)]
    pub fn description(&self) -> String {
        self.description.clone()
    }

    #[wasm_bindgen(js_name = setDeviceId)]
    pub fn set_device_id(&mut self, device_id: Option<String>) {
        self.device_id = device_id;
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> Option<String> {
        self.device_id.clone()
    }

    #[wasm_bindgen(js_name = isHighSeverity)]
    pub fn is_high_severity(&self) -> bool {
        self.severity >= 7
    }

    #[wasm_bindgen(js_name = requiresImmedateAction)]
    pub fn requires_immediate_action(&self) -> bool {
        match self.event_type {
            SecurityEventType::DeviceCompromise | 
            SecurityEventType::DataBreach => true,
            _ => self.severity >= 8,
        }
    }
}

/// Automated key rotation scheduler with policy-based management
#[wasm_bindgen]
pub struct KeyRotationScheduler {
    rotation_intervals: HashMap<String, Duration>, // purpose -> interval
    next_rotations: HashMap<String, DateTime<Utc>>, // purpose -> next rotation time
    rotation_policies: HashMap<String, RotationPolicy>,
    user_preferences: UserRotationPreferences,
    security_events: Vec<SecurityEvent>,
    usage_tracking: HashMap<String, u64>, // purpose -> usage count
    emergency_manager: EmergencyRotationManager,
    incident_detection: IncidentDetectionSystem,
}

#[wasm_bindgen]
impl KeyRotationScheduler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            rotation_intervals: HashMap::new(),
            next_rotations: HashMap::new(),
            rotation_policies: HashMap::new(),
            user_preferences: UserRotationPreferences::new(),
            security_events: Vec::new(),
            usage_tracking: HashMap::new(),
            emergency_manager: EmergencyRotationManager::new(),
            incident_detection: IncidentDetectionSystem::new(),
        }
    }

    #[wasm_bindgen]
    pub fn set_rotation_policy(&mut self, purpose: &str, policy: RotationPolicy) {
        let interval = Duration::days(policy.max_age_days as i64);
        self.rotation_intervals.insert(purpose.to_string(), interval);
        self.rotation_policies.insert(purpose.to_string(), policy);
        
        // Schedule next rotation
        let next_rotation = Utc::now() + interval;
        self.next_rotations.insert(purpose.to_string(), next_rotation);
    }

    #[wasm_bindgen]
    pub fn is_rotation_due(&self, purpose: &str) -> bool {
        if let Some(next_rotation) = self.next_rotations.get(purpose) {
            *next_rotation <= Utc::now()
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn get_next_rotation_time(&self, purpose: &str) -> Option<f64> {
        self.next_rotations.get(purpose)
            .map(|dt| dt.timestamp_millis() as f64)
    }

    #[wasm_bindgen]
    pub fn get_time_until_rotation(&self, purpose: &str) -> Option<f64> {
        if let Some(next_rotation) = self.next_rotations.get(purpose) {
            let duration = *next_rotation - Utc::now();
            Some(duration.num_milliseconds() as f64)
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn force_rotation(&mut self, purpose: &str) {
        // Set next rotation to now to trigger immediate rotation
        self.next_rotations.insert(purpose.to_string(), Utc::now());
    }

    #[wasm_bindgen]
    pub fn update_next_rotation(&mut self, purpose: &str) {
        if let Some(interval) = self.rotation_intervals.get(purpose) {
            let next_rotation = Utc::now() + *interval;
            self.next_rotations.insert(purpose.to_string(), next_rotation);
        }
    }

    #[wasm_bindgen]
    pub fn get_all_scheduled_rotations(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        
        for (purpose, next_rotation) in &self.next_rotations {
            let obj = js_sys::Object::new();
            
            js_sys::Reflect::set(&obj, &JsValue::from_str("purpose"), &JsValue::from_str(purpose)).unwrap();
            js_sys::Reflect::set(&obj, &JsValue::from_str("nextRotation"), &JsValue::from_f64(next_rotation.timestamp_millis() as f64)).unwrap();
            js_sys::Reflect::set(&obj, &JsValue::from_str("isDue"), &JsValue::from_bool(self.is_rotation_due(purpose))).unwrap();
            
            if let Some(time_until) = self.get_time_until_rotation(purpose) {
                js_sys::Reflect::set(&obj, &JsValue::from_str("timeUntilRotation"), &JsValue::from_f64(time_until)).unwrap();
            }
            
            if let Some(policy) = self.rotation_policies.get(purpose) {
                js_sys::Reflect::set(&obj, &JsValue::from_str("maxAgeDays"), &JsValue::from_f64(policy.max_age_days as f64)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("requiresUserConfirmation"), &JsValue::from_bool(policy.requires_user_confirmation)).unwrap();
            }
            
            array.push(&obj);
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn get_rotations_due_within(&self, hours: u32) -> js_sys::Array {
        let array = js_sys::Array::new();
        let threshold = Utc::now() + Duration::hours(hours as i64);
        
        for (purpose, next_rotation) in &self.next_rotations {
            if *next_rotation <= threshold {
                let obj = js_sys::Object::new();
                
                js_sys::Reflect::set(&obj, &JsValue::from_str("purpose"), &JsValue::from_str(purpose)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("nextRotation"), &JsValue::from_f64(next_rotation.timestamp_millis() as f64)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("isDue"), &JsValue::from_bool(*next_rotation <= Utc::now())).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("hoursUntilDue"), &JsValue::from_f64(
                    (*next_rotation - Utc::now()).num_hours() as f64
                )).unwrap();
                
                array.push(&obj);
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn postpone_rotation(&mut self, purpose: &str, additional_days: u32) -> Result<(), JsValue> {
        if let Some(current_rotation) = self.next_rotations.get_mut(purpose) {
            *current_rotation = *current_rotation + Duration::days(additional_days as i64);
            Ok(())
        } else {
            Err(JsValue::from_str("Purpose not found in rotation schedule"))
        }
    }

    #[wasm_bindgen]
    pub fn schedule_rotation_at(&mut self, purpose: &str, timestamp_ms: f64) -> Result<(), JsValue> {
        let target_time = DateTime::from_timestamp_millis(timestamp_ms as i64)
            .ok_or_else(|| JsValue::from_str("Invalid timestamp"))?;
        
        if target_time <= Utc::now() {
            return Err(JsValue::from_str("Cannot schedule rotation in the past"));
        }
        
        self.next_rotations.insert(purpose.to_string(), target_time);
        Ok(())
    }

    #[wasm_bindgen]
    pub fn enable_automatic_rotation(&mut self, purpose: &str, enabled: bool) -> Result<(), JsValue> {
        if let Some(_policy) = self.rotation_policies.get(purpose) {
            // Store the enabled state (we can extend RotationPolicy to include this)
            if enabled && !self.next_rotations.contains_key(purpose) {
                // Schedule the first automatic rotation
                self.update_next_rotation(purpose);
            } else if !enabled {
                // Remove from automatic rotation schedule
                self.next_rotations.remove(purpose);
            }
            Ok(())
        } else {
            Err(JsValue::from_str("Purpose not found in rotation policies"))
        }
    }

    #[wasm_bindgen]
    pub fn get_rotation_statistics(&self) -> js_sys::Object {
        let stats = js_sys::Object::new();
        
        let total_scheduled = self.next_rotations.len();
        let due_now = self.next_rotations.iter()
            .filter(|(purpose, _)| self.is_rotation_due(purpose))
            .count();
        let due_within_24h = self.next_rotations.iter()
            .filter(|(_, next_rotation)| **next_rotation <= Utc::now() + Duration::hours(24))
            .count();
        let due_within_7d = self.next_rotations.iter()
            .filter(|(_, next_rotation)| **next_rotation <= Utc::now() + Duration::days(7))
            .count();
        
        js_sys::Reflect::set(&stats, &JsValue::from_str("totalScheduled"), &JsValue::from_f64(total_scheduled as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueNow"), &JsValue::from_f64(due_now as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueWithin24Hours"), &JsValue::from_f64(due_within_24h as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueWithin7Days"), &JsValue::from_f64(due_within_7d as f64)).unwrap();
        
        // Find next rotation
        if let Some((purpose, next_time)) = self.next_rotations.iter()
            .min_by_key(|(_, time)| *time) {
            js_sys::Reflect::set(&stats, &JsValue::from_str("nextRotationPurpose"), &JsValue::from_str(purpose)).unwrap();
            js_sys::Reflect::set(&stats, &JsValue::from_str("nextRotationTime"), &JsValue::from_f64(next_time.timestamp_millis() as f64)).unwrap();
        }
        
        stats
    }

    #[wasm_bindgen]
    pub fn cleanup_expired_schedules(&mut self) -> u32 {
        let expired_threshold = Utc::now() - Duration::days(30); // Remove schedules older than 30 days
        let original_count = self.next_rotations.len();
        
        self.next_rotations.retain(|_, next_rotation| *next_rotation > expired_threshold);
        
        (original_count - self.next_rotations.len()) as u32
    }

    // User Preference Management
    #[wasm_bindgen(js_name = setUserPreferences)]
    pub fn set_user_preferences(&mut self, preferences: UserRotationPreferences) {
        self.user_preferences = preferences;
        // Reschedule rotations based on new preferences
        self.apply_user_preferences_to_schedules();
    }

    #[wasm_bindgen(js_name = getUserPreferences)]
    pub fn get_user_preferences(&self) -> UserRotationPreferences {
        self.user_preferences.clone()
    }

    #[wasm_bindgen(js_name = updateUserPreference)]
    pub fn update_user_preference(&mut self, preference_type: &str, value: &str) -> Result<(), JsValue> {
        match preference_type {
            "preferred_hour" => {
                if let Ok(hour) = value.parse::<u8>() {
                    if hour <= 23 {
                        self.user_preferences.set_preferred_rotation_time_hour(hour);
                        self.apply_user_preferences_to_schedules();
                        return Ok(());
                    }
                }
                Err(JsValue::from_str("Invalid hour value (0-23)"))
            },
            "allow_automatic" => {
                if let Ok(allow) = value.parse::<bool>() {
                    self.user_preferences.set_allow_automatic_rotation(allow);
                    Ok(())
                } else {
                    Err(JsValue::from_str("Invalid boolean value"))
                }
            },
            "notification_hours" => {
                if let Ok(hours) = value.parse::<u32>() {
                    self.user_preferences.set_notification_advance_hours(hours);
                    Ok(())
                } else {
                    Err(JsValue::from_str("Invalid hours value"))
                }
            },
            "pause_during_usage" => {
                if let Ok(pause) = value.parse::<bool>() {
                    self.user_preferences.set_pause_during_active_usage(pause);
                    Ok(())
                } else {
                    Err(JsValue::from_str("Invalid boolean value"))
                }
            },
            "emergency_confirmation" => {
                if let Ok(requires) = value.parse::<bool>() {
                    self.user_preferences.set_emergency_rotation_requires_confirmation(requires);
                    Ok(())
                } else {
                    Err(JsValue::from_str("Invalid boolean value"))
                }
            },
            _ => Err(JsValue::from_str("Unknown preference type"))
        }
    }

    // Security Event Management
    #[wasm_bindgen(js_name = reportSecurityEvent)]
    pub fn report_security_event(&mut self, event: SecurityEvent) -> Result<bool, JsValue> {
        let should_trigger_rotation = self.should_trigger_emergency_rotation(&event)?;
        
        // Store the security event
        self.security_events.push(event.clone());
        
        // Clean up old events (keep only last 100)
        if self.security_events.len() > 100 {
            self.security_events.remove(0);
        }
        
        if should_trigger_rotation {
            self.trigger_emergency_rotations_for_event(&event)?;
        }
        
        Ok(should_trigger_rotation)
    }

    #[wasm_bindgen(js_name = getRecentSecurityEvents)]
    pub fn get_recent_security_events(&self, hours: u32) -> js_sys::Array {
        let array = js_sys::Array::new();
        let threshold = Utc::now() - Duration::hours(hours as i64);
        
        for event in &self.security_events {
            if event.timestamp >= threshold {
                let obj = js_sys::Object::new();
                
                js_sys::Reflect::set(&obj, &JsValue::from_str("eventType"), &JsValue::from_str(&format!("{:?}", event.event_type()))).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("severity"), &JsValue::from_f64(event.severity() as f64)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("timestamp"), &JsValue::from_f64(event.timestamp())).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("description"), &JsValue::from_str(&event.description())).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("isHighSeverity"), &JsValue::from_bool(event.is_high_severity())).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("requiresImmediateAction"), &JsValue::from_bool(event.requires_immediate_action())).unwrap();
                
                if let Some(device_id) = event.device_id() {
                    js_sys::Reflect::set(&obj, &JsValue::from_str("deviceId"), &JsValue::from_str(&device_id)).unwrap();
                }
                
                array.push(&obj);
            }
        }
        
        array
    }

    // Usage Tracking
    #[wasm_bindgen(js_name = trackKeyUsage)]
    pub fn track_key_usage(&mut self, purpose: &str) {
        let count = self.usage_tracking.entry(purpose.to_string()).or_insert(0);
        *count += 1;
        
        // Check if usage-based rotation should be triggered
        if let Some(policy) = self.rotation_policies.get(purpose) {
            if let Some(max_count) = policy.max_usage_count {
                if *count >= max_count {
                    self.force_rotation(purpose);
                }
            }
        }
    }

    #[wasm_bindgen(js_name = getUsageCount)]
    pub fn get_usage_count(&self, purpose: &str) -> u64 {
        self.usage_tracking.get(purpose).copied().unwrap_or(0)
    }

    #[wasm_bindgen(js_name = resetUsageCount)]
    pub fn reset_usage_count(&mut self, purpose: &str) {
        self.usage_tracking.insert(purpose.to_string(), 0);
    }

    // Smart Scheduling with User Preferences
    #[wasm_bindgen(js_name = scheduleRotationWithPreferences)]
    pub fn schedule_rotation_with_preferences(&mut self, purpose: &str) -> Result<f64, JsValue> {
        if !self.user_preferences.allow_automatic_rotation {
            return Err(JsValue::from_str("Automatic rotation disabled by user preferences"));
        }
        
        let policy = self.rotation_policies.get(purpose)
            .ok_or_else(|| JsValue::from_str("Policy not found for purpose"))?;
        
        let preferred_hour = self.user_preferences.preferred_rotation_time_hour;
        let base_time = Utc::now() + Duration::days(policy.max_age_days as i64);
        
        // Adjust to preferred hour
        let adjusted_time = base_time
            .with_hour(preferred_hour as u32).unwrap_or(base_time)
            .with_minute(0).unwrap_or(base_time)
            .with_second(0).unwrap_or(base_time);
        
        self.next_rotations.insert(purpose.to_string(), adjusted_time);
        Ok(adjusted_time.timestamp_millis() as f64)
    }

    #[wasm_bindgen(js_name = isRotationAllowedNow)]
    pub fn is_rotation_allowed_now(&self, purpose: &str, is_user_active: bool) -> bool {
        if !self.user_preferences.allow_automatic_rotation {
            return false;
        }
        
        if self.user_preferences.pause_during_active_usage && is_user_active {
            return false;
        }
        
        // Check if it's within low usage hours based on policy
        if let Some(policy) = self.rotation_policies.get(purpose) {
            match policy.timing_preference() {
                RotationTiming::Immediate => true,
                RotationTiming::LowUsage => !is_user_active,
                RotationTiming::Scheduled => {
                    let now = Utc::now();
                    let current_hour = now.hour() as u8;
                    let preferred_hour = self.user_preferences.preferred_rotation_time_hour;
                    
                    // Allow rotation within 2 hours of preferred time
                    let diff = if current_hour > preferred_hour {
                        current_hour - preferred_hour
                    } else {
                        preferred_hour - current_hour
                    };
                    diff <= 2 || diff >= 22 // Handle wrap around (e.g., 23-1)
                },
                RotationTiming::UserControlled => false,
                RotationTiming::Background => true, // Always allow background rotations
            }
        } else {
            false
        }
    }

    // Private helper methods
    fn apply_user_preferences_to_schedules(&mut self) {
        if !self.user_preferences.allow_automatic_rotation {
            return;
        }
        
        let preferred_hour = self.user_preferences.preferred_rotation_time_hour;
        let mut updated_rotations = HashMap::new();
        
        for (purpose, current_time) in &self.next_rotations {
            let adjusted_time = current_time
                .with_hour(preferred_hour as u32).unwrap_or(*current_time)
                .with_minute(0).unwrap_or(*current_time)
                .with_second(0).unwrap_or(*current_time);
            
            updated_rotations.insert(purpose.clone(), adjusted_time);
        }
        
        self.next_rotations = updated_rotations;
    }

    fn should_trigger_emergency_rotation(&self, event: &SecurityEvent) -> Result<bool, JsValue> {
        if !event.requires_immediate_action() {
            return Ok(false);
        }
        
        // Check if any policies should trigger for this event type
        for policy in self.rotation_policies.values() {
            if policy.emergency_rotation_enabled() && 
               policy.has_security_event_trigger(event.event_type()) {
                return Ok(true);
            }
        }
        
        Ok(false)
    }

    fn trigger_emergency_rotations_for_event(&mut self, event: &SecurityEvent) -> Result<(), JsValue> {
        let purposes_to_rotate: Vec<String> = self.rotation_policies
            .iter()
            .filter(|(_, policy)| {
                policy.emergency_rotation_enabled() && 
                policy.has_security_event_trigger(event.event_type())
            })
            .map(|(purpose, _)| purpose.clone())
            .collect();
        
        for purpose in purposes_to_rotate {
            self.force_rotation(&purpose);
        }
        
        Ok(())
    }

    // Emergency rotation integration methods
    #[wasm_bindgen(js_name = "triggerEmergencyIncident")]
    pub fn trigger_emergency_incident(
        &mut self,
        trigger_type: &str,
        description: &str,
        affected_devices: Vec<String>,
        severity: u8,
    ) -> Result<String, JsValue> {
        self.emergency_manager
            .trigger_emergency_rotation(trigger_type, description, affected_devices, severity)
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen(js_name = "detectSecurityIncident")]
    pub fn detect_security_incident(&mut self, 
        device_id: &str, 
        event_data: &str
    ) -> Result<bool, JsValue> {
        self.incident_detection
            .detect_incident(device_id, event_data)
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen(js_name = "getActiveIncidents")]
    pub fn get_active_incidents(&self) -> Result<String, JsValue> {
        self.incident_detection
            .get_active_incidents()
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen(js_name = "updateIncidentDetectionThresholds")]
    pub fn update_incident_detection_thresholds(&mut self, thresholds: &str) -> Result<(), JsValue> {
        self.incident_detection
            .update_thresholds(thresholds)
            .map_err(|e| JsValue::from_str(&e))
    }
}

/// Automated security incident detection system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncidentDetectionSystem {
    failed_auth_threshold: u32,
    suspicious_activity_window_minutes: u32,
    unusual_access_pattern_threshold: f64,
    device_compromise_indicators: Vec<String>,
    breach_attempt_patterns: Vec<String>,
    auto_response_enabled: bool,
    detection_sensitivity: DetectionSensitivity,
    active_incidents: HashMap<String, DetectedIncident>,
    device_behavior_baselines: HashMap<String, DeviceBehaviorBaseline>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DetectionSensitivity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedIncident {
    pub id: String,
    pub incident_type: SecurityIncidentType,
    pub detected_at: DateTime<Utc>,
    pub confidence_score: f64,
    pub affected_devices: Vec<String>,
    pub indicators: Vec<String>,
    pub auto_response_triggered: bool,
    pub severity_score: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityIncidentType {
    FailedAuthenticationAttempts,
    UnusualAccessPatterns,
    SuspiciousDeviceActivity,
    PotentialDataBreach,
    MalwareIndicators,
    UnauthorizedDeviceAccess,
    KeyExposureRisk,
    SystemCompromise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceBehaviorBaseline {
    pub device_id: String,
    pub typical_access_hours: Vec<u8>,
    pub typical_usage_patterns: HashMap<String, f64>,
    pub last_updated: DateTime<Utc>,
    pub access_frequency: f64,
    pub typical_locations: Vec<String>,
}

impl IncidentDetectionSystem {
    pub fn new() -> Self {
        Self {
            failed_auth_threshold: 5,
            suspicious_activity_window_minutes: 15,
            unusual_access_pattern_threshold: 0.8,
            device_compromise_indicators: vec![
                "multiple_failed_biometric".to_string(),
                "unknown_location_access".to_string(),
                "unusual_timing".to_string(),
                "modified_device_fingerprint".to_string(),
                "suspicious_network_activity".to_string(),
            ],
            breach_attempt_patterns: vec![
                "rapid_multiple_access_attempts".to_string(),
                "access_from_impossible_location".to_string(),
                "simultaneous_multi_device_access".to_string(),
                "unusual_data_access_patterns".to_string(),
            ],
            auto_response_enabled: true,
            detection_sensitivity: DetectionSensitivity::High,
            active_incidents: HashMap::new(),
            device_behavior_baselines: HashMap::new(),
        }
    }

    pub fn detect_incident(&mut self, device_id: &str, event_data: &str) -> Result<bool, String> {
        let event_json: serde_json::Value = serde_json::from_str(event_data)
            .map_err(|e| format!("Invalid event data JSON: {}", e))?;

        let mut incident_detected = false;
        let mut detected_incidents = Vec::new();

        // Check for failed authentication attempts
        if let Some(auth_failures) = event_json.get("failed_auth_count").and_then(|v| v.as_u64()) {
            if auth_failures as u32 >= self.failed_auth_threshold {
                detected_incidents.push(self.create_incident(
                    SecurityIncidentType::FailedAuthenticationAttempts,
                    device_id,
                    vec![format!("Failed authentication attempts: {}", auth_failures)],
                    0.9,
                    8,
                ));
                incident_detected = true;
            }
        }

        // Check for unusual access patterns
        if let Some(access_time) = event_json.get("access_time").and_then(|v| v.as_str()) {
            if let Ok(access_dt) = DateTime::parse_from_rfc3339(access_time) {
                if self.is_unusual_access_time(device_id, access_dt.hour() as u8) {
                    detected_incidents.push(self.create_incident(
                        SecurityIncidentType::UnusualAccessPatterns,
                        device_id,
                        vec!["Access at unusual time".to_string()],
                        0.7,
                        6,
                    ));
                    incident_detected = true;
                }
            }
        }

        // Check for device compromise indicators
        if let Some(indicators) = event_json.get("compromise_indicators").and_then(|v| v.as_array()) {
            for indicator in indicators {
                if let Some(indicator_str) = indicator.as_str() {
                    if self.device_compromise_indicators.contains(&indicator_str.to_string()) {
                        detected_incidents.push(self.create_incident(
                            SecurityIncidentType::SuspiciousDeviceActivity,
                            device_id,
                            vec![format!("Compromise indicator detected: {}", indicator_str)],
                            0.8,
                            9,
                        ));
                        incident_detected = true;
                    }
                }
            }
        }

        // Check for potential data breach patterns
        if let Some(data_access) = event_json.get("data_access_volume").and_then(|v| v.as_f64()) {
            if self.is_unusual_data_access_volume(device_id, data_access) {
                detected_incidents.push(self.create_incident(
                    SecurityIncidentType::PotentialDataBreach,
                    device_id,
                    vec![format!("Unusual data access volume: {}", data_access)],
                    0.6,
                    7,
                ));
                incident_detected = true;
            }
        }

        // Store detected incidents
        for incident in detected_incidents {
            self.active_incidents.insert(incident.id.clone(), incident);
        }

        // Update device behavior baseline
        self.update_device_baseline(device_id, &event_json);

        Ok(incident_detected)
    }

    pub fn get_active_incidents(&self) -> Result<String, String> {
        serde_json::to_string(&self.active_incidents)
            .map_err(|e| format!("Failed to serialize incidents: {}", e))
    }

    pub fn update_thresholds(&mut self, thresholds_json: &str) -> Result<(), String> {
        let thresholds: serde_json::Value = serde_json::from_str(thresholds_json)
            .map_err(|e| format!("Invalid thresholds JSON: {}", e))?;

        if let Some(failed_auth) = thresholds.get("failed_auth_threshold").and_then(|v| v.as_u64()) {
            self.failed_auth_threshold = failed_auth as u32;
        }

        if let Some(activity_window) = thresholds.get("suspicious_activity_window_minutes").and_then(|v| v.as_u64()) {
            self.suspicious_activity_window_minutes = activity_window as u32;
        }

        if let Some(access_threshold) = thresholds.get("unusual_access_pattern_threshold").and_then(|v| v.as_f64()) {
            self.unusual_access_pattern_threshold = access_threshold;
        }

        if let Some(sensitivity) = thresholds.get("detection_sensitivity").and_then(|v| v.as_str()) {
            self.detection_sensitivity = match sensitivity {
                "low" => DetectionSensitivity::Low,
                "medium" => DetectionSensitivity::Medium,
                "high" => DetectionSensitivity::High,
                "critical" => DetectionSensitivity::Critical,
                _ => DetectionSensitivity::High,
            };
        }

        Ok(())
    }

    fn create_incident(
        &self,
        incident_type: SecurityIncidentType,
        device_id: &str,
        indicators: Vec<String>,
        confidence: f64,
        severity: u8,
    ) -> DetectedIncident {
        DetectedIncident {
            id: Uuid::new_v4().to_string(),
            incident_type,
            detected_at: Utc::now(),
            confidence_score: confidence,
            affected_devices: vec![device_id.to_string()],
            indicators,
            auto_response_triggered: self.auto_response_enabled && severity >= 8,
            severity_score: severity,
        }
    }

    fn is_unusual_access_time(&self, device_id: &str, access_hour: u8) -> bool {
        if let Some(baseline) = self.device_behavior_baselines.get(device_id) {
            !baseline.typical_access_hours.contains(&access_hour)
        } else {
            // No baseline yet, assume normal business hours (9-17) are typical
            !(9..=17).contains(&access_hour)
        }
    }

    fn is_unusual_data_access_volume(&self, device_id: &str, volume: f64) -> bool {
        if let Some(baseline) = self.device_behavior_baselines.get(device_id) {
            if let Some(typical_volume) = baseline.typical_usage_patterns.get("data_access_volume") {
                volume > typical_volume * 3.0 // 3x typical volume is suspicious
            } else {
                false
            }
        } else {
            volume > 1000000.0 // 1MB default threshold for new devices
        }
    }

    fn update_device_baseline(&mut self, device_id: &str, event_data: &serde_json::Value) {
        let baseline = self.device_behavior_baselines.entry(device_id.to_string())
            .or_insert_with(|| DeviceBehaviorBaseline {
                device_id: device_id.to_string(),
                typical_access_hours: Vec::new(),
                typical_usage_patterns: HashMap::new(),
                last_updated: Utc::now(),
                access_frequency: 0.0,
                typical_locations: Vec::new(),
            });

        // Update access hours
        if let Some(access_time) = event_data.get("access_time").and_then(|v| v.as_str()) {
            if let Ok(access_dt) = DateTime::parse_from_rfc3339(access_time) {
                let hour = access_dt.hour() as u8;
                if !baseline.typical_access_hours.contains(&hour) {
                    baseline.typical_access_hours.push(hour);
                }
            }
        }

        // Update usage patterns
        if let Some(volume) = event_data.get("data_access_volume").and_then(|v| v.as_f64()) {
            let current_avg = baseline.typical_usage_patterns.get("data_access_volume").unwrap_or(&0.0);
            let new_avg = (current_avg + volume) / 2.0;
            baseline.typical_usage_patterns.insert("data_access_volume".to_string(), new_avg);
        }

        baseline.last_updated = Utc::now();
    }
}