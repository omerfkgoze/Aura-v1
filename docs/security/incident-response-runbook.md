# Security Incident Response Runbook

**Version:** 1.0  
**Last Updated:** 2025-01-03  
**Owner:** Security Team  
**Classification:** Internal

## Purpose

This runbook provides step-by-step procedures for responding to security incidents in the Aura application, including supply-chain compromises, SLSA verification failures, SBOM integrity issues, and other security events.

## Scope

This runbook covers:

- Supply-chain security incidents (dependency confusion, malicious packages)
- SLSA build provenance failures
- SBOM integrity violations
- Secret exposure incidents
- Vulnerability management escalation
- Security monitoring system failures

## Team Contacts

### Primary Response Team

- **Security Team Lead:** security-lead@aura-app.com
- **DevOps Lead:** devops-lead@aura-app.com
- **Development Lead:** dev-lead@aura-app.com

### Escalation Contacts

- **CTO:** cto@aura-app.com
- **Legal Team:** legal@aura-app.com
- **External Security Consultant:** [Contact as needed]

### Communication Channels

- **Slack Emergency Channel:** #security-incidents
- **Email Distribution:** security-team@aura-app.com
- **On-call Rotation:** PagerDuty integration

## Incident Classification

### Severity Levels

#### P0 - Critical (Response Time: <15 minutes)

- Active security breach or compromise
- Exposed secrets in production systems
- Critical vulnerability with active exploitation
- Complete SLSA verification system failure
- Confirmed malicious code in production

#### P1 - High (Response Time: <1 hour)

- High-severity vulnerabilities in production
- SLSA build provenance failures
- Suspected supply-chain compromise
- Failed critical security scans
- Data integrity concerns

#### P2 - Medium (Response Time: <4 hours)

- Medium-severity vulnerabilities
- SBOM generation failures
- License compliance violations
- Non-critical security scan failures
- Failed dependency updates

#### P3 - Low (Response Time: <24 hours)

- Low-severity vulnerabilities
- Security policy violations
- Documentation updates needed
- Informational security alerts

## Incident Response Procedures

### 1. Initial Response (First 15 minutes)

#### 1.1 Detection and Alerting

When a security incident is detected through:

- Automated monitoring alerts (Slack/Email)
- Manual discovery by team member
- External security researcher report
- Vulnerability scanner findings

**Immediate Actions:**

```bash
# 1. Log the incident
node tools/security/audit-logger.js log critical SECURITY_INCIDENT DETECTED '{
  "incident_type": "[TYPE]",
  "severity": "[P0|P1|P2|P3]",
  "detected_by": "[SYSTEM|PERSON]",
  "detection_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "initial_description": "[DESCRIPTION]"
}'

# 2. Create incident tracking file
echo "INCIDENT-$(date +%Y%m%d-%H%M%S)" > .ai/active-incident.txt
```

#### 1.2 Initial Assessment

- **Classify severity** using criteria above
- **Identify affected systems** (production, staging, development)
- **Determine scope** of potential impact
- **Document initial findings** in incident log

#### 1.3 Notification

Based on severity level:

**P0/P1 Incidents:**

```bash
# Immediate notification to security team
# Send to #security-incidents Slack channel
# Page on-call responder if after hours
# Email security-team@aura-app.com
```

**P2/P3 Incidents:**

```bash
# Notification during business hours
# Create ticket in security backlog
# Email security-team@aura-app.com
```

### 2. Assessment and Containment (First 30 minutes)

#### 2.1 Detailed Investigation

**For Supply-Chain Incidents:**

```bash
# Check dependency integrity
pnpm audit --audit-level high
cargo audit

# Verify lockfile integrity
git diff HEAD~10 -- package-lock.json Cargo.lock

# Run supply-chain scan
.github/workflows/supply-chain-scan.yml

# Check for suspicious packages
node tools/security/dependency-policy-check.js
```

**For SLSA Verification Failures:**

```bash
# Check recent builds
node tools/security/slsa-verify.js [artifact-path] [provenance-path] [signature-path]

# Verify build environment
# Check GitHub Actions logs for anomalies
# Validate signing keys and certificates
```

**For SBOM Integrity Issues:**

```bash
# Regenerate and verify SBOM
node tools/security/sbom-aggregate.js

# Compare with previous known-good SBOM
# Check for unauthorized dependencies
```

**For Secret Exposure:**

```bash
# Immediate secret rotation
# Check git history for exposed secrets
git log --all --full-history -- [affected-files]

# Run comprehensive secret scan
trufflehog git file://. --since-commit HEAD~50 --only-verified
```

#### 2.2 Containment Actions

**Immediate Containment (P0/P1):**

```bash
# Stop affected deployments
kubectl scale deployment [affected-service] --replicas=0

# Revoke compromised credentials immediately
# Update secrets in production environment
# Block suspicious network traffic

# Create emergency branch for fixes
git checkout -b security-fix-$(date +%Y%m%d)
```

**Standard Containment (P2/P3):**

```bash
# Tag current stable release
git tag security-checkpoint-$(date +%Y%m%d)

# Document affected components
# Plan staged remediation approach
```

#### 2.3 Evidence Collection

```bash
# Collect system logs
mkdir -p incident-evidence/$(date +%Y%m%d)
cp .ai/security-monitoring.log incident-evidence/$(date +%Y%m%d)/
cp .ai/audit-trail.log incident-evidence/$(date +%Y%m%d)/

# Capture system state
kubectl get all -o yaml > incident-evidence/$(date +%Y%m%d)/k8s-state.yaml
docker images > incident-evidence/$(date +%Y%m%d)/docker-images.txt

# Preserve build artifacts
gh run download [run-id] --dir incident-evidence/$(date +%Y%m%d)/
```

### 3. Remediation (First 2 hours)

#### 3.1 Develop Remediation Plan

**Template Remediation Plan:**

```markdown
## Incident Remediation Plan

**Incident ID:** [ID]
**Date:** [DATE]  
**Severity:** [LEVEL]

### Root Cause

- [Description of root cause]

### Affected Systems

- [ ] Production environment
- [ ] Staging environment
- [ ] Build pipeline
- [ ] Dependencies

### Remediation Steps

1. [ ] [Action 1 - Owner - ETA]
2. [ ] [Action 2 - Owner - ETA]
3. [ ] [Action 3 - Owner - ETA]

### Verification Steps

1. [ ] [Verification 1]
2. [ ] [Verification 2]

### Rollback Plan

- [Steps to rollback if remediation fails]
```

#### 3.2 Execute Remediation

**Common Remediation Patterns:**

**Dependency Compromise:**

```bash
# Remove malicious dependency
pnpm remove [malicious-package]
# Or update to safe version
pnpm update [package]@[safe-version]

# Verify integrity
pnpm audit
cargo audit

# Regenerate lockfiles
rm -rf node_modules package-lock.json
pnpm install

# Update SBOM
node tools/security/sbom-aggregate.js
```

**SLSA Verification Failure:**

```bash
# Fix build environment issues
# Regenerate build provenance
# Update signing keys if compromised

# Re-run SLSA verification
.github/workflows/slsa-build.yml

# Verify fix
node tools/security/slsa-verify.js [artifact] [provenance] [signature]
```

**Secret Exposure:**

```bash
# Rotate all potentially affected secrets
# Update environment configurations
# Deploy new secrets to production

# Verify secret rotation
kubectl get secrets
# Check application connectivity
```

#### 3.3 Testing and Validation

```bash
# Run comprehensive security tests
pnpm test:security
cargo test

# Run full security audit
.github/workflows/security-audit.yml

# Validate fix with monitoring
node tools/security/security-monitor.js [scan-type] [results-file]
```

### 4. Recovery and Restoration (First 4 hours)

#### 4.1 Gradual Recovery Plan

```bash
# Test in staging first
kubectl apply -f deployments/staging/

# Verify staging functionality
# Run security scans against staging
.github/workflows/security-audit.yml

# Deploy to production with monitoring
kubectl apply -f deployments/production/
```

#### 4.2 Enhanced Monitoring

```bash
# Increase monitoring alerting
# Add temporary additional security checks
# Monitor for related incidents

# Enable debug logging temporarily
export LOG_LEVEL=debug
export SECURITY_MONITORING_VERBOSE=true
```

### 5. Post-Incident Activities (Within 48 hours)

#### 5.1 Incident Documentation

```bash
# Generate comprehensive incident report
cat > incident-report-$(date +%Y%m%d).md << EOF
# Security Incident Report

## Incident Summary
- **ID:** $(cat .ai/active-incident.txt)
- **Date:** $(date)
- **Severity:** [LEVEL]
- **Duration:** [DURATION]
- **Affected Systems:** [SYSTEMS]

## Timeline
- [Time] - Initial detection
- [Time] - Response initiated
- [Time] - Containment completed
- [Time] - Remediation deployed
- [Time] - Full recovery

## Root Cause Analysis
[Detailed analysis of what went wrong]

## Remediation Actions
[What was done to fix the issue]

## Lessons Learned
[What we learned from this incident]

## Prevention Measures
[Steps to prevent similar incidents]
EOF
```

#### 5.2 Post-Incident Review Meeting

- Schedule within 48 hours of resolution
- Include all incident responders
- Review timeline and response effectiveness
- Identify improvement opportunities
- Update runbooks and procedures

#### 5.3 Security Improvements

```bash
# Update security policies based on lessons learned
# Enhance monitoring and alerting rules
# Improve detection capabilities
# Update training materials

# Implement preventive measures
# Add new security tests
# Enhance CI/CD security checks
```

## Incident-Specific Procedures

### Supply-Chain Compromise Response

#### Detection Indicators

- Dependency confusion alerts
- Typosquatting package warnings
- Malicious package detections
- Suspicious registry configurations
- Unexpected dependency changes

#### Specialized Response Actions

```bash
# 1. Immediately audit all dependencies
pnpm ls --all > current-dependencies.txt
cargo tree > current-rust-dependencies.txt

# 2. Compare against known-good baseline
diff baseline-dependencies.txt current-dependencies.txt

# 3. Check package authenticity
npm pack [suspicious-package] --dry-run
# Verify package signatures and metadata

# 4. Trace dependency introduction
git log --follow --patch -- package.json Cargo.toml

# 5. Network isolation
# Block access to suspicious registries
# Implement package allowlisting temporarily

# 6. Comprehensive supply-chain scan
node tools/security/dependency-policy-check.js --strict-mode
```

### SLSA Provenance Failure Response

#### Detection Indicators

- Build provenance verification failures
- Missing or invalid signatures
- Compromised build environment
- Reproducibility failures

#### Specialized Response Actions

```bash
# 1. Verify build environment integrity
# Check GitHub Actions runner logs
# Validate signing keys and certificates

# 2. Re-build from clean state
git clean -fdx
# Ensure reproducible build conditions
export SOURCE_DATE_EPOCH=$(date +%s)

# 3. Compare artifacts
sha256sum [current-artifact] [rebuilt-artifact]

# 4. Investigate build pipeline
# Check for unauthorized workflow changes
git log --oneline .github/workflows/

# 5. Validate all signatures
cosign verify-blob --bundle [bundle] [artifact]
```

### Secret Exposure Response

#### Detection Indicators

- Secrets in git history
- Hardcoded credentials in code
- API keys in logs or artifacts
- Exposed environment variables

#### Specialized Response Actions

```bash
# 1. Immediate secret rotation
# Rotate ALL potentially affected secrets
# Update production systems immediately

# 2. Git history cleanup (if needed)
git filter-branch --env-filter 'unset SECRET_VAR' HEAD~10..HEAD

# 3. Comprehensive secret scan
trufflehog git file://. --since-commit HEAD~100
gitleaks detect --source=. --verbose

# 4. Monitor for unauthorized access
# Check access logs for suspicious activity
# Monitor API usage for unusual patterns

# 5. Notify external services
# Contact third-party API providers if keys exposed
# Reset service account credentials
```

## Tools and Scripts

### Emergency Scripts

#### Quick System Check

```bash
#!/bin/bash
# tools/security/emergency-check.sh

echo "=== EMERGENCY SECURITY CHECK ==="
echo "Time: $(date)"
echo "Git Commit: $(git rev-parse HEAD)"
echo ""

echo "=== Dependency Status ==="
pnpm audit --audit-level high || echo "NPM audit failed"
cd libs/crypto-core && cargo audit || echo "Cargo audit failed"
cd -

echo "=== Secret Scan ==="
trufflehog git file://. --since-commit HEAD~1 --only-verified || echo "Secrets found!"

echo "=== Build Verification ==="
if [ -f "dist/bundle.js" ]; then
  sha256sum dist/bundle.js
fi

echo "=== SLSA Status ==="
if [ -f "provenance.intoto.jsonl" ]; then
  node tools/security/slsa-verify.js dist/ provenance.intoto.jsonl signature.sig
fi

echo "=== Complete ==="
```

#### Incident Logger

```bash
#!/bin/bash
# tools/security/incident-log.sh

INCIDENT_ID="INCIDENT-$(date +%Y%m%d-%H%M%S)"
SEVERITY="$1"
DESCRIPTION="$2"

echo "$INCIDENT_ID" > .ai/active-incident.txt

node tools/security/audit-logger.js log critical SECURITY_INCIDENT STARTED "{
  \"incident_id\": \"$INCIDENT_ID\",
  \"severity\": \"$SEVERITY\",
  \"description\": \"$DESCRIPTION\",
  \"responder\": \"$(whoami)\",
  \"start_time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}"

echo "Incident $INCIDENT_ID logged with severity $SEVERITY"
```

### Monitoring Commands

#### Check System Status

```bash
# Security monitoring status
node tools/security/security-monitor.js --status

# Recent security events
node tools/security/audit-logger.js summary 24

# Active alerts
grep -E "(CRITICAL|ERROR)" .ai/security-monitoring.log | tail -10
```

#### Generate Status Report

```bash
# Generate current security posture report
cat > security-status.md << EOF
# Security Status Report
Generated: $(date)

## Recent Scans
$(tail -5 .ai/security-monitoring.log)

## Active Issues
$(grep -c "severity.*critical" .ai/security-monitoring.log || echo "0") critical issues
$(grep -c "severity.*high" .ai/security-monitoring.log || echo "0") high severity issues

## System Health
- SLSA Verification: $(node tools/security/slsa-verify.js --quick-check && echo "OK" || echo "FAILED")
- Dependency Status: $(pnpm audit --audit-level high > /dev/null && echo "OK" || echo "ISSUES")
- Secret Exposure: $(trufflehog git file://. --since-commit HEAD~1 --only-verified > /dev/null && echo "CLEAN" || echo "EXPOSED")
EOF
```

## Training and Preparedness

### Team Training Requirements

- **All team members:** Basic incident response procedures
- **On-call rotation:** Advanced incident handling
- **Security team:** Specialized threat response
- **Leadership:** Communication and escalation procedures

### Regular Drills

- **Monthly:** Table-top exercises for different incident types
- **Quarterly:** Full incident response simulation
- **Annually:** Cross-team coordination exercises

### Runbook Maintenance

- **Monthly:** Review and update contact information
- **Quarterly:** Update procedures based on lessons learned
- **Annually:** Comprehensive runbook review and testing

## Appendix

### A. Contact Lists

#### Internal Contacts

```yaml
Security Team:
  - Lead: security-lead@aura-app.com
  - Engineer 1: sec-eng1@aura-app.com
  - Engineer 2: sec-eng2@aura-app.com

Development Team:
  - Lead: dev-lead@aura-app.com
  - Senior Dev 1: senior-dev1@aura-app.com
  - Senior Dev 2: senior-dev2@aura-app.com

Operations Team:
  - Lead: ops-lead@aura-app.com
  - SRE 1: sre1@aura-app.com
  - SRE 2: sre2@aura-app.com
```

#### External Contacts

```yaml
Security Vendors:
  - Security Consultant: consultant@security-firm.com
  - Incident Response Firm: emergency@ir-firm.com

Legal:
  - Corporate Counsel: legal@law-firm.com
  - Privacy Officer: privacy@aura-app.com

Communications:
  - PR Agency: crisis@pr-agency.com
  - Customer Success: support@aura-app.com
```

### B. Escalation Matrix

| Incident Severity | Initial Response        | 1 Hour            | 4 Hours            | 24 Hours             |
| ----------------- | ----------------------- | ----------------- | ------------------ | -------------------- |
| P0 - Critical     | Security Team + On-call | CTO + Legal       | Board Notification | Public Communication |
| P1 - High         | Security Team           | Dev/Ops Leads     | CTO                | Status Update        |
| P2 - Medium       | Security Engineer       | Team Lead         | Management Update  | Weekly Report        |
| P3 - Low          | Individual Response     | Team Notification | Sprint Planning    | Monthly Review       |

### C. Communication Templates

#### Initial Incident Notification

```
Subject: [P0-CRITICAL] Security Incident - [BRIEF DESCRIPTION]

INCIDENT ALERT - Immediate Response Required

Incident ID: [ID]
Detection Time: [TIME]
Severity: [LEVEL]
Initial Assessment: [BRIEF DESCRIPTION]

Immediate Actions Required:
- Security team response initiated
- [Specific actions based on incident type]

Next Update: [TIME]
Incident Commander: [NAME]
```

#### Status Update Template

```
Subject: [UPDATE] Security Incident [ID] - [STATUS]

Incident Update - [ID]

Current Status: [INVESTIGATING|CONTAINED|REMEDIATED|RESOLVED]
Time Since Detection: [DURATION]

Progress Update:
- [Action 1] - COMPLETE
- [Action 2] - IN PROGRESS
- [Action 3] - PENDING

Next Steps:
- [Next action with timeline]

Next Update: [TIME]
```

#### Resolution Notification

```
Subject: [RESOLVED] Security Incident [ID] - Resolution Complete

Incident Resolution - [ID]

Final Status: RESOLVED
Total Duration: [DURATION]
Root Cause: [BRIEF DESCRIPTION]

Resolution Actions:
- [Action 1] - COMPLETE
- [Action 2] - COMPLETE

Follow-up Actions:
- Post-incident review scheduled for [DATE]
- Preventive measures implementation planned

Incident Commander: [NAME]
```

---

**Document Control:**

- **Version:** 1.0
- **Last Review:** 2025-01-03
- **Next Review:** 2025-04-03
- **Owner:** Security Team
- **Approver:** CTO
