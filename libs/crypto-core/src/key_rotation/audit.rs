use wasm_bindgen::prelude::*;
use super::types::{KeyVersion, SecurityEventType};
use super::versioned_key::VersionedKey;
use std::collections::HashMap;
use js_sys::Date;

/// Comprehensive audit trail for key rotation events
#[wasm_bindgen]
pub struct AuditTrailManager {
    audit_entries: HashMap<String, Vec<AuditEntry>>,
    integrity_validators: HashMap<String, String>,
    compliance_rules: Vec<ComplianceRule>,
}

/// Individual audit entry for rotation events
#[derive(Clone, Debug)]
pub struct AuditEntry {
    pub entry_id: String,
    pub timestamp: f64,
    pub event_type: AuditEventType,
    pub key_version_from: Option<KeyVersion>,
    pub key_version_to: Option<KeyVersion>,
    pub trigger_reason: String,
    pub success: bool,
    pub error_details: Option<String>,
    pub device_id: String,
    pub user_id: String,
    pub metadata: HashMap<String, String>,
    pub integrity_hash: String,
}

/// Types of audit events
#[derive(Clone, Debug, PartialEq)]
pub enum AuditEventType {
    RotationStarted,
    RotationCompleted,
    RotationFailed,
    EmergencyRotation,
    MigrationStarted,
    MigrationCompleted,
    MigrationFailed,
    KeyVersionCreated,
    KeyVersionExpired,
    CrossDeviceSync,
    SecurityIncident,
    ComplianceCheck,
}

/// Compliance rule for audit validation
#[derive(Clone, Debug)]
pub struct ComplianceRule {
    pub rule_id: String,
    pub rule_name: String,
    pub required_events: Vec<AuditEventType>,
    pub max_time_between_events: f64,
    pub severity: ComplianceSeverity,
}

/// Compliance severity levels
#[derive(Clone, Debug, PartialEq)]
pub enum ComplianceSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Audit report for compliance
#[wasm_bindgen]
pub struct AuditReport {
    report_id: String,
    generated_at: f64,
    period_start: f64,
    period_end: f64,
    total_events: u32,
    compliance_violations: Vec<ComplianceViolation>,
    security_incidents: Vec<SecurityIncident>,
    rotation_statistics: js_sys::Object,
}

/// Compliance violation record
#[derive(Clone, Debug)]
pub struct ComplianceViolation {
    pub violation_id: String,
    pub rule_id: String,
    pub severity: ComplianceSeverity,
    pub description: String,
    pub timestamp: f64,
    pub affected_events: Vec<String>,
}

/// Security incident record
#[derive(Clone, Debug)]
pub struct SecurityIncident {
    pub incident_id: String,
    pub incident_type: SecurityEventType,
    pub severity: ComplianceSeverity,
    pub description: String,
    pub timestamp: f64,
    pub response_actions: Vec<String>,
    pub resolved: bool,
}

#[wasm_bindgen]
impl AuditTrailManager {
    /// Create new audit trail manager
    #[wasm_bindgen(constructor)]
    pub fn new() -> AuditTrailManager {
        let mut manager = AuditTrailManager {
            audit_entries: HashMap::new(),
            integrity_validators: HashMap::new(),
            compliance_rules: Vec::new(),
        };
        
        // Initialize default compliance rules
        manager.initialize_default_compliance_rules();
        
        manager
    }

    /// Record key rotation start event
    #[wasm_bindgen]
    pub fn record_rotation_started(
        &mut self,
        key_id: &str,
        from_version: &KeyVersion,
        to_version: &KeyVersion,
        trigger_reason: &str,
        device_id: &str,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "key_rotation".to_string());
        metadata.insert("phase".to_string(), "start".to_string());
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: AuditEventType::RotationStarted,
            key_version_from: Some(from_version.clone()),
            key_version_to: Some(to_version.clone()),
            trigger_reason: trigger_reason.to_string(),
            success: true,
            error_details: None,
            device_id: device_id.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, "RotationStarted"),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Record key rotation completion
    #[wasm_bindgen]
    pub fn record_rotation_completed(
        &mut self,
        key_id: &str,
        from_version: &KeyVersion,
        to_version: &KeyVersion,
        duration_ms: f64,
        device_id: &str,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "key_rotation".to_string());
        metadata.insert("phase".to_string(), "complete".to_string());
        metadata.insert("duration_ms".to_string(), duration_ms.to_string());
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: AuditEventType::RotationCompleted,
            key_version_from: Some(from_version.clone()),
            key_version_to: Some(to_version.clone()),
            trigger_reason: "scheduled_completion".to_string(),
            success: true,
            error_details: None,
            device_id: device_id.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, "RotationCompleted"),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Record key rotation failure
    #[wasm_bindgen]
    pub fn record_rotation_failed(
        &mut self,
        key_id: &str,
        from_version: &KeyVersion,
        error_details: &str,
        device_id: &str,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "key_rotation".to_string());
        metadata.insert("phase".to_string(), "failed".to_string());
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: AuditEventType::RotationFailed,
            key_version_from: Some(from_version.clone()),
            key_version_to: None,
            trigger_reason: "rotation_error".to_string(),
            success: false,
            error_details: Some(error_details.to_string()),
            device_id: device_id.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, "RotationFailed"),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Record emergency rotation event
    #[wasm_bindgen]
    pub fn record_emergency_rotation(
        &mut self,
        key_id: &str,
        security_event: &str,
        severity: &str,
        response_actions: &js_sys::Array,
        device_id: &str,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "emergency_rotation".to_string());
        metadata.insert("security_event".to_string(), security_event.to_string());
        metadata.insert("severity".to_string(), severity.to_string());
        
        // Convert response actions array to metadata
        for (i, action) in response_actions.iter().enumerate() {
            if let Some(action_str) = action.as_string() {
                metadata.insert(format!("response_action_{}", i), action_str);
            }
        }
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: AuditEventType::EmergencyRotation,
            key_version_from: None,
            key_version_to: None,
            trigger_reason: format!("security_incident: {}", security_event),
            success: true,
            error_details: None,
            device_id: device_id.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, "EmergencyRotation"),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Record data migration events
    #[wasm_bindgen]
    pub fn record_migration_event(
        &mut self,
        key_id: &str,
        migration_id: &str,
        event_type: &str,
        records_affected: u32,
        success: bool,
        error_details: Option<String>,
        device_id: &str,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "data_migration".to_string());
        metadata.insert("migration_id".to_string(), migration_id.to_string());
        metadata.insert("records_affected".to_string(), records_affected.to_string());
        
        let audit_event_type = match event_type {
            "started" => AuditEventType::MigrationStarted,
            "completed" => AuditEventType::MigrationCompleted,
            "failed" => AuditEventType::MigrationFailed,
            _ => AuditEventType::MigrationStarted,
        };
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: audit_event_type,
            key_version_from: None,
            key_version_to: None,
            trigger_reason: format!("data_migration: {}", migration_id),
            success,
            error_details,
            device_id: device_id.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, event_type),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Record cross-device synchronization
    #[wasm_bindgen]
    pub fn record_cross_device_sync(
        &mut self,
        key_id: &str,
        source_device: &str,
        target_devices: &js_sys::Array,
        sync_success: bool,
        user_id: &str
    ) -> String {
        let entry_id = self.generate_entry_id();
        let timestamp = Date::now();
        
        let mut metadata = HashMap::new();
        metadata.insert("operation".to_string(), "cross_device_sync".to_string());
        metadata.insert("source_device".to_string(), source_device.to_string());
        metadata.insert("target_device_count".to_string(), target_devices.length().to_string());
        
        // Record target devices
        for (i, device) in target_devices.iter().enumerate() {
            if let Some(device_str) = device.as_string() {
                metadata.insert(format!("target_device_{}", i), device_str);
            }
        }
        
        let entry = AuditEntry {
            entry_id: entry_id.clone(),
            timestamp,
            event_type: AuditEventType::CrossDeviceSync,
            key_version_from: None,
            key_version_to: None,
            trigger_reason: "cross_device_synchronization".to_string(),
            success: sync_success,
            error_details: if sync_success { None } else { Some("Sync failed".to_string()) },
            device_id: source_device.to_string(),
            user_id: user_id.to_string(),
            metadata,
            integrity_hash: self.calculate_integrity_hash(&entry_id, timestamp, "CrossDeviceSync"),
        };
        
        self.add_audit_entry(key_id, entry);
        entry_id
    }

    /// Get audit trail for specific key
    #[wasm_bindgen]
    pub fn get_audit_trail(&self, key_id: &str) -> js_sys::Array {
        let trail = js_sys::Array::new();
        
        if let Some(entries) = self.audit_entries.get(key_id) {
            for entry in entries.iter() {
                let entry_obj = js_sys::Object::new();
                
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("entryId"), &JsValue::from_str(&entry.entry_id)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("timestamp"), &JsValue::from_f64(entry.timestamp)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("eventType"), &JsValue::from_str(&format!("{:?}", entry.event_type))).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("triggerReason"), &JsValue::from_str(&entry.trigger_reason)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("success"), &JsValue::from_bool(entry.success)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("deviceId"), &JsValue::from_str(&entry.device_id)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("userId"), &JsValue::from_str(&entry.user_id)).unwrap();
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("integrityHash"), &JsValue::from_str(&entry.integrity_hash)).unwrap();
                
                if let Some(error) = &entry.error_details {
                    js_sys::Reflect::set(&entry_obj, &JsValue::from_str("errorDetails"), &JsValue::from_str(error)).unwrap();
                }
                
                // Add metadata as nested object
                let metadata_obj = js_sys::Object::new();
                for (key, value) in &entry.metadata {
                    js_sys::Reflect::set(&metadata_obj, &JsValue::from_str(key), &JsValue::from_str(value)).unwrap();
                }
                js_sys::Reflect::set(&entry_obj, &JsValue::from_str("metadata"), &metadata_obj).unwrap();
                
                trail.push(&entry_obj);
            }
        }
        
        trail
    }

    /// Validate audit trail integrity
    #[wasm_bindgen]
    pub fn validate_audit_integrity(&self, key_id: &str) -> js_sys::Object {
        let result = js_sys::Object::new();
        let mut is_valid = true;
        let issues = js_sys::Array::new();
        
        if let Some(entries) = self.audit_entries.get(key_id) {
            for entry in entries.iter() {
                let expected_hash = self.calculate_integrity_hash(
                    &entry.entry_id,
                    entry.timestamp,
                    &format!("{:?}", entry.event_type)
                );
                
                if entry.integrity_hash != expected_hash {
                    is_valid = false;
                    let issue = format!("Integrity mismatch for entry {}", entry.entry_id);
                    issues.push(&JsValue::from_str(&issue));
                }
            }
            
            // Check for chronological ordering
            for i in 1..entries.len() {
                if entries[i].timestamp < entries[i-1].timestamp {
                    is_valid = false;
                    let issue = format!("Chronological order violation between entries {} and {}", 
                                      entries[i-1].entry_id, entries[i].entry_id);
                    issues.push(&JsValue::from_str(&issue));
                }
            }
        }
        
        js_sys::Reflect::set(&result, &JsValue::from_str("isValid"), &JsValue::from_bool(is_valid)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("issues"), &issues).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("totalEntries"), &JsValue::from_f64(
            self.audit_entries.get(key_id).map(|e| e.len()).unwrap_or(0) as f64
        )).unwrap();
        
        result
    }

    /// Generate compliance report
    #[wasm_bindgen]
    pub fn generate_compliance_report(
        &self,
        period_start: f64,
        period_end: f64
    ) -> js_sys::Object {
        let report_id = self.generate_entry_id();
        let generated_at = Date::now();
        
        let mut total_events = 0u32;
        let mut violations = Vec::new();
        let mut incidents = Vec::new();
        let mut rotation_stats = HashMap::new();
        
        // Analyze all audit entries within the period
        for (key_id, entries) in &self.audit_entries {
            let period_entries: Vec<_> = entries.iter()
                .filter(|entry| entry.timestamp >= period_start && entry.timestamp <= period_end)
                .collect();
            
            total_events += period_entries.len() as u32;
            
            // Check compliance rules
            for rule in &self.compliance_rules {
                if let Some(violation) = self.check_compliance_rule(rule, &period_entries, key_id) {
                    violations.push(violation);
                }
            }
            
            // Collect security incidents
            for entry in &period_entries {
                if entry.event_type == AuditEventType::EmergencyRotation || 
                   entry.event_type == AuditEventType::SecurityIncident {
                    let incident = SecurityIncident {
                        incident_id: entry.entry_id.clone(),
                        incident_type: SecurityEventType::DeviceCompromise, // Default
                        severity: ComplianceSeverity::High,
                        description: entry.trigger_reason.clone(),
                        timestamp: entry.timestamp,
                        response_actions: vec!["emergency_rotation".to_string()],
                        resolved: entry.success,
                    };
                    incidents.push(incident);
                }
            }
            
            // Calculate rotation statistics
            let successful_rotations = period_entries.iter()
                .filter(|e| e.event_type == AuditEventType::RotationCompleted)
                .count();
            let failed_rotations = period_entries.iter()
                .filter(|e| e.event_type == AuditEventType::RotationFailed)
                .count();
            
            rotation_stats.insert(format!("{}_successful", key_id), successful_rotations.to_string());
            rotation_stats.insert(format!("{}_failed", key_id), failed_rotations.to_string());
        }
        
        // Build report object
        let report = js_sys::Object::new();
        js_sys::Reflect::set(&report, &JsValue::from_str("reportId"), &JsValue::from_str(&report_id)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("generatedAt"), &JsValue::from_f64(generated_at)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("periodStart"), &JsValue::from_f64(period_start)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("periodEnd"), &JsValue::from_f64(period_end)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("totalEvents"), &JsValue::from_f64(total_events as f64)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("violationCount"), &JsValue::from_f64(violations.len() as f64)).unwrap();
        js_sys::Reflect::set(&report, &JsValue::from_str("incidentCount"), &JsValue::from_f64(incidents.len() as f64)).unwrap();
        
        // Add rotation statistics
        let stats_obj = js_sys::Object::new();
        for (key, value) in rotation_stats {
            js_sys::Reflect::set(&stats_obj, &JsValue::from_str(&key), &JsValue::from_str(&value)).unwrap();
        }
        js_sys::Reflect::set(&report, &JsValue::from_str("rotationStatistics"), &stats_obj).unwrap();
        
        report
    }

    /// Add compliance rule
    #[wasm_bindgen]
    pub fn add_compliance_rule(
        &mut self,
        rule_id: &str,
        rule_name: &str,
        required_events: &js_sys::Array,
        max_time_between_events: f64,
        severity: &str
    ) -> bool {
        let mut events = Vec::new();
        for event in required_events.iter() {
            if let Some(event_str) = event.as_string() {
                match event_str.as_str() {
                    "RotationStarted" => events.push(AuditEventType::RotationStarted),
                    "RotationCompleted" => events.push(AuditEventType::RotationCompleted),
                    "RotationFailed" => events.push(AuditEventType::RotationFailed),
                    "EmergencyRotation" => events.push(AuditEventType::EmergencyRotation),
                    "MigrationStarted" => events.push(AuditEventType::MigrationStarted),
                    "MigrationCompleted" => events.push(AuditEventType::MigrationCompleted),
                    "CrossDeviceSync" => events.push(AuditEventType::CrossDeviceSync),
                    _ => continue,
                }
            }
        }
        
        let compliance_severity = match severity {
            "low" => ComplianceSeverity::Low,
            "medium" => ComplianceSeverity::Medium,
            "high" => ComplianceSeverity::High,
            "critical" => ComplianceSeverity::Critical,
            _ => ComplianceSeverity::Medium,
        };
        
        let rule = ComplianceRule {
            rule_id: rule_id.to_string(),
            rule_name: rule_name.to_string(),
            required_events: events,
            max_time_between_events,
            severity: compliance_severity,
        };
        
        self.compliance_rules.push(rule);
        true
    }

    // Private helper methods
    fn add_audit_entry(&mut self, key_id: &str, entry: AuditEntry) {
        self.audit_entries
            .entry(key_id.to_string())
            .or_insert_with(Vec::new)
            .push(entry);
    }

    fn generate_entry_id(&self) -> String {
        format!("audit_{}", Date::now() as u64)
    }

    fn calculate_integrity_hash(&self, entry_id: &str, timestamp: f64, event_type: &str) -> String {
        // Simple hash calculation - in production would use cryptographic hash
        format!("hash_{}_{}_{}_{}", entry_id, timestamp as u64, event_type, "integrity_salt")
    }

    fn initialize_default_compliance_rules(&mut self) {
        // Rule: Every rotation start must have a completion or failure
        let rotation_completion_rule = ComplianceRule {
            rule_id: "rotation_completion".to_string(),
            rule_name: "Rotation Completion Requirement".to_string(),
            required_events: vec![AuditEventType::RotationStarted, AuditEventType::RotationCompleted],
            max_time_between_events: 300000.0, // 5 minutes
            severity: ComplianceSeverity::High,
        };
        
        // Rule: Emergency rotations must be documented
        let emergency_documentation_rule = ComplianceRule {
            rule_id: "emergency_documentation".to_string(),
            rule_name: "Emergency Rotation Documentation".to_string(),
            required_events: vec![AuditEventType::EmergencyRotation],
            max_time_between_events: 0.0, // Immediate
            severity: ComplianceSeverity::Critical,
        };
        
        self.compliance_rules.push(rotation_completion_rule);
        self.compliance_rules.push(emergency_documentation_rule);
    }

    fn check_compliance_rule(
        &self,
        rule: &ComplianceRule,
        entries: &[&AuditEntry],
        key_id: &str
    ) -> Option<ComplianceViolation> {
        // Simple compliance checking logic
        // In production, this would be more sophisticated
        
        match rule.rule_id.as_str() {
            "rotation_completion" => {
                let starts: Vec<_> = entries.iter()
                    .filter(|e| e.event_type == AuditEventType::RotationStarted)
                    .collect();
                let completions: Vec<_> = entries.iter()
                    .filter(|e| e.event_type == AuditEventType::RotationCompleted || 
                              e.event_type == AuditEventType::RotationFailed)
                    .collect();
                
                if starts.len() > completions.len() {
                    return Some(ComplianceViolation {
                        violation_id: self.generate_entry_id(),
                        rule_id: rule.rule_id.clone(),
                        severity: rule.severity.clone(),
                        description: format!("Incomplete rotations found for key {}", key_id),
                        timestamp: Date::now(),
                        affected_events: starts.iter().map(|e| e.entry_id.clone()).collect(),
                    });
                }
            }
            _ => {}
        }
        
        None
    }
}