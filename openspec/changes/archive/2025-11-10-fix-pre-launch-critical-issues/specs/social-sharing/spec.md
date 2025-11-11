# social-sharing Spec Deltas

## ADDED Requirements

### Requirement: Type-Safe Social Sharing Definitions
The system SHALL provide type-safe TypeScript definitions for all social sharing types, ensuring compile-time safety and preventing runtime type errors.

#### Scenario: Achievement types are used in code
- **WHEN** developers reference achievement types from Prisma schema
- **THEN** achievement types SHALL be imported as values using `import { AchievementType }`
- **AND** achievement types SHALL be usable as enum values in runtime code
- **AND** achievement type constants SHALL be accessible (e.g., `AchievementType.WEIGHT_GOAL_ACHIEVED`)
- **AND** TypeScript SHALL validate achievement type usage at compile time

#### Scenario: Leaderboard types are configured
- **WHEN** leaderboard configuration references leaderboard types
- **THEN** leaderboard types SHALL be imported as values using `import { LeaderboardType }`
- **AND** leaderboard types SHALL be usable as object keys in configuration
- **AND** leaderboard type references SHALL not cause "used as value" errors
- **AND** type safety SHALL be maintained for all leaderboard operations

#### Scenario: Social sharing types are defined
- **WHEN** module defines type definitions in `src/types/social-sharing.ts`
- **THEN** Prisma client types SHALL be imported correctly based on usage
- **AND** type-only imports SHALL use `import type` when used solely as type annotations
- **AND** value imports SHALL use `import` when used as runtime values (enums, constants)
- **AND** all type definitions SHALL pass TypeScript strict mode checks
- **AND** zero type errors SHALL exist in social sharing module

### Requirement: Social Sharing Configuration Type Safety
The system SHALL maintain type-safe configurations for achievements, leaderboards, and share content with proper TypeScript enforcement.

#### Scenario: Achievement configuration is accessed
- **WHEN** code references `ACHIEVEMENT_CONFIG` object
- **THEN** configuration keys SHALL use AchievementType enum values
- **AND** configuration structure SHALL have full TypeScript type definitions
- **AND** intellisense SHALL provide autocomplete for achievement types
- **AND** invalid achievement type references SHALL be caught at compile time

#### Scenario: Leaderboard configuration is accessed
- **WHEN** code references `LEADERBOARD_CONFIG` object
- **THEN** configuration keys SHALL use LeaderboardType enum values
- **AND** leaderboard properties SHALL match defined type structure
- **AND** missing or incorrect leaderboard type names SHALL be caught at compile time
- **AND** configuration SHALL include label, description, unit, sortDirection, and timeframe

#### Scenario: Share content type is validated
- **WHEN** share content is created or processed
- **THEN** content type SHALL match ShareContentType enum
- **AND** privacy level SHALL match SharePrivacyLevel enum
- **AND** social platform references SHALL match SocialPlatform enum
- **AND** type mismatches SHALL be prevented at compile time

### Requirement: Prisma Client Type Integration
The system SHALL properly integrate Prisma Client generated types with application code, maintaining type safety across database and application layers.

#### Scenario: Prisma types are imported
- **WHEN** application code imports types from @prisma/client
- **THEN** generated Prisma types SHALL be available for use
- **AND** enum types SHALL be importable as both types and values
- **AND** model types SHALL be importable as interface types
- **AND** TypeScript SHALL distinguish between type-space and value-space imports

#### Scenario: Prisma enums are used in code
- **WHEN** code uses Prisma-generated enums (AchievementType, LeaderboardType, etc.)
- **THEN** enums SHALL be imported without `type` keyword for runtime use
- **AND** enum values SHALL be accessible as runtime constants
- **AND** enum comparisons SHALL work in runtime code
- **AND** TypeScript SHALL validate enum usage correctly

#### Scenario: Prisma models are used as types
- **WHEN** functions accept or return Prisma model instances
- **THEN** model types SHALL be imported with `type` keyword when used only as types
- **AND** model types SHALL be imported without `type` keyword when instantiated
- **AND** partial types (e.g., Prisma.UserSelect) SHALL be available
- **AND** type inference SHALL work correctly with Prisma queries
