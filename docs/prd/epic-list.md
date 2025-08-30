# Epic List

**Epic 0: Project Foundation** (NEW - CRITICAL BLOCKER RESOLUTION)
Establish complete development environment with Nx monorepo scaffolding, external service provisioning (Supabase/Vercel/Sentry), Rust/WASM build pipeline integration, and CI/CD foundation. Includes critical USER TASKS for service account setup before any development can proceed.

**Epic 1: Foundation & Privacy Infrastructure** (UPDATED - DATABASE FIRST)
Establish secure database infrastructure with RLS policies, then build Rust/WASM crypto core with memory hygiene (zeroize), Passkeys + OPAQUE authentication, key rotation skeleton, and health-check demo validating end-to-end encryption with rotation testing.

**Epic 2: Core Cycle Tracking & Predictions** (WAS EPIC 1)
Implement SQLCipher/Realm-encrypted local database with duress wipe & auto-lock, probabilistic prediction with calibration metrics (Brier/NLL) and decision regret analysis, plus offline-first sync skeleton with separate P2P/backup keys.

**Epic 3: Stealth Mode & Adaptive UI** (WAS EPIC 2)
Create stealth skin with duress PIN, neutral time-shifted notifications, uncertainty visualization with "why this signal" explanations (on-device), and foundation A11y + i18n (RTL) support.

**Epic 4: Selective Healthcare Sharing** (WAS EPIC 3)
Build libsignal-based sharing links (time/single-use/scope limited), doctor export with PDF/CSV + FHIR schemas (PII-filtered), plus revocation and privacy-safe access logging.

**Epic 5: Supply-chain & Threat Modeling** (WAS EPIC 0 - MOVED TO END)
Advanced security hardening with SLSA compliance, SBOM generation, Sigstore attestation, comprehensive threat model with advanced RLS policies, and CSP/SRI/Trusted Types for production security.

**Dependencies:** (UPDATED SEQUENCE)

- Epic 1 → Epic 0's project scaffolding and external services ready
- Epic 2 → Epic 1's database + Rust crypto + key management ready  
- Epic 3 → Epic 2's uncertainty API complete
- Epic 4 → Epic 1's identity + Epic 2's data model established

**CRITICAL PATH CHANGES:**
- Added Epic 0 as foundation blocker - no development possible without it
- Epic 1 now starts with database setup before crypto implementation
- User must complete external service setup in Epic 0.3 before any Epic 1 work

**Security Gates (Definition of Done for each Epic):**

- Crypto envelope implemented (v/alg/kdf/salt/nonce/kid)
- Argon2id parameter set configured and tested
- E2E test: pcap payload contains only encrypted data
- Fuzz + property tests passing; logs contain no PII
- RLS tests passing, SSR-PII disabled, privacy review approved

**Non-goals for MVP:**

- Telemetry/analytics (optional, DP-enabled later)
- Homomorphic/TEE, Tor/traffic-shaping (advanced phase)
