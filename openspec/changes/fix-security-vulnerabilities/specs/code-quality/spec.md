## ADDED Requirements

### Requirement: API Authorization Enforcement
The system SHALL enforce authorization checks on all API endpoints to prevent unauthorized data access.

#### Scenario: User accesses resource they own
- **WHEN** a user requests data for a resource they own (e.g., their family member data)
- **THEN** the system SHALL verify the user has ownership or membership rights
- **AND** allow access only if verification succeeds
- **AND** return 403 Forbidden if verification fails

#### Scenario: User attempts cross-tenant access
- **WHEN** a user provides a memberId or resourceId belonging to another family
- **THEN** the system SHALL reject the request with 403 Forbidden
- **AND** log the attempted unauthorized access
- **AND** NOT leak information about whether the resource exists

#### Scenario: Admin accesses protected resources
- **WHEN** an administrator accesses admin-only endpoints
- **THEN** the system SHALL verify the user has ADMIN role
- **AND** allow access only to users with explicit admin permissions
- **AND** log all admin actions for audit purposes

### Requirement: Secure Token Generation
The system SHALL generate cryptographically secure tokens for all security-sensitive operations.

#### Scenario: Share token is generated
- **WHEN** a share token is created for reports or content
- **THEN** the system SHALL use crypto.randomBytes or Web Crypto API
- **AND** generate tokens with at least 256 bits of entropy
- **AND** NOT use Math.random() or Date.now() for token generation

#### Scenario: Token verification
- **WHEN** a share token is used to access shared content
- **THEN** the system SHALL verify the token cryptographically
- **AND** check token expiration before granting access
- **AND** verify the token belongs to the requested resource

### Requirement: Sensitive Data Encryption
The system SHALL encrypt sensitive data at rest using AES-256-GCM.

#### Scenario: Third-party credentials are stored
- **WHEN** storing OAuth tokens or API keys for external services
- **THEN** the system SHALL encrypt the credentials before storage
- **AND** use unique initialization vectors for each encryption
- **AND** store encrypted data with version and IV metadata

#### Scenario: Encrypted data is retrieved
- **WHEN** retrieving encrypted credentials
- **THEN** the system SHALL decrypt data only when needed
- **AND** NOT log decrypted sensitive values
- **AND** handle decryption failures gracefully

### Requirement: Database Client Privilege Separation
The system SHALL separate database client privileges based on operation context.

#### Scenario: User request accesses database
- **WHEN** an API request needs database access
- **THEN** the system SHALL use an auth-bound client with user context
- **AND** NOT use service-level credentials for user requests
- **AND** respect row-level security policies

#### Scenario: Background job accesses database
- **WHEN** a scheduled task or background job needs database access
- **THEN** the system SHALL use service credentials with explicit reason logging
- **AND** limit service client scope to required operations
- **AND** audit all service-level database operations

## MODIFIED Requirements

### Requirement: TypeScript Compilation
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

#### Scenario: Database adapter uses generics
- **WHEN** database adapter methods are called
- **THEN** methods SHALL use generic type parameters for type safety
- **AND** return types SHALL be properly typed instead of `any`
- **AND** query builders SHALL preserve type information through the chain

### Requirement: Security Vulnerability Prevention
The system SHALL prevent common security vulnerabilities including SQL injection, XSS, CSRF, IDOR, and rate limiting abuse.

#### Scenario: System processes user-generated content
- **WHEN** displaying user input in web pages
- **THEN** the system SHALL escape all HTML/JavaScript content
- **AND** implement content security policies
- **AND** validate all user input before storage

#### Scenario: System detects potential attacks
- **WHEN** unusual request patterns are detected
- **THEN** the system SHALL implement rate limiting and IP blocking
- **AND** alert administrators of potential security threats
- **AND** log all suspicious activities for audit

#### Scenario: API endpoint receives resource identifier
- **WHEN** an API receives memberId, familyId, or other resource identifiers
- **THEN** the system SHALL verify the caller has access to the resource
- **AND** NOT trust client-provided identifiers without validation
- **AND** implement defense in depth with multiple authorization checks

#### Scenario: Query filters are constructed from user input
- **WHEN** building database queries with user-provided filter values
- **THEN** the system SHALL use parameterized queries or query builder APIs
- **AND** NOT concatenate user input directly into query strings
- **AND** validate and sanitize all filter values before use
