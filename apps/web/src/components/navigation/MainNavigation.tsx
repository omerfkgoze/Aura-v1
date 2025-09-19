'use client';

import { useState } from 'react';
import { Button } from '@tamagui/button';
import { Text, Stack as XStack, Stack as YStack } from '@tamagui/core';
import { H3 } from '@tamagui/text';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    href: '/',
    description: 'Overview and quick access',
  },
  {
    id: 'privacy',
    label: 'Privacy Controls',
    icon: '🔒',
    href: '/privacy',
    description: 'Manage your privacy settings',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings',
    description: 'App and account settings',
  },
];

interface MainNavigationProps {
  currentPath?: string;
  isMobile?: boolean;
}

export function MainNavigation({ currentPath = '/', isMobile = false }: MainNavigationProps) {
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  const toggleNavigation = () => {
    setIsExpanded(!isExpanded);
  };

  if (isMobile) {
    return (
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderColor"
        zIndex={50}
      >
        <XStack justifyContent="space-around" padding="$3">
          {navigationItems.map(item => (
            <Button
              key={item.id}
              backgroundColor="transparent"
              borderWidth={0}
              flexDirection="column"
              alignItems="center"
              padding="$2"
              flex={1}
              hoverStyle={{ backgroundColor: '$gray2' }}
              pressStyle={{ backgroundColor: '$gray3' }}
            >
              <Text fontSize="$6" marginBottom="$1">
                {item.icon}
              </Text>
              <Text fontSize="$1" color={currentPath === item.href ? '#2E5266' : '$gray10'}>
                {item.label}
              </Text>
            </Button>
          ))}
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack
      backgroundColor="$background"
      borderRightWidth={1}
      borderRightColor="$borderColor"
      height="100%"
    >
      {/* Desktop Navigation Header */}
      <XStack padding="$6" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack alignItems="center" justifyContent="space-between">
          <H3 color="#2E5266" fontSize="$6" fontWeight="600">
            Navigation
          </H3>
          <Button
            backgroundColor="transparent"
            borderWidth={0}
            padding="$2"
            onPress={toggleNavigation}
          >
            <Text fontSize="$4">{isExpanded ? '◀' : '▶'}</Text>
          </Button>
        </XStack>
      </XStack>

      {/* Navigation Items */}
      <YStack padding="$4" space="$2">
        {navigationItems.map(item => {
          const isActive = currentPath === item.href;

          return (
            <Button
              key={item.id}
              backgroundColor={isActive ? '#F1F5F9' : 'transparent'}
              borderWidth={0}
              borderRadius="$3"
              padding="$3"
              justifyContent="flex-start"
              alignItems="center"
              hoverStyle={{ backgroundColor: '$gray2' }}
              pressStyle={{ backgroundColor: '$gray3' }}
            >
              <XStack alignItems="center" space="$3" width="100%">
                <Text fontSize="$5">{item.icon}</Text>
                {isExpanded && (
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="500" color={isActive ? '#2E5266' : '$gray12'}>
                      {item.label}
                    </Text>
                    <Text fontSize="$2" color="$gray10">
                      {item.description}
                    </Text>
                  </YStack>
                )}
              </XStack>
              {isActive && (
                <YStack
                  position="absolute"
                  right={0}
                  top={0}
                  bottom={0}
                  width={4}
                  backgroundColor="$primary"
                  borderTopLeftRadius="$2"
                  borderBottomLeftRadius="$2"
                />
              )}
            </Button>
          );
        })}
      </YStack>

      {/* Privacy Mode Indicator */}
      <YStack position="absolute" bottom="$4" left="$4" right="$4">
        <YStack
          backgroundColor="$green2"
          borderColor="$green6"
          borderWidth={1}
          borderRadius="$4"
          padding="$3"
        >
          <XStack alignItems="center" space="$2">
            <YStack width={8} height={8} backgroundColor="$green9" borderRadius="$round" />
            {isExpanded ? (
              <YStack flex={1}>
                <Text fontSize="$2" fontWeight="500" color="$green11">
                  Privacy Mode Active
                </Text>
                <Text fontSize="$1" color="$green10">
                  Zero-knowledge protection enabled
                </Text>
              </YStack>
            ) : (
              <Text fontSize="$2" fontWeight="500" color="$green11">
                🔒
              </Text>
            )}
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
