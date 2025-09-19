import './globals.css';
import { TamaguiProvider } from '@tamagui/core';
import tamaguiConfig from '../tamagui.config';

export const metadata = {
  title: 'Aura - Privacy-First Reproductive Health Tracking',
  description:
    'Zero-knowledge menstrual tracking with cultural stealth modes and healthcare provider sharing.',
  keywords: 'reproductive health, menstrual tracking, privacy, zero-knowledge, healthcare',
  authors: [{ name: 'Aura Health Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          {children}
        </TamaguiProvider>
      </body>
    </html>
  );
}
