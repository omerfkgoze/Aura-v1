'use client';

import { Button } from '@tamagui/button';
import { Card } from '@tamagui/card';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';
import { H1, H2, H3 } from '@tamagui/text';
import { useResponsiveNavigation } from '../hooks/useResponsiveNavigation';

export default function Home() {
  const { isMobile, isTablet, navigationMode } = useResponsiveNavigation();

  return (
    <YStack minHeight="100vh" backgroundColor="$gray2">
      {/* Header */}
      <XStack
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        paddingHorizontal="$4"
        paddingVertical="$4"
        justifyContent="space-between"
        alignItems="center"
        height={64}
      >
        <H1 fontSize="$8" fontWeight="bold" color="#2E5266">
          Aura
        </H1>
        <XStack alignItems="center" space="$3">
          <Text fontSize="$3" color="$gray10">
            Privacy Mode: Active
          </Text>
          <YStack width={8} height={8} backgroundColor="$green9" borderRadius="$round" />
        </XStack>
      </XStack>

      {/* Main Dashboard */}
      <YStack
        maxWidth={1280}
        marginHorizontal="auto"
        paddingHorizontal="$4"
        paddingVertical="$8"
        flex={1}
      >
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
        <YStack
          marginBottom="$8"
          space="$6"
          {...(isMobile
            ? {}
            : {
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              })}
        >
          {/* Privacy Status Card */}
          <Card
            backgroundColor="$background"
            borderColor="$borderColor"
            padding={isMobile ? '$4' : '$6'}
            borderRadius="$4"
            flex={isMobile ? undefined : 1}
            minWidth={isMobile ? undefined : 280}
          >
            <XStack alignItems="center" marginBottom="$4">
              <YStack
                width={32}
                height={32}
                borderRadius="$round"
                backgroundColor="#2E5266"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontSize="$3">
                  🔒
                </Text>
              </YStack>
              <H3 marginLeft="$3" fontSize="$6" fontWeight="600" color="$gray12">
                Privacy Status
              </H3>
            </XStack>
            <YStack space="$2">
              <XStack alignItems="center">
                <YStack
                  width={8}
                  height={8}
                  backgroundColor="$green9"
                  borderRadius="$round"
                  marginRight="$2"
                />
                <Text fontSize="$3" color="$green10">
                  Zero-knowledge encryption active
                </Text>
              </XStack>
              <XStack alignItems="center">
                <YStack
                  width={8}
                  height={8}
                  backgroundColor="$green9"
                  borderRadius="$round"
                  marginRight="$2"
                />
                <Text fontSize="$3" color="$green10">
                  Local data storage secure
                </Text>
              </XStack>
              <XStack alignItems="center">
                <YStack
                  width={8}
                  height={8}
                  backgroundColor="$green9"
                  borderRadius="$round"
                  marginRight="$2"
                />
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
            flex={isMobile ? undefined : 1}
            minWidth={isMobile ? undefined : 280}
          >
            <XStack alignItems="center" marginBottom="$4">
              <YStack
                width={32}
                height={32}
                borderRadius="$round"
                backgroundColor="#4A7C7E"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontSize="$3">
                  📊
                </Text>
              </YStack>
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
            flex={isMobile ? undefined : 1}
            minWidth={isMobile ? undefined : 280}
          >
            <XStack alignItems="center" marginBottom="$4">
              <YStack
                width={32}
                height={32}
                borderRadius="$round"
                backgroundColor="#E8B04B"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontSize="$3">
                  ⚡
                </Text>
              </YStack>
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
        </YStack>

        {/* Development Status */}
        <Card backgroundColor="$blue2" borderColor="$blue6" padding="$4" borderRadius="$4">
          <XStack alignItems="center">
            <YStack
              width={24}
              height={24}
              borderRadius="$round"
              backgroundColor="$blue9"
              alignItems="center"
              justifyContent="center"
              marginRight="$3"
            >
              <Text color="white" fontSize="$2">
                ℹ️
              </Text>
            </YStack>
            <YStack>
              <Text fontSize="$3" fontWeight="500" color="$blue11">
                Development Mode
              </Text>
              <Text fontSize="$3" color="$blue10" marginTop="$1">
                Web platform foundation implemented. Core tracking features coming soon.
              </Text>
            </YStack>
          </XStack>
        </Card>
      </YStack>
    </YStack>
  );
}
