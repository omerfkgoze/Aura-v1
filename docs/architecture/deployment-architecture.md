# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**

- **Platform:** Vercel for web, Expo Application Services (EAS) for mobile
- **Build Command:** `pnpm nx build web && pnpm nx build mobile`
- **Output Directory:** `dist/apps/web`, mobile builds via EAS
- **CDN/Edge:** Vercel Edge Network with global distribution

**Backend Deployment:**

- **Platform:** Vercel Serverless Functions + Supabase managed backend
- **Build Command:** `pnpm nx build api`
- **Deployment Method:** Serverless functions with RLS enforcement

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit
      - run: pnpm nx run-many --target=security-check --all
      - run: pnpm nx run crypto-core:security-audit

  test:
    runs-on: ubuntu-latest
    needs: security-audit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx run-many --target=test --all
      - run: pnpm nx run-many --target=e2e --all

  deploy-staging:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    steps:
      - run: pnpm nx deploy staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: pnpm nx deploy production
```

## Environments

| Environment | Frontend URL                    | Backend URL                         | Purpose                           |
| ----------- | ------------------------------- | ----------------------------------- | --------------------------------- |
| Development | http://localhost:19006          | http://localhost:3000               | Local development with hot reload |
| Staging     | https://aura-staging.vercel.app | https://aura-staging.vercel.app/api | Pre-production testing and QA     |
| Production  | https://aura.app                | https://aura.app/api                | Live environment for end users    |
