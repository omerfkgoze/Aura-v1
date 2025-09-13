#!/bin/bash

# Crypto-only Build Script for Vercel
# This script only builds the WASM crypto components
# Vercel will handle the Next.js build separately

set -e  # Exit on any error

echo "🦀 Building crypto-core WASM module..."

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
fi

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Installing wasm-pack..."
    
    # Install wasm-pack
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    
    echo "✅ wasm-pack installation completed"
fi

# Add cargo to PATH if not already there
export PATH="$HOME/.cargo/bin:$PATH"

# Install wasm32-unknown-unknown target
echo "📦 Adding WASM target..."
rustup target add wasm32-unknown-unknown

# Build crypto-core WASM
echo "🔧 Building crypto-core WASM module..."
cd ../../libs/crypto-core
wasm-pack build --target bundler --out-dir pkg
cd ../..

# Build shared dependencies required by web app
echo "🔧 Building shared dependencies..."
pnpm nx build shared-types utils crypto-core

echo "✅ Crypto build completed successfully!"
echo "🔄 Vercel will now handle the Next.js build automatically..."