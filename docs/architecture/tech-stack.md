# Tech Stack

Pragmatic approach ile kritik güvenlik işlemleri için Rust/WASM, diğer her şey için battle-tested mainstream teknolojiler:

| Category             | Technology                        | Version | Purpose                                   | Rationale                                         |
| -------------------- | --------------------------------- | ------- | ----------------------------------------- | ------------------------------------------------- |
| Frontend Language    | TypeScript                        | 5.3+    | Type safety across entire stack           | Strong typing prevents data leakage, excellent DX |
| Frontend Framework   | Next.js                           | 14.x    | Web app with SSR disabled for PII         | Mature ecosystem, excellent Vercel integration    |
| Mobile Framework     | Expo/React Native                 | 50.x    | Cross-platform mobile                     | Shared codebase, excellent crypto library support |
| UI Component Library | **Tamagui**                       | Latest  | **Single cross-platform design system**   | **Unified web+mobile, excellent theming**         |
| State Management     | **Zustand + TanStack Query**      | Latest  | **UI state + server sync separation**     | **Zustand=UI, React Query=offline/sync**          |
| Local Database       | **SQLite (Expo) + Encryption**    | Latest  | **Real offline with encrypted storage**   | **Secure enclave keys, conflict resolution**      |
| Crypto Core          | **Rust/WASM (minimal)**           | Latest  | **CRITICAL: Client-side encryption only** | **Zero-knowledge requires bulletproof crypto**    |
| Backend Language     | TypeScript                        | 5.3+    | Consistent language across stack          | Same types, reduced cognitive load                |
| Backend Framework    | **Next.js API Routes**            | 14.x    | **Simple REST endpoints**                 | **Standard HTTP, easy to test/debug**             |
| API Style            | **REST + Zod + OpenAPI**          | Latest  | **Standards-based with type generation**  | **External integration friendly, auto-docs**      |
| Database             | PostgreSQL (Supabase)             | 15+     | Managed DB with RLS                       | Row Level Security essential                      |
| Cache                | Redis (Supabase)                  | Latest  | Session and metadata caching              | Simple, managed solution                          |
| File Storage         | Supabase Storage                  | Latest  | Encrypted backup blobs                    | Integrated with auth                              |
| Authentication       | **Supabase Auth + WebAuthn**      | Latest  | **Passkeys + recovery phrases**           | **Hardware-backed + user-controlled backup**      |
| Frontend Testing     | Vitest + Testing Library          | Latest  | Fast unit/integration tests               | Vite-native, excellent DX                         |
| Backend Testing      | Vitest + Supertest                | Latest  | API testing                               | Consistent tooling                                |
| E2E Testing          | Playwright                        | Latest  | Cross-platform E2E                        | Reliable mobile support                           |
| Build Tool           | Nx                                | 17.x    | Monorepo orchestration                    | Build caching, dependency management              |
| Bundler              | Vite (web) + Metro (mobile)       | Latest  | Fast builds                               | Platform-optimized                                |
| IaC Tool             | **Supabase CLI + SQL Migrations** | Latest  | **Reproducible DB schema**                | **Versioned RLS policies, staging/prod parity**   |
| CI/CD                | GitHub Actions                    | Latest  | Automated deployment                      | Free, integrated                                  |
| Monitoring           | Sentry (privacy-safe)             | Latest  | Error tracking without PII                | Zero health data logging                          |
| Logging              | **Technical metrics only**        | N/A     | **Privacy-first: no user data**           | **Reproductive health = zero logging**            |
| CSS Framework        | Tailwind CSS                      | 3.x     | Utility-first styling                     | Consistent with Tamagui                           |
