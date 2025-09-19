'use client';

import { useState, useEffect } from 'react';

interface UseResponsiveNavigationReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  navigationMode: 'mobile' | 'tablet' | 'desktop';
}

// Breakpoints from UX Architecture requirements
const BREAKPOINTS = {
  mobile: 767, // Mobile: 320-767px
  tablet: 1023, // Tablet: 768-1023px
  // Desktop: 1024px+
} as const;

export function useResponsiveNavigation(): UseResponsiveNavigationReturn {
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    // Set initial width
    setScreenWidth(window.innerWidth);

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
}
