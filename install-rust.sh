#!/bin/bash
# Install Rust for Vercel builds

set -e

echo "Installing Rust..."

# Install rustup if not available
if ! command -v rustup &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    source ~/.cargo/env
fi

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

echo "Rust and wasm-pack installed successfully"