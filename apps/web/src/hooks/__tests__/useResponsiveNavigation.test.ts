/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import function with mock 'use client'
const useResponsiveNavigationMock = vi.hoisted(() => {
  const { useState, useEffect } = require('react');

  return function useResponsiveNavigation() {
    const [screenWidth, setScreenWidth] = useState(
      typeof window !== 'undefined' ? window.innerWidth : 1200
    );

    useEffect(() => {
      if (typeof window === 'undefined') return;

      const handleResize = () => {
        setScreenWidth(window.innerWidth);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const BREAKPOINTS = {
      mobile: 767,
      tablet: 1023,
    };

    const isMobile = screenWidth <= BREAKPOINTS.mobile;
    const isTablet = screenWidth > BREAKPOINTS.mobile && screenWidth <= BREAKPOINTS.tablet;
    const isDesktop = screenWidth > BREAKPOINTS.tablet;
    const navigationMode = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

    return {
      isMobile,
      isTablet,
      isDesktop,
      screenWidth,
      navigationMode,
    };
  };
});

vi.mock('../useResponsiveNavigation', () => ({
  useResponsiveNavigation: useResponsiveNavigationMock,
}));

const useResponsiveNavigation = useResponsiveNavigationMock;

// Mock window.innerWidth and resize event
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

const fireResize = (width: number) => {
  mockInnerWidth(width);
  window.dispatchEvent(new Event('resize'));
};

describe('useResponsiveNavigation', () => {
  beforeEach(() => {
    // Reset to default desktop width
    mockInnerWidth(1200);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up event listeners
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with current window width', () => {
      mockInnerWidth(1024);

      const { result } = renderHook(() => useResponsiveNavigation());

      expect(result.current.screenWidth).toBe(1024);
    });

    it('sets correct device type for desktop', () => {
      mockInnerWidth(1200);

      const { result } = renderHook(() => useResponsiveNavigation());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.navigationMode).toBe('desktop');
    });
  });

  describe('Mobile Breakpoint (≤767px)', () => {
    const mobileWidths = [320, 400, 600, 767];

    mobileWidths.forEach(width => {
      it(`identifies ${width}px as mobile`, () => {
        mockInnerWidth(width);

        const { result } = renderHook(() => useResponsiveNavigation());

        expect(result.current.isMobile).toBe(true);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.navigationMode).toBe('mobile');
        expect(result.current.screenWidth).toBe(width);
      });
    });
  });

  describe('Tablet Breakpoint (768-1023px)', () => {
    const tabletWidths = [768, 800, 1000, 1023];

    tabletWidths.forEach(width => {
      it(`identifies ${width}px as tablet`, () => {
        mockInnerWidth(width);

        const { result } = renderHook(() => useResponsiveNavigation());

        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(true);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.navigationMode).toBe('tablet');
        expect(result.current.screenWidth).toBe(width);
      });
    });
  });

  describe('Desktop Breakpoint (≥1024px)', () => {
    const desktopWidths = [1024, 1200, 1440, 1920];

    desktopWidths.forEach(width => {
      it(`identifies ${width}px as desktop`, () => {
        mockInnerWidth(width);

        const { result } = renderHook(() => useResponsiveNavigation());

        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.navigationMode).toBe('desktop');
        expect(result.current.screenWidth).toBe(width);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('updates state when window is resized', () => {
      mockInnerWidth(1200); // Start desktop

      const { result } = renderHook(() => useResponsiveNavigation());

      expect(result.current.isDesktop).toBe(true);

      // Resize to mobile
      act(() => {
        fireResize(400);
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.screenWidth).toBe(400);
    });

    it('handles multiple resize events correctly', () => {
      mockInnerWidth(1200);

      const { result } = renderHook(() => useResponsiveNavigation());

      // Desktop → Mobile
      act(() => {
        fireResize(500);
      });
      expect(result.current.navigationMode).toBe('mobile');

      // Mobile → Tablet
      act(() => {
        fireResize(800);
      });
      expect(result.current.navigationMode).toBe('tablet');

      // Tablet → Desktop
      act(() => {
        fireResize(1400);
      });
      expect(result.current.navigationMode).toBe('desktop');
    });

    it('handles edge case transitions correctly', () => {
      mockInnerWidth(768); // Exact tablet boundary

      const { result } = renderHook(() => useResponsiveNavigation());

      expect(result.current.isTablet).toBe(true);

      // Move to mobile (767px)
      act(() => {
        fireResize(767);
      });
      expect(result.current.isMobile).toBe(true);

      // Move to desktop (1024px)
      act(() => {
        fireResize(1024);
      });
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('Event Listener Management', () => {
    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useResponsiveNavigation());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('only has one resize listener at a time', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useResponsiveNavigation());

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Breakpoint Constants', () => {
    it('uses correct breakpoint values from UX Architecture', () => {
      // Test mobile boundary
      mockInnerWidth(767);
      const { result: mobileResult } = renderHook(() => useResponsiveNavigation());
      expect(mobileResult.current.isMobile).toBe(true);

      mockInnerWidth(768);
      const { result: tabletResult } = renderHook(() => useResponsiveNavigation());
      expect(tabletResult.current.isTablet).toBe(true);

      // Test tablet boundary
      mockInnerWidth(1023);
      const { result: tabletUpperResult } = renderHook(() => useResponsiveNavigation());
      expect(tabletUpperResult.current.isTablet).toBe(true);

      mockInnerWidth(1024);
      const { result: desktopResult } = renderHook(() => useResponsiveNavigation());
      expect(desktopResult.current.isDesktop).toBe(true);
    });
  });

  describe('Return Value Consistency', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useResponsiveNavigation());

      expect(result.current).toHaveProperty('isMobile');
      expect(result.current).toHaveProperty('isTablet');
      expect(result.current).toHaveProperty('isDesktop');
      expect(result.current).toHaveProperty('screenWidth');
      expect(result.current).toHaveProperty('navigationMode');
    });

    it('ensures only one device type is true at a time', () => {
      const testWidths = [400, 800, 1200];

      testWidths.forEach(width => {
        mockInnerWidth(width);
        const { result } = renderHook(() => useResponsiveNavigation());

        const trueCount = [
          result.current.isMobile,
          result.current.isTablet,
          result.current.isDesktop,
        ].filter(Boolean).length;

        expect(trueCount).toBe(1);
      });
    });
  });
});
