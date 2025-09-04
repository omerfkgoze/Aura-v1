# Server Breach Attack Trees

## Overview

This document presents comprehensive attack trees for server-side attacks targeting the Aura reproductive health application infrastructure. Despite the zero-knowledge architecture, server breaches remain a significant threat for metadata, access patterns, and system availability attacks.

## Attack Tree 1: Database Compromise

### Root Goal: Access Encrypted Health Data and Metadata via Database Breach

```
Database Compromise
├── 1. Database Access Achievement [OR]
│   ├── 1.1 Direct Database Access [OR]
│   │   ├── 1.1.1 Credential Compromise
│   │   │   ├── 1.1.1.1 Weak Database Passwords (Probability: 0.3, Impact: Critical)
│   │   │   ├── 1.1.1.2 Default Credentials (Probability: 0.2, Impact: Critical)
│   │   │   ├── 1.1.1.3 Credential Stuffing Attacks (Probability: 0.4, Impact: High)
│   │   │   └── 1.1.1.4 Password Cracking (Probability: 0.3, Impact: High)
│   │   ├── 1.1.2 Network Access Exploitation
│   │   │   ├── 1.1.2.1 Exposed Database Ports (Probability: 0.2, Impact: Critical)
│   │   │   ├── 1.1.2.2 VPN Compromise (Probability: 0.1, Impact: High)
│   │   │   └── 1.1.2.3 Network Segmentation Bypass (Probability: 0.15, Impact: High)
│   │   └── 1.1.3 Database Software Vulnerabilities
│   │       ├── 1.1.3.1 PostgreSQL CVE Exploitation (Probability: 0.1, Impact: Critical)
│   │       ├── 1.1.3.2 Supabase Platform Vulnerabilities (Probability: 0.05, Impact: Critical)
│   │       └── 1.1.3.3 Connection Library Exploits (Probability: 0.08, Impact: High)
│   ├── 1.2 Application-Level Database Access [OR]
│   │   ├── 1.2.1 SQL Injection Attacks
│   │   │   ├── 1.2.1.1 Classic SQL Injection (Probability: 0.2, Impact: High)
│   │   │   ├── 1.2.1.2 Blind SQL Injection (Probability: 0.15, Impact: High)
│   │   │   ├── 1.2.1.3 Time-based SQL Injection (Probability: 0.1, Impact: Medium)
│   │   │   └── 1.2.1.4 Union-based SQL Injection (Probability: 0.12, Impact: High)
│   │   ├── 1.2.2 ORM/Query Builder Exploitation
│   │   │   ├── 1.2.2.1 ORM Injection Vulnerabilities (Probability: 0.08, Impact: Medium)
│   │   │   ├── 1.2.2.2 Query Parameter Injection (Probability: 0.1, Impact: Medium)
│   │   │   └── 1.2.2.3 NoSQL Injection (if applicable) (Probability: 0.05, Impact: Medium)
│   │   └── 1.2.3 Stored Procedure Exploitation
│   │       ├── 1.2.3.1 Procedure Parameter Injection (Probability: 0.06, Impact: High)
│   │       └── 1.2.3.2 Privilege Escalation via Procedures (Probability: 0.04, Impact: Critical)
│   └── 1.3 Database Administration Compromise [OR]
│       ├── 1.3.1 DBA Account Compromise
│       │   ├── 1.3.1.1 Social Engineering DBA (Probability: 0.15, Impact: Critical)
│       │   ├── 1.3.1.2 DBA Workstation Compromise (Probability: 0.1, Impact: Critical)
│       │   └── 1.3.1.3 DBA Credential Theft (Probability: 0.08, Impact: Critical)
│       ├── 1.3.2 Database Management Tool Compromise
│       │   ├── 1.3.2.1 pgAdmin/Management Console Exploit (Probability: 0.05, Impact: High)
│       │   └── 1.3.2.2 Third-party DB Tool Compromise (Probability: 0.07, Impact: High)
│       └── 1.3.3 Cloud Platform Account Compromise
│           ├── 1.3.3.1 Supabase Account Takeover (Probability: 0.03, Impact: Critical)
│           └── 1.3.3.2 Cloud Provider Console Access (Probability: 0.02, Impact: Critical)
│
├── 2. Row Level Security (RLS) Bypass [AND]
│   ├── 2.1 Policy Logic Flaws [OR]
│   │   ├── 2.1.1 RLS Policy Logic Errors
│   │   │   ├── 2.1.1.1 Incorrect auth.uid() Usage (Probability: 0.2, Impact: Critical)
│   │   │   ├── 2.1.1.2 Missing Policy Conditions (Probability: 0.15, Impact: High)
│   │   │   └── 2.1.1.3 Policy Logic Race Conditions (Probability: 0.08, Impact: Medium)
│   │   ├── 2.1.2 Cross-Table Policy Bypass
│   │   │   ├── 2.1.2.1 Join-based Policy Evasion (Probability: 0.1, Impact: High)
│   │   │   └── 2.1.2.2 Foreign Key Policy Gaps (Probability: 0.12, Impact: High)
│   │   └── 2.1.3 Function Security Definer Abuse
│   │       ├── 2.1.3.1 Privileged Function Exploitation (Probability: 0.06, Impact: Critical)
│   │       └── 2.1.3.2 Function Parameter Injection (Probability: 0.08, Impact: High)
│   ├── 2.2 Authentication Context Manipulation [OR]
│   │   ├── 2.2.1 JWT Token Manipulation
│   │   │   ├── 2.2.1.1 JWT Secret Key Compromise (Probability: 0.05, Impact: Critical)
│   │   │   ├── 2.2.1.2 JWT Algorithm Confusion (Probability: 0.03, Impact: High)
│   │   │   └── 2.2.1.3 JWT Payload Tampering (Probability: 0.07, Impact: High)
│   │   ├── 2.2.2 Session Context Poisoning
│   │   │   ├── 2.2.2.1 Session Variable Manipulation (Probability: 0.04, Impact: Medium)
│   │   │   └── 2.2.2.2 Connection Context Override (Probability: 0.03, Impact: High)
│   │   └── 2.2.3 Role-based Access Bypass
│   │       ├── 2.2.3.1 Role Elevation Attacks (Probability: 0.05, Impact: Critical)
│   │       └── 2.2.3.2 Service Role Impersonation (Probability: 0.04, Impact: High)
│   └── 2.3 Database-Level Security Bypass [OR]
│       ├── 2.3.1 Superuser Privilege Escalation (Probability: 0.02, Impact: Critical)
│       ├── 2.3.2 Database Configuration Manipulation (Probability: 0.03, Impact: High)
│       └── 2.3.3 PostgreSQL Extension Exploitation (Probability: 0.02, Impact: Medium)
│
└── 3. Data Extraction and Analysis [AND]
    ├── 3.1 Encrypted Data Access
    │   ├── 3.1.1 Encrypted Health Data Extraction (Probability: 0.9, Impact: Medium)
    │   ├── 3.1.2 Encryption Key Recovery Attempts (Probability: 0.1, Impact: Critical)
    │   └── 3.1.3 Cryptographic Attack Attempts (Probability: 0.05, Impact: High)
    ├── 3.2 Metadata Pattern Analysis
    │   ├── 3.2.1 User Activity Pattern Analysis (Probability: 0.8, Impact: High)
    │   ├── 3.2.2 Sync Frequency Pattern Analysis (Probability: 0.7, Impact: Medium)
    │   └── 3.2.3 Cross-User Correlation Analysis (Probability: 0.6, Impact: High)
    └── 3.3 System Information Gathering
        ├── 3.3.1 User Enumeration (Probability: 0.9, Impact: Medium)
        ├── 3.3.2 System Configuration Discovery (Probability: 0.8, Impact: Low)
        └── 3.3.3 Infrastructure Mapping (Probability: 0.7, Impact: Low)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Weak Database Passwords → RLS Policy Bypass → Data Access** (Overall Probability: 0.054, Impact: Critical)
2. **SQL Injection → JWT Manipulation → Encrypted Data Access** (Overall Probability: 0.014, Impact: Critical)

**Mitigations:**

- Strong authentication with multi-factor for database access
- Comprehensive RLS policy testing and validation
- Regular security auditing of database configurations
- Database activity monitoring and anomaly detection
- Encrypted database connections with certificate validation

## Attack Tree 2: Privilege Escalation

### Root Goal: Escalate Privileges to Access Restricted Data and Systems

```
Privilege Escalation
├── 1. Application-Level Privilege Escalation [OR]
│   ├── 1.1 API Authorization Bypass [OR]
│   │   ├── 1.1.1 JWT Token Vulnerabilities
│   │   │   ├── 1.1.1.1 JWT Secret Brute Force (Probability: 0.1, Impact: High)
│   │   │   ├── 1.1.1.2 JWT None Algorithm Attack (Probability: 0.05, Impact: High)
│   │   │   ├── 1.1.1.3 JWT Key Confusion Attack (Probability: 0.03, Impact: Critical)
│   │   │   └── 1.1.1.4 JWT Claim Manipulation (Probability: 0.08, Impact: High)
│   │   ├── 1.1.2 Session Management Flaws
│   │   │   ├── 1.1.2.1 Session Fixation (Probability: 0.1, Impact: Medium)
│   │   │   ├── 1.1.2.2 Session Hijacking (Probability: 0.12, Impact: High)
│   │   │   ├── 1.1.2.3 Privilege Escalation via Session (Probability: 0.06, Impact: High)
│   │   │   └── 1.1.2.4 Concurrent Session Abuse (Probability: 0.08, Impact: Medium)
│   │   └── 1.1.3 API Endpoint Authorization Flaws
│   │       ├── 1.1.3.1 Missing Authorization Checks (Probability: 0.15, Impact: High)
│   │       ├── 1.1.3.2 BOLA (Broken Object Level Authorization) (Probability: 0.2, Impact: Critical)
│   │       ├── 1.1.3.3 BFLA (Broken Function Level Authorization) (Probability: 0.18, Impact: High)
│   │       └── 1.1.3.4 Parameter Tampering for Privilege Bypass (Probability: 0.12, Impact: High)
│   ├── 1.2 Role-Based Access Control (RBAC) Bypass [OR]
│   │   ├── 1.2.1 Role Manipulation
│   │   │   ├── 1.2.1.1 Client-Side Role Assignment (Probability: 0.25, Impact: Critical)
│   │   │   ├── 1.2.1.2 Role Parameter Injection (Probability: 0.15, Impact: High)
│   │   │   └── 1.2.1.3 Role Enumeration and Guessing (Probability: 0.2, Impact: Medium)
│   │   ├── 1.2.2 Permission Matrix Flaws
│   │   │   ├── 1.2.2.1 Missing Permission Checks (Probability: 0.18, Impact: High)
│   │   │   ├── 1.2.2.2 Inconsistent Permission Enforcement (Probability: 0.12, Impact: Medium)
│   │   │   └── 1.2.2.3 Permission Inheritance Flaws (Probability: 0.08, Impact: High)
│   │   └── 1.2.3 Administrative Function Access
│   │       ├── 1.2.3.1 Admin Panel Discovery (Probability: 0.3, Impact: High)
│   │       ├── 1.2.3.2 Administrative Function Enumeration (Probability: 0.25, Impact: Medium)
│   │       └── 1.2.3.3 Debug/Development Function Access (Probability: 0.15, Impact: High)
│   └── 1.3 Business Logic Abuse [OR]
│       ├── 1.3.1 Workflow Bypass
│       │   ├── 1.3.1.1 Account Recovery Abuse (Probability: 0.2, Impact: High)
│       │   ├── 1.3.1.2 Verification Bypass (Probability: 0.15, Impact: Medium)
│       │   └── 1.3.1.3 State Machine Manipulation (Probability: 0.1, Impact: High)
│       ├── 1.3.2 Rate Limiting Bypass
│       │   ├── 1.3.2.1 IP Rotation for Rate Limit Evasion (Probability: 0.4, Impact: Medium)
│       │   ├── 1.3.2.2 Distributed Request Sources (Probability: 0.3, Impact: Medium)
│       │   └── 1.3.2.3 Header Manipulation for Bypass (Probability: 0.2, Impact: Low)
│       └── 1.3.3 Data Validation Bypass
│           ├── 1.3.3.1 Input Validation Bypass (Probability: 0.25, Impact: High)
│           ├── 1.3.3.2 Type Confusion Attacks (Probability: 0.08, Impact: Medium)
│           └── 1.3.3.3 Schema Validation Bypass (Probability: 0.1, Impact: Medium)
│
├── 2. System-Level Privilege Escalation [OR]
│   ├── 2.1 Container/Runtime Escape [OR]
│   │   ├── 2.1.1 Container Breakout
│   │   │   ├── 2.1.1.1 Docker Daemon Socket Access (Probability: 0.05, Impact: Critical)
│   │   │   ├── 2.1.1.2 Privileged Container Exploitation (Probability: 0.03, Impact: Critical)
│   │   │   ├── 2.1.1.3 Container Runtime CVE (Probability: 0.02, Impact: Critical)
│   │   │   └── 2.1.1.4 Kernel Exploit from Container (Probability: 0.01, Impact: Critical)
│   │   ├── 2.1.2 Resource Limit Bypass
│   │   │   ├── 2.1.2.1 Memory Limit Bypass (Probability: 0.1, Impact: Medium)
│   │   │   ├── 2.1.2.2 CPU Limit Bypass (Probability: 0.08, Impact: Low)
│   │   │   └── 2.1.2.3 Network Limit Bypass (Probability: 0.06, Impact: Medium)
│   │   └── 2.1.3 Orchestration Platform Abuse
│   │       ├── 2.1.3.1 Kubernetes API Server Access (Probability: 0.02, Impact: Critical)
│   │       ├── 2.1.3.2 Service Account Token Abuse (Probability: 0.04, Impact: High)
│   │       └── 2.1.3.3 Pod Security Policy Bypass (Probability: 0.03, Impact: High)
│   ├── 2.2 Cloud Platform Privilege Escalation [OR]
│   │   ├── 2.2.1 IAM Role Escalation
│   │   │   ├── 2.2.1.1 IAM Policy Misconfiguration (Probability: 0.1, Impact: Critical)
│   │   │   ├── 2.2.1.2 Assume Role Chain Exploitation (Probability: 0.05, Impact: High)
│   │   │   └── 2.2.1.3 Service-Linked Role Abuse (Probability: 0.03, Impact: High)
│   │   ├── 2.2.2 Metadata Service Exploitation
│   │   │   ├── 2.2.2.1 SSRF to Metadata Service (Probability: 0.08, Impact: High)
│   │   │   ├── 2.2.2.2 Instance Metadata Token Abuse (Probability: 0.06, Impact: High)
│   │   │   └── 2.2.2.3 Cross-Account Role Assumption (Probability: 0.02, Impact: Critical)
│   │   └── 2.2.3 Cloud Service API Abuse
│   │       ├── 2.2.3.1 Overprivileged Service Account (Probability: 0.12, Impact: High)
│   │       ├── 2.2.3.2 Cloud Function Privilege Escalation (Probability: 0.04, Impact: High)
│   │       └── 2.2.3.3 Resource Sharing Misconfiguration (Probability: 0.06, Impact: Medium)
│   └── 2.3 Network Infrastructure Escalation [OR]
│       ├── 2.3.1 Network Segmentation Bypass
│       │   ├── 2.3.1.1 VLAN Hopping (Probability: 0.03, Impact: High)
│       │   ├── 2.3.1.2 Firewall Rule Bypass (Probability: 0.05, Impact: High)
│       │   └── 2.3.1.3 Network ACL Evasion (Probability: 0.04, Impact: Medium)
│       ├── 2.3.2 Administrative Network Access
│       │   ├── 2.3.2.1 Management VLAN Access (Probability: 0.02, Impact: Critical)
│       │   ├── 2.3.2.2 Out-of-Band Management Access (Probability: 0.01, Impact: Critical)
│       │   └── 2.3.2.3 Network Device Compromise (Probability: 0.02, Impact: High)
│       └── 2.3.3 Service Discovery and Exploitation
│           ├── 2.3.3.1 Internal Service Enumeration (Probability: 0.15, Impact: Medium)
│           ├── 2.3.3.2 Service Account Discovery (Probability: 0.1, Impact: High)
│           └── 2.3.3.3 Inter-Service Communication Abuse (Probability: 0.08, Impact: High)
│
└── 3. Insider Threat Escalation [OR]
    ├── 3.1 Legitimate User Account Abuse [OR]
    │   ├── 3.1.1 Employee Account Compromise
    │   │   ├── 3.1.1.1 Social Engineering Employee (Probability: 0.2, Impact: Critical)
    │   │   ├── 3.1.1.2 Credential Theft from Employee (Probability: 0.15, Impact: Critical)
    │   │   └── 3.1.1.3 Malicious Insider Activity (Probability: 0.05, Impact: Critical)
    │   ├── 3.1.2 Contractor/Vendor Access Abuse
    │   │   ├── 3.1.2.1 Third-party Vendor Compromise (Probability: 0.08, Impact: High)
    │   │   ├── 3.1.2.2 Contractor Account Misuse (Probability: 0.1, Impact: High)
    │   │   └── 3.1.2.3 Excessive Vendor Permissions (Probability: 0.12, Impact: Medium)
    │   └── 3.1.3 Service Account Compromise
    │       ├── 3.1.3.1 Service Account Credential Exposure (Probability: 0.15, Impact: High)
    │       ├── 3.1.3.2 Service Account Privilege Abuse (Probability: 0.08, Impact: High)
    │       └── 3.1.3.3 Cross-Service Account Access (Probability: 0.06, Impact: Medium)
    ├── 3.2 Administrative Access Abuse [OR]
    │   ├── 3.2.1 System Administrator Compromise
    │   │   ├── 3.2.1.1 Admin Workstation Compromise (Probability: 0.08, Impact: Critical)
    │   │   ├── 3.2.1.2 Admin Credential Theft (Probability: 0.1, Impact: Critical)
    │   │   └── 3.2.1.3 Privileged Access Management Bypass (Probability: 0.04, Impact: Critical)
    │   ├── 3.2.2 Database Administrator Abuse
    │   │   ├── 3.2.2.1 DBA Direct Database Access (Probability: 0.12, Impact: Critical)
    │   │   ├── 3.2.2.2 Database Backup Access Abuse (Probability: 0.08, Impact: High)
    │   │   └── 3.2.2.3 Production Database Modification (Probability: 0.06, Impact: Critical)
    │   └── 3.2.3 Security Team Access Abuse
    │       ├── 3.2.3.1 Security Tool Misuse (Probability: 0.04, Impact: High)
    │       ├── 3.2.3.2 Audit Log Manipulation (Probability: 0.03, Impact: Critical)
    │       └── 3.2.3.3 Incident Response Tool Abuse (Probability: 0.02, Impact: High)
    └── 3.3 Supply Chain Compromise [OR]
        ├── 3.3.1 Development Tool Compromise
        │   ├── 3.3.1.1 CI/CD Pipeline Injection (Probability: 0.05, Impact: Critical)
        │   ├── 3.3.1.2 Source Code Repository Compromise (Probability: 0.03, Impact: Critical)
        │   └── 3.3.1.3 Build Environment Compromise (Probability: 0.04, Impact: High)
        ├── 3.3.2 Dependency Compromise
        │   ├── 3.3.2.1 Malicious Package Injection (Probability: 0.02, Impact: High)
        │   ├── 3.3.2.2 Package Manager Compromise (Probability: 0.01, Impact: Critical)
        │   └── 3.3.2.3 Transitive Dependency Attack (Probability: 0.03, Impact: Medium)
        └── 3.3.3 Infrastructure Provider Compromise
            ├── 3.3.3.1 Cloud Provider Account Takeover (Probability: 0.01, Impact: Critical)
            ├── 3.3.3.2 Third-party Service Compromise (Probability: 0.02, Impact: High)
            └── 3.3.3.3 CDN/Edge Service Compromise (Probability: 0.015, Impact: High)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Client-Side Role Assignment → BOLA → Data Access** (Overall Probability: 0.05, Impact: Critical)
2. **Social Engineering Employee → Admin Access → Database Modification** (Overall Probability: 0.012, Impact: Critical)

**Mitigations:**

- Server-side authorization enforcement for all API endpoints
- Principle of least privilege for all user roles and permissions
- Regular privilege access reviews and auditing
- Multi-factor authentication for all administrative accounts
- Zero-trust security model implementation

## Attack Tree 3: Insider Threats

### Root Goal: Leverage Insider Access to Compromise Reproductive Health Data

```
Insider Threat Attacks
├── 1. Malicious Insider Actions [OR]
│   ├── 1.1 Employee Data Theft [OR]
│   │   ├── 1.1.1 Direct Database Access Abuse
│   │   │   ├── 1.1.1.1 DBA Credential Abuse (Probability: 0.05, Impact: Critical)
│   │   │   ├── 1.1.1.2 Production Database Querying (Probability: 0.08, Impact: Critical)
│   │   │   └── 1.1.1.3 Database Backup Theft (Probability: 0.06, Impact: Critical)
│   │   ├── 1.1.2 Application-Level Data Access
│   │   │   ├── 1.1.2.1 Admin Panel Data Export (Probability: 0.1, Impact: High)
│   │   │   ├── 1.1.2.2 API Credential Abuse (Probability: 0.12, Impact: High)
│   │   │   └── 1.1.2.3 Service Account Impersonation (Probability: 0.08, Impact: High)
│   │   └── 1.1.3 System-Level Data Extraction
│   │       ├── 1.1.3.1 Server File System Access (Probability: 0.07, Impact: High)
│   │       ├── 1.1.3.2 Memory Dump Creation (Probability: 0.04, Impact: Medium)
│   │       └── 1.1.3.3 Network Traffic Capture (Probability: 0.06, Impact: Medium)
│   ├── 1.2 System Sabotage [OR]
│   │   ├── 1.2.1 Data Destruction
│   │   │   ├── 1.2.1.1 Database Table Deletion (Probability: 0.03, Impact: Critical)
│   │   │   ├── 1.2.1.2 Backup Destruction (Probability: 0.04, Impact: Critical)
│   │   │   └── 1.2.1.3 Selective Record Deletion (Probability: 0.05, Impact: High)
│   │   ├── 1.2.2 Service Disruption
│   │   │   ├── 1.2.2.1 Server Configuration Changes (Probability: 0.06, Impact: High)
│   │   │   ├── 1.2.2.2 Network Configuration Disruption (Probability: 0.04, Impact: High)
│   │   │   └── 1.2.2.3 Resource Exhaustion Attacks (Probability: 0.05, Impact: Medium)
│   │   └── 1.2.3 Security Control Bypass
│   │       ├── 1.2.3.1 Audit Log Deletion (Probability: 0.07, Impact: Critical)
│   │       ├── 1.2.3.2 Security Policy Modification (Probability: 0.05, Impact: High)
│   │       └── 1.2.3.3 Access Control Manipulation (Probability: 0.06, Impact: High)
│   └── 1.3 Espionage and Intelligence Gathering [OR]
│       ├── 1.3.1 Competitive Intelligence
│       │   ├── 1.3.1.1 User Pattern Analysis (Probability: 0.08, Impact: High)
│       │   ├── 1.3.1.2 Business Metric Extraction (Probability: 0.1, Impact: Medium)
│       │   └── 1.3.1.3 Feature Usage Statistics (Probability: 0.12, Impact: Low)
│       ├── 1.3.2 Legal/Political Intelligence
│       │   ├── 1.3.2.1 Geographic Usage Patterns (Probability: 0.06, Impact: Critical)
│       │   ├── 1.3.2.2 Demographic Health Data (Probability: 0.04, Impact: Critical)
│       │   └── 1.3.2.3 Policy Violation Evidence (Probability: 0.03, Impact: Critical)
│       └── 1.3.3 Personal Vendetta
│           ├── 1.3.3.1 Specific User Targeting (Probability: 0.05, Impact: Critical)
│           ├── 1.3.3.2 Data Exposure Threats (Probability: 0.04, Impact: Critical)
│           └── 1.3.3.3 Blackmail Material Collection (Probability: 0.02, Impact: Critical)
│
├── 2. Compromised Insider Accounts [AND]
│   ├── 2.1 External Compromise of Internal Accounts [OR]
│   │   ├── 2.1.1 Credential-Based Compromise
│   │   │   ├── 2.1.1.1 Phishing Attacks on Employees (Probability: 0.25, Impact: High)
│   │   │   ├── 2.1.1.2 Credential Stuffing Employee Accounts (Probability: 0.15, Impact: High)
│   │   │   ├── 2.1.1.3 Password Spraying Internal Systems (Probability: 0.2, Impact: Medium)
│   │   │   └── 2.1.1.4 Social Engineering for Credentials (Probability: 0.18, Impact: High)
│   │   ├── 2.1.2 Device Compromise
│   │   │   ├── 2.1.2.1 Work Device Malware Infection (Probability: 0.12, Impact: High)
│   │   │   ├── 2.1.2.2 Remote Access Tool Abuse (Probability: 0.08, Impact: High)
│   │   │   └── 2.1.2.3 USB/Physical Media Attacks (Probability: 0.06, Impact: Medium)
│   │   └── 2.1.3 Network-Based Attacks
│   │       ├── 2.1.3.1 Wi-Fi Network Compromise (Probability: 0.1, Impact: Medium)
│   │       ├── 2.1.3.2 VPN Session Hijacking (Probability: 0.04, Impact: High)
│   │       └── 2.1.3.3 Corporate Network Lateral Movement (Probability: 0.06, Impact: High)
│   ├── 2.2 Privilege Escalation from Compromised Account [AND]
│   │   ├── 2.2.1 Local Privilege Escalation (Probability: 0.4, Impact: High)
│   │   ├── 2.2.2 Active Directory Escalation (Probability: 0.3, Impact: Critical)
│   │   └── 2.2.3 Cloud Platform Escalation (Probability: 0.2, Impact: High)
│   └── 2.3 Data Access from Compromised Position [AND]
│       ├── 2.3.1 Direct System Access (Probability: 0.8, Impact: Critical)
│       ├── 2.3.2 Credential Harvesting (Probability: 0.6, Impact: High)
│       └── 2.3.3 Lateral Movement (Probability: 0.5, Impact: High)
│
└── 3. Third-Party Insider Threats [OR]
    ├── 3.1 Vendor/Contractor Abuse [OR]
    │   ├── 3.1.1 Cloud Service Provider Access
    │   │   ├── 3.1.1.1 Supabase Employee Access Abuse (Probability: 0.01, Impact: Critical)
    │   │   ├── 3.1.1.2 Cloud Platform Support Access (Probability: 0.005, Impact: Critical)
    │   │   └── 3.1.1.3 Infrastructure Provider Backdoors (Probability: 0.002, Impact: Critical)
    │   ├── 3.1.2 Third-Party Development Access
    │   │   ├── 3.1.2.1 Contractor Code Repository Access (Probability: 0.08, Impact: High)
    │   │   ├── 3.1.2.2 Development Environment Access (Probability: 0.1, Impact: High)
    │   │   └── 3.1.2.3 Production Deployment Access (Probability: 0.04, Impact: Critical)
    │   └── 3.1.3 Security Vendor Access
    │       ├── 3.1.3.1 Security Tool Provider Backdoors (Probability: 0.01, Impact: High)
    │       ├── 3.1.3.2 Audit Firm Data Access (Probability: 0.02, Impact: High)
    │       └── 3.1.3.3 Penetration Testing Data Retention (Probability: 0.03, Impact: Medium)
    ├── 3.2 Supply Chain Insider Threats [OR]
    │   ├── 3.2.1 Software Supply Chain
    │   │   ├── 3.2.1.1 Malicious Package Maintainer (Probability: 0.01, Impact: High)
    │   │   ├── 3.2.1.2 Compromised Package Repository (Probability: 0.005, Impact: Critical)
    │   │   └── 3.2.1.3 Build Tool Chain Compromise (Probability: 0.008, Impact: High)
    │   ├── 3.2.2 Hardware Supply Chain
    │   │   ├── 3.2.2.1 Server Hardware Backdoors (Probability: 0.002, Impact: Critical)
    │   │   └── 3.2.2.2 Network Equipment Compromises (Probability: 0.003, Impact: High)
    │   └── 3.2.3 Service Supply Chain
    │       ├── 3.2.3.1 CDN Provider Compromise (Probability: 0.01, Impact: High)
    │       ├── 3.2.3.2 Monitoring Service Backdoors (Probability: 0.005, Impact: Medium)
    │       └── 3.2.3.3 Analytics Provider Data Access (Probability: 0.02, Impact: High)
    └── 3.3 Business Partner Access Abuse [OR]
        ├── 3.3.1 Healthcare Integration Partners
        │   ├── 3.3.1.1 EHR Integration Abuse (Probability: 0.03, Impact: Critical)
        │   ├── 3.3.1.2 Healthcare API Partner Breach (Probability: 0.02, Impact: High)
        │   └── 3.3.1.3 Medical Device Integration Compromise (Probability: 0.01, Impact: High)
        ├── 3.3.2 Marketing and Analytics Partners
        │   ├── 3.3.2.1 Analytics Provider Overreach (Probability: 0.05, Impact: High)
        │   ├── 3.3.2.2 Advertising Platform Data Mining (Probability: 0.08, Impact: Medium)
        │   └── 3.3.2.3 Social Media Integration Abuse (Probability: 0.06, Impact: Medium)
        └── 3.3.3 Financial and Payment Partners
            ├── 3.3.3.1 Payment Processor Data Correlation (Probability: 0.02, Impact: High)
            ├── 3.3.3.2 Subscription Service Data Sharing (Probability: 0.03, Impact: Medium)
            └── 3.3.3.3 Financial Institution Cross-Reference (Probability: 0.01, Impact: High)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Phishing Employee → AD Escalation → Direct Database Access** (Overall Probability: 0.06, Impact: Critical)
2. **DBA Credential Abuse → Production Database Access** (Overall Probability: 0.05, Impact: Critical)

**Mitigations:**

- Zero-trust architecture with continuous verification
- Privileged access management (PAM) with session recording
- Behavioral analytics for insider threat detection
- Data loss prevention (DLP) with health data classification
- Regular access reviews and least privilege enforcement

## Server Breach Prioritization Matrix

### Risk Scoring Summary

| Attack Vector                       | Max Risk Score | Primary Mitigation                   | Implementation Priority |
| ----------------------------------- | -------------- | ------------------------------------ | ----------------------- |
| **Database Credential Compromise**  | 270            | Strong auth + MFA + monitoring       | Critical                |
| **BOLA via Missing Authorization**  | 200            | Server-side authorization checks     | Critical                |
| **Phishing → Privilege Escalation** | 180            | Security awareness + PAM             | High                    |
| **SQL Injection → RLS Bypass**      | 126            | Parameterized queries + testing      | High                    |
| **Insider DBA Access Abuse**        | 150            | Zero-knowledge + activity monitoring | High                    |

### Implementation Recommendations

**Critical Priority (Immediate):**

1. **Database Security Hardening**
   - Multi-factor authentication for all database access
   - Network segmentation and access controls
   - Database activity monitoring and alerting
   - Regular RLS policy auditing and testing

2. **API Authorization Security**
   - Server-side authorization for all endpoints
   - BOLA/BFLA testing and prevention
   - JWT security hardening and monitoring
   - API security testing automation

3. **Zero-Trust Architecture**
   - Continuous authentication and authorization
   - Network micro-segmentation
   - Device compliance verification
   - Session monitoring and anomaly detection

**High Priority (Within Sprint):**

1. **Insider Threat Protection**
   - Privileged access management implementation
   - Data loss prevention with health data classification
   - User behavior analytics and monitoring
   - Access review and certification processes

2. **Supply Chain Security**
   - Third-party security assessment requirements
   - Vendor access monitoring and controls
   - Software supply chain validation
   - Business partner data access agreements

**Medium Priority (Within Epic):**

1. **Advanced Threat Detection**
   - Machine learning-based anomaly detection
   - Behavioral analytics for privilege escalation
   - Advanced persistent threat (APT) detection
   - Automated incident response workflows

2. **Defense in Depth**
   - Multi-layered security controls
   - Redundant authentication mechanisms
   - Distributed monitoring and alerting
   - Disaster recovery and business continuity

This comprehensive server breach analysis provides systematic threat modeling for server-side attacks, enabling targeted security control implementation based on risk assessment and attack path prioritization, with special consideration for the zero-knowledge architecture protecting reproductive health data.
