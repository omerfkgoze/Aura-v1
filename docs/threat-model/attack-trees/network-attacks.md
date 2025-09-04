# Network Attack Trees

## Overview

This document presents comprehensive attack trees for network-based attacks targeting the Aura reproductive health application. Network attacks represent a significant threat vector for intercepting encrypted reproductive health data and compromising communication channels.

## Attack Tree 1: Man-in-the-Middle (MITM) Attacks

### Root Goal: Intercept and Decrypt Reproductive Health Data in Transit

```
MITM Attack
├── 1. Network Position Achievement [OR]
│   ├── 1.1 Wi-Fi Network Compromise [OR]
│   │   ├── 1.1.1 Rogue Access Point
│   │   │   ├── 1.1.1.1 Evil Twin AP (Probability: 0.6, Impact: High)
│   │   │   ├── 1.1.1.2 Public Wi-Fi Exploitation (Probability: 0.8, Impact: High)
│   │   │   └── 1.1.1.3 Captive Portal Manipulation (Probability: 0.4, Impact: Medium)
│   │   ├── 1.1.2 Legitimate AP Compromise
│   │   │   ├── 1.1.2.1 Router Admin Access (Probability: 0.3, Impact: High)
│   │   │   ├── 1.1.2.2 Firmware Exploitation (Probability: 0.2, Impact: Critical)
│   │   │   └── 1.1.2.3 WPS Pin Attack (Probability: 0.4, Impact: Medium)
│   │   └── 1.1.3 Network Protocol Attacks
│   │       ├── 1.1.3.1 ARP Spoofing (Probability: 0.7, Impact: High)
│   │       ├── 1.1.3.2 DHCP Spoofing (Probability: 0.5, Impact: Medium)
│   │       └── 1.1.3.3 DNS Spoofing (Probability: 0.6, Impact: High)
│   ├── 1.2 Cellular Network Compromise [OR]
│   │   ├── 1.2.1 IMSI Catcher Deployment
│   │   │   ├── 1.2.1.1 Stingray/Cell Tower Spoofing (Probability: 0.1, Impact: Critical)
│   │   │   └── 1.2.1.2 Femtocell Compromise (Probability: 0.05, Impact: High)
│   │   ├── 1.2.2 SS7 Network Exploitation
│   │   │   ├── 1.2.2.1 Location Tracking (Probability: 0.02, Impact: High)
│   │   │   └── 1.2.2.2 Call/SMS Interception (Probability: 0.01, Impact: Medium)
│   │   └── 1.2.3 5G/LTE Vulnerabilities
│   │       ├── 1.2.3.1 Protocol Downgrade Attacks (Probability: 0.1, Impact: Medium)
│   │       └── 1.2.3.2 Baseband Exploitation (Probability: 0.02, Impact: Critical)
│   └── 1.3 ISP/Backbone Compromise [OR]
│       ├── 1.3.1 BGP Hijacking (Probability: 0.01, Impact: Critical)
│       ├── 1.3.2 DNS Resolver Compromise (Probability: 0.05, Impact: High)
│       └── 1.3.3 Transit Provider Compromise (Probability: 0.02, Impact: Critical)
│
├── 2. TLS/SSL Interception [AND]
│   ├── 2.1 Certificate Authority Compromise [OR]
│   │   ├── 2.1.1 Rogue CA Certificates
│   │   │   ├── 2.1.1.1 Malicious Root CA Installation (Probability: 0.3, Impact: Critical)
│   │   │   ├── 2.1.1.2 Compromised Enterprise CA (Probability: 0.2, Impact: High)
│   │   │   └── 2.1.1.3 Nation-State CA Abuse (Probability: 0.05, Impact: Critical)
│   │   ├── 2.1.2 Certificate Pinning Bypass
│   │   │   ├── 2.1.2.1 Root/Jailbreak Certificate Manipulation (Probability: 0.4, Impact: High)
│   │   │   ├── 2.1.2.2 App Patching/Modification (Probability: 0.3, Impact: High)
│   │   │   └── 2.1.2.3 Runtime Hook/Frida Bypass (Probability: 0.6, Impact: Medium)
│   │   └── 2.1.3 Domain Validation Attacks
│   │       ├── 2.1.3.1 DNS Hijacking for Domain Control (Probability: 0.2, Impact: High)
│   │       └── 2.1.3.2 ACME Challenge Manipulation (Probability: 0.1, Impact: Medium)
│   ├── 2.2 Protocol Downgrade Attacks [OR]
│   │   ├── 2.2.1 TLS Version Downgrade (Probability: 0.3, Impact: Medium)
│   │   ├── 2.2.2 Cipher Suite Downgrade (Probability: 0.4, Impact: Medium)
│   │   └── 2.2.3 Perfect Forward Secrecy Bypass (Probability: 0.2, Impact: High)
│   └── 2.3 Application-Layer Attacks [OR]
│       ├── 2.3.1 HTTP Parameter Pollution (Probability: 0.3, Impact: Low)
│       ├── 2.3.2 Session Token Manipulation (Probability: 0.4, Impact: High)
│       └── 2.3.3 API Request Manipulation (Probability: 0.5, Impact: Medium)
│
└── 3. Data Interception and Analysis [AND]
    ├── 3.1 Traffic Capture (Probability: 0.9, Impact: Medium)
    ├── 3.2 Pattern Analysis [OR]
    │   ├── 3.2.1 Timing Analysis (Probability: 0.8, Impact: High)
    │   ├── 3.2.2 Size Analysis (Probability: 0.7, Impact: Medium)
    │   └── 3.2.3 Frequency Analysis (Probability: 0.6, Impact: Medium)
    └── 3.3 Decryption Attempts [OR]
        ├── 3.3.1 Known Plaintext Attacks (Probability: 0.2, Impact: High)
        ├── 3.3.2 Side-channel Analysis (Probability: 0.1, Impact: Critical)
        └── 3.3.3 Brute Force Attacks (Probability: 0.01, Impact: Low)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Public Wi-Fi → Rogue CA → Traffic Capture** (Overall Probability: 0.216, Impact: Critical)
2. **ARP Spoofing → Certificate Pinning Bypass → Session Manipulation** (Overall Probability: 0.112, Impact: High)

**Mitigations:**

- Certificate pinning with backup pins and CA pinning
- Network security validation and public Wi-Fi warnings
- Perfect Forward Secrecy (PFS) for all connections
- Traffic padding and timing obfuscation
- Certificate Transparency monitoring

## Attack Tree 2: Certificate Pinning Bypass

### Root Goal: Bypass Certificate Pinning to Enable Traffic Interception

```
Certificate Pinning Bypass
├── 1. Client-Side Manipulation [OR]
│   ├── 1.1 Application Modification [OR]
│   │   ├── 1.1.1 Static Analysis and Patching
│   │   │   ├── 1.1.1.1 APK/IPA Reverse Engineering (Probability: 0.7, Impact: High)
│   │   │   ├── 1.1.1.2 Binary Patching (Probability: 0.5, Impact: High)
│   │   │   └── 1.1.1.3 Code Injection (Probability: 0.4, Impact: Medium)
│   │   ├── 1.1.2 Runtime Modification [OR]
│   │   │   ├── 1.1.2.1 Frida/Objection Hooking (Probability: 0.8, Impact: High)
│   │   │   ├── 1.1.2.2 Xposed Framework (Android) (Probability: 0.6, Impact: High)
│   │   │   └── 1.1.2.3 Cycript (iOS) (Probability: 0.4, Impact: Medium)
│   │   └── 1.1.3 Library Replacement
│   │       ├── 1.1.3.1 SSL Library Substitution (Probability: 0.3, Impact: Critical)
│   │       └── 1.1.3.2 Network Stack Modification (Probability: 0.2, Impact: Critical)
│   ├── 1.2 System-Level Bypass [OR]
│   │   ├── 1.2.1 Certificate Store Manipulation
│   │   │   ├── 1.2.1.1 Root CA Installation (Probability: 0.6, Impact: Critical)
│   │   │   ├── 1.2.1.2 System Certificate Addition (Probability: 0.4, Impact: High)
│   │   │   └── 1.2.1.3 User Certificate Trust (Probability: 0.8, Impact: Medium)
│   │   ├── 1.2.2 Network Configuration Changes
│   │   │   ├── 1.2.2.1 Proxy Configuration (Probability: 0.7, Impact: High)
│   │   │   ├── 1.2.2.2 VPN with Certificate Injection (Probability: 0.5, Impact: High)
│   │   │   └── 1.2.2.3 DNS over HTTPS Bypass (Probability: 0.3, Impact: Medium)
│   │   └── 1.2.3 Device Compromise Prerequisites
│   │       ├── 1.2.3.1 Root/Jailbreak Access (Probability: 0.3, Impact: Critical)
│   │       └── 1.2.3.2 Developer/Debug Mode (Probability: 0.4, Impact: High)
│   └── 1.3 Social Engineering [OR]
│       ├── 1.3.1 User Certificate Installation
│       │   ├── 1.3.1.1 Fake Security Update (Probability: 0.4, Impact: High)
│       │   ├── 1.3.1.2 Corporate Policy Deception (Probability: 0.3, Impact: High)
│       │   └── 1.3.1.3 Technical Support Impersonation (Probability: 0.5, Impact: Medium)
│       └── 1.3.2 App Installation Deception
│           ├── 1.3.2.1 Fake App Store Presence (Probability: 0.2, Impact: Critical)
│           └── 1.3.2.2 Sideloading Encouragement (Probability: 0.3, Impact: High)
│
├── 2. Network-Level Attacks [OR]
│   ├── 2.1 DNS Manipulation [OR]
│   │   ├── 2.1.1 DNS Cache Poisoning (Probability: 0.2, Impact: High)
│   │   ├── 2.1.2 DNS Resolver Compromise (Probability: 0.1, Impact: Critical)
│   │   └── 2.1.3 DNS-over-HTTPS Interception (Probability: 0.15, Impact: Medium)
│   ├── 2.2 BGP/Routing Attacks [OR]
│   │   ├── 2.2.1 BGP Route Hijacking (Probability: 0.01, Impact: Critical)
│   │   └── 2.2.2 AS-Path Manipulation (Probability: 0.005, Impact: High)
│   └── 2.3 CDN/Edge Compromise [OR]
│       ├── 2.3.1 CDN Node Compromise (Probability: 0.02, Impact: Critical)
│       └── 2.3.2 Edge Certificate Injection (Probability: 0.01, Impact: High)
│
└── 3. Implementation Weaknesses [OR]
    ├── 3.1 Pinning Logic Flaws
    │   ├── 3.1.1 Weak Pin Validation (Probability: 0.3, Impact: High)
    │   ├── 3.1.2 Pin Backup Failures (Probability: 0.2, Impact: Medium)
    │   └── 3.1.3 Certificate Chain Validation Bypass (Probability: 0.4, Impact: High)
    ├── 3.2 Exception Handling Flaws
    │   ├── 3.2.1 Silent Pin Failure (Probability: 0.5, Impact: Critical)
    │   ├── 3.2.2 Fallback to Non-Pinned Connection (Probability: 0.3, Impact: High)
    │   └── 3.2.3 Debug Mode Pin Bypass (Probability: 0.6, Impact: Medium)
    └── 3.3 Update Mechanism Vulnerabilities
        ├── 3.3.1 Pin Update Without Validation (Probability: 0.2, Impact: High)
        ├── 3.3.2 Rollback Attack Susceptibility (Probability: 0.1, Impact: Medium)
        └── 3.3.3 Emergency Pin Override Abuse (Probability: 0.05, Impact: Critical)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Frida Hooking → Silent Pin Failure → Traffic Interception** (Overall Probability: 0.4, Impact: Critical)
2. **Root CA Installation → Weak Pin Validation → Data Access** (Overall Probability: 0.18, Impact: Critical)

**Mitigations:**

- Multi-layered certificate pinning (cert, public key, CA pinning)
- Certificate pinning with backup mechanisms and rotation
- Runtime application protection against hooking frameworks
- Certificate transparency monitoring and validation
- Network security state monitoring and alerting

## Attack Tree 3: DNS Hijacking

### Root Goal: Redirect Network Traffic via DNS Manipulation

```
DNS Hijacking Attack
├── 1. DNS Infrastructure Compromise [OR]
│   ├── 1.1 DNS Resolver Attacks [OR]
│   │   ├── 1.1.1 ISP DNS Compromise
│   │   │   ├── 1.1.1.1 DNS Server Compromise (Probability: 0.1, Impact: High)
│   │   │   ├── 1.1.1.2 DNS Cache Poisoning (Probability: 0.2, Impact: Medium)
│   │   │   └── 1.1.1.3 DNS Response Injection (Probability: 0.3, Impact: Medium)
│   │   ├── 1.1.2 Public DNS Service Attacks
│   │   │   ├── 1.1.2.1 Google/Cloudflare DNS Compromise (Probability: 0.01, Impact: Critical)
│   │   │   └── 1.1.2.2 Alternative DNS Provider Compromise (Probability: 0.05, Impact: High)
│   │   └── 1.1.3 Local DNS Resolver Compromise
│   │       ├── 1.1.3.1 Router DNS Settings Modification (Probability: 0.4, Impact: High)
│   │       ├── 1.1.3.2 DHCP DNS Server Manipulation (Probability: 0.5, Impact: Medium)
│   │       └── 1.1.3.3 Host File Modification (Probability: 0.6, Impact: Low)
│   ├── 1.2 Authoritative DNS Server Attacks [OR]
│   │   ├── 1.2.1 Domain Registrar Compromise
│   │   │   ├── 1.2.1.1 Registrar Account Hijacking (Probability: 0.05, Impact: Critical)
│   │   │   └── 1.2.1.2 Registrar Infrastructure Breach (Probability: 0.02, Impact: Critical)
│   │   ├── 1.2.2 DNS Hosting Provider Attacks
│   │   │   ├── 1.2.2.1 Cloudflare/Route53 Account Compromise (Probability: 0.03, Impact: Critical)
│   │   │   └── 1.2.2.2 DNS Zone File Modification (Probability: 0.04, Impact: High)
│   │   └── 1.2.3 Name Server Compromise
│   │       ├── 1.2.3.1 Primary Name Server Breach (Probability: 0.02, Impact: Critical)
│   │       └── 1.2.3.2 Secondary Name Server Manipulation (Probability: 0.03, Impact: High)
│   └── 1.3 Protocol-Level Attacks [OR]
│       ├── 1.3.1 DNS-over-HTTPS (DoH) Bypass
│       │   ├── 1.3.1.1 DoH Resolver Compromise (Probability: 0.02, Impact: High)
│       │   └── 1.3.1.2 DoH Traffic Interception (Probability: 0.1, Impact: Medium)
│       ├── 1.3.2 DNS-over-TLS (DoT) Attacks
│       │   ├── 1.3.2.1 DoT Resolver Certificate Compromise (Probability: 0.03, Impact: High)
│       │   └── 1.3.2.2 DoT Downgrade Attacks (Probability: 0.2, Impact: Medium)
│       └── 1.3.3 DNSSEC Bypass
│           ├── 1.3.3.1 Key Signing Key Compromise (Probability: 0.005, Impact: Critical)
│           └── 1.3.3.2 DNSSEC Validation Bypass (Probability: 0.1, Impact: High)
│
├── 2. Network Position for DNS Interception [AND]
│   ├── 2.1 Network Access Achievement [OR]
│   │   ├── 2.1.1 Local Network Compromise
│   │   │   ├── 2.1.1.1 Wi-Fi Network Access (Probability: 0.7, Impact: Medium)
│   │   │   ├── 2.1.1.2 Ethernet Network Access (Probability: 0.3, Impact: Medium)
│   │   │   └── 2.1.1.3 Network Device Compromise (Probability: 0.2, Impact: High)
│   │   ├── 2.1.2 ISP Infrastructure Access
│   │   │   ├── 2.1.2.1 ISP Employee Access (Probability: 0.02, Impact: Critical)
│   │   │   └── 2.1.2.2 ISP System Compromise (Probability: 0.01, Impact: Critical)
│   │   └── 2.1.3 Internet Exchange Point Access
│   │       ├── 2.1.3.1 IXP Compromise (Probability: 0.005, Impact: Critical)
│   │       └── 2.1.3.2 Transit Provider Compromise (Probability: 0.01, Impact: Critical)
│   ├── 2.2 DNS Query Interception [AND]
│   │   ├── 2.2.1 Packet Capture (Probability: 0.9, Impact: Low)
│   │   ├── 2.2.2 Query Analysis (Probability: 0.8, Impact: Medium)
│   │   └── 2.2.3 Response Injection (Probability: 0.6, Impact: High)
│   └── 2.3 Traffic Redirection Setup [AND]
│       ├── 2.3.1 Malicious Server Deployment (Probability: 0.8, Impact: High)
│       ├── 2.3.2 Certificate Acquisition (Probability: 0.4, Impact: Critical)
│       └── 2.3.3 Service Impersonation (Probability: 0.7, Impact: Critical)
│
└── 3. Attack Execution and Data Harvesting [AND]
    ├── 3.1 Domain Resolution Redirection (Probability: 0.9, Impact: Critical)
    ├── 3.2 Malicious Service Hosting [OR]
    │   ├── 3.2.1 Phishing Site Deployment (Probability: 0.8, Impact: High)
    │   ├── 3.2.2 Malicious App Distribution (Probability: 0.6, Impact: Critical)
    │   └── 3.2.3 Data Collection Service (Probability: 0.9, Impact: Critical)
    └── 3.3 User Data Collection [AND]
        ├── 3.3.1 Credential Harvesting (Probability: 0.7, Impact: Critical)
        ├── 3.3.2 Session Token Capture (Probability: 0.8, Impact: High)
        └── 3.3.3 Health Data Interception (Probability: 0.5, Impact: Critical)
```

### Risk Assessment

**Critical Risk Paths:**

1. **Router DNS Modification → Traffic Redirection → Data Collection** (Overall Probability: 0.2016, Impact: Critical)
2. **Public DNS Compromise → Service Impersonation → Credential Harvesting** (Overall Probability: 0.01568, Impact: Critical)

**Mitigations:**

- DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT) enforcement
- DNSSEC validation where available
- Certificate pinning to prevent impersonation
- Network security monitoring for DNS anomalies
- Multiple DNS resolver validation

## Network Attack Prioritization Matrix

### Risk Scoring Summary

| Attack Vector                  | Max Risk Score | Primary Mitigation                    | Implementation Priority |
| ------------------------------ | -------------- | ------------------------------------- | ----------------------- |
| **MITM via Public Wi-Fi**      | 216            | Certificate pinning + Wi-Fi warnings  | Critical                |
| **Certificate Pinning Bypass** | 400            | Multi-layered pinning + RASP          | Critical                |
| **DNS Hijacking via Router**   | 201.6          | DoH enforcement + monitoring          | High                    |
| **Cellular Network MITM**      | 50             | Certificate transparency + monitoring | Medium                  |
| **BGP Hijacking**              | 25             | Certificate pinning + monitoring      | Low                     |

### Implementation Recommendations

**Critical Priority (Immediate):**

1. **Enhanced Certificate Pinning**
   - Multiple pin types (certificate, public key, CA)
   - Backup pin mechanisms with secure updates
   - Certificate Transparency monitoring integration

2. **Network Security Validation**
   - Public Wi-Fi detection and warnings
   - Network trust scoring based on connection type
   - VPN recommendation for untrusted networks

3. **Runtime Application Protection**
   - Anti-hooking mechanisms against Frida/Xposed
   - Binary integrity verification
   - Runtime tampering detection

**High Priority (Within Sprint):**

1. **DNS Security Implementation**
   - DNS-over-HTTPS (DoH) enforcement
   - DNSSEC validation where supported
   - DNS response validation and monitoring

2. **Traffic Analysis Protection**
   - Traffic padding to prevent size analysis
   - Timing randomization for requests
   - Decoy traffic generation

**Medium Priority (Within Epic):**

1. **Advanced Network Monitoring**
   - Certificate transparency log monitoring
   - DNS resolution anomaly detection
   - Network path validation

2. **Perfect Forward Secrecy**
   - Ephemeral key exchange for all connections
   - Session key rotation policies
   - Post-quantum cryptography preparation

This comprehensive network attack analysis provides systematic threat modeling for network-based attacks, enabling targeted security control implementation based on risk assessment and attack path prioritization.
