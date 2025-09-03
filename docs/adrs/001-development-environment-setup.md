# ADR-001: Development Environment Configuration

**Status:** Accepted

**Date:** 2025-08-30

**Context:**

The Aura menstrual health app requires a sophisticated development environment that balances security, privacy, and developer experience. Key requirements include:

- Zero-knowledge architecture where server never accesses plaintext health data
- Local HTTPS for WebAuthn testing
- Secure secret management for development
- Privacy-safe logging that prevents PII/health data leakage
- Support for both web (Next.js) and mobile (Expo) development
- Local database setup with PostgreSQL and optional Redis

**Decision:**

We will implement a comprehensive development environment with:

1. **Environment Variable Management**: Zod-based validation with secure secret generation
2. **Dual Database Options**: Docker Compose (PostgreSQL + Redis) OR Supabase local development
3. **HTTPS Setup**: mkcert for local certificate generation supporting WebAuthn
4. **Privacy-Safe Logging**: Structured logging with pino that redacts all PII/health data
5. **Security-First Configuration**: CORS, CSP, and security headers configured for development
6. **Automated Setup**: Single script (`dev-setup.sh`) for complete environment initialization

**Consequences:**

**Easier:**

- Developers can get a complete environment running with one command
- Security best practices are enforced from day one
- WebAuthn testing works locally with proper HTTPS
- Zero risk of accidentally logging health data during development
- Consistent environment across all developers

**More Difficult:**

- Initial setup complexity is higher than basic development environments
- Requires understanding of security concepts (peppers, HTTPS, etc.)
- Docker dependency for optimal experience
- More configuration files to maintain

**Alternatives Considered:**

1. **Simple .env file approach**: Rejected due to lack of validation and security
2. **Supabase-only development**: Rejected to provide flexibility for developers without Supabase accounts
3. **HTTP-only development**: Rejected because WebAuthn requires HTTPS
4. **Manual setup only**: Rejected due to complexity and potential for errors

**Implementation Details:**

- Environment validation happens at application startup
- Secrets are generated cryptographically secure with 32+ character minimum
- Docker Compose provides isolated database environment
- mkcert creates locally trusted certificates
- All logging utilities actively prevent PII/health data from being logged
