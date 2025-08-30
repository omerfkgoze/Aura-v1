# Security and Performance

## Security Requirements

**Frontend Security:**

- CSP Headers: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://*.supabase.co`
- XSS Prevention: React built-in protections + Tamagui safe rendering
- Secure Storage: iOS Keychain/Android Keystore for crypto keys

**Backend Security:**

- Input Validation: Zod schema validation on all API endpoints
- Rate Limiting: 100 requests/minute per IP, 1000/hour per authenticated user
- CORS Policy: Restricted to production domains only

**Authentication Security:**

- Token Storage: Secure HTTP-only cookies + iOS/Android secure storage
- Session Management: JWT with 24-hour expiration, refresh token rotation
- Password Policy: Passwordless (Passkeys only) + recovery phrase backup

## Performance Optimization

**Frontend Performance:**

- Bundle Size Target: <2MB total, <500KB initial load
- Loading Strategy: Progressive loading with skeleton screens
- Caching Strategy: TanStack Query with 5min stale time, 30min garbage collection

**Backend Performance:**

- Response Time Target: <200ms for API calls, <500ms for crypto operations
- Database Optimization: Composite indexes on (user_id, updated_at DESC)
- Caching Strategy: Supabase built-in caching + Vercel Edge caching
