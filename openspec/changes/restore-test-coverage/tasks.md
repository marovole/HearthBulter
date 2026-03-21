## Implementation

### Phase 1: Analysis and Classification (COMPLETED)

- [x] 1.1 Document all 49 skipped tests with failure reasons
- [x] 1.2 Classify tests by fix complexity (Convex/prereqs/simple)
- [x] 1.3 Identify which tests can be quickly fixed vs need rewrite

**Analysis Results:**
| Category | Count | Issue |
|----------|-------|-------|
| lib/ai tests | 4 | Test methods don't exist in implementation |
| Component tests | 6 | Mock/component resolution issues |
| API route tests | 8 | service-container mock undefined |
| lib/\* tests | 8 | Convex migration - Prisma mock issue |
| API tests (Convex) | 5 | Convex migration - need rewrite |
| Services tests | 3 | Convex migration - need rewrite |
| Integration tests | 9 | Complex setup, multiple issues |
| Other tests | 3 | Various issues |

### Phase 2: Quick Wins (2-4 hours)

- [x] 2.1 Investigate test failures (PARTIAL)
- [x] 2.2 Fix response-cache.test.ts import (class name mismatch)
- [x] 2.3 Verified: deeper issues require interface alignment

**Key Findings:**

- Most skipped tests have test-implementation interface mismatches
- lib/ai tests expect methods that don't exist in implementation
- API route tests have complex mock setup issues
- Simple class name fix improved 7 tests from "cannot run" to "runtime failures"
- Remaining failures require either test rewrite or implementation additions

### Phase 3: Convex Migration Tests (1-2 days)

- [ ] 3.1 Rewrite inventory-related tests to use Convex mocks (~4 hours)
- [ ] 3.2 Rewrite nutrition-related tests to use Convex mocks (~4 hours)
- [ ] 3.3 Rewrite notification tests to use Convex mocks (~2 hours)
- [ ] 3.4 Rewrite health-data tests to use Convex mocks (~4 hours)

### Phase 4: lib/ai Tests (2-4 hours)

- [ ] 4.1 Align test expectations with actual implementation
- [ ] 4.2 Fix or skip tests with mismatched interfaces

### Phase 5: Complex Integration Tests (1-2 days)

- [ ] 5.1 Fix dashboard integration tests (~4 hours)
- [ ] 5.2 Fix AI workflow integration tests (~4 hours)
- [ ] 5.3 Fix remaining integration tests (~4 hours)

### Phase 6: Validation (2-4 hours)

- [ ] 6.1 Run full test suite and verify all pass
- [ ] 6.2 Update coverage thresholds in jest.config.js
- [ ] 6.3 Run lint and type-check

### Phase 7: Documentation (1 hour)

- [ ] 7.1 Update TESTING_TODO.md with final status
- [ ] 7.2 Archive completed change

**Total Estimated Time: 3-5 days**
