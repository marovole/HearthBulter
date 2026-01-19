## 1. Implementation

- [ ] 1.1 Inventory all Prisma/Supabase runtime usages (APIs, services, hooks, tests)
- [ ] 1.2 Replace NextAuth session usage with Clerk (frontend pages + middleware)
- [ ] 1.3 Implement Clerk auth helper for server routes and update API auth checks
- [ ] 1.4 Add Clerk webhook endpoint and Convex user upsert mutation
- [ ] 1.5 Update Convex schema to include clerkId + indexes
- [ ] 1.6 Refactor Convex queries/mutations to rely on Clerk identity
- [ ] 1.7 Add Convex access-control helpers (member/family/budget/notification) and apply to API routes
- [ ] 1.8 Migrate budget APIs to Convex queries/mutations and enforce access checks
- [ ] 1.9 Migrate notification APIs to Convex queries/mutations and enforce access checks
- [ ] 1.10 Migrate tracking photo upload + recognition/correction to Convex data + Convex Storage
- [ ] 1.11 Migrate remaining Prisma/Supabase services to Convex or retire unused paths
- [ ] 1.12 Replace Supabase file storage service with Convex Storage service
- [ ] 1.13 Implement Convex-based rate limiting and update middleware/API usage
- [ ] 1.14 Remove Supabase adapters, Prisma repositories, and runtime DB utilities
- [ ] 1.15 Remove Supabase/Prisma dependencies and scripts from package.json
- [ ] 1.16 Update environment variables and deployment configuration
- [ ] 1.17 Update tests/mocks for Clerk + Convex auth + storage + rate limiting
- [ ] 1.18 Run unit/integration/e2e test suites and fix regressions

## 2. Verification

- [ ] 2.1 Clerk sign-in/sign-up works with Google OAuth
- [ ] 2.2 Protected routes reject unauthenticated access
- [ ] 2.3 Convex data read/write works for core flows
- [ ] 2.4 Member-scoped APIs reject unauthorized access (IDOR prevention)
- [ ] 2.5 Webhook syncs Clerk users into Convex
- [ ] 2.6 File upload/download works via Convex Storage
- [ ] 2.7 Rate limiting works across multiple instances
- [ ] 2.8 Build and type-check succeed in CI
