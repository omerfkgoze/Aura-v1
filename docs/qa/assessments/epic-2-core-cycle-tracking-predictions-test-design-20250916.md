# Test Design: Epic 2 - Core Cycle Tracking & Predictions

Date: 2025-09-16
Designer: Quinn (Test Architect)

## Test Strategy Overview

- Total test scenarios: 112
- Unit tests: 45 (40%)
- Integration tests: 42 (38%)
- E2E tests: 25 (22%)
- Priority distribution: P0: 58, P1: 32, P2: 15, P3: 7

## Test Scenarios by Story and Acceptance Criteria

### Story 2.1: Encrypted Local Database Implementation

#### AC1: SQLCipher integration for iOS/Android with AES-256 encryption

| ID           | Level       | Priority | Test                                   | Justification                      |
| ------------ | ----------- | -------- | -------------------------------------- | ---------------------------------- |
| 2.1-UNIT-001 | Unit        | P0       | Validate AES-256 encryption parameters | Cryptographic parameter validation |
| 2.1-UNIT-002 | Unit        | P0       | Test encryption key generation         | Security-critical algorithm        |
| 2.1-INT-001  | Integration | P0       | Database file encryption verification  | File system integration            |
| 2.1-INT-002  | Integration | P0       | SQLCipher iOS native integration       | Platform-specific database ops     |
| 2.1-INT-003  | Integration | P0       | SQLCipher Android native integration   | Platform-specific database ops     |
| 2.1-E2E-001  | E2E         | P0       | Full database encryption workflow      | Critical security path             |

#### AC2: Realm encrypted database implementation for React Native

| ID           | Level       | Priority | Test                             | Justification                 |
| ------------ | ----------- | -------- | -------------------------------- | ----------------------------- |
| 2.1-UNIT-003 | Unit        | P0       | Realm encryption key validation  | Key management logic          |
| 2.1-INT-004  | Integration | P0       | React Native Realm integration   | Cross-platform database layer |
| 2.1-INT-005  | Integration | P0       | Encrypted realm file operations  | Database CRUD with encryption |
| 2.1-E2E-002  | E2E         | P0       | React Native encrypted data flow | Complete encryption workflow  |

#### AC3: Duress wipe functionality

| ID           | Level       | Priority | Test                                | Justification                |
| ------------ | ----------- | -------- | ----------------------------------- | ---------------------------- |
| 2.1-UNIT-004 | Unit        | P0       | Duress PIN validation logic         | Security pattern recognition |
| 2.1-UNIT-005 | Unit        | P0       | Biometric duress sequence detection | Complex detection algorithm  |
| 2.1-INT-006  | Integration | P0       | Database wipe execution             | Critical data destruction    |
| 2.1-INT-007  | Integration | P0       | Secure memory cleanup after wipe    | Security implementation      |
| 2.1-E2E-003  | E2E         | P0       | Complete duress wipe workflow       | Critical security journey    |

#### AC4: Auto-lock mechanism

| ID           | Level       | Priority | Test                            | Justification          |
| ------------ | ----------- | -------- | ------------------------------- | ---------------------- |
| 2.1-UNIT-006 | Unit        | P1       | Idle timeout calculation        | Timer logic validation |
| 2.1-UNIT-007 | Unit        | P1       | Configurable timeout validation | Input validation logic |
| 2.1-INT-008  | Integration | P1       | Background app state detection  | Platform integration   |
| 2.1-E2E-004  | E2E         | P1       | Auto-lock user experience       | User interaction flow  |

#### AC5: Database schema versioning with encrypted migration

| ID           | Level       | Priority | Test                                   | Justification               |
| ------------ | ----------- | -------- | -------------------------------------- | --------------------------- |
| 2.1-UNIT-008 | Unit        | P0       | Schema version comparison logic        | Migration decision logic    |
| 2.1-UNIT-009 | Unit        | P0       | Migration script validation            | Schema transformation logic |
| 2.1-INT-009  | Integration | P0       | Encrypted database migration execution | Critical data migration     |
| 2.1-INT-010  | Integration | P0       | Migration rollback functionality       | Data integrity protection   |
| 2.1-E2E-005  | E2E         | P0       | Full migration workflow testing        | Critical upgrade path       |

#### AC6: Local backup encryption with separate keys

| ID           | Level       | Priority | Test                                | Justification                 |
| ------------ | ----------- | -------- | ----------------------------------- | ----------------------------- |
| 2.1-UNIT-010 | Unit        | P0       | Backup key generation isolation     | Key separation security       |
| 2.1-UNIT-011 | Unit        | P0       | Backup encryption algorithm         | Cryptographic correctness     |
| 2.1-INT-011  | Integration | P0       | Backup file creation and encryption | File system security ops      |
| 2.1-INT-012  | Integration | P0       | Backup restore with key validation  | Backup integrity verification |
| 2.1-E2E-006  | E2E         | P1       | Complete backup/restore cycle       | Full backup workflow          |

#### AC7: Database integrity verification

| ID           | Level       | Priority | Test                          | Justification                |
| ------------ | ----------- | -------- | ----------------------------- | ---------------------------- |
| 2.1-UNIT-012 | Unit        | P0       | Integrity hash calculation    | Hash algorithm validation    |
| 2.1-UNIT-013 | Unit        | P0       | Tamper detection logic        | Security detection algorithm |
| 2.1-INT-013  | Integration | P0       | Database corruption detection | Data integrity protection    |
| 2.1-E2E-007  | E2E         | P0       | Tamper response workflow      | Security response journey    |

### Story 2.2: Menstrual Cycle Data Entry Interface

#### AC1: Period start/end date entry with calendar interface

| ID           | Level       | Priority | Test                               | Justification            |
| ------------ | ----------- | -------- | ---------------------------------- | ------------------------ |
| 2.2-UNIT-014 | Unit        | P1       | Date range validation logic        | Input validation rules   |
| 2.2-UNIT-015 | Unit        | P1       | Calendar date selection validation | UI component logic       |
| 2.2-INT-014  | Integration | P1       | Calendar widget integration        | UI component interaction |
| 2.2-E2E-008  | E2E         | P1       | Period date entry user journey     | Core user workflow       |

#### AC2: Flow intensity tracking with customizable scales

| ID           | Level       | Priority | Test                             | Justification            |
| ------------ | ----------- | -------- | -------------------------------- | ------------------------ |
| 2.2-UNIT-016 | Unit        | P1       | Flow intensity validation        | Data validation logic    |
| 2.2-UNIT-017 | Unit        | P1       | Custom scale configuration logic | Configuration management |
| 2.2-INT-015  | Integration | P1       | Scale persistence and retrieval  | Data storage integration |
| 2.2-E2E-009  | E2E         | P1       | Flow tracking user experience    | Core tracking workflow   |

#### AC3: Symptom logging with categories and custom support

| ID           | Level       | Priority | Test                          | Justification             |
| ------------ | ----------- | -------- | ----------------------------- | ------------------------- |
| 2.2-UNIT-018 | Unit        | P1       | Symptom category validation   | Category management logic |
| 2.2-UNIT-019 | Unit        | P1       | Custom symptom creation logic | Dynamic data model        |
| 2.2-INT-016  | Integration | P1       | Symptom data persistence      | Database operations       |
| 2.2-E2E-010  | E2E         | P1       | Symptom logging user flow     | Feature completeness      |

#### AC4: Immediate local storage with client-side encryption

| ID           | Level       | Priority | Test                                  | Justification                 |
| ------------ | ----------- | -------- | ------------------------------------- | ----------------------------- |
| 2.2-UNIT-020 | Unit        | P0       | Client-side encryption before storage | Security-critical operation   |
| 2.2-UNIT-021 | Unit        | P0       | Immediate storage trigger logic       | Data persistence logic        |
| 2.2-INT-017  | Integration | P0       | Encrypted data write operations       | Database security integration |
| 2.2-E2E-011  | E2E         | P0       | Data entry to encrypted storage flow  | Complete security workflow    |

#### AC5: Data validation preventing impossible entries

| ID           | Level       | Priority | Test                          | Justification                   |
| ------------ | ----------- | -------- | ----------------------------- | ------------------------------- |
| 2.2-UNIT-022 | Unit        | P0       | Date impossibility detection  | Critical data validation        |
| 2.2-UNIT-023 | Unit        | P0       | Data consistency validation   | Logical consistency rules       |
| 2.2-INT-018  | Integration | P1       | Cross-field validation        | Multi-field constraint checking |
| 2.2-E2E-012  | E2E         | P1       | Invalid data entry prevention | User error prevention           |

#### AC6: Batch entry support for historical data

| ID           | Level       | Priority | Test                            | Justification                   |
| ------------ | ----------- | -------- | ------------------------------- | ------------------------------- |
| 2.2-UNIT-024 | Unit        | P2       | Batch data validation logic     | Bulk operation logic            |
| 2.2-INT-019  | Integration | P2       | Batch database operations       | Performance-critical operations |
| 2.2-E2E-013  | E2E         | P2       | Historical data import workflow | Secondary feature workflow      |

#### AC7: Data entry audit trail

| ID           | Level       | Priority | Test                          | Justification          |
| ------------ | ----------- | -------- | ----------------------------- | ---------------------- |
| 2.2-UNIT-025 | Unit        | P1       | Audit log entry creation      | Audit logic validation |
| 2.2-INT-020  | Integration | P1       | Audit trail persistence       | Audit data storage     |
| 2.2-E2E-014  | E2E         | P2       | Modification history tracking | Audit functionality    |

### Story 2.3: Probabilistic Prediction Engine

#### AC1: Bayesian prediction model with cycle variability

| ID           | Level       | Priority | Test                                 | Justification                  |
| ------------ | ----------- | -------- | ------------------------------------ | ------------------------------ |
| 2.3-UNIT-026 | Unit        | P0       | Bayesian model calculation accuracy  | Complex mathematical algorithm |
| 2.3-UNIT-027 | Unit        | P0       | Cycle variability factor computation | Statistical calculation logic  |
| 2.3-UNIT-028 | Unit        | P0       | Personal history integration logic   | Historical data processing     |
| 2.3-INT-021  | Integration | P0       | Model training with historical data  | ML pipeline integration        |
| 2.3-E2E-015  | E2E         | P0       | Prediction generation workflow       | Core prediction functionality  |

#### AC2: Confidence interval calculation (50%, 80%, 95%)

| ID           | Level       | Priority | Test                               | Justification                  |
| ------------ | ----------- | -------- | ---------------------------------- | ------------------------------ |
| 2.3-UNIT-029 | Unit        | P0       | Confidence interval mathematics    | Statistical algorithm accuracy |
| 2.3-UNIT-030 | Unit        | P0       | Multi-level confidence calculation | Complex probability math       |
| 2.3-INT-022  | Integration | P0       | Confidence band data generation    | Prediction system integration  |
| 2.3-E2E-016  | E2E         | P1       | Confidence display to user         | User-facing prediction feature |

#### AC3: Ovulation prediction with uncertainty quantification

| ID           | Level       | Priority | Test                                | Justification                    |
| ------------ | ----------- | -------- | ----------------------------------- | -------------------------------- |
| 2.3-UNIT-031 | Unit        | P0       | Ovulation timing calculation        | Core health prediction algorithm |
| 2.3-UNIT-032 | Unit        | P0       | Uncertainty quantification logic    | Statistical uncertainty modeling |
| 2.3-INT-023  | Integration | P0       | Ovulation model integration         | Health prediction pipeline       |
| 2.3-E2E-017  | E2E         | P1       | Ovulation prediction user interface | Health feature user experience   |

#### AC4: Prediction accuracy tracking with metrics

| ID           | Level       | Priority | Test                                | Justification               |
| ------------ | ----------- | -------- | ----------------------------------- | --------------------------- |
| 2.3-UNIT-033 | Unit        | P0       | Brier score calculation             | Statistical accuracy metric |
| 2.3-UNIT-034 | Unit        | P0       | Negative log-likelihood computation | Advanced statistical metric |
| 2.3-INT-024  | Integration | P1       | Accuracy metrics persistence        | Performance tracking data   |
| 2.3-E2E-018  | E2E         | P2       | Accuracy reporting to user          | Transparency feature        |

#### AC5: Decision regret analysis

| ID           | Level       | Priority | Test                           | Justification                |
| ------------ | ----------- | -------- | ------------------------------ | ---------------------------- |
| 2.3-UNIT-035 | Unit        | P1       | Decision regret calculation    | Advanced analytics algorithm |
| 2.3-INT-025  | Integration | P2       | Regret analysis integration    | Analytics pipeline           |
| 2.3-E2E-019  | E2E         | P3       | Regret analysis user interface | Advanced feature UI          |

#### AC6: Model uncertainty communication via visualizations

| ID           | Level       | Priority | Test                                  | Justification                  |
| ------------ | ----------- | -------- | ------------------------------------- | ------------------------------ |
| 2.3-UNIT-036 | Unit        | P1       | Probability distribution generation   | Visualization data preparation |
| 2.3-INT-026  | Integration | P1       | Visualization component integration   | UI data binding                |
| 2.3-E2E-020  | E2E         | P1       | Interactive uncertainty visualization | User experience feature        |

#### AC7: Prediction calibration validation

| ID           | Level       | Priority | Test                             | Justification              |
| ------------ | ----------- | -------- | -------------------------------- | -------------------------- |
| 2.3-UNIT-037 | Unit        | P0       | Calibration metrics calculation  | Model validation logic     |
| 2.3-INT-027  | Integration | P1       | Calibration validation pipeline  | ML model evaluation        |
| 2.3-E2E-021  | E2E         | P2       | Calibration results presentation | Model transparency feature |

### Story 2.4: Uncertainty Visualization and Explanation API

#### AC1: Uncertainty band visualization

| ID           | Level       | Priority | Test                               | Justification                |
| ------------ | ----------- | -------- | ---------------------------------- | ---------------------------- |
| 2.4-UNIT-038 | Unit        | P1       | Band visualization data generation | Chart data preparation logic |
| 2.4-INT-028  | Integration | P1       | Visualization API integration      | API-UI integration           |
| 2.4-E2E-022  | E2E         | P1       | Interactive uncertainty bands      | Core visualization feature   |

#### AC2: "Why this signal" explanations

| ID           | Level       | Priority | Test                              | Justification                   |
| ------------ | ----------- | -------- | --------------------------------- | ------------------------------- |
| 2.4-UNIT-039 | Unit        | P1       | Factor identification logic       | Explanation algorithm           |
| 2.4-UNIT-040 | Unit        | P1       | Explanation text generation       | Natural language processing     |
| 2.4-INT-029  | Integration | P1       | Explanation API implementation    | Explanation service integration |
| 2.4-E2E-023  | E2E         | P1       | Interactive explanation interface | User explanation experience     |

#### AC3: Historical accuracy display

| ID           | Level       | Priority | Test                              | Justification             |
| ------------ | ----------- | -------- | --------------------------------- | ------------------------- |
| 2.4-UNIT-041 | Unit        | P1       | Historical comparison calculation | Accuracy analysis logic   |
| 2.4-INT-030  | Integration | P1       | Historical data visualization     | Time series data handling |
| 2.4-E2E-024  | E2E         | P2       | Accuracy history user interface   | Transparency feature UI   |

#### AC4: Confidence factor breakdown

| ID           | Level       | Priority | Test                           | Justification                 |
| ------------ | ----------- | -------- | ------------------------------ | ----------------------------- |
| 2.4-UNIT-042 | Unit        | P1       | Factor weight calculation      | Multi-factor analysis logic   |
| 2.4-INT-031  | Integration | P1       | Factor breakdown API           | Analytical API implementation |
| 2.4-E2E-025  | E2E         | P1       | Factor breakdown visualization | Analytical UI feature         |

#### AC5: Interactive uncertainty exploration

| ID           | Level       | Priority | Test                              | Justification              |
| ------------ | ----------- | -------- | --------------------------------- | -------------------------- |
| 2.4-UNIT-043 | Unit        | P2       | Sensitivity analysis calculation  | Interactive analysis logic |
| 2.4-INT-032  | Integration | P2       | Interactive component integration | Advanced UI interactions   |

#### AC6: Calibration metrics display

| ID           | Level       | Priority | Test                           | Justification              |
| ------------ | ----------- | -------- | ------------------------------ | -------------------------- |
| 2.4-UNIT-044 | Unit        | P1       | Calibration visualization data | Metrics visualization prep |
| 2.4-INT-033  | Integration | P2       | Metrics display integration    | Metrics UI integration     |

#### AC7: On-device explanation generation

| ID           | Level       | Priority | Test                          | Justification                  |
| ------------ | ----------- | -------- | ----------------------------- | ------------------------------ |
| 2.4-UNIT-045 | Unit        | P0       | Local explanation algorithm   | Privacy-preserving computation |
| 2.4-INT-034  | Integration | P0       | On-device processing pipeline | Local processing integration   |

### Story 2.5: Offline-First Synchronization Skeleton

#### AC1: Complete offline functionality

| ID           | Level       | Priority | Test                          | Justification               |
| ------------ | ----------- | -------- | ----------------------------- | --------------------------- |
| 2.5-UNIT-046 | Unit        | P0       | Offline mode detection logic  | Core offline functionality  |
| 2.5-INT-035  | Integration | P0       | Offline data operations       | Database offline capability |
| 2.5-E2E-026  | E2E         | P0       | Complete offline user journey | Critical offline workflow   |

#### AC2: P2P synchronization framework

| ID           | Level       | Priority | Test                            | Justification                |
| ------------ | ----------- | -------- | ------------------------------- | ---------------------------- |
| 2.5-UNIT-047 | Unit        | P0       | P2P protocol implementation     | Network protocol logic       |
| 2.5-UNIT-048 | Unit        | P0       | Device-to-device key exchange   | Cryptographic key management |
| 2.5-INT-036  | Integration | P0       | P2P network layer integration   | Network stack integration    |
| 2.5-INT-037  | Integration | P0       | Encrypted P2P data transmission | Secure communication channel |

#### AC3: Encrypted backup key generation

| ID           | Level       | Priority | Test                       | Justification            |
| ------------ | ----------- | -------- | -------------------------- | ------------------------ |
| 2.5-UNIT-049 | Unit        | P0       | Backup key isolation logic | Security key separation  |
| 2.5-INT-038  | Integration | P0       | Key generation integration | Cryptographic operations |

#### AC4: Conflict resolution strategy

| ID           | Level       | Priority | Test                           | Justification                |
| ------------ | ----------- | -------- | ------------------------------ | ---------------------------- |
| 2.5-UNIT-050 | Unit        | P0       | Conflict detection algorithm   | Data consistency logic       |
| 2.5-UNIT-051 | Unit        | P0       | Resolution strategy logic      | Conflict resolution rules    |
| 2.5-INT-039  | Integration | P0       | Multi-device conflict handling | Distributed data consistency |

#### AC5: Synchronization status indicators

| ID          | Level       | Priority | Test                         | Justification           |
| ----------- | ----------- | -------- | ---------------------------- | ----------------------- |
| 2.5-INT-040 | Integration | P1       | Status indicator integration | UI status communication |
| 2.5-E2E-027 | E2E         | P1       | Sync status user experience  | User feedback mechanism |

#### AC6: Network-optional design

| ID          | Level       | Priority | Test                         | Justification      |
| ----------- | ----------- | -------- | ---------------------------- | ------------------ |
| 2.5-INT-041 | Integration | P0       | Graceful network degradation | Network resilience |

#### AC7: Sync audit trail

| ID          | Level       | Priority | Test                             | Justification              |
| ----------- | ----------- | -------- | -------------------------------- | -------------------------- |
| 2.5-INT-042 | Integration | P1       | Audit trail without content leak | Privacy-preserving logging |

## Test Execution Recommendations

### Phase 1: Critical Security (P0 Tests)

Execute all P0 tests first - these cover encryption, data security, and core functionality. Total: 58 tests.

### Phase 2: Core Functionality (P1 Tests)

Focus on user-facing features and core workflows. Total: 32 tests.

### Phase 3: Secondary Features (P2 Tests)

Advanced features and nice-to-have functionality. Total: 15 tests.

### Phase 4: Enhancement Features (P3 Tests)

Low-priority and rarely-used features. Total: 7 tests.

## Risk Coverage Analysis

### High-Risk Areas Covered:

- **Encryption & Security**: 28 scenarios covering SQLCipher, Realm encryption, key management
- **Data Integrity**: 15 scenarios covering validation, conflicts, migrations
- **Prediction Accuracy**: 12 scenarios covering Bayesian models, calibration
- **Offline Functionality**: 8 scenarios covering offline-first operations

### Test Coverage by Level:

- **Unit Tests (45)**: Focus on algorithms, calculations, validation logic
- **Integration Tests (42)**: Database operations, API integrations, platform-specific code
- **E2E Tests (25)**: Complete user journeys, critical security workflows

## Quality Gates

This epic requires:

- ≥95% P0 test coverage before production release
- ≥90% P1 test coverage for feature completeness
- All encryption and security tests (P0) must pass with zero failures
- Prediction accuracy tests must validate within acceptable statistical bounds

## Test Dependencies

### Required Test Data:

- Historical cycle data for model training (anonymized)
- Encrypted database test fixtures
- P2P network simulation environment
- Cross-platform test devices (iOS/Android)

### Infrastructure Requirements:

- Secure test environment for encryption testing
- Offline testing capability
- Multi-device test setup for P2P functionality
- Performance monitoring for prediction algorithms
