# ADR-003: Local HTTPS Setup for WebAuthn

**Status:** Accepted

**Date:** 2025-08-30

**Context:**

WebAuthn (Web Authentication) is a critical security feature for the Aura app, enabling:
- Passwordless authentication with biometrics
- Hardware security key support
- Enhanced user privacy and security

However, WebAuthn requires HTTPS to function, even in development. Browser security policies prevent WebAuthn from working over HTTP connections, except for localhost in some browsers. This creates challenges for:
- Local development testing
- Mobile device testing (requires computer IP, not localhost)
- Team development consistency
- CI/CD pipeline testing

**Decision:**

Implement local HTTPS certificates using mkcert with:

1. **mkcert for Certificate Generation**: Creates locally trusted certificates without browser warnings
2. **Multiple Domain Support**: Cover localhost, 127.0.0.1, IPv6, and custom local domain
3. **Mobile Testing Support**: Generate additional certificates with computer IP addresses
4. **Automated Setup Script**: `setup-https.sh` handles entire certificate generation process
5. **Next.js HTTPS Configuration**: Provide configuration examples for development HTTPS server
6. **Fallback Documentation**: Clear instructions for manual certificate generation

**Consequences:**

**Easier:**
- WebAuthn works seamlessly in local development
- No browser security warnings for HTTPS
- Mobile testing possible with IP-based certificates
- Team members have consistent HTTPS setup
- Real-world production-like testing environment

**More Difficult:**
- Additional setup step required for new developers
- mkcert installation dependency
- Certificate management and renewal
- Slightly more complex Next.js configuration
- Platform-specific installation instructions needed

**Alternatives Considered:**

1. **Self-signed certificates**: Rejected due to browser warnings and trust issues
2. **HTTP-only development**: Rejected because WebAuthn won't work
3. **Production-only WebAuthn testing**: Rejected as it slows development cycle
4. **Browser security bypass**: Rejected as unreliable and not production-representative

**Implementation Details:**

**Certificate Generation:**
```bash
mkcert -cert-file certificates/localhost.pem \
       -key-file certificates/localhost-key.pem \
       localhost 127.0.0.1 ::1 \
       local.aura-app.dev *.local.aura-app.dev
```

**Supported Domains:**
- `https://localhost:3000` - Standard localhost
- `https://127.0.0.1:3000` - IP localhost
- `https://local.aura-app.dev:3000` - Custom domain
- `https://[COMPUTER_IP]:3000` - Mobile testing (requires additional certificate)

**Certificate Security:**
- Certificates stored in `certificates/` directory
- Directory added to `.gitignore` to prevent committing
- Proper file permissions set (644 for cert, 600 for key)
- Local CA installed only on developer machines

**Next.js Configuration:**
- Conditional HTTPS configuration for development only
- Automatic certificate loading from `certificates/` directory
- Fallback to HTTP if certificates not available