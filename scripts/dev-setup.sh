#!/bin/bash

# Aura Development Environment Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Aura Development Environment Setup"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    log_success "Node.js found: $NODE_VERSION"
else
    log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm found: $PNPM_VERSION"
else
    log_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    log_success "pnpm installed"
fi

# Check Docker
if command_exists docker; then
    log_success "Docker found"
    if docker info >/dev/null 2>&1; then
        log_success "Docker is running"
    else
        log_warning "Docker is installed but not running. Please start Docker Desktop."
    fi
else
    log_warning "Docker not found. Some features will be limited without Docker."
fi

# Check Supabase CLI
if command_exists supabase; then
    SUPABASE_VERSION=$(supabase --version)
    log_success "Supabase CLI found: $SUPABASE_VERSION"
else
    log_warning "Supabase CLI not found. Installing..."
    if command_exists npm; then
        npm install -g @supabase/cli
        log_success "Supabase CLI installed"
    else
        log_error "Cannot install Supabase CLI without npm"
    fi
fi

echo ""

# Step 2: Install dependencies
log_info "Installing project dependencies..."
pnpm install
log_success "Dependencies installed"

echo ""

# Step 3: Generate secrets
log_info "Generating secure secrets..."
if [ ! -f .env.local ]; then
    node scripts/generate-secrets.js --write
    log_success "Secrets generated and written to .env.local files"
else
    log_warning ".env.local already exists. To regenerate secrets, run:"
    echo "  node scripts/generate-secrets.js --write"
fi

echo ""

# Step 4: Set up HTTPS certificates
log_info "Setting up HTTPS certificates for WebAuthn..."
if command_exists mkcert; then
    ./scripts/setup-https.sh
    log_success "HTTPS certificates set up"
else
    log_warning "mkcert not found. HTTPS setup skipped."
    log_info "To install mkcert:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  brew install mkcert"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
        echo "  chmod +x mkcert-v*-linux-amd64"
        echo "  sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
    fi
    echo "  Then run: ./scripts/setup-https.sh"
fi

echo ""

# Step 5: Set up local database
log_info "Setting up local development database..."
if command_exists docker && docker info >/dev/null 2>&1; then
    log_info "Starting Docker containers..."
    docker-compose up -d
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 5
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Docker containers started successfully"
    else
        log_warning "Some Docker containers may not have started correctly"
        echo "Run 'docker-compose logs' to check for issues"
    fi
else
    log_warning "Docker not available. Using Supabase local development instead..."
    if command_exists supabase; then
        log_info "Initializing Supabase local development..."
        supabase start
        log_success "Supabase local development started"
    else
        log_warning "Neither Docker nor Supabase CLI available for local database setup"
    fi
fi

echo ""

# Step 6: Build core packages
log_info "Building core packages..."
if pnpm nx run utils:build; then
    log_success "Utils package built successfully"
else
    log_warning "Utils package build failed (expected if TypeScript not fully configured)"
fi

if pnpm nx run logger:build 2>/dev/null; then
    log_success "Logger package built successfully"
else
    log_warning "Logger package build failed (expected if TypeScript not fully configured)"
fi

echo ""

# Step 7: Development environment summary
echo "📋 Development Environment Summary"
echo "=================================="
echo ""

log_success "✅ Prerequisites checked"
log_success "✅ Dependencies installed"
log_success "✅ Environment variables configured"

if [ -d "certificates" ]; then
    log_success "✅ HTTPS certificates set up"
else
    log_warning "⚠️  HTTPS certificates not set up (WebAuthn may not work)"
fi

if docker-compose ps 2>/dev/null | grep -q "Up"; then
    log_success "✅ Local database running (Docker)"
elif command_exists supabase && supabase status >/dev/null 2>&1; then
    log_success "✅ Local database running (Supabase)"
else
    log_warning "⚠️  Local database not running"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "━━━━━━━━━━━━━"
echo "1. Review your .env.local files and update any placeholder values"
echo "2. Start development servers:"
echo "   pnpm nx run-many --target=dev --all"
echo "3. Open your browser:"
echo "   • Web app: https://localhost:3000"
echo "   • Supabase Studio: http://localhost:54323"
echo ""
echo "🛠️  Useful commands:"
echo "━━━━━━━━━━━━━━━━━"
echo "• Start all services: pnpm nx run-many --target=dev --all"
echo "• Start web only: pnpm nx dev web"
echo "• Start mobile only: pnpm nx dev mobile"
echo "• Run tests: pnpm nx run-many --target=test --all"
echo "• Database management: docker-compose up/down"
echo "• Supabase local: supabase start/stop"
echo "• Generate new secrets: node scripts/generate-secrets.js --write"
echo ""
echo "📚 Documentation:"
echo "━━━━━━━━━━━━━━━━━"
echo "• Development guide: docs/DEVELOPMENT.md"
echo "• Architecture: docs/architecture/"
echo "• API documentation: Generated after first run"
echo ""
echo "Happy coding! 🚀"