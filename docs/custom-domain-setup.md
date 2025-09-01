# Custom Domain Setup Guide

This guide covers setting up custom domains for the Aura app across different environments and services.

## Overview

The Aura app requires custom domain configuration for:

- **Web Application**: Primary user-facing domain
- **API Endpoints**: Subdomain for API access
- **Staging Environment**: Separate domain for testing
- **SSL Certificates**: Automated certificate management

## Prerequisites

- Domain registrar access (e.g., Namecheap, GoDaddy, Cloudflare)
- Vercel account with domain management permissions
- Supabase project with custom domain support (Pro plan)
- DNS management access

## Domain Structure

Recommended domain structure for Aura:

```
Production:
├── aura.app (or your-domain.com)          → Web application
├── api.aura.app                           → API endpoints (optional)
└── admin.aura.app                         → Admin dashboard (future)

Staging:
├── staging.aura.app                       → Staging web app
├── staging-api.aura.app                   → Staging API
└── dev.aura.app                          → Development previews
```

## Step 1: Domain Registration

### 1.1 Choose Domain Name

For a reproductive health app, consider:

- **Privacy-focused**: Choose a neutral name that doesn't immediately reveal the app's purpose
- **Professional**: Opt for `.app`, `.health`, or `.com` TLD
- **Memorable**: Keep it short and easy to type
- **International**: Ensure it works across different cultures and languages

### 1.2 Register Domain

1. Register your domain through a reputable registrar
2. Enable domain privacy protection
3. Set up 2FA on your registrar account
4. Consider registering multiple TLDs (.com, .app, .health) to prevent squatting

## Step 2: Vercel Domain Configuration

### 2.1 Add Domain to Vercel

```bash
# Using Vercel CLI
vercel domains add aura.app

# Or through Vercel dashboard:
# 1. Go to Project Settings → Domains
# 2. Add aura.app
# 3. Add www.aura.app (redirect to main domain)
```

### 2.2 Configure DNS Records

Add these DNS records at your domain registrar:

```dns
# A Records (for root domain)
Type: A
Name: @
Value: 76.76.19.61

Type: A
Name: @
Value: 76.223.126.88

# CNAME Records (for subdomains)
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: CNAME
Name: staging
Value: cname.vercel-dns.com

Type: CNAME
Name: dev
Value: cname.vercel-dns.com

# API subdomain (if using separate API domain)
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### 2.3 SSL Certificate Configuration

Vercel automatically provisions SSL certificates:

```bash
# Verify SSL certificate
curl -I https://aura.app

# Check certificate details
openssl s_client -connect aura.app:443 -servername aura.app
```

## Step 3: Supabase Custom Domain Setup

### 3.1 Configure Supabase Custom Domain (Pro Plan Required)

1. **Navigate to Project Settings**:
   - Go to Supabase Dashboard
   - Select your project
   - Navigate to Settings → Custom domains

2. **Add Custom Domain**:

   ```
   Domain: db.aura.app
   ```

3. **Configure DNS**:
   ```dns
   Type: CNAME
   Name: db
   Value: [your-project-ref].supabase.co
   ```

### 3.2 Update Environment Variables

Update your environment variables to use custom domains:

```env
# Production
EXPO_PUBLIC_SUPABASE_URL=https://db.aura.app
SUPABASE_URL=https://db.aura.app

# API URLs
EXPO_PUBLIC_API_URL=https://aura.app/api
# or if using separate API domain:
# EXPO_PUBLIC_API_URL=https://api.aura.app
```

## Step 4: Environment-Specific Configuration

### 4.1 Production Environment

```json
// vercel.json - Production configuration
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "EXPO_PUBLIC_SUPABASE_URL": "@supabase-url-prod",
    "SUPABASE_URL": "@supabase-url-prod"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### 4.2 Staging Environment

```bash
# Set up staging domain
vercel domains add staging.aura.app

# Configure staging environment
vercel env add EXPO_PUBLIC_SUPABASE_URL staging
vercel env add SUPABASE_URL staging
```

## Step 5: Security Configuration

### 5.1 HSTS Configuration

Enable HTTP Strict Transport Security:

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 5.2 Content Security Policy

```javascript
// CSP for reproductive health app
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://*.supabase.co'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https://*.supabase.co'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://*.sentry.io'],
  'font-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

const cspString = Object.entries(csp)
  .map(([key, values]) => \`\${key} \${values.join(' ')}\`)
  .join('; ');
```

## Step 6: Domain Verification and Testing

### 6.1 DNS Propagation Check

```bash
# Check DNS propagation
dig aura.app
dig www.aura.app
dig staging.aura.app

# Check from multiple locations
nslookup aura.app 8.8.8.8
nslookup aura.app 1.1.1.1
```

### 6.2 SSL Certificate Verification

```bash
# Test SSL certificate
curl -I https://aura.app
curl -I https://www.aura.app
curl -I https://staging.aura.app

# Check certificate chain
openssl s_client -connect aura.app:443 -showcerts
```

### 6.3 Security Headers Testing

```bash
# Test security headers
curl -I https://aura.app

# Use online tools:
# - https://securityheaders.com/
# - https://www.ssllabs.com/ssltest/
```

## Step 7: Monitoring and Maintenance

### 7.1 Certificate Monitoring

Set up monitoring for SSL certificate expiration:

```javascript
// scripts/check-ssl-certificates.js
import https from 'https';

const domains = [
  'aura.app',
  'www.aura.app',
  'staging.aura.app',
  'db.aura.app'
];

async function checkCertificate(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      agent: false
    };

    const req = https.request(options, (res) => {
      const cert = res.connection.getPeerCertificate();
      const expiryDate = new Date(cert.valid_to);
      const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      resolve({
        domain,
        expiryDate,
        daysUntilExpiry,
        issuer: cert.issuer.O
      });
    });

    req.on('error', (error) => {
      resolve({ domain, error: error.message });
    });

    req.end();
  });
}

// Check all domains
for (const domain of domains) {
  const result = await checkCertificate(domain);
  console.log(\`\${domain}: \${result.daysUntilExpiry} days until expiry\`);
}
```

### 7.2 Performance Monitoring

Monitor domain performance:

```javascript
// Performance testing
const domains = ['aura.app', 'staging.aura.app'];

for (const domain of domains) {
  const start = Date.now();
  const response = await fetch(\`https://\${domain}\`);
  const end = Date.now();

  console.log(\`\${domain}: \${end - start}ms\`);
}
```

## Step 8: Troubleshooting

### Common Issues

1. **DNS Propagation Delays**
   - DNS changes can take 24-48 hours to propagate globally
   - Use DNS checking tools to verify propagation
   - Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS)

2. **SSL Certificate Issues**
   - Ensure DNS is properly configured before SSL provisioning
   - Check Vercel dashboard for certificate status
   - Verify all subdomains are properly configured

3. **CORS Issues with Custom Domains**
   - Update Supabase CORS settings to include new domains
   - Check API endpoint configurations
   - Verify environment variables are updated

4. **Redirect Loops**
   - Check for conflicting redirect rules
   - Verify HTTPS redirect configuration
   - Test with different browsers and incognito mode

### Debug Commands

```bash
# DNS troubleshooting
dig +trace aura.app
nslookup aura.app

# HTTP/HTTPS testing
curl -v https://aura.app
curl -L -v http://aura.app

# Certificate chain
openssl s_client -connect aura.app:443 -servername aura.app

# Vercel domain status
vercel domains ls
vercel certs ls
```

## Security Considerations for Reproductive Health App

1. **Privacy Protection**
   - Use privacy-protected domain registration
   - Implement HSTS preloading
   - Consider additional privacy-focused DNS providers

2. **Geographic Considerations**
   - Be aware of legal restrictions in different regions
   - Consider geo-blocking where necessary
   - Implement appropriate content warnings

3. **Data Protection**
   - Ensure all domains use HTTPS
   - Implement proper CSP headers
   - Use privacy-focused CDN and DNS providers

4. **Access Control**
   - Monitor domain access patterns
   - Implement rate limiting
   - Consider DDoS protection

## Maintenance Checklist

- [ ] Monitor SSL certificate expiration (90-day rotation)
- [ ] Check DNS record integrity monthly
- [ ] Review security headers quarterly
- [ ] Test domain accessibility from different regions
- [ ] Monitor domain performance metrics
- [ ] Update CDN and DNS configurations as needed
- [ ] Review and update privacy policies when domains change
- [ ] Test disaster recovery procedures with backup domains
