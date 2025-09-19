'use client';

import { H1, H2 } from '@tamagui/text';
import { Card } from '@tamagui/card';
import { Button } from '@tamagui/button';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';
import { CulturalPresetToggle } from '../../components/stealth/CulturalPresetToggle';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <H1 fontSize="$8" fontWeight="bold" color="#2E5266">
                  Aura
                </H1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Privacy Controls</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <YStack marginBottom="$8">
          <H1 fontSize="$10" fontWeight="bold" color="$gray12" marginBottom="$2">
            Privacy Controls
          </H1>
          <Text fontSize="$6" color="$gray10">
            Manage your privacy settings and data protection
          </Text>
        </YStack>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Privacy Status */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding="$6"
            borderRadius="$4"
          >
            <H2 fontSize="$7" fontWeight="600" color="$gray12" marginBottom="$4">
              Privacy Status
            </H2>
            <YStack space="$3">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$4" color="$gray11">
                  Zero-Knowledge Encryption
                </Text>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </XStack>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$4" color="$gray11">
                  Local Data Storage
                </Text>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </XStack>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$4" color="$gray11">
                  Cultural Stealth Mode
                </Text>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </XStack>
            </YStack>
          </Card>

          {/* Emergency Controls */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding="$6"
            borderRadius="$4"
          >
            <H2 fontSize="$7" fontWeight="600" color="$gray12" marginBottom="$4">
              Emergency Controls
            </H2>
            <YStack space="$3">
              <Button
                backgroundColor="#DC2626"
                color="white"
                padding="$4"
                fontSize="$4"
                fontWeight="600"
              >
                🚨 Panic Mode (Instant Stealth)
              </Button>
              <Text fontSize="$3" color="$gray10">
                Instantly activates maximum stealth mode for emergency situations
              </Text>
            </YStack>
          </Card>
        </div>

        {/* Cultural Preset Selection - Full Width */}
        <div className="mt-6">
          <CulturalPresetToggle
            disabled={true}
            onPresetChange={preset => {
              console.log('Preset changed to:', preset);
            }}
          />
        </div>

        {/* Development Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Text fontSize="$3" color="$blue11">
            🚧 Privacy controls are under development. Full functionality coming soon.
          </Text>
        </div>
      </main>
    </div>
  );
}
