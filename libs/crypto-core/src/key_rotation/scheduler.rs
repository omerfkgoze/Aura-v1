use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use chrono::{DateTime, Duration, Utc};

/// Rotation policy configuration for automated key management
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RotationPolicy {
    max_age_days: u32,
    max_usage_count: Option<u64>,
    force_rotation_on_compromise: bool,
    requires_user_confirmation: bool,
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
}

/// Automated key rotation scheduler with policy-based management
#[wasm_bindgen]
pub struct KeyRotationScheduler {
    rotation_intervals: HashMap<String, Duration>, // purpose -> interval
    next_rotations: HashMap<String, DateTime<Utc>>, // purpose -> next rotation time
    rotation_policies: HashMap<String, RotationPolicy>,
}

#[wasm_bindgen]
impl KeyRotationScheduler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            rotation_intervals: HashMap::new(),
            next_rotations: HashMap::new(),
            rotation_policies: HashMap::new(),
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
}