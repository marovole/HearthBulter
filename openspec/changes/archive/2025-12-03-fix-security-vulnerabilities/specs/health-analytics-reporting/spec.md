## ADDED Requirements

### Requirement: Report Access Authorization
The system SHALL enforce ownership verification on all health report API endpoints.

#### Scenario: User requests their own report
- **WHEN** a user requests a health report with their own memberId
- **THEN** the system SHALL verify the memberId belongs to the user's family
- **AND** return the report data if verification succeeds
- **AND** return 403 Forbidden if the user is not authorized

#### Scenario: User attempts cross-tenant report access
- **WHEN** a user provides a reportId belonging to another family
- **THEN** the system SHALL reject the request with 403 Forbidden
- **AND** NOT reveal whether the report exists
- **AND** log the unauthorized access attempt

#### Scenario: User accesses anomaly data
- **WHEN** a user requests health anomaly data
- **THEN** the system SHALL verify the user has access to the target member's data
- **AND** only return anomalies for authorized family members
- **AND** reject cross-family anomaly access with 403

### Requirement: Secure Report Sharing
The system SHALL generate and validate share tokens using cryptographically secure methods.

#### Scenario: Share token is generated for report
- **WHEN** a user requests to share a health report
- **THEN** the system SHALL generate a token using crypto.randomBytes (256 bits minimum)
- **AND** embed expiration time in the token or database
- **AND** associate the token with the specific report and creator
- **AND** NOT use predictable algorithms like Math.random()

#### Scenario: Shared report is accessed via token
- **WHEN** someone accesses a report using a share token
- **THEN** the system SHALL verify the token cryptographically
- **AND** check if the token has expired
- **AND** verify the token matches the requested report
- **AND** increment view count and log access

#### Scenario: Token regeneration requested
- **WHEN** a user regenerates the share token for a report
- **THEN** the system SHALL invalidate the previous token
- **AND** generate a new cryptographically secure token
- **AND** optionally notify users who had the old link

#### Scenario: Expired token is used
- **WHEN** someone attempts to access a report with an expired token
- **THEN** the system SHALL return 410 Gone or appropriate error
- **AND** NOT reveal report contents
- **AND** suggest the user request a new share link from the owner

### Requirement: Report Analytics Input Validation
The system SHALL validate all input for analytics and reporting endpoints.

#### Scenario: Report generation with invalid date range
- **WHEN** a user requests a report with invalid start/end dates
- **THEN** the system SHALL validate date formats and logical consistency
- **AND** return 400 Bad Request with clear error messages
- **AND** NOT process requests with future dates or impossible ranges

#### Scenario: Anomaly query with malformed parameters
- **WHEN** anomaly API receives query parameters with unexpected formats
- **THEN** the system SHALL validate all parameters against schema
- **AND** sanitize memberId and date range values
- **AND** reject requests with potentially malicious input
