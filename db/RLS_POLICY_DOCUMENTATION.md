# Row Level Security (RLS) Policy Documentation

## Overview

This document details the comprehensive RLS implementation for Aura's zero-knowledge architecture, implementing deny-by-default security principles with complete user data isolation.

## Core Security Principles

### 1. Zero-Knowledge Architecture Enforcement

- **Server Never Accesses Plaintext**: All health data is encrypted client-side before database storage
- **User Isolation**: `auth.uid()` prevents all cross-user data access under any circumstance
- **Deny-by-Default**: No data access without explicit user authorization through RLS policies

### 2. User Isolation Strategy

All user data tables implement identical isolation pattern:

```sql
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid())
```

This ensures:

- Authentication required (`auth.uid() IS NOT NULL`)
- User can only access their own records (`"userId" = auth.uid()`)
- Zero cross-user data leakage possible

### 3. Service Role Restrictions

Service accounts are explicitly limited to:

- ✅ Table metadata (schema validation)
- ✅ Migration history (deployment tracking)
- ✅ Health check functions (monitoring)
- ✅ System catalogs (performance monitoring)
- ❌ **NO ACCESS** to any user data tables
- ❌ **NO ACCESS** to authentication tables

## RLS Policy Implementation by Table

### encrypted_cycle_data

**Purpose**: Menstrual cycle tracking data with complete user isolation

**Policies**:

- `encrypted_cycle_data_user_isolation`: SELECT with user isolation
- `encrypted_cycle_data_insert`: INSERT with user validation
- `encrypted_cycle_data_update`: UPDATE with owner verification
- `encrypted_cycle_data_delete`: DELETE with owner verification

**Security Features**:

- Zero cross-user access prevention
- Optimistic concurrency through version control
- Device-specific sync status tracking

### encrypted_user_prefs

**Purpose**: User preference data with privacy isolation

**Policies**:

- `encrypted_user_prefs_user_isolation`: SELECT with user isolation
- `encrypted_user_prefs_insert`: INSERT with user validation
- `encrypted_user_prefs_update`: UPDATE with owner verification
- `encrypted_user_prefs_delete`: DELETE with owner verification

**Security Features**:

- Complete preference privacy
- Cultural theme settings isolation
- Stealth mode configuration security

### healthcare_share

**Purpose**: Healthcare data sharing with creator control

**Policies**:

- `healthcare_share_user_isolation`: SELECT with sharing creator control
- `healthcare_share_insert`: INSERT with creator validation
- `healthcare_share_update`: UPDATE with creator verification
- `healthcare_share_delete`: DELETE with creator verification

**Security Features**:

- Only sharing creators can manage their shares
- Healthcare provider access control
- Audit trail integration without PII exposure

### share_token

**Purpose**: Token-based healthcare sharing access

**Policies**:

- `share_token_validation`: SELECT via token validation only
- `share_token_insert`: INSERT by sharing creators only
- `share_token_update`: UPDATE by token creators only
- `share_token_delete`: DELETE by token creators only

**Security Features**:

- Token-based access prevents user enumeration
- Time-based expiration enforcement
- No direct user reference in token validation

### device_key

**Purpose**: Device key management with user isolation

**Policies**:

- `device_key_user_isolation`: SELECT with user isolation
- `device_key_insert`: INSERT with user validation
- `device_key_update`: UPDATE with owner verification
- `device_key_delete`: DELETE with owner verification

**Security Features**:

- Hash-based device identification for privacy
- Automated key rotation without cross-user exposure
- Device management security

## Performance Optimization

### RLS-Optimized Indexes

All user data tables include composite indexes optimized for RLS queries:

```sql
-- Pattern: (userId, timestamp DESC)
CREATE INDEX idx_table_user_updated ON table_name ("userId", "updatedAt" DESC);
```

**Benefits**:

- Fast user data retrieval with RLS enforcement
- Efficient pagination and sync operations
- Minimal query performance impact from security

### Query Performance Targets

- **Response Time**: <200ms for API calls with RLS enforcement
- **Database Optimization**: Composite indexes support RLS queries efficiently
- **Connection Pooling**: Security-first settings with performance optimization

## Security Validation

### Testing Requirements

All RLS policies must pass comprehensive security testing:

1. **Negative Testing**: 100% unauthorized access prevention
2. **Cross-User Access Tests**: User A cannot access User B's data
3. **Service Role Validation**: System accounts cannot access PII
4. **Token Security**: Share tokens prevent user enumeration

### Security Gates

- ✅ All unauthorized access attempts blocked
- ✅ Certificate pinning functional across platforms
- ✅ Audit logging operational without PII leakage
- ✅ Performance targets maintained with full RLS enforcement

### Continuous Security Monitoring

- Real-time RLS policy violation detection
- Automated security regression testing in CI/CD
- Quarterly penetration testing validation
- Policy change impact assessment

## Compliance and Privacy

### Regulatory Alignment

- **GDPR**: Right to be forgotten through user data isolation
- **HIPAA**: Healthcare data protection through zero-knowledge architecture
- **State Privacy Laws**: Reproductive health data protection through client-side encryption

### Audit Trail

- All policy violations logged without PII exposure
- Healthcare sharing activities tracked with privacy-safe metadata
- Real-time security violation alerting through Sentry integration

## Error Handling and Recovery

### RLS Policy Failures

- Database connections fail-closed (deny access) on policy violations
- Real-time alerting on policy enforcement failures
- Automatic fallback to deny-by-default on configuration errors

### Disaster Recovery

- Policy backup and restoration procedures
- Migration rollback capabilities for security policy changes
- Emergency access procedures with full audit trail

## Migration and Deployment

### Deployment Strategy

- **Staging Validation**: All RLS policies tested in staging environment
- **Production Rollout**: Gradual deployment with security monitoring
- **Rollback Procedures**: Immediate rollback on policy violation detection

### Migration History Tracking

```sql
CREATE TABLE migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by VARCHAR(255) DEFAULT 'service_role'
);
```

### Security Policy Versioning

- All RLS policy changes tracked in version control
- Policy regression testing prevents security reduction
- Automated policy validation in CI/CD pipeline

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-07  
**Author**: Dev Agent (Story 0.8)  
**Review Cycle**: Quarterly security assessment required
