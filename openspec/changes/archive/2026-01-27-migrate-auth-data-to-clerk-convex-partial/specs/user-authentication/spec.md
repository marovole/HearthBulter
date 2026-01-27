## ADDED Requirements

### Requirement: Clerk-based Authentication

The system SHALL use Clerk as the sole authentication provider for all sign-in and sign-up flows.

#### Scenario: User signs in

- **WHEN** a user accesses the sign-in page
- **THEN** the system SHALL render Clerk SignIn UI
- **AND** successful authentication SHALL create a valid Clerk session

#### Scenario: User signs up

- **WHEN** a user accesses the sign-up page
- **THEN** the system SHALL render Clerk SignUp UI with Google OAuth enabled
- **AND** successful registration SHALL create a valid Clerk session

### Requirement: Protected Route Enforcement

The system SHALL enforce authentication for protected routes using Clerk middleware.

#### Scenario: Access protected route unauthenticated

- **WHEN** a user without a Clerk session requests a protected route
- **THEN** the system SHALL block access and redirect to the sign-in page

#### Scenario: Access protected route authenticated

- **WHEN** a user with a Clerk session requests a protected route
- **THEN** the system SHALL allow access

### Requirement: Clerk Session API Compatibility

The system SHALL expose an internal auth helper that returns current Clerk user details for server-side API routes.

#### Scenario: API route checks authentication

- **WHEN** a server-side API route invokes the auth helper
- **THEN** it SHALL return the current user id, email, and name when authenticated
- **AND** it SHALL return null when unauthenticated

## REMOVED Requirements

### Requirement: NextAuth Session Handling

**Reason**: Clerk replaces NextAuth and becomes the only authentication provider.
**Migration**: Remove NextAuth providers, session helpers, and auth API routes.
