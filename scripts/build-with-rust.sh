#!/bin/bash

# Vercel Build Script with Rust Installation
# This script installs Rust and builds the Aura app for deployment

set -e  # Exit on any error

echo "🚀 Starting Aura build process..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust and Cargo..."
    
    # Install Rust using rustup
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Source the cargo environment
    source $HOME/.cargo/env
    
    # Verify installation
    rustc --version
    cargo --version
    
    echo "✅ Rust installation completed"
else
    echo "✅ Rust is already installed"
fi

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Installing wasm-pack..."
    
    # Install wasm-pack
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    
    # Verify installation
    wasm-pack --version
    
    echo "✅ wasm-pack installation completed"
else
    echo "✅ wasm-pack is already installed"
fi

# Add cargo to PATH if not already there
export PATH="$HOME/.cargo/bin:$PATH"

# Install wasm32-unknown-unknown target
echo "📦 Adding WASM target..."
rustup target add wasm32-unknown-unknown

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    exit 1
fi

# Build the application
echo "🔧 Building Aura application..."

# Build crypto-core WASM first (explicitly)
echo "🦀 Building crypto-core WASM module..."
cd libs/crypto-core
wasm-pack build --target bundler --out-dir pkg
cd ../..

# Install dependencies if needed
echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile

# Build dependencies first
echo "🔧 Building shared dependencies..."
pnpm nx build shared-types utils crypto-core

# Build web app directly (avoiding NX environment issues)
echo "🔧 Building web application..."
cd apps/web
export NODE_ENV=production
npm run build
cd ../..

echo "✅ Build completed successfully!"