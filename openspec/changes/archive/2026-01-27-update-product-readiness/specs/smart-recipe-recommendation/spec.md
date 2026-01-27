## ADDED Requirements

### Requirement: Recommendation Data Source Compatibility

The system SHALL provide a Supabase-compatible data source for the recommendation engine.

#### Scenario: Nested relation loading

- **WHEN** recommendation queries require ingredient relations
- **THEN** the data source SHALL return nested relations without runtime errors

#### Scenario: Order-by arrays

- **WHEN** queries include multi-field orderBy arrays
- **THEN** the data source SHALL preserve ordering semantics

#### Scenario: JSON filter compatibility

- **WHEN** recommendation filters use JSON fields
- **THEN** the data source SHALL provide equivalent filtering behavior
