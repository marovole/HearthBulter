## ADDED Requirements
### Requirement: Dependency Management
The system SHALL maintain a deterministic and conflict-free dependency tree using a single package manager.

#### Scenario: Lockfile consistency
- **WHEN** developers install or update dependencies
- **THEN** the system SHALL maintain exactly one lockfile (`pnpm-lock.yaml`)
- **AND** `package-lock.json` and `yarn.lock` SHALL NOT exist
- **AND** CI pipelines SHALL fail if multiple lockfiles are detected

#### Scenario: Package manager enforcement
- **WHEN** developers attempt to use `npm` or `yarn`
- **THEN** the system SHALL enforce `pnpm` usage via `engines` field in `package.json`
- **AND** provide clear error messages via `preinstall` checks if possible

## MODIFIED Requirements
### Requirement: TypeScript Compilation
The system SHALL enforce strict TypeScript type checking across all source files and prevent type errors from reaching production by strictly failing builds on any error.

#### Scenario: TypeScript compilation is executed
- **WHEN** developers run type checking via `npx tsc --noEmit` OR `next build`
- **THEN** the compilation SHALL complete with zero type errors
- **AND** `typescript.ignoreBuildErrors` SHALL be set to `false` in `next.config.js`
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

#### Scenario: Database adapter uses generics
- **WHEN** database adapter methods are called
- **THEN** methods SHALL use generic type parameters for type safety
- **AND** return types SHALL be properly typed instead of `any`
- **AND** query builders SHALL preserve type information through the chain
