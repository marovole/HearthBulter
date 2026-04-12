## Why

The test suite coverage has dropped to 4.46% (target: 25%) because 49 tests were skipped after Convex migration. This creates significant risk for production stability and makes refactoring dangerous.

## What Changes

- Re-enable skipped tests in phases, prioritizing by fix complexity
- Fix Convex migration-related tests (services now use Convex instead of Prisma)
- Fix component and integration tests with mock issues
- Fix API route tests with service-container mock problems
- Update coverage thresholds to reflect achievable targets

## Impact

- Affected specs: `testing`
- Affected code:
  - `src/__tests__/` (49 skipped test files)
  - `jest.config.js` (testPathIgnorePatterns)
  - `src/lib/services/` (Convex migration)
  - `src/__tests__/mocks/` (mock configurations)
