/**
 * User Guidance for Secure Recovery Phrase Storage
 *
 * Provides comprehensive guidance and recommendations for users
 * on how to securely store and manage their recovery data.
 */
/**
 * Comprehensive storage recommendations for recovery phrases
 */
export function getRecoveryPhraseGuidance() {
  return {
    storageRecommendations: {
      digital: [
        '🔐 Use a reputable password manager with end-to-end encryption',
        '💾 Store in an encrypted file on an offline device or air-gapped computer',
        '🔑 Use hardware security keys (YubiKey, etc.) for additional protection',
        '💿 Consider encrypted USB drives stored in secure locations',
        '🖥️ Use encrypted disk images with strong passwords',
        '📱 Avoid storing on smartphones unless using hardware-backed encryption',
      ],
      physical: [
        '📝 Write clearly on high-quality, acid-free paper',
        '🔥 Store in fireproof and waterproof safes or containers',
        '🏦 Use bank safety deposit boxes for long-term storage',
        '🔩 Consider metal seed phrase storage devices (steel plates)',
        '📍 Store copies in multiple geographically separate locations',
        '🏠 Keep one copy easily accessible for regular verification',
        '📦 Use tamper-evident envelopes to detect unauthorized access',
      ],
      distributed: [
        '🧩 Split phrase using Shamir Secret Sharing (3-of-5 or 2-of-3)',
        '👥 Distribute shares to trusted family members or friends',
        '🌍 Ensure shares are in different geographic locations',
        '🔄 Use different storage methods for different shares',
        '📋 Provide clear instructions to share holders',
        '⏰ Regularly verify share availability and holder accessibility',
        '🔄 Have a plan for share rotation and updates',
      ],
    },
    securityWarnings: [
      '⚠️ NEVER store recovery phrases in plain text on internet-connected devices',
      '🚫 NEVER take photos of your recovery phrase',
      '☁️ NEVER store in cloud services without strong encryption',
      '👥 NEVER share your complete recovery phrase with anyone',
      '📧 NEVER send recovery phrases via email, text, or messaging apps',
      '🖥️ NEVER enter your phrase on suspicious websites or applications',
      '📱 NEVER store as notes, contacts, or calendar entries on your phone',
      '🖨️ Be cautious when printing - ensure printer security and dispose of drafts safely',
    ],
    bestPractices: [
      '✅ Test your recovery phrase immediately after generating it',
      '📝 Write down the phrase by hand rather than typing it',
      '🔍 Double-check every word and verify the correct spelling',
      '📅 Regularly verify your stored recovery phrases (quarterly recommended)',
      '🔄 Update storage locations if security is compromised',
      '📚 Keep instructions for recovery process with your phrase',
      '⚡ Create emergency access codes for immediate situations',
      '🛡️ Use the distributed storage approach for maximum security',
      '📖 Document your storage strategy for trusted individuals',
      '🔐 Consider using a passphrase for additional security',
    ],
    commonMistakes: [
      '❌ Storing only one copy of the recovery phrase',
      '❌ Using predictable storage locations (desk drawer, obvious safe)',
      '❌ Not testing the recovery process before relying on it',
      '❌ Mixing up word order or using incorrect spellings',
      '❌ Storing the phrase with other sensitive information',
      '❌ Not informing trusted individuals about recovery procedures',
      '❌ Using easily damaged storage materials (regular paper, cheap metal)',
      '❌ Storing all recovery methods in the same location',
      '❌ Not updating recovery information when circumstances change',
      '❌ Assuming digital storage is always more secure than physical',
    ],
    testingInstructions: [
      '1️⃣ BEFORE relying on your recovery phrase, test it in a safe environment',
      '2️⃣ Use the recovery process to verify each word is correct',
      '3️⃣ Ensure you can read your handwriting clearly',
      '4️⃣ Verify that all copies of your phrase are identical',
      '5️⃣ Test the recovery process every 3-6 months',
      '6️⃣ Ensure trusted individuals know how to access and use recovery information',
      '7️⃣ Practice the recovery process under time pressure',
      '8️⃣ Verify that your storage locations remain secure and accessible',
    ],
  };
}
/**
 * Guidance for Shamir Secret Sharing storage
 */
export function getShamirSharingGuidance(totalShares, threshold) {
  return {
    distribution: [
      `📊 You need ${threshold} out of ${totalShares} shares to recover your account`,
      `🎯 Keep ${Math.min(threshold, totalShares - threshold + 1)} shares yourself for quick access`,
      `👥 Distribute ${Math.max(0, totalShares - threshold)} shares to trusted individuals`,
      '🗺️ Ensure shares are geographically distributed for disaster recovery',
      '🔐 Consider encrypting individual shares with recipient-specific passwords',
      '📝 Keep a record of who has which shares (without revealing share content)',
    ],
    shareHolders: [
      '👨‍👩‍👧‍👦 Choose family members who understand the importance of security',
      '🤝 Select trustworthy friends who will be available long-term',
      '⚖️ Consider legal professionals (lawyers, notaries) for formal storage',
      '🏦 Use institutional storage (safety deposit boxes) for some shares',
      '🌍 Ensure share holders are in different locations/countries if possible',
      '📞 Maintain regular contact with share holders to ensure availability',
    ],
    communication: [
      '📋 Provide clear instructions on what the share is for',
      '⚡ Explain the urgency and importance of the share',
      '🔒 Emphasize the need for secure storage without revealing details',
      '📱 Establish secure communication channels for share recovery',
      '📅 Set up regular check-ins to verify share integrity',
      '🆘 Create emergency contact procedures for immediate access',
    ],
    maintenance: [
      '🔍 Verify share integrity every 6 months',
      '🔄 Have a plan for updating shares if needed',
      '👥 Replace shares if holders become unavailable',
      '📍 Update storage locations if security is compromised',
      '📚 Keep instructions updated and accessible to trusted individuals',
      '⚠️ Monitor for signs that shares may have been compromised',
    ],
  };
}
/**
 * Emergency code storage guidance
 */
export function getEmergencyCodeGuidance() {
  return {
    generation: [
      '🎲 Generate codes immediately after setting up your account',
      '🔢 Create multiple codes for different scenarios (emergency, recovery, backup)',
      '⏰ Set appropriate expiration times based on usage scenarios',
      '🖨️ Print codes immediately and securely dispose of digital copies',
      '💾 Never store codes digitally on connected devices',
    ],
    storage: [
      '🖨️ Print codes on high-quality paper immediately after generation',
      '💼 Store printed codes in a fireproof safe or safety deposit box',
      '📦 Use tamper-evident envelopes to detect unauthorized access',
      '🏠 Keep one set easily accessible for emergencies',
      '🏦 Store backup copies in different secure locations',
      '📝 Include instructions for use with the stored codes',
    ],
    usage: [
      '🚨 Use emergency codes only when primary authentication fails',
      '⚡ Each code can only be used once - they are single-use only',
      '🎯 Enter codes carefully - you have limited attempts',
      '⏰ Check expiration dates before attempting to use codes',
      '🔄 Generate new codes immediately after using any emergency code',
    ],
    renewal: [
      '📅 Review and renew codes every 3-6 months',
      '🔄 Generate new codes before existing ones expire',
      '🗑️ Securely destroy old codes when replacing them',
      '📋 Update stored instructions when renewing codes',
      '🔔 Set calendar reminders for code renewal',
      '👥 Inform trusted individuals about code updates if they help with storage',
    ],
  };
}
/**
 * Security checklist for recovery setup
 */
export function getRecoverySecurityChecklist() {
  return {
    setup: [
      { task: 'Generate recovery phrase using cryptographically secure method', critical: true },
      { task: 'Write down recovery phrase by hand immediately', critical: true },
      { task: 'Verify recovery phrase by testing it before storing', critical: true },
      { task: 'Create Shamir shares if using distributed storage', critical: false },
      { task: 'Generate emergency access codes for backup', critical: false },
      { task: 'Document recovery strategy for trusted individuals', critical: false },
    ],
    storage: [
      { task: 'Store recovery phrase in fireproof/waterproof container', critical: true },
      { task: 'Create at least one backup copy in different location', critical: true },
      { task: 'Ensure storage location is secure but accessible', critical: true },
      { task: 'Use tamper-evident storage to detect unauthorized access', critical: false },
      { task: 'Distribute Shamir shares to trusted individuals', critical: false },
      { task: 'Store emergency codes in easily accessible secure location', critical: false },
    ],
    testing: [
      { task: 'Test recovery phrase immediately after storage', critical: true },
      { task: 'Verify all stored copies are identical and readable', critical: true },
      { task: 'Test Shamir share reconstruction if using distributed storage', critical: false },
      { task: 'Verify emergency codes work before expiration', critical: false },
      { task: 'Ensure trusted individuals understand their role', critical: false },
      { task: 'Practice recovery process under time pressure', critical: false },
    ],
    maintenance: [
      { task: 'Verify recovery phrase readability every 3 months', critical: true },
      { task: 'Check that storage locations remain secure and accessible', critical: true },
      { task: 'Test recovery process every 6 months', critical: false },
      { task: 'Renew emergency codes before expiration', critical: false },
      { task: 'Update recovery documentation when circumstances change', critical: false },
      { task: 'Verify availability of Shamir share holders', critical: false },
    ],
  };
}
/**
 * Recovery strategy recommendations based on user profile
 */
export function getPersonalizedRecoveryStrategy(profile) {
  const strategies = {
    techSavvy: {
      true: {
        primaryMethod: 'Recovery phrase with hardware security key backup',
        advanced: [
          'Consider Shamir Secret Sharing for maximum security',
          'Use encrypted digital storage with hardware keys',
        ],
      },
      false: {
        primaryMethod: 'Recovery phrase with physical backup',
        advanced: ['Focus on secure physical storage', 'Use simple, reliable storage methods'],
      },
    },
    family: {
      true: {
        distributed: [
          'Use Shamir Secret Sharing with family members',
          'Distribute shares among trusted family',
        ],
        backup: 'Family-based distributed storage',
      },
      false: {
        distributed: [
          'Use institutional storage (bank safety deposit boxes)',
          'Consider professional storage services',
        ],
        backup: 'Institutional-based storage',
      },
    },
    travel: {
      true: {
        access: [
          'Ensure recovery methods work internationally',
          'Have multiple recovery options available',
        ],
        considerations: ['Consider time zones for emergency access', 'Ensure global accessibility'],
      },
      false: {
        access: ['Focus on local storage security', 'Optimize for home-based access'],
        considerations: ['Local storage optimization', 'Regional backup strategies'],
      },
    },
  };
  const riskStrategies = {
    low: {
      methods: ['Recovery phrase + Shamir sharing + Emergency codes'],
      storage: [
        'Multiple secure locations',
        'Redundant backup systems',
        'Professional storage options',
      ],
    },
    medium: {
      methods: ['Recovery phrase + Emergency codes'],
      storage: ['Primary and backup storage', 'Mix of physical and digital storage'],
    },
    high: {
      methods: ['Recovery phrase only'],
      storage: ['Simple, accessible storage', 'Focus on usability over redundancy'],
    },
  };
  const selectedStrategy = riskStrategies[profile.riskTolerance];
  const familyStrategy = strategies.family[profile.hasFamily.toString()];
  const techStrategy = strategies.techSavvy[profile.techSavvy.toString()];
  const travelStrategy = strategies.travel[profile.travels.toString()];
  return {
    primaryMethod: techStrategy.primaryMethod,
    backupMethods: [
      ...selectedStrategy.methods,
      familyStrategy.backup,
      ...(profile.techSavvy ? techStrategy.advanced : []),
    ],
    storageStrategy: [
      ...selectedStrategy.storage,
      ...familyStrategy.distributed,
      ...travelStrategy.access,
    ],
    warnings: [
      ...travelStrategy.considerations,
      profile.riskTolerance === 'high'
        ? 'High risk tolerance means fewer backup options - ensure primary method is very secure'
        : '',
      !profile.hasFamily ? 'Without family support, focus on institutional storage options' : '',
      !profile.techSavvy
        ? 'Avoid complex technical solutions - focus on proven, simple methods'
        : '',
    ].filter(Boolean),
  };
}
/**
 * Interactive recovery setup guide
 */
export function getRecoverySetupGuide() {
  return {
    steps: [
      {
        step: 1,
        title: 'Generate Your Recovery Phrase',
        description:
          'Create a cryptographically secure recovery phrase that will allow you to regain access to your account.',
        actions: [
          'Use the app to generate a new recovery phrase',
          'Choose 12, 15, 18, 21, or 24 words (12 words recommended for most users)',
          'Write down the phrase immediately - do not save digitally yet',
        ],
      },
      {
        step: 2,
        title: 'Verify Your Recovery Phrase',
        description: 'Test your recovery phrase to ensure it works before storing it.',
        actions: [
          'Use the recovery test feature in the app',
          'Enter your phrase exactly as written',
          'Verify each word is spelled correctly',
          'Confirm the phrase successfully recovers your account',
        ],
      },
      {
        step: 3,
        title: 'Choose Your Storage Strategy',
        description: 'Decide how you will securely store your recovery information.',
        actions: [
          'Consider your personal security needs and technical comfort level',
          'Choose between simple storage, distributed storage, or hybrid approach',
          'Plan for multiple storage locations and backup methods',
        ],
      },
      {
        step: 4,
        title: 'Implement Secure Storage',
        description: 'Store your recovery phrase using your chosen strategy.',
        actions: [
          'Write the phrase on high-quality paper with permanent ink',
          'Store in fireproof and waterproof containers',
          'Create backup copies in separate secure locations',
          'If using Shamir sharing, distribute shares to trusted individuals',
        ],
      },
      {
        step: 5,
        title: 'Set Up Emergency Access',
        description: 'Create emergency access codes for immediate situations.',
        actions: [
          'Generate emergency access codes through the app',
          'Print the codes immediately',
          'Store codes in easily accessible but secure locations',
          'Set calendar reminders for code renewal',
        ],
      },
      {
        step: 6,
        title: 'Document and Test',
        description: 'Create documentation and test your complete recovery system.',
        actions: [
          'Document your storage strategy for trusted individuals',
          'Test the complete recovery process',
          'Verify all storage locations remain secure and accessible',
          'Set up regular maintenance reminders',
        ],
      },
    ],
    tips: [
      '💡 Start with a simple approach and add complexity as needed',
      '💡 Physical storage is often more secure than digital for recovery phrases',
      '💡 Test everything before relying on it for actual recovery',
      '💡 Regular maintenance prevents recovery failures when you need them most',
      '💡 Consider the long-term availability of your chosen storage methods',
      '💡 Balance security with accessibility - you need to be able to use your recovery method',
    ],
    troubleshooting: [
      {
        problem: 'Recovery phrase test fails',
        solution:
          'Check word spelling, order, and ensure you are using the exact phrase that was generated',
      },
      {
        problem: 'Cannot read handwritten phrase',
        solution:
          'Rewrite the phrase more clearly, consider printing or using different writing materials',
      },
      {
        problem: 'Storage location becomes inaccessible',
        solution:
          'Use backup storage locations, update your storage strategy, and inform trusted individuals',
      },
      {
        problem: 'Shamir share holder becomes unavailable',
        solution:
          'Generate new shares and redistribute, ensure you have more shares than the minimum threshold',
      },
      {
        problem: 'Emergency codes expired',
        solution: 'Generate new emergency codes immediately, set better renewal reminders',
      },
      {
        problem: 'Forgot storage location',
        solution:
          'Check all potential secure locations, ask trusted individuals who might know your strategy',
      },
    ],
  };
}
//# sourceMappingURL=guidance.js.map
