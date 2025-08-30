# Aura Development Troubleshooting Guide

Quick solutions for common development environment issues.

## 🚨 Emergency Fixes

### "Nothing Works" - Complete Reset

```bash
# Nuclear option - reset everything
docker-compose down -v
rm -rf node_modules .nx certificates
pnpm install
./scripts/dev-setup.sh
```

---

## 🔧 Environment Issues

### Environment Validation Failed

**Symptoms:**
```
❌ Missing required environment variables: NEXTAUTH_SECRET, DEVICE_HASH_PEPPER
📝 Copy .env.example to .env.local and fill in the values
```

**Solution:**
```bash
# Regenerate all secrets
node scripts/generate-secrets.js --write

# Verify secrets are generated
grep -E "^[A-Z_]+=" .env.local | wc -l  # Should show multiple lines
```

### "Insecure environment variables detected"

**Symptoms:**
```
⚠️ Insecure environment variables detected: NEXTAUTH_SECRET (too short: 16 chars, minimum 32)
```

**Solution:**
```bash
# Generate new secure secrets
node scripts/generate-secrets.js --write

# Check secret lengths
grep NEXTAUTH_SECRET .env.local | cut -d'=' -f2 | wc -c  # Should be > 32
```

---

## 🐳 Docker Issues

### Containers Won't Start

**Symptoms:**
```bash
docker-compose ps
# Shows "Exit 1" or "Restarting"
```

**Solutions:**

**Option 1: Port conflicts**
```bash
# Check what's using port 54322
lsof -i :54322
kill [PID_IF_NEEDED]

# Restart containers
docker-compose down
docker-compose up -d
```

**Option 2: Disk space**
```bash
# Clean Docker
docker system prune -af
docker volume prune -f

# Restart
docker-compose up -d
```

**Option 3: Reset volumes**
```bash
# Complete reset (DELETES ALL DATA)
docker-compose down -v
docker-compose up -d
```

### Database Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:54322
```

**Solution:**
```bash
# Wait for database to be ready
docker-compose logs postgres

# Should see: "database system is ready to accept connections"
# If not, restart:
docker-compose restart postgres
```

---

## 🗄️ Supabase Issues

### "supabase start" Fails

**Symptoms:**
```
Error: Docker not running
```

**Solution:**
```bash
# Start Docker Desktop first, then:
supabase stop
supabase start

# Check status
supabase status
```

### Missing Supabase CLI

**Solution:**
```bash
# Install globally
npm install -g @supabase/cli

# Verify installation
supabase --version
```

### Local Supabase Wrong Version

**Symptoms:**
```
Error: Please upgrade your CLI to the latest version
```

**Solution:**
```bash
# Update CLI
npm update -g @supabase/cli

# Reset local environment
supabase stop
supabase start
```

---

## 🔐 HTTPS/Certificate Issues

### mkcert Not Found

**Symptoms:**
```
❌ mkcert is not installed
```

**Solutions:**

**macOS:**
```bash
brew install mkcert
brew install nss  # For Firefox support
```

**Linux:**
```bash
curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

**Windows:**
```bash
choco install mkcert
```

### Certificates Not Trusted

**Symptoms:**
- Browser shows "Not Secure" warning
- ERR_CERT_AUTHORITY_INVALID

**Solution:**
```bash
# Reinstall local CA
mkcert -uninstall
mkcert -install

# Regenerate certificates
rm -rf certificates/
./scripts/setup-https.sh
```

### Mobile Device Won't Connect (HTTPS)

**Symptoms:**
- Mobile app can't connect to development server
- Certificate errors on mobile

**Solution:**
```bash
# Find your computer's IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Or: ipconfig getifaddr en0

# Generate mobile certificate (replace YOUR_IP)
mkcert -cert-file certificates/mobile.pem \
       -key-file certificates/mobile-key.pem \
       192.168.1.100 localhost 127.0.0.1

# Update Next.js to use mobile certificate
```

---

## 📱 Mobile Development Issues

### Expo Won't Start

**Symptoms:**
```
Error: Expo CLI not found
```

**Solution:**
```bash
# Install Expo CLI
npm install -g @expo/cli

# Or use npx
npx expo start
```

### Metro Bundler Issues

**Symptoms:**
- "Unable to resolve module"
- Build hanging

**Solution:**
```bash
# Clear Metro cache
pnpm nx run mobile:start --clear

# Or reset everything
cd apps/mobile
rm -rf node_modules .expo
cd ../..
pnpm install
```

### Can't Connect to Development Server

**Symptoms:**
- QR code scanned but app won't load
- "Network request failed"

**Solutions:**

**Check your computer's IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Update environment variables:**
```bash
# In .env.local, replace with your IP
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

**Firewall issues:**
```bash
# macOS - allow Node.js through firewall
# System Preferences > Security & Privacy > Firewall > Options
# Allow "Node" and "Expo"
```

---

## ⚡ Performance Issues

### Slow Build Times

**Solutions:**

**Clear caches:**
```bash
# Clear Nx cache
pnpm nx reset

# Clear npm cache
npm cache clean --force

# Clear Node modules
rm -rf node_modules
pnpm install
```

**Check disk space:**
```bash
df -h
# Ensure you have at least 5GB free
```

### High Memory Usage

**Solutions:**

**Limit Node.js memory:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm nx run-many --target=dev --all
```

**Docker memory limits:**
```bash
# In docker-compose.yml, add to postgres service:
deploy:
  resources:
    limits:
      memory: 512M
```

### Database Connection Timeouts

**Symptoms:**
```
Error: timeout exceeded when trying to connect
```

**Solution:**
```bash
# Increase Docker memory in Docker Desktop
# Settings > Resources > Memory: 4GB+

# Check Docker resources
docker stats
```

---

## 🚦 Package/Dependency Issues

### pnpm Install Fails

**Symptoms:**
```
ERR_PNPM_NO_MATCHING_VERSION
```

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove lock file and reinstall
rm pnpm-lock.yaml
pnpm install
```

### TypeScript Errors

**Symptoms:**
```
Type 'string' is not assignable to type 'never'
```

**Solutions:**

**Regenerate types:**
```bash
# If using Supabase
supabase gen types typescript > libs/shared-types/src/supabase.ts

# Check TypeScript config
pnpm nx run utils:type-check
```

**Clear TypeScript cache:**
```bash
# Remove TypeScript build info
find . -name "*.tsbuildinfo" -delete
pnpm nx run-many --target=build --all
```

### Nx Issues

**Symptoms:**
```
Cannot find project 'utils'
```

**Solution:**
```bash
# Reset Nx workspace
pnpm nx reset

# Verify project configuration
pnpm nx show projects
```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

```bash
# Environment variable
export DEBUG=*
pnpm nx run-many --target=dev --all

# Or for specific services
export DEBUG=aura:*
```

### Check Service Status

```bash
# Docker services
docker-compose ps
docker-compose logs [service-name]

# Supabase services
supabase status
supabase logs

# Node.js processes
ps aux | grep node
```

### Validate Environment

```bash
# Check all environment variables are loaded
node -e "console.log(process.env)" | grep -E "(SUPABASE|EXPO|NEXTAUTH|DEVICE)"

# Test environment validation
node -e "
const { validateFrontendEnv } = require('./libs/utils/src/env-validation');
try {
  console.log('✅ Frontend env valid');
  validateFrontendEnv(process.env);
} catch (e) {
  console.log('❌ Frontend env invalid:', e.message);
}
"
```

---

## 📞 Getting Help

### Still Stuck?

1. **Check logs:**
   ```bash
   # Docker logs
   docker-compose logs
   
   # Application logs
   pnpm nx run web:dev --verbose
   ```

2. **Health check:**
   ```bash
   curl http://localhost:3000/api/dev/health
   ```

3. **Create an issue:**
   - Include error message
   - Include environment info (OS, Node version, Docker version)
   - Include steps to reproduce

### Environment Info

```bash
# Gather system info for bug reports
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "Docker: $(docker --version)"
echo "Supabase: $(supabase --version)"
```

---

**Remember:** When in doubt, try the "Complete Reset" at the top of this guide! 🔄