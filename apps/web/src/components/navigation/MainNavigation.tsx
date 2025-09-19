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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
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
      </div>
    );
  }

  return (
    <div className="bg-white border-r border-slate-200 h-full">
      {/* Desktop Navigation Header */}
      <div className="p-6 border-b border-slate-200">
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
      </div>

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
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 rounded-l"
                  style={{ backgroundColor: '#2E5266' }}
                />
              )}
            </Button>
          );
        })}
      </YStack>

      {/* Privacy Mode Indicator */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <XStack alignItems="center" space="$2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
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
        </div>
      </div>
    </div>
  );
}
