# Aura Development Environment Setup

A comprehensive guide to setting up the local development environment for the Aura menstrual health app.

## 🚀 Quick Start

**For the impatient developer:**

```bash
# 1. Clone and navigate
git clone <repository-url>
cd aura-app

# 2. Run the automated setup
./scripts/dev-setup.sh

# 3. Start development servers
pnpm nx run-many --target=dev --all
```

**Access your apps:**

- 🌐 Web: https://localhost:3000
- 📱 Mobile: Expo DevTools will show QR code
- 🗄️ Database Studio: http://localhost:54323

---

## 📋 Prerequisites

### Required Software

| Software    | Version | Installation                      |
| ----------- | ------- | --------------------------------- |
| **Node.js** | 18+     | [nodejs.org](https://nodejs.org/) |
| **pnpm**    | Latest  | `npm install -g pnpm`             |
| **Docker**  | Latest  | [docker.com](https://docker.com/) |

### Optional but Recommended

| Software         | Purpose             | Installation                   |
| ---------------- | ------------------- | ------------------------------ |
| **Supabase CLI** | Database management | `npm install -g @supabase/cli` |
| **mkcert**       | HTTPS certificates  | `brew install mkcert` (macOS)  |
| **Expo CLI**     | Mobile development  | `npm install -g @expo/cli`     |

---

## 🛠️ Manual Setup Guide

### Step 1: Install Dependencies

```bash
# Install project dependencies
pnpm install

# Verify installation
pnpm nx --version
```

### Step 2: Environment Configuration

```bash
# Generate secure secrets
node scripts/generate-secrets.js --write

# Verify environment variables
cat .env.local
```

**Required Environment Variables:**

- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side)
- `EXPO_PUBLIC_DEVICE_PEPPER`: Client-side device fingerprinting salt
- `DEVICE_HASH_PEPPER`: Server-side device hash validation salt
- `NEXTAUTH_SECRET`: NextAuth.js JWT signing secret

### Step 3: Local Database Setup

Choose **one** of the following options:

#### Option A: Docker Compose (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

#### Option B: Supabase Local Development

```bash
# Start Supabase local stack
supabase start

# Apply migrations and seed data
supabase db reset
```

### Step 4: HTTPS Setup (for WebAuthn)

```bash
# Generate local HTTPS certificates
./scripts/setup-https.sh

# Verify certificates are created
ls -la certificates/
```

### Step 5: Build Core Packages

```bash
# Build utility packages
pnpm nx run utils:build
pnpm nx run logger:build

# Verify builds
pnpm nx run utils:type-check
```

---

## 🏃‍♂️ Development Workflow

### Starting Development Servers

```bash
# Start all services (web + mobile + database)
pnpm nx run-many --target=dev --all

# Start specific services
pnpm nx dev web          # Web app only
pnpm nx dev mobile       # Mobile app only
```

### Running Tests

```bash
# Run all tests
pnpm nx run-many --target=test --all

# Run tests for specific package
pnpm nx test utils
pnpm nx test web
```

### Code Quality Checks

```bash
# Linting
pnpm nx run-many --target=lint --all

# Type checking
pnpm nx run-many --target=type-check --all

# Security audit
pnpm audit
```

---

## 🔐 Security & Privacy

### Development Security Checklist

- [ ] **Environment Variables**: All secrets generated securely
- [ ] **HTTPS Certificates**: Local certificates installed for WebAuthn
- [ ] **Database Access**: RLS policies prevent data leakage
- [ ] **Logging**: No PII or health data in development logs
- [ ] **Crypto Validation**: All crypto operations tested and verified

### Testing Security Features

```bash
# Health check (includes crypto validation)
curl http://localhost:3000/api/dev/health

# Detailed crypto validation
curl -X POST http://localhost:3000/api/dev/crypto-validate
```

---

## 🗄️ Database Management

### Using Docker Compose

```bash
# Start database
docker-compose up postgres -d

# Access database
docker exec -it aura-postgres-dev psql -U postgres -d aura_dev

# View logs
docker-compose logs postgres
```

### Using Supabase Local

```bash
# Database operations
supabase start                    # Start local Supabase
supabase db reset                 # Reset with fresh schema
supabase db diff                  # Show schema changes
supabase gen types typescript     # Generate TypeScript types

# Access Supabase Studio
open http://localhost:54323
```

### Database URLs

- **Docker**: `postgresql://postgres:postgres@localhost:54322/aura_dev`
- **Supabase**: `postgresql://postgres:postgres@localhost:54322/postgres`

---

## 📱 Mobile Development

### Expo Development

```bash
# Start Expo development server
pnpm nx dev mobile

# Run on specific platform
pnpm nx run mobile:ios
pnpm nx run mobile:android
```

### Device Testing

1. **iOS Simulator**: Requires Xcode (macOS only)
2. **Android Emulator**: Requires Android Studio
3. **Physical Device**: Install Expo Go app, scan QR code

### HTTPS for Mobile Testing

```bash
# Generate certificate with your IP address
mkcert -cert-file certificates/mobile.pem \
       -key-file certificates/mobile-key.pem \
       [YOUR_COMPUTER_IP] localhost 127.0.0.1
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Environment validation failed"

```bash
# Regenerate secrets
node scripts/generate-secrets.js --write

# Check all required variables are set
grep -E "^[A-Z_]+=" .env.local
```

#### "Docker containers won't start"

```bash
# Reset Docker environment
docker-compose down -v
docker-compose up -d

# Check Docker resources
docker system df
```

#### "Supabase connection refused"

```bash
# Restart Supabase
supabase stop
supabase start

# Check status
supabase status
```

#### "HTTPS certificates not working"

```bash
# Reinstall mkcert CA
mkcert -uninstall
mkcert -install

# Regenerate certificates
rm -rf certificates/
./scripts/setup-https.sh
```

#### "Mobile app won't connect"

```bash
# Check your computer's IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update EXPO_PUBLIC_API_URL in .env.local
EXPO_PUBLIC_API_URL=http://[YOUR_IP]:3000
```

### Performance Issues

#### Slow builds

```bash
# Clear Nx cache
pnpm nx reset

# Clear node_modules
rm -rf node_modules
pnpm install
```

#### Database connection timeouts

```bash
# Check Docker resources
docker stats

# Increase Docker memory limit in Docker Desktop
```

---

## 🏗️ Architecture Overview

### Project Structure

```
aura-app/
├── apps/
│   ├── web/           # Next.js web application
│   └── mobile/        # Expo/React Native app
├── libs/
│   ├── utils/         # Shared utilities & env validation
│   └── logger/        # Privacy-safe structured logging
├── db/                # Database initialization scripts
├── supabase/          # Supabase configuration & migrations
├── scripts/           # Development & deployment scripts
└── docs/              # Documentation & architecture
```

### Technology Stack

- **Frontend**: Next.js (web) + Expo (mobile)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis (optional)
- **Auth**: Supabase Auth + WebAuthn
- **Crypto**: Rust/WASM (client-side encryption)

### Data Flow

1. **Client** encrypts health data before sending
2. **API** validates requests, never accesses plaintext health data
3. **Database** stores encrypted data with RLS policies
4. **Logs** contain zero PII or health information

---

## 🚀 Deployment

### Development to Staging

```bash
# Run security checks
pnpm nx run-many --target=security-check --all

# Build all packages
pnpm nx run-many --target=build --all

# Run integration tests
pnpm nx run-many --target=test:integration --all
```

### Environment Promotion

1. **Development**: Local environment with Docker/Supabase
2. **Staging**: Cloud deployment with Supabase staging project
3. **Production**: Full cloud deployment with monitoring

---

## 📚 Additional Resources

### Documentation

- [Architecture Documentation](./docs/architecture/)
- [Security Best Practices](./docs/architecture/coding-standards.md)
- [API Documentation](./docs/api/) (generated after first run)

### Development Tools

- [Nx Documentation](https://nx.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)

### Community

- Report issues: [GitHub Issues](https://github.com/your-repo/issues)
- Development discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

---

## 🏁 Next Steps

After completing the setup:

1. **Explore the codebase**: Start with `apps/web/src` and `apps/mobile/src`
2. **Review architecture**: Read through `docs/architecture/`
3. **Run tests**: Ensure all tests pass with `pnpm nx run-many --target=test --all`
4. **Start coding**: Check out the current stories in `docs/stories/`

---

**Welcome to Aura development! 🌙✨**

For questions or issues, check the troubleshooting section above or create an issue in the repository.
