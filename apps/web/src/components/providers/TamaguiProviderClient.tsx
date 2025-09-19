'use client';

import { ReactNode } from 'react';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../../tamagui.config';

interface TamaguiProviderClientProps {
  children: ReactNode;
}

export function TamaguiProviderClient({ children }: TamaguiProviderClientProps) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}
