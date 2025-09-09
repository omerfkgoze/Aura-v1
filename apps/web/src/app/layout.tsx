import '../index.css';

export const metadata = {
  title: 'Aura - Private Health Tracking',
  description: 'Your privacy-first reproductive health companion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
