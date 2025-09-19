'use client';

import { ReactNode } from 'react';
import { MainNavigation } from '../navigation/MainNavigation';
import { useResponsiveNavigation } from '../../hooks/useResponsiveNavigation';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPath?: string;
}

export function DashboardLayout({ children, currentPath }: DashboardLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useResponsiveNavigation();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="pb-20">{children}</div>
        <MainNavigation currentPath={currentPath} isMobile={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop/Tablet Sidebar Navigation */}
      <div className={`${isTablet ? 'w-16' : 'w-64'} flex-shrink-0`}>
        <div className="fixed h-full">
          <MainNavigation currentPath={currentPath} isMobile={false} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
