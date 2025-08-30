# Development Workflow

## Local Development Setup

**Prerequisites:**

```bash
# Install required tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust
npm install -g pnpm  # Package manager
npm install -g @supabase/cli  # Supabase CLI
npm install -g nx  # Nx CLI
```

**Initial Setup:**

```bash
# Clone and install dependencies
git clone <repo-url> aura-app
cd aura-app
pnpm install

# Setup Supabase locally
supabase start
supabase db reset  # Apply all migrations and policies

# Build crypto core
pnpm nx build crypto-core

# Generate types from database
pnpm nx run shared-types:generate-db-types
```

**Development Commands:**

```bash
# Start all services (mobile simulator + web dev server)
pnpm nx run-many --target=dev --all

# Start mobile only
pnpm nx dev mobile

# Start web only
pnpm nx dev web

# Run tests (unit + integration)
pnpm nx run-many --target=test --all

# Security validation
pnpm nx run-many --target=security-check --all
```

## Environment Configuration

**Required Environment Variables:**

```bash
# Frontend (.env.local)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_DEVICE_PEPPER=<random-pepper>

# UX Configuration
EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED=true
EXPO_PUBLIC_STEALTH_MODE_DEFAULT=false
EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED=true
EXPO_PUBLIC_ANIMATION_REDUCED_MOTION=false

# Backend (.env)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
DEVICE_HASH_PEPPER=<server-pepper>
NEXTAUTH_SECRET=<random-secret>

# Shared (both frontend and backend)
NODE_ENV=development
APP_VERSION=1.0.0
SECURITY_AUDIT_ENABLED=true
```

## UX Testing Strategy

### Cultural Validation Testing

- Regional stealth mode effectiveness testing
- Cultural appropriateness validation
- Multi-language accessibility testing

### Privacy Security Testing

- Stealth mode authenticity validation
- Screen reader privacy compliance
- Emergency scenario testing

### Implementation Roadmap Integration

**Phase 1: Core Privacy Infrastructure + UX Foundation**

- Stealth mode framework implementation
- Basic cultural adaptation system
- Emergency privacy controls
- Adaptive UI component library

**Phase 2: Uncertainty Visualization + UX Components**

- Prediction confidence display system
- Educational explanation interface
- Historical accuracy tracking
- Uncertainty visualization components

**Phase 3: Cultural Stealth Modes + UX Disguises**

- Religious app disguise development
- Study app disguise development
- Professional app disguise development
- Cultural authentication and transitions

**Phase 4: Accessibility Integration + UX Compliance**

- Screen reader compatibility testing
- Cultural accessibility validation
- Assistive technology integration
- Privacy-adaptive accessibility (PAA) implementation

**Phase 5: Healthcare Sharing + UX Integration**

- Provider verification system
- Secure sharing link generation
- Cultural mediator integration
- Healthcare UX workflows
