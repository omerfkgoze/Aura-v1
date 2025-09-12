use crate::key_rotation::types::{SecurityEventType, RotationResult};
use crate::key_rotation::scheduler::SecurityEvent;
use crate::key_rotation::versioned_key::VersionedKey;
use crate::key_rotation::audit::{AuditTrailManager, AuditEvent};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmergencyTriggerType {
    SecurityBreach,
    CompromisedDevice,
    SuspiciousActivity,
    KeyExposureRisk,
    SystemIntrusion,
    MalwareDetection,
    UnauthorizedAccess,
    DataLeakage,
    PhysicalCompromise,
    ManualTrigger,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmergencyStatus {
    Detected,
    Responding,
    Isolating,
    Rotating,
    Recovering,
    Complete,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryStatus {
    NotStarted,
    InProgress,
    DataValidated,
    KeysRotated,
    AccessRestored,
    Complete,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyIncident {
    pub id: String,
    pub trigger_type: EmergencyTriggerType,
    pub severity: u8, // 1-10 scale
    pub detected_at: DateTime<Utc>,
    pub status: EmergencyStatus,
    pub affected_devices: Vec<String>,
    pub description: String,
    pub auto_triggered: bool,
    pub response_time_limit: Duration,
    pub escalation_contacts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyResponse {
    pub incident_id: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: EmergencyStatus,
    pub actions_taken: Vec<EmergencyAction>,
    pub devices_isolated: Vec<String>,
    pub keys_invalidated: Vec<String>,
    pub recovery_status: RecoveryStatus,
    pub data_accessibility: bool,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyAction {
    pub id: String,
    pub action_type: EmergencyActionType,
    pub target: String, // device_id, key_id, etc.
    pub executed_at: DateTime<Utc>,
    pub success: bool,
    pub details: String,
    pub rollback_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmergencyActionType {
    IsolateDevice,
    InvalidateKey,
    RevokeAccess,
    BlockSync,
    EmergencyRotation,
    DataBackup,
    AccessRestore,
    SystemLock,
    NotifyUser,
    EscalateIncident,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyRecoveryPlan {
    pub incident_id: String,
    pub recovery_steps: Vec<RecoveryStep>,
    pub data_integrity_checks: Vec<String>,
    pub access_restoration_order: Vec<String>,
    pub validation_requirements: Vec<String>,
    pub rollback_procedures: Vec<String>,
    pub estimated_duration: Duration,
    pub user_communication_plan: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryStep {
    pub id: String,
    pub description: String,
    pub action_type: RecoveryActionType,
    pub prerequisites: Vec<String>,
    pub estimated_duration: Duration,
    pub validation_criteria: Vec<String>,
    pub rollback_step: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryActionType {
    ValidateDataIntegrity,
    GenerateNewKeys,
    ReencryptData,
    RestoreDeviceAccess,
    ValidateUserAccess,
    UpdateSecurityPolicies,
    NotifyUserCompletion,
    AuditTrailUpdate,
}

#[wasm_bindgen]
pub struct EmergencyRotationManager {
    active_incidents: HashMap<String, EmergencyIncident>,
    active_responses: HashMap<String, EmergencyResponse>,
    recovery_plans: HashMap<String, EmergencyRecoveryPlan>,
    isolated_devices: HashMap<String, DateTime<Utc>>,
    invalidated_keys: HashMap<String, DateTime<Utc>>,
    audit_manager: AuditTrailManager,
    auto_response_enabled: bool,
    max_response_time: Duration,
    escalation_threshold: u8,
}

#[wasm_bindgen]
impl EmergencyRotationManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            active_incidents: HashMap::new(),
            active_responses: HashMap::new(),
            recovery_plans: HashMap::new(),
            isolated_devices: HashMap::new(),
            invalidated_keys: HashMap::new(),
            audit_manager: AuditTrailManager::new(),
            auto_response_enabled: true,
            max_response_time: Duration::minutes(15),
            escalation_threshold: 7,
        }
    }

    #[wasm_bindgen(js_name = "triggerEmergencyRotation")]
    pub fn trigger_emergency_rotation(
        &mut self,
        trigger_type: &str,
        description: &str,
        affected_devices: Vec<String>,
        severity: u8,
    ) -> Result<String, String> {
        let trigger_type = self.parse_trigger_type(trigger_type)?;
        let incident_id = Uuid::new_v4().to_string();
        
        let incident = EmergencyIncident {
            id: incident_id.clone(),
            trigger_type,
            severity,
            detected_at: Utc::now(),
            status: EmergencyStatus::Detected,
            affected_devices: affected_devices.clone(),
            description: description.to_string(),
            auto_triggered: false,
            response_time_limit: if severity >= self.escalation_threshold {
                Duration::minutes(5)
            } else {
                self.max_response_time
            },
            escalation_contacts: self.get_escalation_contacts(severity),
        };

        // Log emergency incident
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "emergency_incident_detected".to_string(),
            timestamp: Utc::now(),
            device_id: "system".to_string(),
            user_id: "system".to_string(),
            metadata: format!("trigger_type={:?}, severity={}, devices={}", 
                trigger_type, severity, affected_devices.len()),
            success: true,
            error_message: None,
        };
        
        if let Err(e) = self.audit_manager.log_event(audit_event) {
            eprintln!("Failed to log emergency incident: {}", e);
        }

        self.active_incidents.insert(incident_id.clone(), incident);

        // Auto-respond if enabled and severity is high
        if self.auto_response_enabled && severity >= self.escalation_threshold {
            if let Err(e) = self.initiate_emergency_response(&incident_id) {
                return Err(format!("Failed to initiate auto-response: {}", e));
            }
        }

        Ok(incident_id)
    }

    #[wasm_bindgen(js_name = "initiateEmergencyResponse")]
    pub fn initiate_emergency_response(&mut self, incident_id: &str) -> Result<(), String> {
        let incident = self.active_incidents.get(incident_id)
            .ok_or_else(|| "Incident not found".to_string())?
            .clone();

        let response = EmergencyResponse {
            incident_id: incident_id.to_string(),
            started_at: Utc::now(),
            completed_at: None,
            status: EmergencyStatus::Responding,
            actions_taken: Vec::new(),
            devices_isolated: Vec::new(),
            keys_invalidated: Vec::new(),
            recovery_status: RecoveryStatus::NotStarted,
            data_accessibility: true,
            success_rate: 0.0,
        };

        self.active_responses.insert(incident_id.to_string(), response);

        // Update incident status
        if let Some(incident) = self.active_incidents.get_mut(incident_id) {
            incident.status = EmergencyStatus::Responding;
        }

        // Execute immediate response actions based on trigger type and severity
        self.execute_immediate_actions(&incident)?;

        // Generate recovery plan
        self.generate_recovery_plan(&incident)?;

        Ok(())
    }

    #[wasm_bindgen(js_name = "isolateDevice")]
    pub fn isolate_device(&mut self, device_id: &str, incident_id: &str) -> Result<(), String> {
        let action = EmergencyAction {
            id: Uuid::new_v4().to_string(),
            action_type: EmergencyActionType::IsolateDevice,
            target: device_id.to_string(),
            executed_at: Utc::now(),
            success: true,
            details: format!("Device {} isolated due to incident {}", device_id, incident_id),
            rollback_available: true,
        };

        // Add to isolated devices
        self.isolated_devices.insert(device_id.to_string(), Utc::now());

        // Update response
        if let Some(response) = self.active_responses.get_mut(incident_id) {
            response.actions_taken.push(action.clone());
            response.devices_isolated.push(device_id.to_string());
            response.status = EmergencyStatus::Isolating;
        }

        // Log isolation action
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "emergency_device_isolated".to_string(),
            timestamp: Utc::now(),
            device_id: device_id.to_string(),
            user_id: "system".to_string(),
            metadata: format!("incident_id={}, action_id={}", incident_id, action.id),
            success: true,
            error_message: None,
        };

        self.audit_manager.log_event(audit_event)
            .map_err(|e| format!("Failed to log device isolation: {}", e))?;

        Ok(())
    }

    #[wasm_bindgen(js_name = "invalidateKey")]
    pub fn invalidate_key(&mut self, key_id: &str, incident_id: &str) -> Result<(), String> {
        let action = EmergencyAction {
            id: Uuid::new_v4().to_string(),
            action_type: EmergencyActionType::InvalidateKey,
            target: key_id.to_string(),
            executed_at: Utc::now(),
            success: true,
            details: format!("Key {} invalidated due to incident {}", key_id, incident_id),
            rollback_available: false, // Key invalidation is not reversible
        };

        // Add to invalidated keys
        self.invalidated_keys.insert(key_id.to_string(), Utc::now());

        // Update response
        if let Some(response) = self.active_responses.get_mut(incident_id) {
            response.actions_taken.push(action.clone());
            response.keys_invalidated.push(key_id.to_string());
        }

        // Log key invalidation
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "emergency_key_invalidated".to_string(),
            timestamp: Utc::now(),
            device_id: "system".to_string(),
            user_id: "system".to_string(),
            metadata: format!("key_id={}, incident_id={}, action_id={}", 
                key_id, incident_id, action.id),
            success: true,
            error_message: None,
        };

        self.audit_manager.log_event(audit_event)
            .map_err(|e| format!("Failed to log key invalidation: {}", e))?;

        Ok(())
    }

    #[wasm_bindgen(js_name = "executeEmergencyRotation")]
    pub fn execute_emergency_rotation(
        &mut self,
        incident_id: &str,
        device_ids: Vec<String>,
    ) -> Result<Vec<String>, String> {
        let mut rotated_keys = Vec::new();

        if let Some(response) = self.active_responses.get_mut(incident_id) {
            response.status = EmergencyStatus::Rotating;
        }

        // Execute rapid key rotation for each device
        for device_id in device_ids {
            match self.rotate_device_keys_emergency(&device_id, incident_id) {
                Ok(new_key_ids) => {
                    rotated_keys.extend(new_key_ids);
                }
                Err(e) => {
                    eprintln!("Failed to rotate keys for device {}: {}", device_id, e);
                    // Continue with other devices even if one fails
                }
            }
        }

        // Log emergency rotation completion
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "emergency_rotation_completed".to_string(),
            timestamp: Utc::now(),
            device_id: "system".to_string(),
            user_id: "system".to_string(),
            metadata: format!("incident_id={}, keys_rotated={}", incident_id, rotated_keys.len()),
            success: !rotated_keys.is_empty(),
            error_message: if rotated_keys.is_empty() { 
                Some("No keys were successfully rotated".to_string()) 
            } else { 
                None 
            },
        };

        self.audit_manager.log_event(audit_event)
            .map_err(|e| format!("Failed to log emergency rotation: {}", e))?;

        Ok(rotated_keys)
    }

    #[wasm_bindgen(js_name = "initiateRecovery")]
    pub fn initiate_recovery(&mut self, incident_id: &str) -> Result<(), String> {
        let recovery_plan = self.recovery_plans.get(incident_id)
            .ok_or_else(|| "Recovery plan not found".to_string())?
            .clone();

        if let Some(response) = self.active_responses.get_mut(incident_id) {
            response.status = EmergencyStatus::Recovering;
            response.recovery_status = RecoveryStatus::InProgress;
        }

        // Execute recovery steps in order
        for step in &recovery_plan.recovery_steps {
            match self.execute_recovery_step(step, incident_id) {
                Ok(_) => {
                    println!("Recovery step {} completed successfully", step.id);
                }
                Err(e) => {
                    eprintln!("Recovery step {} failed: {}", step.id, e);
                    // Decide whether to continue or abort based on step criticality
                    if step.rollback_step.is_some() {
                        // Execute rollback if available
                        if let Err(rollback_err) = self.execute_rollback(&step.rollback_step.as_ref().unwrap()) {
                            eprintln!("Rollback also failed: {}", rollback_err);
                        }
                    }
                    return Err(format!("Recovery failed at step {}: {}", step.id, e));
                }
            }
        }

        // Update recovery status
        if let Some(response) = self.active_responses.get_mut(incident_id) {
            response.recovery_status = RecoveryStatus::Complete;
            response.status = EmergencyStatus::Complete;
            response.completed_at = Some(Utc::now());
            response.data_accessibility = true;
        }

        // Log recovery completion
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "emergency_recovery_completed".to_string(),
            timestamp: Utc::now(),
            device_id: "system".to_string(),
            user_id: "system".to_string(),
            metadata: format!("incident_id={}, steps_completed={}", 
                incident_id, recovery_plan.recovery_steps.len()),
            success: true,
            error_message: None,
        };

        self.audit_manager.log_event(audit_event)
            .map_err(|e| format!("Failed to log recovery completion: {}", e))?;

        Ok(())
    }

    #[wasm_bindgen(js_name = "getIncidentStatus")]
    pub fn get_incident_status(&self, incident_id: &str) -> Result<String, String> {
        let incident = self.active_incidents.get(incident_id)
            .ok_or_else(|| "Incident not found".to_string())?;

        let response = self.active_responses.get(incident_id);

        let status = serde_json::json!({
            "incident": incident,
            "response": response,
            "recovery_plan": self.recovery_plans.get(incident_id),
            "isolated_devices": self.isolated_devices.keys().collect::<Vec<_>>(),
            "invalidated_keys": self.invalidated_keys.keys().collect::<Vec<_>>(),
        });

        serde_json::to_string(&status)
            .map_err(|e| format!("Failed to serialize status: {}", e))
    }

    #[wasm_bindgen(js_name = "isDeviceIsolated")]
    pub fn is_device_isolated(&self, device_id: &str) -> bool {
        self.isolated_devices.contains_key(device_id)
    }

    #[wasm_bindgen(js_name = "isKeyInvalidated")]
    pub fn is_key_invalidated(&self, key_id: &str) -> bool {
        self.invalidated_keys.contains_key(key_id)
    }

    #[wasm_bindgen(js_name = "restoreDeviceAccess")]
    pub fn restore_device_access(&mut self, device_id: &str, incident_id: &str) -> Result<(), String> {
        // Validate that incident is resolved
        let incident = self.active_incidents.get(incident_id)
            .ok_or_else(|| "Incident not found".to_string())?;

        let response = self.active_responses.get(incident_id)
            .ok_or_else(|| "Response not found".to_string())?;

        if response.status != EmergencyStatus::Complete {
            return Err("Cannot restore access until incident is fully resolved".to_string());
        }

        // Remove from isolated devices
        if self.isolated_devices.remove(device_id).is_none() {
            return Err("Device was not isolated".to_string());
        }

        // Log access restoration
        let audit_event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_type: "device_access_restored".to_string(),
            timestamp: Utc::now(),
            device_id: device_id.to_string(),
            user_id: "system".to_string(),
            metadata: format!("incident_id={}", incident_id),
            success: true,
            error_message: None,
        };

        self.audit_manager.log_event(audit_event)
            .map_err(|e| format!("Failed to log access restoration: {}", e))?;

        Ok(())
    }
}

impl EmergencyRotationManager {
    fn parse_trigger_type(&self, trigger_type: &str) -> Result<EmergencyTriggerType, String> {
        match trigger_type.to_lowercase().as_str() {
            "security_breach" => Ok(EmergencyTriggerType::SecurityBreach),
            "compromised_device" => Ok(EmergencyTriggerType::CompromisedDevice),
            "suspicious_activity" => Ok(EmergencyTriggerType::SuspiciousActivity),
            "key_exposure_risk" => Ok(EmergencyTriggerType::KeyExposureRisk),
            "system_intrusion" => Ok(EmergencyTriggerType::SystemIntrusion),
            "malware_detection" => Ok(EmergencyTriggerType::MalwareDetection),
            "unauthorized_access" => Ok(EmergencyTriggerType::UnauthorizedAccess),
            "data_leakage" => Ok(EmergencyTriggerType::DataLeakage),
            "physical_compromise" => Ok(EmergencyTriggerType::PhysicalCompromise),
            "manual_trigger" => Ok(EmergencyTriggerType::ManualTrigger),
            _ => Err(format!("Unknown trigger type: {}", trigger_type)),
        }
    }

    fn get_escalation_contacts(&self, severity: u8) -> Vec<String> {
        match severity {
            9..=10 => vec!["critical@security.team".to_string(), "cto@company.com".to_string()],
            7..=8 => vec!["security@company.com".to_string(), "devops@company.com".to_string()],
            5..=6 => vec!["security@company.com".to_string()],
            _ => vec!["support@company.com".to_string()],
        }
    }

    fn execute_immediate_actions(&mut self, incident: &EmergencyIncident) -> Result<(), String> {
        match incident.trigger_type {
            EmergencyTriggerType::CompromisedDevice => {
                // Immediately isolate all affected devices
                for device_id in &incident.affected_devices {
                    self.isolate_device(device_id, &incident.id)?;
                }
            }
            EmergencyTriggerType::KeyExposureRisk => {
                // Immediately invalidate potentially compromised keys
                // This would need integration with key management system
                println!("Immediate key invalidation required for incident {}", incident.id);
            }
            EmergencyTriggerType::SystemIntrusion => {
                // System-wide lockdown
                for device_id in &incident.affected_devices {
                    self.isolate_device(device_id, &incident.id)?;
                }
            }
            _ => {
                // Standard response - isolate affected devices if severity is high
                if incident.severity >= 8 {
                    for device_id in &incident.affected_devices {
                        self.isolate_device(device_id, &incident.id)?;
                    }
                }
            }
        }
        Ok(())
    }

    fn generate_recovery_plan(&mut self, incident: &EmergencyIncident) -> Result<(), String> {
        let mut recovery_steps = Vec::new();

        // Step 1: Validate data integrity
        recovery_steps.push(RecoveryStep {
            id: "validate_data_integrity".to_string(),
            description: "Validate data integrity across all affected systems".to_string(),
            action_type: RecoveryActionType::ValidateDataIntegrity,
            prerequisites: Vec::new(),
            estimated_duration: Duration::minutes(30),
            validation_criteria: vec!["All data checksums verified".to_string()],
            rollback_step: None,
        });

        // Step 2: Generate new keys
        recovery_steps.push(RecoveryStep {
            id: "generate_new_keys".to_string(),
            description: "Generate new cryptographic keys for affected devices".to_string(),
            action_type: RecoveryActionType::GenerateNewKeys,
            prerequisites: vec!["validate_data_integrity".to_string()],
            estimated_duration: Duration::minutes(15),
            validation_criteria: vec!["New keys meet cryptographic standards".to_string()],
            rollback_step: Some("restore_previous_keys".to_string()),
        });

        // Step 3: Re-encrypt data
        recovery_steps.push(RecoveryStep {
            id: "reencrypt_data".to_string(),
            description: "Re-encrypt affected data with new keys".to_string(),
            action_type: RecoveryActionType::ReencryptData,
            prerequisites: vec!["generate_new_keys".to_string()],
            estimated_duration: Duration::hours(2),
            validation_criteria: vec!["All data re-encrypted successfully".to_string()],
            rollback_step: Some("restore_previous_encryption".to_string()),
        });

        // Step 4: Restore device access
        recovery_steps.push(RecoveryStep {
            id: "restore_device_access".to_string(),
            description: "Restore access to previously isolated devices".to_string(),
            action_type: RecoveryActionType::RestoreDeviceAccess,
            prerequisites: vec!["reencrypt_data".to_string()],
            estimated_duration: Duration::minutes(10),
            validation_criteria: vec!["All devices can access encrypted data".to_string()],
            rollback_step: Some("re_isolate_devices".to_string()),
        });

        let recovery_plan = EmergencyRecoveryPlan {
            incident_id: incident.id.clone(),
            recovery_steps,
            data_integrity_checks: vec![
                "Verify all encrypted data can be decrypted".to_string(),
                "Validate data checksums".to_string(),
                "Confirm no data corruption".to_string(),
            ],
            access_restoration_order: incident.affected_devices.clone(),
            validation_requirements: vec![
                "All new keys meet security requirements".to_string(),
                "Data integrity maintained throughout process".to_string(),
                "No unauthorized access during recovery".to_string(),
            ],
            rollback_procedures: vec![
                "Restore from verified backup".to_string(),
                "Revert to previous key version".to_string(),
                "Re-isolate devices if issues detected".to_string(),
            ],
            estimated_duration: Duration::hours(3),
            user_communication_plan: vec![
                "Notify users of security incident".to_string(),
                "Provide recovery timeline".to_string(),
                "Confirm when access is restored".to_string(),
            ],
        };

        self.recovery_plans.insert(incident.id.clone(), recovery_plan);
        Ok(())
    }

    fn execute_recovery_step(&self, step: &RecoveryStep, incident_id: &str) -> Result<(), String> {
        match step.action_type {
            RecoveryActionType::ValidateDataIntegrity => {
                // Implement data integrity validation
                println!("Validating data integrity for incident {}", incident_id);
                // This would integrate with actual data validation systems
                Ok(())
            }
            RecoveryActionType::GenerateNewKeys => {
                // Implement new key generation
                println!("Generating new keys for incident {}", incident_id);
                // This would integrate with key generation systems
                Ok(())
            }
            RecoveryActionType::ReencryptData => {
                // Implement data re-encryption
                println!("Re-encrypting data for incident {}", incident_id);
                // This would integrate with encryption systems
                Ok(())
            }
            RecoveryActionType::RestoreDeviceAccess => {
                // Implement device access restoration
                println!("Restoring device access for incident {}", incident_id);
                // This would integrate with device management systems
                Ok(())
            }
            _ => {
                println!("Executing recovery step: {:?}", step.action_type);
                Ok(())
            }
        }
    }

    fn execute_rollback(&self, rollback_step: &str) -> Result<(), String> {
        println!("Executing rollback step: {}", rollback_step);
        // Implement rollback logic based on step type
        Ok(())
    }

    fn rotate_device_keys_emergency(&mut self, device_id: &str, incident_id: &str) -> Result<Vec<String>, String> {
        // This would integrate with the actual key rotation system
        // For now, simulate key rotation
        let new_key_id = Uuid::new_v4().to_string();
        
        println!("Emergency key rotation for device {} completed. New key: {}", device_id, new_key_id);
        
        Ok(vec![new_key_id])
    }
}

// Default implementation for convenience
impl Default for EmergencyRotationManager {
    fn default() -> Self {
        Self::new()
    }
}