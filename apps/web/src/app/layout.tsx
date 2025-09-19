import './globals.css';
import { TamaguiProviderClient } from '../components/providers/TamaguiProviderClient';

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
        <TamaguiProviderClient>{children}</TamaguiProviderClient>
      </body>
    </html>
  );
}
