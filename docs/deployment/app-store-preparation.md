# Mobile App Store Preparation Guide

## Apple App Store Setup

### 1. Apple Developer Account

1. **Enroll in Apple Developer Program**
   - Visit: https://developer.apple.com/programs/
   - Cost: $99/year
   - Required for: App Store distribution
   - Time: 1-3 business days for approval

2. **Create App Store Connect Entry**
   - Visit: https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - **Platform:** iOS
   - **App Name:** Aura - Private Health Tracking
   - **Primary Language:** English
   - **Bundle ID:** com.aura.health (must be unique)
   - **SKU:** aura-ios-2024

### 2. App Store Metadata (Critical for Health Apps)

**App Information:**

- **Category:** Health & Fitness > Women's Health
- **Content Rights:** You own or have licensed all content
- **Age Rating:** 17+ (Mature content due to reproductive health topics)

**App Privacy (CRITICAL):**

```
Data Collection: NONE
- No data is collected from users
- All data is encrypted locally
- Zero-knowledge architecture
- No analytics or tracking
```

**App Description Template:**

```
Aura is a completely private reproductive health tracking app designed for your security and privacy.

🔒 COMPLETE PRIVACY
• Zero-knowledge encryption - we cannot see your data
• All information stored locally on your device
• No cloud storage of personal health information
• No tracking, no analytics, no data sharing

🩸 COMPREHENSIVE TRACKING
• Menstrual cycle and period tracking
• Symptom logging and pattern recognition
• Temperature and fertility indicators
• Completely customizable tracking options

🥷 STEALTH MODE
• Discrete interface for sensitive environments
• App icon and name can be disguised
• Emergency privacy controls
• Cultural sensitivity built-in

MEDICAL DISCLAIMER: This app is not intended to diagnose, treat, cure, or prevent any medical condition. Always consult with healthcare professionals for medical advice.
```

### 3. Required Screenshots and Assets

- **App Icon:** 1024×1024px (no transparency, no rounded corners)
- **iPhone Screenshots:**
  - iPhone 6.7": 1284×2778px or 1290×2796px
  - iPhone 6.5": 1242×2688px or 1284×2778px
  - iPhone 5.5": 1242×2208px
- **iPad Screenshots (if supporting iPad):**
  - 12.9" iPad Pro: 2048×2732px
  - 11" iPad Pro: 1668×2388px

### 4. Privacy Policy Requirements (MANDATORY)

- **URL Required:** Must be publicly accessible
- **Content Must Include:**
  - Data collection practices (state "none")
  - Encryption and security measures
  - Local data storage explanation
  - No third-party data sharing
  - User rights and data control
  - Contact information for privacy questions

### 5. App Store Review Guidelines Compliance

- **Health Data:** Comply with HealthKit guidelines even if not using HealthKit
- **Privacy:** Clearly explain zero-knowledge encryption
- **Content:** Ensure all content is appropriate and medically responsible
- **Functionality:** App must work as described without crashes

## Google Play Store Setup

### 1. Google Play Console Account

1. **Create Developer Account**
   - Visit: https://play.google.com/console
   - One-time fee: $25
   - Required documents: Government-issued ID

2. **Create New App**
   - Click "Create app"
   - **App name:** Aura - Private Health Tracking
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free
   - **Category:** Health & Fitness

### 2. App Content and Policies

**Target Audience:**

- **Age group:** 18+ (mature content)
- **Content rating:** Suitable for mature audiences

**Privacy Policy:**

- Same URL as App Store
- Must be accessible and comprehensive

**Data Safety Section (CRITICAL):**

```
Data Collection: NO data collected
Data Sharing: NO data shared with third parties
Data Encryption: All data encrypted in transit and at rest
Data Deletion: Users can delete all data anytime
Location: No location data collected
Personal Info: No personal information collected
Health Info: All health data stays on device only
```

### 3. Content Rating Questionnaire

- **Violence:** None
- **Sexual Content:** Mature (reproductive health topics)
- **Profanity:** None
- **Drugs, Alcohol, Tobacco:** None
- **Gambling:** None
- **Other Mature Content:** Yes (reproductive health information)

### 4. Store Listing Assets

- **App Icon:** 512×512px (PNG, 32-bit)
- **Feature Graphic:** 1024×500px
- **Phone Screenshots:** At least 2, up to 8
- **7-inch Tablet Screenshots:** At least 1 (if supporting tablets)
- **10-inch Tablet Screenshots:** At least 1 (if supporting tablets)

### 5. Release Management

- **Release Type:** Internal testing → Closed testing → Open testing → Production
- **Version Code:** Auto-increment with each release
- **Signing:** Use Google Play App Signing (recommended)

## Privacy Policy Template

Create at: `https://your-domain.com/privacy-policy`

```markdown
# Privacy Policy - Aura Health Tracking App

Last updated: [DATE]

## Our Commitment to Privacy

Aura is built on a zero-knowledge architecture. This means:

- We cannot see, access, or read your health data
- All your information is encrypted locally on your device
- We do not collect, store, or share any personal information
- No analytics, tracking, or data mining

## Data Collection: NONE

We do not collect any data, including:

- Personal information (name, email, phone, address)
- Health information (cycles, symptoms, temperatures)
- Device information (location, device ID, usage patterns)
- Analytics or crash reports containing personal data

## Data Storage: Local Only

All your health data is:

- Stored locally on your device
- Encrypted with military-grade encryption
- Never transmitted to our servers
- Never accessible to us or third parties

## Third-Party Services

We use minimal third-party services:

- Supabase: Only for app authentication (no personal data)
- Sentry: Technical error reporting (no personal data)

These services are configured with privacy-first settings and cannot access your health data.

## Your Rights

You have complete control:

- All data belongs to you
- Delete data anytime through app settings
- Export data in standard formats
- No account required - you own your data

## Children's Privacy

This app is not intended for users under 18. We do not knowingly collect information from minors.

## Contact Us

Privacy questions: privacy@aura-health.app
Technical support: support@aura-health.app

## Changes to Policy

We will notify users of any policy changes through app updates.
```

## Signing Certificate Management

### iOS Certificates

1. **Development Certificate:** For testing on devices
2. **Distribution Certificate:** For App Store submission
3. **Provisioning Profiles:** Link certificates to app bundle ID

### Android Signing

1. **Upload Key:** For Google Play Console
2. **App Signing Key:** Managed by Google Play (recommended)
3. **Keystore Security:** Store securely, never commit to version control

## Pre-Submission Checklist

### Technical Requirements

- [ ] App builds without errors
- [ ] All features work as expected
- [ ] Privacy controls function properly
- [ ] Encryption/decryption works correctly
- [ ] No crashes or major bugs
- [ ] Performance is acceptable
- [ ] App size is optimized

### Legal Requirements

- [ ] Privacy policy published and accessible
- [ ] Terms of service (if applicable)
- [ ] Medical disclaimers included
- [ ] Age restrictions properly set
- [ ] Content ratings accurate
- [ ] All required metadata completed

### Health App Specific

- [ ] Medical disclaimers prominent
- [ ] No medical advice or diagnosis claims
- [ ] Privacy features clearly explained
- [ ] Data encryption verified
- [ ] Zero-knowledge claims accurate
- [ ] Emergency access considerations

## Timeline Expectations

**Apple App Store:**

- Review time: 1-3 days (first submission may take longer)
- Health apps may require additional review
- Rejections require resubmission

**Google Play Store:**

- Review time: 1-3 days
- New developer accounts may take longer
- Policy violations can cause delays

## Common Rejection Reasons

### Apple

- Missing privacy policy
- Inadequate privacy explanations
- Health claims without proper disclaimers
- UI/UX issues
- Crashes or non-functional features

### Google

- Data safety section inaccuracies
- Missing privacy policy
- Content rating mismatches
- Policy violations
- Technical issues

## Next Steps

1. **Complete Developer Accounts:** Apple ($99/year) and Google ($25 one-time)
2. **Create Privacy Policy:** Host on your domain
3. **Prepare Assets:** Icons, screenshots, descriptions
4. **Test Thoroughly:** Ensure all features work
5. **Submit for Review:** Start with internal testing
6. **Respond to Feedback:** Address reviewer comments promptly
