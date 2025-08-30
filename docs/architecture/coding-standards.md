# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared-types and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer
- **Environment Variables:** Access only through config objects, never process.env directly
- **Error Handling:** All API routes must use the standard error handler
- **State Updates:** Never mutate state directly - use proper state management patterns
- **Crypto Operations:** All encryption/decryption must go through packages/crypto-core
- **Database Access:** Never direct SQL - always use RLS-enforced repository patterns
- **PII Handling:** Zero plaintext personal information in logs or server-side code
- **Device Identification:** Always use salted hashes, never raw device IDs
- **Concurrent Updates:** Implement optimistic concurrency for all data mutations

## Naming Conventions

| Element               | Frontend             | Backend     | Example                        |
| --------------------- | -------------------- | ----------- | ------------------------------ |
| Components            | PascalCase           | -           | `CycleDataEntry.tsx`           |
| Hooks                 | camelCase with 'use' | -           | `useCryptoCore.ts`             |
| API Routes            | -                    | kebab-case  | `/api/cycle-data`              |
| Database Tables       | -                    | snake_case  | `encrypted_cycle_data`         |
| Crypto Functions      | camelCase            | -           | `encryptCycleData()`           |
| RPC Functions         | snake_case           | snake_case  | `update_cycle_data_optimistic` |
| Environment Variables | UPPER_SNAKE          | UPPER_SNAKE | `EXPO_PUBLIC_API_URL`          |
| Constants             | UPPER_SNAKE          | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS`           |

## Security Coding Standards

- **Zero-Knowledge Principle:** Server must never access plaintext health data
- **AAD Validation:** All crypto operations must include Additional Authenticated Data
- **RLS Enforcement:** Database queries must use `auth.uid()` for user isolation
- **Input Sanitization:** All user inputs validated with Zod schemas before processing
- **Token Expiration:** All tokens must have explicit expiration and validation
- **Memory Safety:** Crypto operations must zeroize sensitive data after use
- **Conflict Resolution:** Version conflicts must be presented to user, never auto-resolved
- **Audit Trail:** All healthcare sharing activities must be logged (privacy-safe)
- **Device Privacy:** Device fingerprinting must use salted hashes with user-specific salts
- **Emergency Controls:** All UI must support immediate stealth mode activation
