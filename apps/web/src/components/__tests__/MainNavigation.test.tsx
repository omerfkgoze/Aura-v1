import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MainNavigation } from '../navigation/MainNavigation';

// Mock Tamagui components
vi.mock('@tamagui/button', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@tamagui/core', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@tamagui/text', () => ({
  H3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

describe('MainNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Navigation', () => {
    it('renders all navigation items', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Privacy Controls')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('highlights active navigation item', () => {
      render(<MainNavigation currentPath="/privacy" isMobile={false} />);

      const privacyButton = screen.getByText('Privacy Controls').closest('button');
      expect(privacyButton).toHaveStyle('backgroundColor: #F1F5F9');
    });

    it('shows expanded navigation by default', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      expect(screen.getByText('Overview and quick access')).toBeInTheDocument();
      expect(screen.getByText('Manage your privacy settings')).toBeInTheDocument();
    });

    it('toggles navigation expansion', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      const toggleButton = screen.getByText('◀');
      fireEvent.click(toggleButton);

      // Descriptions should be hidden when collapsed
      expect(screen.queryByText('Overview and quick access')).not.toBeInTheDocument();
    });

    it('displays privacy mode indicator', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      expect(screen.getByText('Privacy Mode Active')).toBeInTheDocument();
      expect(screen.getByText('Zero-knowledge protection enabled')).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('renders bottom navigation for mobile', () => {
      render(<MainNavigation currentPath="/" isMobile={true} />);

      const container = screen.getByText('Dashboard').closest('div');
      expect(container).toHaveClass('fixed', 'bottom-0');
    });

    it('shows icons and labels in mobile layout', () => {
      render(<MainNavigation currentPath="/" isMobile={true} />);

      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('highlights active item in mobile navigation', () => {
      render(<MainNavigation currentPath="/settings" isMobile={true} />);

      const settingsText = screen.getByText('Settings');
      expect(settingsText).toHaveStyle('color: #2E5266');
    });

    it('does not show privacy indicator in mobile mode', () => {
      render(<MainNavigation currentPath="/" isMobile={true} />);

      expect(screen.queryByText('Privacy Mode Active')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    const navigationItems = [
      { label: 'Dashboard', icon: '🏠', href: '/' },
      { label: 'Privacy Controls', icon: '🔒', href: '/privacy' },
      { label: 'Settings', icon: '⚙️', href: '/settings' },
    ];

    navigationItems.forEach(item => {
      it(`renders ${item.label} navigation item correctly`, () => {
        render(<MainNavigation currentPath="/" isMobile={false} />);

        expect(screen.getByText(item.label)).toBeInTheDocument();
        expect(screen.getByText(item.icon)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains proper button semantics', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('provides descriptive text for navigation items', () => {
      render(<MainNavigation currentPath="/" isMobile={false} />);

      expect(screen.getByText('Overview and quick access')).toBeInTheDocument();
      expect(screen.getByText('Manage your privacy settings')).toBeInTheDocument();
      expect(screen.getByText('App and account settings')).toBeInTheDocument();
    });
  });
});
