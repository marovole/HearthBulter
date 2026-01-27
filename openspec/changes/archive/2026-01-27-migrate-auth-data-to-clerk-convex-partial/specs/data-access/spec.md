## ADDED Requirements

### Requirement: Convex as Primary Data Store

The system SHALL use Convex queries and mutations as the sole runtime data access layer.

#### Scenario: Read data

- **WHEN** the application requires persisted data
- **THEN** it SHALL fetch data via Convex query functions
- **AND** direct Supabase/Prisma access SHALL NOT be used at runtime

#### Scenario: Write data

- **WHEN** the application creates or updates data
- **THEN** it SHALL use Convex mutations
- **AND** data SHALL be validated by Convex schemas

### Requirement: Clerk Identity Mapping

The system SHALL map Clerk user ids to Convex user documents via a dedicated `clerkId` field.

#### Scenario: User record upsert

- **WHEN** Clerk emits a user.created or user.updated event
- **THEN** the system SHALL upsert a Convex user document using `clerkId`

## REMOVED Requirements

### Requirement: Supabase/Prisma Runtime Access

**Reason**: Convex replaces Supabase/Prisma as the runtime data layer.
**Migration**: Remove Supabase adapters, Prisma repositories, and direct database calls.
