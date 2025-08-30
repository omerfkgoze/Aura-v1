# Requirements

## Functional

**FR1:** The application must implement client-side encryption for all user health data before storage, ensuring zero-knowledge architecture where even the service provider cannot access raw user information.

**FR2:** The system must provide menstrual cycle predictions with confidence intervals and probability bands rather than false precision, displaying uncertainty ranges to build user trust.

**FR3:** The application must offer a stealth UI mode that disguises the app as a calculator or notes application with secure mode switching capabilities.

**FR4:** Users must be able to track basic cycle data (period start/end dates, flow intensity, symptoms) with offline-first functionality that works without internet connectivity.

**FR5:** The system must generate time-limited, encrypted export links for selective healthcare provider data sharing without permanent data exposure.

**FR6:** The application must support cross-platform deployment (iOS, Android, Web) with consistent privacy protection across all platforms.

**FR7:** Users must be able to input and modify cycle data with real-time local storage and optional encrypted cloud backup via Supabase RLS.

**FR8:** The system must provide probabilistic cycle length and ovulation predictions based on historical user data with transparency about prediction confidence.

## Non Functional

**NFR1:** Application launch time must be under 2 seconds with core tracking functions responding within 500ms to ensure smooth user experience.

**NFR2:** The system must store maximum 50MB of user data for 2 years of tracking history while maintaining encryption overhead.

**NFR3:** All client-side encryption must use libsodium cryptographic library with security audits conducted every 6 months.

**NFR4:** The application must maintain 99.5% uptime for core offline functionality with graceful degradation when cloud features are unavailable.

**NFR5:** Privacy architecture must achieve GDPR and CCPA compliance by design with user data sovereignty as foundational principle.

**NFR6:** The system must support iOS 14+, Android 8+, and modern browsers with WebCrypto API compatibility.

**NFR7:** Database queries must utilize Supabase Row Level Security policies to ensure server-level data isolation between users.

**NFR8:** The application must pass independent security audits specifically validating zero-knowledge architecture claims.
