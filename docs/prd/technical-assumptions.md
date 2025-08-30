# Technical Assumptions

## Repository Structure: Monorepo

Monorepo structure using **Nx/Turborepo + pnpm** for efficient dependency management and build caching. Shared Rust/WASM crypto core as separate package with auto-generated TypeScript types, platform-specific apps, and common API layer. This enables maximum code reuse for security-critical components while maintaining optimal performance.

## Service Architecture

Client-first architecture with minimal server dependencies where encryption keys never touch the server. Supabase provides managed PostgreSQL with Row Level Security policies and edge functions for auxiliary services. **SSR completely disabled for any PII-related pages** to prevent server-side data exposure. Core functionality operates offline-first with optional encrypted cloud backup.

## Testing Requirements

Unit + Integration testing with **property-based testing for all cryptographic operations**. Security-critical Rust crypto core requires 100% test coverage with automated fuzzing. Integration tests validate RLS policies and zero-knowledge architecture through automated privacy audits. **Rust crypto core maintained as separate package with auto-generated TS types** ensuring type safety across language boundaries.

## Additional Technical Assumptions and Requests

**Cryptographic Architecture:**

- **Crypto envelope with metadata:** Every ciphertext includes version, algorithm, KDF params, salt, nonce, and key ID for seamless key rotation and migration
- **Argon2id parameter tuning:** Device-class specific parameters (64-256 MB memory, t=2-3 iterations) with **OS/libsodium randombytes for all RNG**
- **Per-device key management:** Keys stored in iOS Keychain/Android StrongBox with **Passkeys + one-time recovery codes** (optional Shamir secret sharing for advanced users)
- **libsignal SDK** for healthcare provider sharing, avoiding custom protocol implementation risks
- **WASM/React Native memory hygiene:** Secrets never copied to JS heap, immediate zeroization, short-lived buffers, side-channel/timing attack mitigation

**Frontend Technology Stack:**

- React Native for mobile with Rust/WASM crypto core integration and strict memory isolation
- Next.js for web with **SSR completely disabled for PII-related functionality**
- **Auto-generated TypeScript types from Rust crypto core** ensuring type safety and consistency
- Nx/Turborepo monorepo with pnpm for efficient dependency and build management

**Backend and Infrastructure:**

- Supabase managed PostgreSQL with Row Level Security as primary database
- **libsignal SDK for end-to-end encrypted sharing** with healthcare providers
- Supabase Edge Functions only for non-sensitive operations (metadata, public health statistics)
- CDN deployment with strict content security policies preventing data leakage

**Security and Privacy Architecture:**

- **Rust crypto core as separate, auditable package** with minimal dependencies and formal verification where possible
- **Crypto envelope versioning system** enabling seamless algorithm upgrades and key rotation without data loss
- **Device-specific Argon2id tuning** with performance benchmarking during initial setup
- **Hardware-backed key storage** (Keychain/StrongBox) with Passkeys as primary recovery mechanism
- **Memory safety protocols** preventing secret leakage to JavaScript heap with immediate zeroization
- Security audit requirement every 6 months with focus on Rust crypto core and libsignal integration
