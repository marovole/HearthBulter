# code-quality Spec Deltas

## MODIFIED Requirements

### Requirement: TypeScript Type Safety Enforcement
The system SHALL enforce strict TypeScript type checking across all source files and prevent type errors from reaching production.

#### Scenario: TypeScript compilation is executed
- **WHEN** developers run type checking via `npx tsc --noEmit`
- **THEN** the compilation SHALL complete with zero type errors
- **AND** all route handlers SHALL use correct Next.js 15 async params typing
- **AND** type imports SHALL be distinguished from value imports correctly
- **AND** no `any` types SHALL be used without explicit justification

#### Scenario: API route handlers are implemented
- **WHEN** developers create or modify Next.js API routes with dynamic parameters
- **THEN** route handlers SHALL declare params as `Promise<Record<string, string>>`
- **AND** route handlers SHALL await params before accessing values
- **AND** type safety SHALL be enforced at compile time
- **AND** route handler signatures SHALL match Next.js 15 specifications

#### Scenario: Type definitions are imported
- **WHEN** modules import types from external packages
- **THEN** type-only imports SHALL use `import type` syntax when used only as types
- **AND** value imports SHALL use regular `import` syntax when used as runtime values
- **AND** TypeScript's `isolatedModules` check SHALL validate import correctness
- **AND** build SHALL fail if type/value imports are confused

### Requirement: ESLint Code Quality Standards
The system SHALL enforce ESLint rules to maintain code quality while allowing builds with non-critical warnings.

#### Scenario: Code is linted during build
- **WHEN** production build is executed via `npm run build`
- **THEN** ESLint SHALL check all source files
- **AND** critical errors SHALL block the build (e.g., require() imports, type errors)
- **AND** style warnings SHALL be reported but not block the build
- **AND** all require() style imports SHALL be converted to ES6 imports

#### Scenario: Code formatting issues exist
- **WHEN** developers run `npm run lint:fix`
- **THEN** auto-fixable issues SHALL be corrected automatically (newlines, trailing commas)
- **AND** manual fixes SHALL be required for complex issues
- **AND** build SHALL succeed after running lint:fix
- **AND** remaining warnings SHALL be documented for later cleanup

#### Scenario: Code quality is validated
- **WHEN** code is submitted for review
- **THEN** ESLint SHALL report all issues (errors and warnings)
- **AND** CI pipeline SHALL pass if only warnings exist
- **AND** developers SHALL address errors before merging
- **AND** warnings SHALL be tracked for periodic cleanup

## ADDED Requirements

### Requirement: Function Complexity Limits
The system SHALL enforce maximum function complexity limits to maintain code readability and testability.

#### Scenario: Functions exceed complexity threshold
- **WHEN** ESLint analyzes function complexity
- **THEN** functions with complexity >15 SHALL trigger warnings
- **AND** functions with complexity >20 SHALL trigger errors
- **AND** complex functions SHALL be refactored into smaller units
- **AND** complexity metrics SHALL be reported in code review

#### Scenario: Code refactoring is needed
- **WHEN** developers encounter high-complexity functions
- **THEN** functions SHALL be decomposed into logical sub-functions
- **AND** extracted logic SHALL have clear single responsibilities
- **AND** complexity SHALL be reduced to acceptable levels (≤15)
- **AND** tests SHALL verify refactored behavior matches original
