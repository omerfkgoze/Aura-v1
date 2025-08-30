# Epic 2: Core Cycle Tracking & Predictions

**Epic Goal:** Implement secure local data storage with SQLCipher/Realm encryption, probabilistic menstrual cycle prediction engine with uncertainty quantification and calibration metrics, plus offline-first synchronization framework enabling reliable cycle tracking without network dependency.

## Story 2.1: Encrypted Local Database Implementation

As a privacy-conscious user,
I want my menstrual cycle data stored in an encrypted local database with duress protection,
so that my data remains secure even if my device is compromised or accessed without permission.

### Acceptance Criteria

1. SQLCipher integration for iOS/Android with AES-256 encryption of database files
2. Realm encrypted database implementation for React Native with seamless key integration
3. Duress wipe functionality triggered by specific PIN or biometric sequence
4. Auto-lock mechanism securing database after configurable idle time
5. Database schema versioning with encrypted migration support
6. Local backup encryption with separate backup keys isolated from primary storage
7. Database integrity verification preventing tampering detection

## Story 2.2: Menstrual Cycle Data Entry Interface

As a user tracking my menstrual cycle,
I want intuitive data entry for period dates, flow intensity, and symptoms with immediate local storage,
so that I can quickly record my health information without connectivity requirements.

### Acceptance Criteria

1. Period start/end date entry with calendar interface and quick-select options
2. Flow intensity tracking (light, medium, heavy) with customizable scales
3. Symptom logging with pre-defined categories and custom symptom support
4. Immediate local storage with client-side encryption before database writing
5. Data validation preventing impossible dates or inconsistent entries
6. Batch entry support for historical data import and retroactive updates
7. Data entry audit trail maintaining modification history for accuracy tracking

## Story 2.3: Probabilistic Prediction Engine

As a user planning around my menstrual cycle,
I want probabilistic predictions with confidence intervals instead of false precision,
so that I understand the uncertainty in predictions and can make informed decisions.

### Acceptance Criteria

1. Bayesian prediction model incorporating cycle length variability and personal history
2. Confidence interval calculation for next period start with 50%, 80%, 95% bands
3. Ovulation prediction with uncertainty quantification based on available data
4. Prediction accuracy tracking with Brier score and negative log-likelihood metrics
5. "Decision regret" analysis helping users understand prediction reliability impact
6. Model uncertainty communication through visual probability distributions
7. Prediction calibration validation ensuring stated confidence matches actual accuracy

## Story 2.4: Uncertainty Visualization and Explanation API

As a user interpreting cycle predictions,
I want clear visualization of prediction uncertainty with explanations of contributing factors,
so that I understand why predictions have specific confidence levels and what affects accuracy.

### Acceptance Criteria

1. Uncertainty band visualization showing probability ranges for cycle events
2. "Why this signal" explanations identifying factors influencing prediction confidence
3. Historical accuracy display showing how past predictions compared to actual events
4. Confidence factor breakdown (cycle regularity, data completeness, recent changes)
5. Interactive uncertainty exploration allowing users to see prediction sensitivity
6. Calibration metrics display helping users understand their personal prediction accuracy
7. On-device explanation generation without exposing data to external services

## Story 2.5: Offline-First Synchronization Skeleton

As a multi-device user,
I want offline-first functionality with optional encrypted synchronization across devices,
so that I can access my data anywhere while maintaining complete privacy control.

### Acceptance Criteria

1. Complete offline functionality for data entry, predictions, and visualization
2. P2P synchronization framework with separate keys for device-to-device communication
3. Encrypted backup key generation isolated from primary encryption keys
4. Conflict resolution strategy for simultaneous edits across multiple devices
5. Synchronization status indicators showing data consistency across devices
6. Network-optional design gracefully degrading when connectivity unavailable
7. Sync audit trail tracking data movement between devices without exposing content
