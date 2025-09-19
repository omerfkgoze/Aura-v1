'use client';

import { H1, H2 } from '@tamagui/text';
import { Card } from '@tamagui/card';
import { Button } from '@tamagui/button';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';

export default function SettingsPage() {
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
              <span className="text-sm text-slate-600">Settings</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <YStack marginBottom="$8">
          <H1 fontSize="$10" fontWeight="bold" color="$gray12" marginBottom="$2">
            Settings
          </H1>
          <Text fontSize="$6" color="$gray10">
            Configure your app preferences and account settings
          </Text>
        </YStack>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* App Preferences */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding="$6"
            borderRadius="$4"
          >
            <H2 fontSize="$7" fontWeight="600" color="$gray12" marginBottom="$4">
              App Preferences
            </H2>
            <YStack space="$4">
              <XStack alignItems="center" justifyContent="space-between">
                <YStack>
                  <Text fontSize="$4" color="$gray12" fontWeight="500">
                    Theme
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    Choose your preferred theme
                  </Text>
                </YStack>
                <Button
                  backgroundColor="#2E5266"
                  color="white"
                  fontSize="$3"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                >
                  Light
                </Button>
              </XStack>

              <XStack alignItems="center" justifyContent="space-between">
                <YStack>
                  <Text fontSize="$4" color="$gray12" fontWeight="500">
                    Language
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    Select your language
                  </Text>
                </YStack>
                <Button
                  backgroundColor="#2E5266"
                  color="white"
                  fontSize="$3"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                >
                  English
                </Button>
              </XStack>

              <XStack alignItems="center" justifyContent="space-between">
                <YStack>
                  <Text fontSize="$4" color="$gray12" fontWeight="500">
                    Notifications
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    Manage notification preferences
                  </Text>
                </YStack>
                <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end pr-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </XStack>
            </YStack>
          </Card>

          {/* Account Settings */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding="$6"
            borderRadius="$4"
          >
            <H2 fontSize="$7" fontWeight="600" color="$gray12" marginBottom="$4">
              Account
            </H2>
            <YStack space="$3">
              <Button
                backgroundColor="transparent"
                borderColor="$borderColor"
                borderWidth={1}
                padding="$3"
                justifyContent="flex-start"
              >
                <Text fontSize="$4" color="$gray11">
                  👤 Profile Settings
                </Text>
              </Button>
              <Button
                backgroundColor="transparent"
                borderColor="$borderColor"
                borderWidth={1}
                padding="$3"
                justifyContent="flex-start"
              >
                <Text fontSize="$4" color="$gray11">
                  🔐 Security Settings
                </Text>
              </Button>
              <Button
                backgroundColor="transparent"
                borderColor="$borderColor"
                borderWidth={1}
                padding="$3"
                justifyContent="flex-start"
              >
                <Text fontSize="$4" color="$gray11">
                  📊 Data Export
                </Text>
              </Button>
              <Button
                backgroundColor="transparent"
                borderColor="$red9"
                borderWidth={1}
                padding="$3"
                justifyContent="flex-start"
              >
                <Text fontSize="$4" color="$red11">
                  🗑️ Delete Account
                </Text>
              </Button>
            </YStack>
          </Card>
        </div>

        {/* Development Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Text fontSize="$3" color="$blue11">
            🚧 Settings functionality is under development. Full features coming soon.
          </Text>
        </div>
      </main>
    </div>
  );
}
