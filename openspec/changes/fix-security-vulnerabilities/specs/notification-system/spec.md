## ADDED Requirements

### Requirement: Admin API Security
The system SHALL protect all administrative API endpoints with proper authentication and authorization.

#### Scenario: Scheduler API is accessed
- **WHEN** any user attempts to access /api/admin/scheduler
- **THEN** the system SHALL verify the user is authenticated
- **AND** verify the user has ADMIN role
- **AND** return 401 if not authenticated
- **AND** return 403 if authenticated but not admin

#### Scenario: Admin performs scheduler operation
- **WHEN** an admin starts, stops, or executes scheduler tasks
- **THEN** the system SHALL log the operation with admin user ID
- **AND** record the action, timestamp, and affected tasks
- **AND** provide audit trail for security review

#### Scenario: Unauthorized admin API access attempt
- **WHEN** a non-admin user attempts admin operations
- **THEN** the system SHALL reject with 403 Forbidden
- **AND** log the unauthorized access attempt
- **AND** alert security monitoring if repeated attempts detected

### Requirement: Diagnostic Endpoint Protection
The system SHALL protect or remove diagnostic endpoints in production environments.

#### Scenario: Test endpoint is accessed in production
- **WHEN** /api/test-db or /api/test-auth is accessed in production
- **THEN** the system SHALL either return 404 Not Found
- **OR** require admin authentication for access
- **AND** NOT expose environment variables or system information

#### Scenario: Diagnostic endpoint accessed in development
- **WHEN** diagnostic endpoints are accessed in development environment
- **THEN** the system SHALL verify NODE_ENV is development
- **AND** provide diagnostic information only in non-production
- **AND** never expose sensitive secrets even in development

#### Scenario: Error response handling
- **WHEN** any API endpoint encounters an error
- **THEN** the system SHALL NOT expose stack traces to clients
- **AND** log detailed errors server-side only
- **AND** return generic error messages to users
- **AND** NOT leak system configuration in error responses

### Requirement: Security Alert Notifications
The system SHALL send notifications for security-relevant events.

#### Scenario: Multiple failed authentication attempts
- **WHEN** more than 5 failed login attempts occur for an account
- **THEN** the system SHALL notify the account owner
- **AND** log the event for security review
- **AND** optionally implement temporary lockout

#### Scenario: Unauthorized access attempt detected
- **WHEN** IDOR or privilege escalation attempt is detected
- **THEN** the system SHALL log with high priority
- **AND** optionally notify security administrators
- **AND** track patterns for threat analysis
