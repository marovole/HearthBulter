# Fix Pre-Launch Critical Issues

## Why

Based on comprehensive pre-launch code review (documented in `PRE_LAUNCH_REVIEW.md`), the system currently has critical issues preventing production deployment with an overall readiness score of 4.6/10:

1. **TypeScript type errors** (100+ errors) blocking build and creating runtime type safety risks
2. **Build failures** due to ESLint errors configured to block deployment
3. **Test failures** with 77.6% test suite failure rate and 5.24% coverage (target: 25%)
4. **Type definition issues** in social-sharing module causing value/type confusion

These issues are classified as **P0 severity** and must be resolved before production launch to prevent:
- Runtime type errors and system crashes
- Failed deployments
- Inadequate test coverage hiding critical bugs
- Poor code maintainability

## What Changes

### Code Quality Fixes
- **BREAKING**: Update all Next.js 15 API route handlers to use async params (100+ files)
- Fix TypeScript type errors in social-sharing module (import type vs import)
- Add missing type definitions and resolve any type usage
- Ensure all TypeScript strict mode checks pass

### Build System Improvements
- Fix ESLint errors preventing builds (require() imports, missing newlines, trailing commas)
- Configure ESLint to allow builds with warnings but block on errors
- Update test configuration to prevent Jest worker exceptions
- Ensure `npm run build` succeeds without errors

### Testing Infrastructure
- Fix Jest worker child process exceptions (4+ failures)
- Resolve load testing configuration (100% error rate → <1%)
- Improve test coverage from 5.24% to minimum 25%
- Fix failing test suites (59/76 suites currently failing)

### Type System Enhancements
- Create proper TypeScript types for social-sharing module
- Ensure proper distinction between type imports and value imports
- Add missing return type annotations
- Fix function signature mismatches

## Impact

### Affected Specs
- `code-quality` - MODIFIED: TypeScript and ESLint requirements
- `testing` - MODIFIED: Test coverage and reliability requirements
- `social-sharing` - ADDED: Type safety requirements (new formal requirements)

### Affected Code
- **API Routes**: ~100+ files in `src/app/api/**/*` (Next.js 15 params changes)
- **Types**: `src/types/social-sharing.ts` (import type fixes)
- **Library Code**:
  - `src/lib/db/index-optimizer.ts` (✅ already fixed)
  - `src/lib/logging/structured-logger.ts` (✅ already fixed)
  - `src/lib/db/query-cache.ts` (✅ already fixed)
  - `src/lib/performance/react-optimization.tsx` (✅ already fixed)
- **Test Files**: `src/__tests__/**/*` (ESLint fixes, Jest config)
- **Configuration**: `jest.config.js`, `.eslintrc.json`, `tsconfig.json`

### Breaking Changes
- **BREAKING**: All API route handlers must update to async params pattern:
  ```typescript
  // Before:
  export async function GET(req: Request, { params }: { params: { id: string } }) {}

  // After:
  export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```

### Migration Notes
- All route handlers accessing `params` need updates
- Tests mocking route handlers must update signatures
- May require Next.js documentation review for migration patterns

### Risk Assessment
- **Low risk**: Most changes are type-level fixes with no runtime behavior changes
- **Medium risk**: Route handler changes require systematic updates across 100+ files
- **Mitigation**: Each change can be tested independently; comprehensive test suite validates correctness

## Success Criteria

### Must Pass (P0)
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit --skipLibCheck` ✅
- [ ] Production build succeeds: `npm run build` ✅
- [ ] Zero P0 TypeScript errors remaining
- [ ] ESLint allows builds to complete
- [ ] Test coverage ≥25% (currently 5.24%)
- [ ] Test suite failure rate <20% (currently 77.6%)
- [ ] Jest worker exceptions resolved

### Should Pass (P1)
- [ ] All ESLint warnings addressed
- [ ] Test coverage ≥50%
- [ ] Load testing error rate <1% (currently 100%)
- [ ] Zero console.log statements in production code

## Timeline Estimate
- **P0 Fixes**: 28-39 hours (4-5 work days)
  - TypeScript fixes: 4-6 hours
  - ESLint auto-fixes: 30 minutes
  - Manual require() fixes: 1 hour
  - Jest worker issues: 2-3 hours
  - Load testing fixes: 2 hours
  - Coverage improvements: 8-12 hours

- **Total with P1**: 40-50 hours (1-1.5 weeks)

## Dependencies
- Next.js 15 documentation for async params migration
- Jest configuration expertise for worker exception debugging
- May need increased test environment memory allocation
