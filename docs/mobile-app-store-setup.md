# Mobile App Store Setup Guide

This guide covers the complete setup process for publishing the Aura reproductive health app to both Apple App Store and Google Play Store, with special considerations for health apps.

## Overview

Publishing a reproductive health app requires careful attention to:

- **Privacy policies** and data handling transparency
- **Age ratings** and content guidelines compliance
- **Regional availability** based on legal considerations
- **Health app certifications** and medical disclaimers
- **Security and encryption** requirements

## Prerequisites

- Apple Developer Program membership ($99/year)
- Google Play Console account ($25 one-time fee)
- Completed app with all features implemented
- Privacy policy hosted on your domain
- Terms of service document
- App icons in all required sizes
- Screenshots for all device types

## Apple App Store Setup

### 1. Apple Developer Account Setup

#### 1.1 Enroll in Apple Developer Program

1. **Individual Account** (Recommended for indie developers):
   - Go to [developer.apple.com](https://developer.apple.com)
   - Click "Enroll" and select "Individual"
   - Provide personal identification
   - Pay $99 annual fee

2. **Organization Account** (For companies):
   - Requires D-U-N-S Number
   - Business verification process
   - Official business documents required

#### 1.2 Enable Two-Factor Authentication

```bash
# Enable 2FA on Apple ID (required)
# Go to appleid.apple.com
# Security → Two-Factor Authentication → Turn On
```

#### 1.3 Agree to Developer Program License Agreement

- Review and accept the latest license agreement
- Ensure compliance with health app guidelines

### 2. App Store Connect Configuration

#### 2.1 Create App Record

1. **Navigate to App Store Connect**:
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"

2. **App Information**:

   ```
   Platform: iOS
   Name: Aura - Personal Health Tracker
   Primary Language: English (US)
   Bundle ID: com.yourcompany.aura
   SKU: aura-ios-2024
   ```

3. **App Store Information**:
   ```
   Category: Primary - Health & Fitness
   Category: Secondary - Medical
   Content Rights: You retain all rights
   Age Rating: See section 2.2
   ```

#### 2.2 Age Rating Configuration

For reproductive health app, configure carefully:

```
Content Rating Questionnaire:
├── Cartoon or Fantasy Violence: None
├── Realistic Violence: None
├── Sexual Content or Nudity: None
├── Profanity or Crude Humor: None
├── Alcohol, Tobacco, Drug Use: None
├── Simulated Gambling: None
├── Horror/Fear Themes: None
├── Mature/Suggestive Themes: None
├── Medical/Treatment Information: Frequent/Intense ⚠️
├── Unrestricted Web Access: None
├── Gambling: None

Result: Age 4+ or 9+ (depending on content complexity)
```

#### 2.3 App Privacy Configuration

Critical for health apps - complete App Privacy section:

```yaml
Data Collection Categories:
  Health and Fitness:
    - Reproductive health data: ✅
    - Symptom tracking: ✅
    - Cycle information: ✅

  Contact Info:
    - Email address: ✅ (for account creation only)

  Identifiers:
    - User ID: ✅ (for data sync only)
    - Device ID: ✅ (encrypted, for security)

  Usage Data:
    - Product interaction: ❌ (privacy-first approach)
    - Advertising data: ❌
    - Other usage data: ❌

  Diagnostics:
    - Crash data: ✅ (privacy-safe, no health data)
    - Performance data: ✅ (technical only)

Data Use Purposes:
  - App functionality: ✅
  - Analytics: ❌
  - Product personalization: ✅
  - Advertising: ❌
  - Marketing: ❌
  - Third-party advertising: ❌

Data Sharing:
  - No data shared with third parties: ✅
  - Data not sold: ✅
```

### 3. App Metadata and Assets

#### 3.1 App Store Listing

```yaml
App Name: 'Aura - Personal Health Tracker'
Subtitle: 'Private reproductive health tracking'

Description: |
  Aura is a privacy-first reproductive health tracking app designed to help you 
  understand your body and cycles without compromising your privacy.

  KEY FEATURES:
  • 🔒 End-to-end encrypted data - your health data never leaves your device unencrypted
  • 📊 Comprehensive cycle tracking with smart predictions
  • 💡 Personalized insights based on your unique patterns  
  • 🌙 Symptom logging with customizable categories
  • 🎯 Privacy-focused design - no ads, no data selling
  • ☁️ Optional secure cloud sync for multi-device access
  • 🌍 Works offline - your data is always accessible

  PRIVACY & SECURITY:
  • All health data is encrypted on your device
  • Optional cloud backup uses zero-knowledge encryption
  • No personal health data is ever shared or sold
  • Full control over your data with easy export/delete

  Perfect for anyone who wants to track their reproductive health privately and securely.

Keywords: |
  reproductive health, cycle tracking, period tracker, ovulation, fertility, 
  women's health, health tracking, privacy, encrypted, personal health

What's New: |
  Initial release of Aura with comprehensive privacy-focused health tracking features.

Marketing URL: https://aura.app
Support URL: https://aura.app/support
Privacy Policy URL: https://aura.app/privacy
```

#### 3.2 App Icons

Required icon sizes for iOS:

```
iPhone:
- 60x60 pt (120x120 px @2x, 180x180 px @3x)
- App Store: 1024x1024 px

iPad:
- 76x76 pt (152x152 px @2x)
- 83.5x83.5 pt (167x167 px @2x)

Settings:
- 29x29 pt (58x58 px @2x, 87x87 px @3x)
- 40x40 pt (80x80 px @2x, 120x120 px @3x)
```

#### 3.3 Screenshots

Required screenshots:

- iPhone 6.5" (2688 x 1242)
- iPhone 5.5" (2208 x 1242)
- iPad Pro 12.9" (2732 x 2048)
- iPad Pro 12.9" (2732 x 2048)

Screenshot guidelines:

- Show key features clearly
- Avoid showing actual health data
- Use representative but non-personal data
- Highlight privacy features prominently

### 4. Code Signing and Certificates

#### 4.1 Generate Certificates

```bash
# Create Certificate Signing Request (CSR)
# Use Keychain Access on macOS:
# Keychain Access → Certificate Assistant → Request a Certificate

# In Apple Developer Portal:
# Certificates, Identifiers & Profiles → Certificates → +
# Select "iOS Distribution" certificate
# Upload CSR file
# Download and install certificate
```

#### 4.2 Create App Identifier

```
Bundle ID: com.yourcompany.aura
Description: Aura Reproductive Health App
Capabilities:
  - App Groups (for widget support)
  - Associated Domains
  - Background App Refresh
  - Data Protection
  - HealthKit (if needed)
  - Keychain Sharing
  - Push Notifications
  - iCloud
```

#### 4.3 Create Provisioning Profiles

```bash
# Distribution Provisioning Profile
# Apple Developer Portal → Profiles → +
# Select "App Store Distribution"
# Select App ID: com.yourcompany.aura
# Select Distribution Certificate
# Download and install profile
```

### 5. Build and Upload

#### 5.1 Configure Expo Build

```json
// app.config.js
export default {
  expo: {
    name: "Aura",
    slug: "aura-health",
    version: "1.0.0",
    ios: {
      bundleIdentifier: "com.yourcompany.aura",
      buildNumber: "1",
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        NSHealthShareUsageDescription: "Aura needs access to health data to provide personalized cycle insights.",
        NSHealthUpdateUsageDescription: "Aura can optionally sync your tracked data with HealthKit.",
        NSLocationWhenInUseUsageDescription: "Location is used only for temperature-based insights (optional)."
      }
    }
  }
};
```

#### 5.2 Build for App Store

```bash
# Using EAS Build (recommended)
npm install -g @expo/cli
eas build --platform ios --profile production

# Upload to App Store Connect
eas submit --platform ios --profile production
```

## Google Play Store Setup

### 1. Google Play Console Account

#### 1.1 Create Developer Account

1. **Sign up for Google Play Console**:
   - Go to [play.google.com/console](https://play.google.com/console)
   - Pay $25 one-time registration fee
   - Verify identity and payment method

2. **Complete Account Setup**:
   - Developer name: Your Company Name
   - Website: https://aura.app
   - Email contact: support@aura.app

#### 1.2 Set Up Payment Profile

- Add tax information
- Set up merchant account for paid apps (if applicable)
- Configure payment methods

### 2. Create App in Play Console

#### 2.1 App Details

```yaml
App Name: 'Aura - Personal Health Tracker'
Default Language: English (United States)
App Category: Health & Fitness
Tags: reproductive health, cycle tracking, women's health
```

#### 2.2 Store Listing

```yaml
Short Description: |
  Privacy-first reproductive health tracking with end-to-end encryption.

Full Description: |
  Aura is a privacy-focused reproductive health tracking app that puts your data security first.

  🔒 PRIVACY & SECURITY
  • End-to-end encryption for all health data
  • Zero-knowledge cloud sync
  • No personal data sharing or selling
  • Full data control with easy export/delete

  📊 COMPREHENSIVE TRACKING
  • Menstrual cycle tracking and predictions
  • Symptom logging with custom categories
  • Temperature and mood tracking
  • Personalized insights and patterns

  💡 SMART FEATURES
  • Intelligent cycle predictions
  • Customizable reminders
  • Multi-device sync (encrypted)
  • Offline functionality
  • Export data anytime

  🌍 DESIGNED FOR EVERYONE
  • Inclusive and accessible design
  • Multiple language support
  • Cultural sensitivity considerations
  • Works globally with local privacy compliance

  Perfect for anyone who values their privacy while tracking reproductive health.

App Icon: 512x512 px PNG
Feature Graphic: 1024x500 px JPG/PNG
```

#### 2.3 Screenshots and Media

Required assets:

- Phone screenshots: 16:9 or 9:16 ratio (min 320px)
- 7-inch tablet: 16:10 or 10:16 ratio
- 10-inch tablet: 3:4 or 4:3 ratio
- Feature graphic: 1024x500 px
- App icon: 512x512 px PNG

### 3. App Content and Privacy

#### 3.1 Content Rating

Complete IARC questionnaire:

```yaml
App Category: Health & Fitness
Target Audience: Ages 13+

Content Questions:
  - Violence: No violent content
  - Sexual Content: Educational health content only
  - Profanity: No profanity
  - Controlled Substances: No substance content
  - Gambling: No gambling
  - User-Generated Content: Limited to personal health notes
  - Sharing Location: Optional, user-controlled
  - Personal Information: Health data (encrypted)

Rating: Teen (13+) or Everyone
```

#### 3.2 Data Safety Section

Critical for health apps:

```yaml
Data Collection:
  Personal Info:
    - Name: No
    - Email: Yes (account creation only)
    - User IDs: Yes (encrypted)

  Health and Fitness:
    - Health info: Yes (reproductive health data)
    - Fitness info: Yes (cycle tracking)

  App Info:
    - Crash logs: Yes (privacy-safe)
    - Diagnostics: Yes (no personal data)

Data Sharing:
  - No data shared with third parties
  - No data sold to third parties
  - All data encrypted in transit and at rest

Data Security:
  - Data encrypted in transit: Yes
  - Data encrypted at rest: Yes
  - Users can delete data: Yes
  - Follows Families Policy: Yes
  - Independent security review: Yes
```

### 4. App Signing and Release

#### 4.1 Generate Signing Key

```bash
# Generate upload key
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.keystore \
        -alias upload -keyalg RSA -keysize 2048 -validity 9125

# Store keystore securely and never share
# Add keystore info to app.json/eas.json
```

#### 4.2 Configure Build Settings

```json
// app.config.js Android settings
android: {
  package: "com.yourcompany.aura",
  versionCode: 1,
  permissions: [
    "INTERNET",
    "ACCESS_NETWORK_STATE"
  ],
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.yourcompany.aura",
  config: {
    googleSignIn: {
      apiKey: "your-google-api-key",
      certificateHash: "your-certificate-hash"
    }
  }
}
```

#### 4.3 Build and Upload

```bash
# Build Android App Bundle (recommended)
eas build --platform android --profile production

# Upload to Play Console
eas submit --platform android --profile production
```

## Health App Specific Requirements

### 1. Medical Disclaimers

Include in both app stores:

```
IMPORTANT MEDICAL DISCLAIMER:
Aura is designed for tracking and educational purposes only. This app is not
intended to diagnose, treat, cure, or prevent any disease or medical condition.
The information provided should not replace professional medical advice.
Always consult with a healthcare provider for medical concerns.
```

### 2. Privacy Policy (Critical for Health Apps)

Your privacy policy must include:

```markdown
# Health Data Privacy Policy

## Data Collection

- We collect only the health information you choose to enter
- All data is encrypted before leaving your device
- We never access your unencrypted health data

## Data Use

- Your data is used solely to provide app functionality
- No health data is used for advertising or marketing
- No data is sold or shared with third parties

## Data Storage

- All data is encrypted using industry-standard encryption
- Cloud storage uses zero-knowledge encryption
- You can export or delete your data at any time

## Your Rights

- Access your data: Export anytime
- Correct your data: Edit within the app
- Delete your data: Complete account deletion available
- Data portability: Standard export formats provided
```

### 3. Age Verification for Teen Content

Since reproductive health apps may be used by teenagers:

```javascript
// Age verification component
const AgeVerification = () => {
  const [birthDate, setBirthDate] = useState('');

  const verifyAge = () => {
    const age = calculateAge(birthDate);
    if (age < 13) {
      // Redirect to parental consent
      return redirectToParentalConsent();
    }
    if (age < 18) {
      // Show teen-specific privacy notice
      return showTeenPrivacyNotice();
    }
    // Continue with normal flow
    return proceedWithApp();
  };

  return <AgeVerificationScreen onVerify={verifyAge} privacyNotice={<HealthDataPrivacyNotice />} />;
};
```

## Regional Considerations

### 1. Legal Requirements by Region

```yaml
United States:
  - HIPAA compliance considerations
  - FDA guidance for health apps
  - State-specific reproductive health laws

European Union:
  - GDPR compliance mandatory
  - Medical device regulations (MDR)
  - Country-specific health data laws

Other Regions:
  - Research local reproductive health laws
  - Consider cultural sensitivities
  - Implement geo-blocking where required
```

### 2. Content Localization

```javascript
// Sensitive content handling
const getSensitiveContentForRegion = region => {
  const restrictions = {
    'conservative-regions': {
      showReproductiveHealth: false,
      useNeutralTerms: true,
      hideAdvancedFeatures: true,
    },
    'liberal-regions': {
      showReproductiveHealth: true,
      useNeutralTerms: false,
      hideAdvancedFeatures: false,
    },
  };

  return restrictions[getRegionCategory(region)];
};
```

## Testing and Quality Assurance

### 1. Beta Testing Programs

#### Apple TestFlight

```bash
# Set up TestFlight beta testing
# Apple Developer Portal → TestFlight
# Upload beta build
# Add external testers (up to 10,000)
# Collect feedback before public release
```

#### Google Play Internal Testing

```bash
# Set up internal testing track
# Google Play Console → Release Management → App Releases
# Create internal testing track
# Add up to 100 testers
# Graduate to alpha/beta tracks
```

### 2. Health App Testing Checklist

- [ ] Privacy controls work correctly
- [ ] Data encryption verified
- [ ] Export/delete functionality tested
- [ ] Age verification working
- [ ] Parental controls (if applicable)
- [ ] Offline functionality verified
- [ ] Multi-device sync tested
- [ ] Performance with large datasets
- [ ] Accessibility compliance
- [ ] Cultural sensitivity review

## Launch Strategy

### 1. Soft Launch

1. **Limited Geographic Release**:
   - Start with 1-2 countries
   - Monitor user feedback and technical issues
   - Iterate based on real-world usage

2. **Gradual Feature Rollout**:
   - Release core features first
   - Add advanced features in updates
   - Monitor app store ratings

### 2. Marketing Compliance

```yaml
Marketing Guidelines:
  Medical Claims:
    - No diagnostic claims
    - No treatment promises
    - Educational content only

  Privacy Marketing:
    - Emphasize privacy features
    - Explain encryption clearly
    - Highlight user control

  Target Audience:
    - Age-appropriate marketing
    - Cultural sensitivity
    - Inclusive representation
```

## Post-Launch Maintenance

### 1. App Store Optimization (ASO)

- Monitor keyword rankings
- A/B test app store listings
- Respond to user reviews
- Update screenshots with new features
- Maintain high app store ratings

### 2. Compliance Monitoring

- Stay updated with app store guideline changes
- Monitor privacy law updates
- Regular security audits
- Update privacy policies as needed
- Maintain health app certifications

### 3. Update Strategy

```bash
# Regular update schedule
# Version 1.1 - Bug fixes and minor improvements
# Version 1.2 - New tracking features
# Version 2.0 - Major UI/UX improvements

# Always include:
# - Security updates
# - Privacy enhancements
# - Bug fixes
# - Performance improvements
```

## Troubleshooting Common Issues

### App Store Rejections

**Common rejection reasons for health apps:**

1. **Insufficient privacy controls** - Add granular privacy settings
2. **Medical claims** - Remove any diagnostic language
3. **Age rating issues** - Review content rating questionnaire
4. **Missing disclaimers** - Add comprehensive medical disclaimers

### Play Store Policy Violations

**Common policy issues:**

1. **Sensitive permissions** - Justify health data access
2. **Target SDK requirements** - Keep Android SDK updated
3. **Content rating** - Ensure appropriate content rating
4. **Data safety** - Complete data safety section thoroughly

## Resources and References

### Official Documentation

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- [Health App Guidelines - Apple](https://developer.apple.com/health-fitness/)
- [Google Play Health Apps Policy](https://support.google.com/googleplay/android-developer/answer/9888076)

### Health App Compliance

- [FDA Mobile Medical App Guidance](https://www.fda.gov/medical-devices/digital-health-center-excellence/mobile-medical-applications)
- [HIPAA Guidelines for Apps](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/mobile-health-apps/index.html)
- [GDPR Compliance for Health Apps](https://gdpr.eu/health-data/)

### Testing and Quality

- [Apple Accessibility Guidelines](https://developer.apple.com/accessibility/)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)

This comprehensive guide should ensure successful submission and approval of your reproductive health app while maintaining the highest privacy and security standards.
