# Technical Design: Pre-Launch Critical Issues Fix

## Context

The codebase has accumulated critical issues discovered during pre-launch code review:
- TypeScript type errors preventing safe deployment
- Build failures blocking CI/CD pipeline
- Test infrastructure instability (77.6% failure rate)
- Low test coverage (5.24% vs 25% target)

This fix is time-sensitive as it blocks production launch. The changes affect 100+ files but most are systematic, low-risk type-level fixes.

### Constraints
- Must maintain backward compatibility where possible
- Cannot break existing functionality
- Must complete within 1-1.5 weeks
- Changes must be testable incrementally

### Stakeholders
- Development team (immediate unblocking)
- Product team (launch schedule)
- QA team (test infrastructure stability)
- Operations team (deployment readiness)

## Goals / Non-Goals

### Goals
1. **Achieve deployment readiness** - Pass all pre-launch checks
2. **Fix type safety** - Resolve all blocking TypeScript errors
3. **Stabilize testing** - Reduce test failure rate to <20%
4. **Enable builds** - Ensure `npm run build` succeeds
5. **Meet coverage target** - Achieve minimum 25% test coverage

### Non-Goals
1. Feature enhancements (scope limited to fixes only)
2. Performance optimization (unless blocking)
3. UI/UX improvements
4. Refactoring beyond what's necessary for fixes
5. Achieving 100% test coverage (25% is sufficient for launch)

## Decisions

### Decision 1: Next.js 15 Async Params Migration Pattern

**What**: Update all route handlers to use async params pattern

**Why**: Next.js 15 requires params to be awaited as they're now Promises. This is a breaking change from Next.js 14.

**Pattern**:
```typescript
// Standard route with single param
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... rest of handler
}

// Route with multiple params
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string; memberId: string }> }
) {
  const { familyId, memberId } = await params;
  // ... rest of handler
}

// Route with optional params
export async function GET(
  request: Request,
  context: { params?: Promise<Record<string, string>> }
) {
  const params = context.params ? await context.params : {};
  // ... rest of handler
}
```

**Alternatives Considered**:
1. ❌ Downgrade to Next.js 14 - Loses new features and future compatibility
2. ❌ Disable type checking - Unsafe, hides real errors
3. ✅ Systematic migration - Clean, type-safe, future-proof

**Implementation**:
- Create helper utility for consistent param extraction
- Update routes incrementally by API directory
- Update tests to match new signatures

### Decision 2: Import Type vs Import Value Distinction

**What**: Fix `src/types/social-sharing.ts` to properly distinguish type-only imports from value imports

**Why**: TypeScript's `import type` syntax is for types that will be erased at compile time. Using these types as runtime values causes errors.

**Pattern**:
```typescript
// Type-only usage (erased at runtime)
import type { AchievementType } from '@prisma/client';
function foo(type: AchievementType) {} // ✅ OK

// Value usage (needs runtime access)
import { AchievementType } from '@prisma/client';
const config = {
  [AchievementType.WEIGHT_GOAL]: { ... } // ✅ OK - enum value
}

// WRONG: type import used as value
import type { AchievementType } from '@prisma/client';
const x = AchievementType.WEIGHT_GOAL; // ❌ Error!
```

**Alternatives Considered**:
1. ❌ Use separate value enums - Duplicates Prisma types
2. ❌ Disable isolatedModules - Hides important errors
3. ✅ Fix imports correctly - Clean, follows TypeScript best practices

### Decision 3: ESLint Configuration Strategy

**What**: Configure ESLint to allow builds with warnings but block on errors

**Why**: Current config blocks builds on any lint issue, including minor formatting. This is too strict for rapid iteration while maintaining quality gates.

**Configuration**:
```json
{
  "rules": {
    "eol-last": "warn",           // Was error - now allows build
    "comma-dangle": "warn",       // Was error - now allows build
    "@typescript-eslint/no-require-imports": "error", // Keep as error
    "@typescript-eslint/no-explicit-any": "warn",     // Too common to block
    "no-console": "warn"          // Log in code review, don't block
  }
}
```

**Alternatives Considered**:
1. ❌ Disable ESLint entirely - Loses code quality benefits
2. ❌ Keep all errors - Blocks legitimate urgent fixes
3. ✅ Warn for style, error for safety - Balanced approach

### Decision 4: Jest Worker Exception Resolution

**What**: Increase Jest memory limits and reduce worker count to prevent child process crashes

**Why**: Jest workers are hitting memory limits with large test suite, causing 4+ child process exceptions

**Configuration**:
```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',              // Reduce from default 100%
  workerIdleMemoryLimit: '512MB', // Explicit limit
  testTimeout: 10000,             // Increase from 5000ms
  bail: false,                    // Don't stop on first failure
}
```

**Alternatives Considered**:
1. ❌ Increase system memory - Not always available
2. ❌ Skip tests - Unsafe, defeats purpose
3. ✅ Optimize Jest config - Works within constraints

### Decision 5: Test Coverage Strategy

**What**: Focus on API route tests to quickly achieve 25% coverage target

**Why**: API routes are critical paths with highest ROI for test coverage. Currently many routes lack tests entirely.

**Approach**:
1. **Phase 1**: Add basic happy-path tests for untested routes (quick wins)
2. **Phase 2**: Add error handling tests for critical routes
3. **Phase 3**: Add edge case coverage (post-launch)

**Coverage Targets by Layer**:
- API Routes: 40% (from ~10%)
- Services: 30% (from ~5%)
- Components: 15% (from ~3%)
- Overall: 25% (from 5.24%)

**Alternatives Considered**:
1. ❌ Aim for 70% coverage - Too time-consuming for launch
2. ❌ Lower target to 10% - Insufficient quality gate
3. ✅ Targeted 25% with focus on critical paths - Balanced

## Risks / Trade-offs

### Risk 1: Next.js 15 Migration Breaks Functionality
**Impact**: High - Could break all API routes
**Probability**: Low - Pattern is straightforward
**Mitigation**:
- Test each route after migration
- Keep test suite running throughout
- Migrate incrementally by directory
- Easy to rollback individual routes if needed

### Risk 2: Jest Config Changes Affect Test Results
**Impact**: Medium - Could hide real test failures
**Probability**: Low - Changes are conservative
**Mitigation**:
- Document baseline test results before changes
- Compare failure patterns before/after
- Monitor for new test instabilities
- Rollback config if problems emerge

### Risk 3: ESLint Changes Lower Code Quality
**Impact**: Low - Warnings still visible in CI
**Probability**: Medium - Team might ignore warnings
**Mitigation**:
- Code review process still catches issues
- Periodic "warning cleanup" sprints
- CI still reports all warnings
- Can tighten rules post-launch

### Risk 4: Coverage Target Not Met in Time
**Impact**: Medium - May delay launch
**Probability**: Medium - 5% → 25% is 5x increase
**Mitigation**:
- Focus on quick wins (untested routes)
- Use test templates for consistency
- Parallelize test writing across team
- Can adjust target if time constrained (negotiate minimum 20%)

## Migration Plan

### Phase 1: Quick Wins (Day 1-2)
1. Run `npm run lint:fix` - Auto-fix formatting (30 min)
2. Fix require() imports manually (1 hour)
3. Fix social-sharing type imports (1 hour)
4. Fix already-identified syntax errors ✅ (done)
5. Verify builds pass

**Exit Criteria**: `npm run build` succeeds

### Phase 2: TypeScript Migration (Day 2-4)
1. Create migration patterns and helpers
2. Migrate API routes by directory:
   - `/api/analytics` (10 routes)
   - `/api/ecommerce` (12 routes)
   - `/api/families` (20 routes)
   - `/api/members` (15 routes)
   - Other routes (50+ routes)
3. Update route handler tests
4. Verify type checking passes

**Exit Criteria**: `npx tsc --noEmit --skipLibCheck` succeeds with 0 errors

### Phase 3: Test Stabilization (Day 3-5)
1. Fix Jest worker configuration
2. Fix load testing configuration
3. Stabilize failing test suites
4. Add coverage for critical paths
5. Verify test suite stability

**Exit Criteria**:
- Test failure rate <20%
- Test coverage ≥25%
- Jest worker exceptions = 0
- `npm test` completes successfully

### Phase 4: Validation (Day 5)
1. Run all validation commands
2. Deploy to staging environment
3. Run smoke tests
4. Fix any discovered issues
5. Update documentation

**Exit Criteria**: All P0 success criteria met

### Rollback Plan
If major issues discovered:
1. **TypeScript changes**: Revert via git (changes are isolated)
2. **ESLint config**: Restore previous config (single file)
3. **Jest config**: Restore previous config (single file)
4. **Test changes**: Disable problematic tests temporarily

Each phase can be rolled back independently as changes are modular.

## Open Questions

1. **Q**: Should we migrate all 100+ routes at once or incrementally?
   **A**: Incrementally by directory to enable testing and rollback

2. **Q**: What's the minimum acceptable test coverage for launch?
   **A**: 25% firm target, 20% negotiable minimum if time-constrained

3. **Q**: Should we fix P1 issues before launch?
   **A**: No, P0 only. P1 can be post-launch improvements

4. **Q**: Do we need staging environment testing before merging?
   **A**: Yes, critical for validating route handler changes

5. **Q**: How do we handle discovered regressions?
   **A**: Fix immediately if P0, defer if P1, document all

## Success Metrics

### Technical Metrics
- ✅ TypeScript compilation: 0 errors
- ✅ Build success: `npm run build` passes
- ✅ Test coverage: ≥25%
- ✅ Test failure rate: <20%
- ✅ Jest worker exceptions: 0

### Process Metrics
- Timeline: Complete within 5 work days
- Rollbacks: <3 rollbacks during implementation
- Blockers: <2 unexpected major blockers

### Quality Metrics
- Zero production incidents from this change
- No functionality regressions
- Improved developer experience (builds work)
