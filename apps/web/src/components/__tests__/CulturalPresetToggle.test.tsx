import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CulturalPresetToggle, type CulturalPreset } from '../stealth/CulturalPresetToggle';

// Mock Tamagui components
vi.mock('@tamagui/button', () => ({
  Button: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={onPress} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@tamagui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@tamagui/core', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@tamagui/text', () => ({
  H3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

describe('CulturalPresetToggle', () => {
  const mockOnPresetChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all cultural preset options', () => {
      render(<CulturalPresetToggle />);

      expect(screen.getByText('Global Default')).toBeInTheDocument();
      expect(screen.getByText('High Privacy Mode')).toBeInTheDocument();
      expect(screen.getByText('Professional Mode')).toBeInTheDocument();
      expect(screen.getByText('Invisible Mode')).toBeInTheDocument();
    });

    it('displays preset descriptions', () => {
      render(<CulturalPresetToggle />);

      expect(screen.getByText('Standard privacy with full functionality')).toBeInTheDocument();
      expect(screen.getByText('Enhanced stealth for sensitive environments')).toBeInTheDocument();
      expect(screen.getByText('Workplace-appropriate discrete interface')).toBeInTheDocument();
      expect(screen.getByText('Complete disguise as alternative app')).toBeInTheDocument();
    });

    it('shows preset icons', () => {
      render(<CulturalPresetToggle />);

      expect(screen.getByText('🌍')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('👔')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('renders component title', () => {
      render(<CulturalPresetToggle />);

      expect(screen.getByText('Cultural Preset Selection')).toBeInTheDocument();
    });
  });

  describe('Default State', () => {
    it('selects global preset by default', () => {
      render(<CulturalPresetToggle />);

      expect(screen.getByText('Active Mode: Global Default')).toBeInTheDocument();
    });

    it('respects currentPreset prop', () => {
      render(<CulturalPresetToggle currentPreset="high-privacy" />);

      expect(screen.getByText('Active Mode: High Privacy Mode')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onPresetChange when preset is selected', () => {
      render(<CulturalPresetToggle onPresetChange={mockOnPresetChange} />);

      const professionalButton = screen.getByText('Professional Mode').closest('button');
      fireEvent.click(professionalButton!);

      expect(mockOnPresetChange).toHaveBeenCalledWith('professional');
    });

    it('updates active mode display when preset changes', () => {
      render(<CulturalPresetToggle onPresetChange={mockOnPresetChange} />);

      const invisibleButton = screen.getByText('Invisible Mode').closest('button');
      fireEvent.click(invisibleButton!);

      expect(screen.getByText('Active Mode: Invisible Mode')).toBeInTheDocument();
    });

    it('supports all preset types', () => {
      const presets: CulturalPreset[] = ['global', 'high-privacy', 'professional', 'invisible'];

      presets.forEach(preset => {
        render(<CulturalPresetToggle onPresetChange={mockOnPresetChange} />);

        const presetButton = screen
          .getByText(
            preset === 'global'
              ? 'Global Default'
              : preset === 'high-privacy'
                ? 'High Privacy Mode'
                : preset === 'professional'
                  ? 'Professional Mode'
                  : 'Invisible Mode'
          )
          .closest('button');

        fireEvent.click(presetButton!);
        expect(mockOnPresetChange).toHaveBeenCalledWith(preset);

        mockOnPresetChange.mockClear();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<CulturalPresetToggle disabled={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows preview mode message when disabled', () => {
      render(<CulturalPresetToggle disabled={true} />);

      expect(screen.getByText('(Preview Mode - Changes not applied)')).toBeInTheDocument();
    });

    it('does not call onPresetChange when disabled', () => {
      render(<CulturalPresetToggle disabled={true} onPresetChange={mockOnPresetChange} />);

      const professionalButton = screen.getByText('Professional Mode').closest('button');
      fireEvent.click(professionalButton!);

      expect(mockOnPresetChange).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('highlights selected preset', () => {
      render(<CulturalPresetToggle currentPreset="high-privacy" />);

      const highPrivacyButton = screen.getByText('High Privacy Mode').closest('button');
      expect(highPrivacyButton).toHaveStyle('backgroundColor: $gray2');
    });

    it('applies correct colors for each preset', () => {
      const colorMapping = {
        'Global Default': '#4A7C7E',
        'High Privacy Mode': '#2E5266',
        'Professional Mode': '#E8B04B',
        'Invisible Mode': '#64748B',
      };

      render(<CulturalPresetToggle />);

      Object.entries(colorMapping).forEach(([label, color]) => {
        const iconContainer = screen.getByText(label).closest('button')?.querySelector('div');
        expect(iconContainer).toHaveStyle(`backgroundColor: ${color}`);
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains proper button semantics', () => {
      render(<CulturalPresetToggle />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // One for each preset
    });

    it('provides descriptive content for each option', () => {
      render(<CulturalPresetToggle />);

      // Each preset should have both name and description visible
      expect(screen.getByText('Standard privacy with full functionality')).toBeVisible();
      expect(screen.getByText('Enhanced stealth for sensitive environments')).toBeVisible();
      expect(screen.getByText('Workplace-appropriate discrete interface')).toBeVisible();
      expect(screen.getByText('Complete disguise as alternative app')).toBeVisible();
    });
  });
});
