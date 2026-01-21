# HearthBulter Pre-Launch Checklist

## Overview

This document provides verification steps before deploying HearthBulter to production after the Supabase-to-Neon migration.

## Migration Summary

| Phase     | Description                 | Status      |
| --------- | --------------------------- | ----------- |
| Phase 1-4 | Neon adapter implementation | ✅ Complete |
| Phase 5   | Core Supabase removal       | ✅ Complete |
| Phase 6   | Package cleanup             | ✅ Complete |
| Test Fix  | Jest mock updates           | ✅ Complete |

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure these are configured in Cloudflare Dashboard:

| Variable                            | Required | Description                       |
| ----------------------------------- | -------- | --------------------------------- |
| `DATABASE_URL`                      | ✅ Yes   | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY`                  | ✅ Yes   | Clerk authentication secret       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes   | Clerk public key                  |
| `OPENAI_API_KEY`                    | Optional | For AI features                   |
| `UPSTASH_REDIS_REST_URL`            | Optional | For caching                       |
| `UPSTASH_REDIS_REST_TOKEN`          | Optional | For caching                       |

### 2. Local Verification

```bash
# Verify build passes
pnpm build

# Run tests
pnpm test

# Check for any remaining Supabase references
grep -rl "supabase" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
```

### 3. Database Verification

```bash
# Verify Prisma schema is in sync
pnpm db:generate

# Push schema to Neon (if not done)
pnpm db:push
```

### 4. Cloudflare Deployment

```bash
# Deploy to preview environment
pnpm deploy:preview

# Or deploy to production
pnpm deploy
```

## Post-Deployment Verification

### Core Flows to Test

1. **Authentication**
   - [ ] User signup works
   - [ ] User login works
   - [ ] Session persists after refresh

2. **Dashboard**
   - [ ] Dashboard loads without errors
   - [ ] Data displays correctly from Neon DB
   - [ ] Charts render properly

3. **Health Data**
   - [ ] Can add new health data entries
   - [ ] Historical data displays correctly
   - [ ] Trends calculation works

4. **Meal Planning**
   - [ ] Can create meal plans
   - [ ] Can add meals to plans
   - [ ] Nutrition calculations work

5. **AI Features** (if OPENAI_API_KEY configured)
   - [ ] AI chat responds
   - [ ] Health analysis works
   - [ ] Recipe optimization works

## Build Metrics

Current build output:

- **Build Status**: ✅ SUCCESS
- **Test Coverage**: 87% (633/728 passing)
- **Middleware Size**: 85.5 kB
- **Dashboard First Load**: 311 kB

## Known Deprecations

The following warnings appear during build but do not affect functionality:

- `fetchConnectionCache` option deprecated (Prisma) - Now always `true`
- `baseline-browser-mapping` data over two months old - Optional update

## Rollback Plan

If issues occur after deployment:

1. Revert to the last known good commit:

   ```bash
   git revert HEAD~N  # where N is number of commits to revert
   ```

2. Restore Supabase configuration (if needed):
   - Environment variables in Cloudflare
   - Re-add `@supabase/supabase-js` dependency

## Contact

For migration-related issues, check:

- `/docs/plans/supabase-to-neon-migration.md`
- GitHub Issues

---

_Last updated: January 21, 2026_
