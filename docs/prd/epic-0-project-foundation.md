# Epic 0: Project Foundation

**Epic Goal:** Establish the complete development environment, project scaffolding, and external service provisioning required for a greenfield privacy-focused application, ensuring all infrastructure and tooling is properly configured before feature development begins.

## Story 0.1: Monorepo Project Scaffolding and Tooling Setup

As a developer starting a greenfield project,
I want a fully configured monorepo with Nx workspace, TypeScript configuration, and build tooling,
so that I can immediately begin feature development with consistent tooling across all packages.

### Acceptance Criteria

1. **Nx Monorepo Initialization**
   - Create new Nx workspace with TypeScript preset: `npx create-nx-workspace@latest aura --preset=ts --packageManager=pnpm`
   - Configure workspace structure: `apps/` (web, mobile, api), `libs/` (shared, crypto-core, ui)
   - Set up pnpm workspaces configuration in `pnpm-workspace.yaml`
   - Configure Nx project.json files for each application and library

2. **TypeScript Configuration**
   - Root `tsconfig.base.json` with strict mode and path mapping configured
   - Per-project `tsconfig.json` extending base configuration
   - Shared types library (`libs/types`) with common interfaces
   - Configure TypeScript project references for optimal build performance

3. **Development Tooling Setup**
   - ESLint configuration with privacy-focused rules (no console.log in production)
   - Prettier with consistent formatting rules across all packages
   - Husky pre-commit hooks for linting and type checking
   - VS Code workspace settings with recommended extensions list

4. **Build System Configuration**
   - Nx build targets configured for each app (web: Vite, mobile: Metro, api: tsc)
   - Development server configurations with hot reload
   - Production build optimization settings
   - Build caching configuration for improved performance

5. **Package Management**
   - Root `package.json` with workspace scripts: `dev`, `build`, `test`, `lint`
   - Dependency management strategy (exact versions for crypto, loose for dev tools)
   - Security audit configuration: `pnpm audit --audit-level=moderate`

### Definition of Done

- [ ] Developer can run `pnpm install && pnpm dev` and see all apps running locally
- [ ] Build system produces optimized bundles for all targets
- [ ] Linting and type checking pass on empty project structure
- [ ] Git hooks prevent commits with type errors or linting failures

## Story 0.2: Development Environment Configuration

As a developer setting up the local environment,
I want comprehensive environment configuration with secure defaults and development utilities,
so that sensitive data is properly managed and development workflow is optimized.

### Acceptance Criteria

1. **Environment Variables Management**
   - `.env.example` files for each environment (development, staging, production)
   - `.env.local` for developer-specific overrides (gitignored)
   - Environment validation using Zod schemas in each app
   - Clear documentation of required vs optional environment variables

2. **Local Development Database**
   - Docker Compose configuration for local PostgreSQL instance
   - Database initialization scripts with development seed data (anonymized)
   - Local Redis instance for caching (optional, fallback to memory)
   - Database migration scripts using Supabase CLI

3. **Development Utilities**
   - Debug logging configuration (structured logging with pino)
   - Development-only debugging endpoints (health checks, crypto validation)
   - Local HTTPS setup for WebAuthn testing (using mkcert)
   - Mobile development setup (Expo CLI, Android/iOS simulators)

4. **Security Defaults**
   - Generate secure random values for JWT secrets and encryption keys
   - Configure CORS policies for development (restrictive by default)
   - Set up Content Security Policy headers for development
   - Configure secure cookie settings even in development

5. **Documentation**
   - `DEVELOPMENT.md` with complete setup instructions
   - Architecture decision records (ADRs) directory structure
   - Code style guide referencing security best practices
   - Troubleshooting guide for common setup issues

### Definition of Done

- [ ] New developer can follow README and have working environment in <30 minutes
- [ ] All environment variables are validated on app startup
- [ ] Local database can be reset and reseeded with single command
- [ ] HTTPS works locally for WebAuthn development

## Story 0.3: External Service Provisioning and Integration

As a project owner,
I want all external service accounts created and configured with proper security settings,
so that developers can integrate with production-ready infrastructure from day one.

### Acceptance Criteria

1. **Supabase Project Setup** (User Task)
   - Create new Supabase project: `https://app.supabase.com/new`
   - Configure project settings: enable Row Level Security by default
   - Generate service role key and anon key for development
   - Configure authentication providers (enable WebAuthn/Passkeys)
   - Set up database connection pooling and optimization settings

2. **Deployment Platform Setup** (User Task)
   - Create Vercel account and connect to GitHub repository
   - Configure Vercel project with environment variables
   - Set up staging and production environments
   - Configure custom domain (if applicable)

3. **Security and Monitoring Setup** (User Task)
   - Create Sentry account for error monitoring (privacy-safe configuration)
   - Configure Sentry projects for web, mobile, and API
   - Set up data scrubbing rules to prevent PII logging
   - Generate Sentry DSN keys for each environment

4. **Mobile App Store Preparation** (User Task)
   - Create Apple Developer account and App Store Connect entry
   - Create Google Play Console account and app entry
   - Generate signing certificates and store securely
   - Configure app store metadata and privacy policy links

5. **Service Integration Configuration**
   - Configure Supabase CLI with project credentials
   - Set up database migrations and RLS policies repository
   - Configure deployment pipelines with service credentials
   - Test service connectivity and authentication flows

### 🚨 CRITICAL USER TASKS (Must Complete Before Development)

**Before Any Code Can Be Written, User Must:**

1. **Supabase Setup** (15 minutes)
   - Go to https://app.supabase.com/new
   - Create account with strong password + 2FA
   - Create new project: "Aura Production"
   - **SAVE**: Database URL, Service Role Key, Anon Key
   - Enable RLS: Go to Authentication → Settings → Enable RLS by default
   - **Result**: Database ready for developer use

2. **Vercel Setup** (10 minutes)
   - Go to https://vercel.com/signup
   - Connect GitHub account
   - Import repository when ready
   - **SAVE**: Team ID and API tokens
   - **Result**: Deployment pipeline ready

3. **Sentry Setup** (10 minutes)
   - Go to https://sentry.io/signup/
   - Create organization: "Aura Privacy"
   - Create 3 projects: "aura-web", "aura-mobile", "aura-api"
   - **SAVE**: DSN keys for each project
   - Configure data scrubbing: Settings → General → Data Scrubbing → Enable all PII scrubbing
   - **Result**: Error monitoring without privacy leaks

4. **Mobile Store Preparation** (30 minutes)
   - **Apple**: Create Apple Developer account ($99/year)
   - **Google**: Create Google Play Console account ($25 one-time)
   - Reserve app names: "Aura Privacy Tracker" or similar
   - **Result**: Ready for mobile app deployment

### 🔧 DEVELOPER INTEGRATION TASKS (After User Setup)

5. **Service Integration Configuration**
   - Add service credentials to `.env.local` files
   - Test database connectivity with Supabase CLI
   - Configure deployment variables in Vercel
   - Test error reporting to Sentry
   - **Result**: All services integrated and tested

### Definition of Done

- [ ] **USER COMPLETED**: All 4 external service accounts created with credentials saved
- [ ] **DEVELOPER COMPLETED**: All services integrated with proper environment variables
- [ ] Database migrations can be applied to remote Supabase instance
- [ ] Deployment pipeline can successfully deploy to staging environment
- [ ] Error monitoring captures issues without logging sensitive data
- [ ] **BLOCKER RESOLVED**: Development can proceed with full external service support

## Story 0.4: Rust/WASM Build Pipeline Integration

As a developer implementing cryptographic features,
I want a fully configured Rust/WASM build pipeline integrated into the monorepo,
so that cryptographic operations are compiled and available for TypeScript consumption.

### Acceptance Criteria

1. **Rust Project Structure**
   - Create `libs/crypto-core` directory with Cargo workspace
   - Configure `Cargo.toml` with WebAssembly target and dependencies:
     - `getrandom = { version = "0.2", features = ["js"] }`
     - `wasm-bindgen = "0.2"`
     - `libsodium-sys` for crypto operations
   - Set up proper memory management with `wee_alloc`

2. **WASM Build Configuration**
   - Install `wasm-pack`: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
   - Configure build targets in `package.json`: `bundler`, `web`, `nodejs`
   - Set up TypeScript definitions generation: `wasm-bindgen` with `--typescript`
   - Configure build optimization: `wasm-opt -O3` for production builds
   - Add build scripts: `"build:wasm": "wasm-pack build --target bundler --out-dir pkg"`

3. **Nx Integration**
   - Create `libs/crypto-core/project.json` with custom executor:

   ```json
   {
     "targets": {
       "build": {
         "executor": "@nx/js:tsc",
         "dependsOn": ["build-wasm"]
       },
       "build-wasm": {
         "executor": "nx:run-commands",
         "options": {
           "command": "wasm-pack build --target bundler",
           "cwd": "libs/crypto-core"
         }
       }
     }
   }
   ```

   - Configure dependency graph: `apps/web` and `apps/mobile` depend on `crypto-core`
   - Set up watch mode: `nx run crypto-core:build-wasm --watch`
   - Integrate WASM build into main builds via `dependsOn` configuration

4. **Development Workflow**
   - Hot reload support for Rust changes during development
   - Source map generation for debugging WebAssembly
   - Automated testing of Rust code with `cargo test`
   - Integration testing of WASM bindings in TypeScript

5. **Security Configuration**
   - Configure `wasm-opt` for size and security optimization
   - Set up constant-time operation verification
   - Configure memory sanitization for development builds
   - Set up automated security audit of Rust dependencies

### Definition of Done

- [ ] `pnpm nx build crypto-core` produces WASM module with TypeScript bindings in `libs/crypto-core/pkg/`
- [ ] Web and mobile apps can import: `import { encrypt, decrypt } from '@aura/crypto-core'`
- [ ] Rust tests pass: `nx run crypto-core:test` (using `cargo test`)
- [ ] Build pipeline includes `wasm-opt` security optimization
- [ ] **BLOCKER 4 RESOLVED**: Crypto core compilation integrated into monorepo build system

## Story 0.5: CI/CD Pipeline Foundation

As a development team,
I want automated continuous integration and deployment pipelines,
so that code quality is maintained and deployments are secure and consistent.

### Acceptance Criteria

1. **GitHub Actions Workflow Configuration**
   - Security audit workflow (dependency scanning, secrets detection)
   - Test workflow (unit, integration, e2e tests across all packages)
   - Build verification workflow (ensure all targets build successfully)
   - Deployment workflow (automated staging deployment on PR, production on merge)

2. **Code Quality Gates**
   - TypeScript compilation check across all packages
   - ESLint and Prettier formatting verification
   - Test coverage reporting (minimum 80% for crypto-core, 60% for other packages)
   - Security audit of npm dependencies and Rust crates

3. **Deployment Automation**
   - Staging deployment on every pull request
   - Production deployment on main branch merge (with manual approval gate)
   - Database migration automation using Supabase CLI
   - Environment variable validation before deployment

4. **Security Integration**
   - Automated security scanning with GitHub Security Advisories
   - Secret scanning and prevention of credential commits
   - Dependency vulnerability scanning for both npm and Cargo
   - Docker image security scanning (if using containers)

5. **Monitoring Integration**
   - Sentry release tracking and error monitoring setup
   - Performance monitoring and alerting configuration
   - Deployment notification integration (Slack/Discord)
   - Rollback procedures documentation and automation

### Definition of Done

- [ ] All CI/CD pipelines execute successfully on empty repository
- [ ] Security gates prevent insecure code from being deployed
- [ ] Staging environment automatically updates on pull requests
- [ ] Production deployment includes monitoring and rollback capabilities

## Story 0.6: Supply-chain Security & SLSA Compliance

As a security-conscious development team,
I want to implement SLSA Level 2 compliance with SBOM generation and build attestation,
so that our supply-chain is protected from compromise and we have verifiable build provenance.

### Acceptance Criteria

1. **SLSA Level 2 Compliance**
   - Build provenance attestation automatically generated for all releases
   - Sigstore integration for build artifact signing and verification
   - Reproducible builds configured with deterministic output
   - Build environment isolation and attestation

2. **Software Bill of Materials (SBOM)**
   - SBOM automatically generated for all dependencies (npm + Cargo)
   - SPDX or CycloneDX format compatibility for tooling integration
   - License compliance checking and vulnerability mapping
   - SBOM signing with Sigstore for integrity verification

3. **Enhanced Package Security**
   - Package pinning strategy with exact versions for crypto dependencies
   - Automated security updates with approval workflow for non-breaking changes
   - Dependency vulnerability scanning integrated into CI/CD pipeline
   - Supply-chain attack detection (typosquatting, dependency confusion)

4. **Build Security Hardening**
   - Build environment sandboxing and isolation
   - Secret scanning prevention in build artifacts
   - Build artifact integrity verification before deployment
   - Audit trail for all build and deployment activities

### Definition of Done

- [ ] SLSA provenance generated and verifiable for all production builds
- [ ] SBOM generated and includes all transitive dependencies
- [ ] Dependency vulnerability scanning fails build on critical issues
- [ ] Build artifacts signed with Sigstore and verification automated

## Story 0.7: Comprehensive Threat Model Creation

As a privacy-focused product team,
I want to create a detailed threat model covering all attack vectors against menstrual health data,
so that security controls are systematically designed to mitigate identified risks.

### Acceptance Criteria

1. **STRIDE Analysis**
   - Spoofing threats: Identity verification and authentication bypass scenarios
   - Tampering threats: Data integrity attacks on encrypted payloads
   - Repudiation threats: Non-repudiation of sensitive health data actions
   - Information Disclosure: PII leakage through logs, errors, or side channels
   - Denial of Service: Availability attacks on critical health tracking functions
   - Elevation of Privilege: Unauthorized access escalation scenarios

2. **Privacy-Specific Threat Assessment**
   - Reproductive health data sensitivity classification and handling
   - Inference attacks from usage patterns and metadata
   - Cross-correlation risks with external health data sources
   - Regulatory compliance threats (HIPAA, GDPR, state-level privacy laws)

3. **Attack Tree Analysis**
   - Device compromise scenarios (malware, physical access, rooting/jailbreaking)
   - Network interception attacks (MITM, certificate pinning bypass, DNS hijacking)
   - Server breach scenarios (database compromise, privilege escalation, insider threats)
   - Social engineering attacks (account recovery, support impersonation)

4. **Regulatory and Legal Threat Analysis**
   - Government access scenarios (subpoenas, national security letters, jurisdiction shopping)
   - Legal compulsion threats (court orders, law enforcement requests)
   - Cross-border data transfer risks and jurisdiction-specific regulations
   - Third-party disclosure risks (insurance, employers, family court proceedings)

5. **UI/UX Security Threats**
   - Shoulder surfing and visual privacy in public spaces
   - Family member access and domestic surveillance scenarios
   - Screen recording and accessibility service abuse
   - Social media integration and unintended sharing risks

### Definition of Done

- [ ] Threat model document created with STRIDE analysis for all components
- [ ] Attack trees documented for top 5 high-risk scenarios
- [ ] Privacy impact assessment completed for reproductive health data
- [ ] Risk acceptance decisions documented with rationale and approval
- [ ] Threat model review schedule established (quarterly updates)

## Story 0.8: Database Security Hardening

As a zero-knowledge architecture implementer,
I want Supabase RLS policies configured with "deny-by-default" principle,
so that data access is impossible without explicit user authorization.

### Acceptance Criteria

1. **Row Level Security (RLS) Implementation**
   - All database tables configured with RLS enabled by default
   - Deny-by-default policies: no data access without explicit user authorization
   - User isolation policies preventing cross-user data access under any circumstance
   - Service role policies restricted to only non-PII operations (health checks, migrations)

2. **Database Connection Security**
   - SSL/TLS encryption enforced for all database connections
   - Certificate pinning implemented for mobile and web clients
   - Connection pooling configured with security-first settings
   - Database firewall rules restricting access to authorized IP ranges

3. **Audit and Monitoring**
   - Audit logging enabled for all database access attempts and policy violations
   - Real-time alerting on RLS policy violations or unusual access patterns
   - Database query monitoring for potential SQL injection or privilege escalation
   - Regular access review and permission auditing automation

4. **Encryption and Key Management**
   - Database encryption at rest verified with customer-managed keys
   - Column-level encryption for highly sensitive fields (if applicable)
   - Key rotation policies and procedures documented
   - Backup encryption and secure key escrow procedures

5. **RLS Policy Testing**
   - Comprehensive test suite with negative test cases (attempted unauthorized access)
   - Automated testing of RLS policies in CI/CD pipeline
   - Penetration testing scenarios for database access controls
   - Policy regression testing to prevent accidental privilege escalation

### Definition of Done

- [ ] All database tables have RLS enabled with deny-by-default policies
- [ ] RLS policy test suite passes with 100% unauthorized access prevention
- [ ] Database audit logging captures all access attempts and violations
- [ ] SSL/TLS and certificate pinning verified for all database connections

## Story 0.9: Web Security Headers and CSP Implementation

As a web application security engineer,
I want comprehensive Content Security Policy, Subresource Integrity, and Trusted Types implemented,
so that client-side attacks and code injection are prevented.

### Acceptance Criteria

1. **Content Security Policy (CSP)**
   - Strict CSP implemented blocking all unauthorized script execution
   - Nonce-based script allowlisting for dynamic content
   - CSP reporting endpoint configured with violation monitoring and alerting
   - CSP policies tested across all supported browsers and devices

2. **Subresource Integrity (SRI)**
   - SRI hashes generated and verified for all external resources and dependencies
   - Automated SRI hash generation integrated into build pipeline
   - SRI fallback mechanisms for CDN failures or hash mismatches
   - SRI violation monitoring and alerting for potential tampering

3. **Trusted Types and DOM Security**
   - Trusted Types API implemented preventing DOM-based XSS attacks
   - Sanitization policies configured for all dynamic HTML content
   - Dangerous sink protection (innerHTML, document.write, eval)
   - CSP integration with Trusted Types for comprehensive XSS protection

4. **HTTP Security Headers**
   - HSTS (HTTP Strict Transport Security) with long max-age and includeSubDomains
   - X-Frame-Options: DENY to prevent clickjacking attacks
   - X-Content-Type-Options: nosniff to prevent MIME type confusion
   - Referrer-Policy: strict-origin-when-cross-origin for privacy protection
   - Feature-Policy/Permissions-Policy for capability restriction

5. **Certificate and Transport Security**
   - Certificate pinning configured for all external API communications
   - HPKP (HTTP Public Key Pinning) implementation with backup pins
   - TLS configuration hardening (TLS 1.3+, secure cipher suites)
   - Certificate transparency monitoring and alerting

### Definition of Done

- [ ] CSP policies block all unauthorized scripts with zero false positives
- [ ] SRI verification prevents execution of tampered external resources
- [ ] Trusted Types prevent all DOM-based XSS attack vectors
- [ ] Security headers achieve A+ rating on security header scanners
- [ ] Certificate pinning verified for all external communications

## Story 0.10: Security Gates Framework Implementation

As a development team lead,
I want automated security gates that validate crypto envelope structure and prevent PII leakage,
so that every epic meets consistent security standards before deployment.

### Acceptance Criteria

1. **Crypto Envelope Validation**
   - Automated tests checking v/alg/kdf/salt/nonce/kid structure compliance
   - Crypto envelope schema validation against defined standards
   - Key derivation function parameter validation (iterations, memory, parallelism)
   - Encryption algorithm and mode validation (AES-256-GCM, ChaCha20-Poly1305)

2. **Network Traffic Analysis**
   - Automated pcap analysis ensuring only encrypted payloads in network traffic
   - TLS inspection for proper certificate validation and cipher suite usage
   - Metadata leakage detection (request timing, size patterns, headers)
   - Deep packet inspection for PII exposure in network communications

3. **Testing Framework Integration**
   - Property-based testing framework for crypto operations and data handling
   - Fuzz testing integrated with CI/CD for input validation and error handling
   - Chaos engineering tests for security failure scenarios
   - Load testing with security constraints (rate limiting, resource exhaustion)

4. **PII and Data Leakage Prevention**
   - Log analysis automation detecting any PII exposure in application logs
   - Error message sanitization preventing information disclosure
   - Debug information filtering in production builds
   - Memory dump analysis for sensitive data persistence

5. **RLS and Access Control Testing**
   - RLS policy testing automation with comprehensive unauthorized access attempts
   - Cross-user data access prevention testing (user A accessing user B's data)
   - Privilege escalation testing for service accounts and admin functions
   - Session management and token validation security testing

6. **SSR and Client-Side Security**
   - SSR-PII prevention tests ensuring no sensitive data in server-side rendering
   - Client-side storage encryption validation (IndexedDB, localStorage)
   - XSS and injection attack prevention testing
   - Client-side crypto implementation validation

### Definition of Done

- [ ] Security gates integrated into CI/CD with zero false positives
- [ ] Crypto envelope validation prevents deployment of malformed encryption
- [ ] Network traffic analysis confirms zero PII leakage
- [ ] PII detection prevents any sensitive data exposure in logs or errors
- [ ] RLS testing achieves 100% unauthorized access prevention
- [ ] SSR security prevents sensitive data exposure in HTML source
