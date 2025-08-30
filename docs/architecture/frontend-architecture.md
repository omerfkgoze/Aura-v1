# Frontend Architecture

## Key Screen Layouts & UX Implementation

### Adaptive Launch Interface

**Purpose:** Display appropriate interface based on user's cultural/privacy context

**Key Elements:**

- Biometric/PIN authentication overlay
- Cultural context detection (location, language, time-based)
- Stealth level selector (emergency override)
- Seamless transition animations between modes

### Stealth Mode - Cultural Disguise Variants

**Purpose:** Authentic cultural app experience hiding menstrual tracking functionality

**Key Elements:**

- Prayer app interface (Islamic contexts): Qibla finder, prayer times, Quran verses
- Study app interface (East Asian contexts): Flashcards, note-taking, academic calendar
- Professional app interface (Workplace): Task manager, calendar, notes hybrid
- Secret access patterns integrated naturally into each disguise

### Uncertainty Visualization Dashboard

**Purpose:** Honest menstrual cycle predictions with clear confidence communication

**Key Elements:**

- Probability bands for next period (50%, 80%, 95% confidence intervals)
- Color-coded uncertainty levels with cultural color adaptations
- Historical accuracy tracker showing past prediction vs reality
- "Why this confidence level" expandable explanations
- Quick data entry shortcuts for current cycle status

## Component Library / Design System

### Design System Approach

Custom privacy-adaptive design system built on zero-knowledge principles, culturally-sensitive components, stealth-compatible accessibility

### Core Components

#### Adaptive Privacy Button

**Purpose:** Context-aware privacy controls that adapt appearance based on current stealth level

**Variants:**

- Stealth Level 0: Standard privacy icon with clear labeling
- Stealth Level 1: Disguised as calculator function key
- Stealth Level 2: Integrated into cultural app navigation
- Stealth Level 3: Gesture-only access, no visual element

#### Uncertainty Visualization Band

**Purpose:** Honest probability display for menstrual cycle predictions

**Variants:**

- Confidence levels: High (80%+), Medium (50-80%), Low (<50%)
- Cultural color adaptations: Western (blue-green spectrum), Islamic (earth tones), East Asian (harmony colors)
- Accessibility versions: High contrast, pattern-based, text-heavy

#### Stealth Transition Animation System

**Purpose:** Seamless morphing between disguise modes and tracking interface

**Variants:**

- Calculator Morph: Number buttons → date selectors (800ms natural math completion)
- Prayer Morph: Prayer times → cycle timeline (1200ms respectful transformation)
- Study Morph: Flashcards → symptom logging (900ms academic transition)
- Emergency Morph: Any mode → stealth (<200ms panic response)

## Branding & Style Guide

### Visual Identity

Medical-grade trustworthiness with cultural sensitivity, avoiding traditional "feminine health" stereotypes. Design philosophy: "Invisible by choice, powerful by design"

### Color Palette

| Color Type | Hex Code | Usage                                                           |
| ---------- | -------- | --------------------------------------------------------------- |
| Primary    | #2E5266  | Trust and medical authority, works across all cultural contexts |
| Secondary  | #4A7C7E  | Calm confidence, culturally neutral medical tone                |
| Accent     | #E8B04B  | Gentle highlight, warm but professional                         |
| Success    | #2D5A27  | Positive feedback, discrete green avoiding medical associations |
| Warning    | #B7701A  | Important notices, amber tone culturally appropriate            |
| Error      | #8B2635  | Critical alerts, deep red that works in conservative contexts   |

### Typography

**Primary:** Inter (web-safe, excellent readability, neutral cultural associations)
**Secondary:** SF Pro / Roboto (platform natives for stealth mode authenticity)
**Monospace:** SF Mono / Roboto Mono (for calculator disguise mode)

## Component Architecture

**Component Organization:**

```
apps/mobile/src/
├── components/
│   ├── crypto/                 # Rust/WASM crypto operations
│   │   ├── CryptoCore.ts      # WASM bindings
│   │   ├── KeyManager.ts      # Device key management
│   │   └── crypto-worker.ts   # Web Worker for heavy ops
│   ├── privacy/               # Stealth and cultural adaptation
│   │   ├── StealthController.tsx
│   │   ├── CulturalPresets.tsx
│   │   └── EmergencyPrivacy.tsx
│   ├── data/                  # Local data management
│   │   ├── SQLiteManager.ts
│   │   ├── SyncManager.ts
│   │   └── ConflictResolver.tsx
│   ├── predictions/           # Client-side predictions
│   │   ├── PredictionEngine.ts
│   │   ├── UncertaintyViz.tsx
│   │   └── CalibrationTracker.ts
│   ├── sharing/               # Healthcare sharing
│   │   ├── ShareManager.ts
│   │   ├── ReportGenerator.ts
│   │   └── libsignalClient.ts
│   └── ui/                    # UX-driven UI components
│       ├── adaptive/          # Privacy-adaptive components
│       │   ├── AdaptiveButton.tsx
│       │   ├── StealthTransition.tsx
│       │   └── CulturalTheme.tsx
│       ├── uncertainty/       # Uncertainty visualization
│       │   ├── ConfidenceBand.tsx
│       │   ├── PredictionChart.tsx
│       │   └── AccuracyTracker.tsx
│       └── stealth-modes/     # Disguise interfaces
│           ├── CalculatorMode.tsx
│           ├── PrayerMode.tsx
│           └── StudyMode.tsx
├── screens/                   # Main application screens
├── hooks/                     # Custom React hooks
└── utils/                     # Shared utilities
```

## State Management Architecture

**State Structure:**

```typescript
// Zustand store for UI state only
interface AppState {
  // Privacy and UI state
  stealthMode: boolean;
  culturalPreset: CulturalPreset;
  currentScreen: string;

  // Crypto state (never persisted)
  masterKeyLoaded: boolean;
  keyRotationStatus: 'idle' | 'rotating' | 'complete';

  // Sync state
  syncStatus: 'offline' | 'syncing' | 'synced' | 'conflict';
  lastSyncAt: Date | null;

  // Actions
  setStealthMode: (enabled: boolean) => void;
  setCulturalPreset: (preset: CulturalPreset) => void;
  handleConflict: (resolution: ConflictResolution) => void;
}

// TanStack Query for server sync (encrypted data only)
const cycleDataQuery = useQuery({
  queryKey: ['cycle-data'],
  queryFn: () => fetchEncryptedCycleData(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
});
```

## Routing Architecture & Screen Implementation

**Route Organization with UX Patterns:**

```
apps/mobile/src/screens/
├── auth/                      # Authentication & Onboarding
│   ├── PasskeyAuth.tsx        # WebAuthn authentication
│   ├── RecoverySetup.tsx      # Recovery phrase generation
│   ├── DeviceRegistration.tsx # Multi-device setup
│   └── CulturalOnboarding.tsx # Cultural context setup
├── stealth/                   # Disguise Modes (UX-driven)
│   ├── CalculatorMode.tsx     # Calculator disguise with secret access
│   ├── StudyMode.tsx          # Study app disguise (East Asian contexts)
│   ├── PrayerMode.tsx         # Religious app disguise (Islamic contexts)
│   └── ProfessionalMode.tsx   # Workplace-appropriate disguise
├── tracking/                  # Core Functionality
│   ├── AdaptiveLaunch.tsx     # Context-aware launch interface
│   ├── Dashboard.tsx          # Main cycle overview with uncertainty viz
│   ├── DataEntry.tsx          # Period data input with cultural adaptations
│   └── Predictions.tsx        # Uncertainty-based predictions with confidence
├── privacy/                   # Privacy Controls & Settings
│   ├── Settings.tsx           # Privacy controls with cultural presets
│   ├── KeyManagement.tsx      # Device keys, rotation
│   ├── EmergencyMode.tsx      # Duress protection
│   └── StealthConfig.tsx      # Stealth mode configuration
└── sharing/                   # Healthcare Integration
    ├── ShareSetup.tsx         # Healthcare provider setup
    ├── ReportGeneration.tsx   # Client-side report creation
    ├── AccessAudit.tsx        # Sharing audit trail
    └── CulturalMediator.tsx   # Cultural context for healthcare sharing
```

## Accessibility & Responsive Design Implementation

### Accessibility Requirements

**Compliance Target:** WCAG AA 2.1 with Privacy-Adaptive Accessibility (PAA) extensions for stealth-compatible screen reader support

**Key Requirements:**

**Visual:**

- Color contrast ratios: 4.5:1 minimum maintained across all stealth modes
- Focus indicators: High-visibility focus rings that adapt to disguise context
- Text sizing: 200% zoom support without horizontal scrolling

**Interaction:**

- Keyboard navigation: Complete app functionality via keyboard, secret access patterns work with assistive technologies
- Screen reader support: Discrete audio descriptions maintaining privacy ("calculation result" instead of "period prediction")
- Touch targets: 44px minimum in all modes, maintaining accessibility while appearing authentic

**Privacy-Preserving Screen Reader Approach:**

- Stealth Mode Audio: Screen reader announces disguise app content authentically
- Discrete Navigation: Medical terms replaced with neutral language
- Cultural Audio Adaptation: Screen reader voice and terminology adapt to cultural preset

### Responsiveness Strategy

**Breakpoints:**

| Breakpoint | Min Width | Max Width | Target Devices                     |
| ---------- | --------- | --------- | ---------------------------------- |
| Mobile     | 320px     | 767px     | Smartphones, small tablets         |
| Tablet     | 768px     | 1023px    | iPads, Android tablets             |
| Desktop    | 1024px    | 1439px    | Laptops, small desktops            |
| Wide       | 1440px    | -         | Large monitors, ultrawide displays |

**Adaptation Patterns:**

- **Mobile:** Single-column priority, gestures for stealth access
- **Tablet:** Two-column layout with sidebar privacy controls
- **Desktop:** Multi-panel interface with comprehensive privacy dashboard

### Animation & Micro-interactions

**Motion Principles:** Respectful Discretion - All animations can be instantly interrupted for privacy, motion serves function over aesthetics, cultural appropriateness in timing and style

**Key Animations:**

- **Stealth Transition:** Morphing transformation between disguise and tracking (Duration: 800-1200ms)
- **Uncertainty Reveal:** Confidence bands expand to show prediction ranges (Duration: 600ms)
- **Emergency Privacy:** Instant stealth activation with rapid fade (Duration: 200ms)

### Performance Considerations

**Performance Goals:**

- **Page Load:** <2 seconds initial launch, <500ms stealth mode activation
- **Interaction Response:** <100ms for privacy-critical actions
- **Animation FPS:** Consistent 60fps across all supported devices

**Design Strategies:** Privacy-First Performance - Crypto operations optimized for UI responsiveness, local data prioritized over network requests, stealth mode transitions preloaded for instant activation

## Frontend Services Layer

**API Client Setup:**

```typescript
// REST client with automatic encryption
class AuraAPIClient {
  private cryptoCore: CryptoCore;
  private baseURL: string;

  constructor(cryptoCore: CryptoCore) {
    this.cryptoCore = cryptoCore;
    this.baseURL = process.env.EXPO_PUBLIC_API_URL;
  }

  async updateCycleData(data: CycleData): Promise<UpdateResult> {
    // Generate AAD for integrity
    const aad = {
      userId: data.userId,
      recordId: data.id,
      tableName: 'encrypted_cycle_data',
      version: data.version,
      timestamp: new Date().toISOString(),
    };

    // Client-side encryption
    const encrypted = await this.cryptoCore.encrypt(data, { aad });

    // Optimistic concurrency request
    const response = await fetch(`${this.baseURL}/api/cycle-data/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedPayload: encrypted.payload,
        cryptoEnvelope: encrypted.envelope,
        currentVersion: data.version,
        deviceIdHash: await this.generateDeviceHash(),
      }),
    });

    const result = await response.json();

    if (result.status === 'conflict') {
      // Handle conflict resolution
      return { status: 'conflict', remoteData: result.remoteData };
    }

    return { status: 'success', newVersion: result.newVersion };
  }

  private async generateDeviceHash(): Promise<string> {
    const deviceId = await this.getDeviceId();
    const userSalt = await this.cryptoCore.deriveDeviceSalt();
    const serverPepper = process.env.EXPO_PUBLIC_DEVICE_PEPPER || '';

    return this.cryptoCore.blake3Hash(deviceId + userSalt + serverPepper);
  }
}
```
