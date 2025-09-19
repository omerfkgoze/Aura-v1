'use client';

import { Button } from '@tamagui/button';
import { Card } from '@tamagui/card';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';
import { H1, H2, H3 } from '@tamagui/text';
import { useResponsiveNavigation } from '../hooks/useResponsiveNavigation';

export default function Home() {
  const { isMobile, isTablet, navigationMode } = useResponsiveNavigation();

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
              <span className="text-sm text-slate-600">Privacy Mode: Active</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <YStack marginBottom="$8">
          <H2 fontSize="$10" fontWeight="bold" color="$gray12" marginBottom="$2">
            Welcome to Aura
          </H2>
          <Text fontSize="$6" color="$gray10">
            Your privacy-first reproductive health companion
          </Text>
        </YStack>

        {/* Dashboard Cards */}
        <div
          className={`grid gap-6 mb-8 ${
            isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {/* Privacy Status Card */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding={isMobile ? '$4' : '$6'}
            borderRadius="$4"
          >
            <XStack alignItems="center" marginBottom="$4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#2E5266' }}
              >
                <span className="text-white text-sm">🔒</span>
              </div>
              <H3 marginLeft="$3" fontSize="$6" fontWeight="600" color="$gray12">
                Privacy Status
              </H3>
            </XStack>
            <YStack space="$2">
              <XStack alignItems="center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <Text fontSize="$3" color="$green10">
                  Zero-knowledge encryption active
                </Text>
              </XStack>
              <XStack alignItems="center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <Text fontSize="$3" color="$green10">
                  Local data storage secure
                </Text>
              </XStack>
              <XStack alignItems="center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <Text fontSize="$3" color="$green10">
                  Cultural stealth mode ready
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Cycle Overview Card */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding={isMobile ? '$4' : '$6'}
            borderRadius="$4"
          >
            <XStack alignItems="center" marginBottom="$4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#4A7C7E' }}
              >
                <span className="text-white text-sm">📊</span>
              </div>
              <H3 marginLeft="$3" fontSize="$6" fontWeight="600" color="$gray12">
                Cycle Overview
              </H3>
            </XStack>
            <YStack alignItems="center" paddingVertical="$4">
              <Text fontSize="$8" fontWeight="bold" color="#2E5266">
                Day --
              </Text>
              <Text fontSize="$3" color="$gray10" marginTop="$1">
                No data available
              </Text>
              <Button
                marginTop="$4"
                backgroundColor="#E8B04B"
                color="white"
                fontSize="$3"
                fontWeight="500"
                paddingHorizontal="$4"
                paddingVertical="$2"
              >
                Start Tracking
              </Button>
            </YStack>
          </Card>

          {/* Quick Actions Card */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding={isMobile ? '$4' : '$6'}
            borderRadius="$4"
          >
            <XStack alignItems="center" marginBottom="$4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E8B04B' }}
              >
                <span className="text-white text-sm">⚡</span>
              </div>
              <H3 marginLeft="$3" fontSize="$6" fontWeight="600" color="$gray12">
                Quick Actions
              </H3>
            </XStack>
            <YStack space="$3">
              <Button
                width="100%"
                justifyContent="flex-start"
                backgroundColor="transparent"
                borderWidth={0}
                paddingHorizontal="$3"
                paddingVertical={isMobile ? '$3' : '$2'}
                fontSize="$3"
                color="$gray11"
                hoverStyle={{ backgroundColor: '$gray2' }}
                minHeight={isMobile ? 44 : 32}
              >
                📝 Log Today's Data
              </Button>
              <Button
                width="100%"
                justifyContent="flex-start"
                backgroundColor="transparent"
                borderWidth={0}
                paddingHorizontal="$3"
                paddingVertical={isMobile ? '$3' : '$2'}
                fontSize="$3"
                color="$gray11"
                hoverStyle={{ backgroundColor: '$gray2' }}
                minHeight={isMobile ? 44 : 32}
              >
                🔒 Privacy Settings
              </Button>
              <Button
                width="100%"
                justifyContent="flex-start"
                backgroundColor="transparent"
                borderWidth={0}
                paddingHorizontal="$3"
                paddingVertical={isMobile ? '$3' : '$2'}
                fontSize="$3"
                color="$gray11"
                hoverStyle={{ backgroundColor: '$gray2' }}
                minHeight={isMobile ? 44 : 32}
              >
                👥 Healthcare Sharing
              </Button>
            </YStack>
          </Card>
        </div>

        {/* Development Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mr-3">
              <span className="text-white text-xs">ℹ️</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Development Mode</h4>
              <p className="text-sm text-blue-700 mt-1">
                Web platform foundation implemented. Core tracking features coming soon.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
