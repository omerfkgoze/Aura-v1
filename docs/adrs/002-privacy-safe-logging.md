# ADR-002: Privacy-Safe Logging Strategy

**Status:** Accepted

**Date:** 2025-08-30

**Context:**

Reproductive health applications handle extremely sensitive personal data. Traditional logging approaches risk exposing:

- Menstrual cycle data
- Health symptoms
- Personal identifiable information (PII)
- Device identification information
- User behavioral patterns

However, we still need comprehensive logging for:

- System health monitoring
- Security incident detection
- Performance optimization
- Debugging development issues
- API request/response monitoring

**Decision:**

Implement a privacy-safe logging architecture with:

1. **Zero Health Data Logging**: Complete prohibition on logging any health-related information
2. **PII Redaction**: Automatic redaction of emails, phone numbers, names, addresses
3. **Structured Logging**: Use pino for consistent, machine-readable logs
4. **Context-Aware Loggers**: Specialized loggers for technical, security, API, database, and crypto contexts
5. **Development-Only Utilities**: Enhanced logging in development that's disabled in production
6. **Sanitization Functions**: Utility functions to clean URLs, error messages, and data objects

**Consequences:**

**Easier:**

- Developers can log freely without risk of exposing sensitive data
- Automated PII protection prevents accidental exposure
- Structured logs enable better monitoring and alerting
- Consistent logging patterns across all application components
- Security incidents can be tracked without compromising privacy

**More Difficult:**

- Debugging issues may require more careful log analysis
- Cannot log actual data values for troubleshooting
- Requires discipline to use context-appropriate loggers
- Additional overhead from sanitization functions

**Alternatives Considered:**

1. **No logging**: Rejected as it would make monitoring and debugging impossible
2. **Manual PII filtering**: Rejected due to high risk of human error
3. **Encrypted logging**: Rejected as it doesn't address the fundamental privacy risk
4. **Sampling-based logging**: Rejected as even sampled health data is too sensitive

**Implementation Details:**

**Prohibited Fields (automatically redacted):**

- Health data: `cycleData`, `symptoms`, `temperature`, `mood`, `notes`, `healthData`
- PII: `email`, `phone`, `name`, `address`, `birthDate`
- Auth: `password`, `token`, `jwt`, `apiKey`, `secret`
- Device: Raw `deviceId`, `fingerprint`, `hardwareId`

**Logger Categories:**

- `technical`: System health, performance metrics
- `security`: Authentication, authorization, threats
- `api`: Request/response metadata (no body content)
- `database`: Query performance, connection pool status
- `crypto`: Encryption operation metadata (no keys/data)
- `dev`: Development-only debugging (disabled in production)

**Sanitization Rules:**

- Replace UUIDs with `[UUID]`
- Replace email addresses with `[EMAIL]`
- Replace phone numbers with `[PHONE]`
- Replace user IDs in URLs with `[USER_ID]`
- Truncate user IDs to first 8 characters + `***` for tracing
