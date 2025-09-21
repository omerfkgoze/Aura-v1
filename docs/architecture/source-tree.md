# Source Tree

Production-ready monorepo structure with comprehensive security:

```
aura-app/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── security-audit.yml  # Automated security validation
│       ├── build-test.yml      # Build and test pipeline
│       └── deploy.yml          # Deployment pipeline
├── apps/                       # Application packages
│   ├── mobile/                 # React Native application
│   │   ├── src/
│   │   │   ├── components/     # UI components with stealth modes
│   │   │   ├── crypto/         # Rust/WASM crypto bindings
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── screens/        # Application screens
│   │   │   ├── services/       # API client services
│   │   │   └── utils/          # Utility functions
│   │   ├── ios/                # iOS specific code
│   │   ├── android/            # Android specific code
│   │   └── package.json
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   └── api/        # REST API endpoints with RLS
│   │   │   ├── components/     # Shared web components
│   │   │   └── middleware/     # Auth and security middleware
│   │   └── package.json
│   └── api/                    # Standalone API service (if needed)
├── libs/                   # Shared packages
│   ├── crypto-core/            # Rust/WASM crypto implementation
│   │   ├── src/
│   │   │   ├── lib.rs          # Main Rust crypto library
│   │   │   ├── aad.rs          # AAD validation logic
│   │   │   ├── keys.rs         # Key management
│   │   │   └── envelope.rs     # Crypto envelope handling
│   │   ├── pkg/                # Generated WASM bindings
│   │   └── Cargo.toml
│   ├── shared-types/           # TypeScript type definitions
│   │   ├── src/
│   │   │   ├── api.ts          # API request/response types
│   │   │   ├── crypto.ts       # Crypto-related types
│   │   │   ├── data.ts         # Data model types
│   │   │   └── index.ts        # Exports
│   │   └── package.json
│   ├── ui/                     # Shared UI components (Tamagui)
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── themes/         # Cultural themes
│   │   │   └── stealth/        # Stealth mode components
│   │   └── package.json
│   └── utils/                  # Shared utility functions
├── db/                         # Database schema and migrations
│   ├── migrations/             # Supabase migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_secure_functions.sql
│   │   └── 004_indexes.sql
│   ├── policies/               # RLS policy definitions
│   │   ├── cycle_data.sql      # Cycle data policies
│   │   ├── user_prefs.sql      # User preferences policies
│   │   └── healthcare_share.sql # Healthcare sharing policies
│   └── functions/              # Secure RPC functions
│       ├── update_cycle_data_optimistic.sql
│       ├── validate_share_token.sql
│       └── healthcare_access_audit.sql
├── docs/                       # Documentation
│   ├── prd.md                  # Product Requirements Document
│   ├── architecture.md         # This architecture document
│   ├── security-audit.md       # Security validation checklist
│   └── deployment-guide.md     # Deployment instructions
├── scripts/                    # Build and deployment scripts
│   ├── build-crypto.sh         # Compile Rust to WASM
│   ├── deploy-staging.sh       # Staging deployment
│   ├── deploy-production.sh    # Production deployment
│   └── security-check.sh       # Security validation script
├── infrastructure/             # Infrastructure as Code
│   ├── supabase/
│   │   ├── config.toml         # Supabase configuration
│   │   └── seed.sql            # Initial data setup
│   └── vercel.json             # Vercel deployment config
├── .env.example                # Environment variables template
├── nx.json                     # Nx workspace configuration
├── package.json                # Root package.json with workspaces
├── pnpm-workspace.yaml         # PNPM workspace configuration
└── README.md                   # Project documentation
```
