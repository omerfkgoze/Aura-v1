#!/bin/bash

# Setup local HTTPS certificates for WebAuthn testing
# This script uses mkcert to create locally trusted certificates

set -e

echo "🔐 Setting up local HTTPS certificates for WebAuthn testing..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert is not installed. Please install it first:"
    echo ""
    echo "On macOS:"
    echo "  brew install mkcert"
    echo "  brew install nss # if you use Firefox"
    echo ""
    echo "On Linux:"
    echo "  curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
    echo "  chmod +x mkcert-v*-linux-amd64"
    echo "  sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
    echo ""
    echo "On Windows:"
    echo "  choco install mkcert"
    echo ""
    exit 1
fi

# Create certificates directory
CERT_DIR="./certificates"
mkdir -p "$CERT_DIR"

echo "📁 Created certificates directory: $CERT_DIR"

# Install local CA
echo "🏛️  Installing local Certificate Authority..."
mkcert -install

# Generate certificates for local development
echo "📜 Generating certificates for local development..."
mkcert -cert-file "$CERT_DIR/localhost.pem" -key-file "$CERT_DIR/localhost-key.pem" \
    localhost \
    127.0.0.1 \
    ::1 \
    local.aura-app.dev \
    *.local.aura-app.dev

# Set proper permissions
chmod 644 "$CERT_DIR/localhost.pem"
chmod 600 "$CERT_DIR/localhost-key.pem"

echo "✅ HTTPS certificates generated successfully!"
echo ""
echo "📋 Certificate files:"
echo "  - Certificate: $CERT_DIR/localhost.pem"
echo "  - Private Key: $CERT_DIR/localhost-key.pem"
echo ""
echo "🌐 Your local domains are now trusted:"
echo "  - https://localhost:3000"
echo "  - https://127.0.0.1:3000"
echo "  - https://local.aura-app.dev:3000"
echo ""
echo "📱 For mobile testing, add your computer's IP to the certificate:"
echo "   mkcert -cert-file $CERT_DIR/mobile.pem -key-file $CERT_DIR/mobile-key.pem [YOUR_IP_ADDRESS]"
echo ""
echo "⚠️  Remember to add these certificates to your Next.js configuration!"

# Create a simple Next.js HTTPS configuration snippet
cat > "$CERT_DIR/next-https-config.js" << EOF
// Next.js HTTPS configuration for development
// Add this to your next.config.js file

const fs = require('fs');
const path = require('path');

const httpsConfig = process.env.NODE_ENV === 'development' ? {
  key: fs.readFileSync(path.join(__dirname, 'certificates/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates/localhost.pem')),
} : undefined;

module.exports = {
  // ... your other Next.js config
  
  // Enable HTTPS in development
  ...(httpsConfig && {
    experimental: {
      https: httpsConfig,
    },
  }),
};
EOF

echo "📝 Created Next.js HTTPS configuration example: $CERT_DIR/next-https-config.js"
echo ""
echo "🎉 Setup complete! WebAuthn will now work in your local development environment."