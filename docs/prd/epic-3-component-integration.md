# Epic-3: Component Integration - Brownfield Enhancement

## Epic Goal

Transform placeholder interfaces in both web and mobile apps into functional applications by integrating existing components and logic, enabling development to continue with fully working applications.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Development setup completed (epic-1.5), applications launch with `pnpm dev`
- Technology stack: Next.js (web), React Native/Expo (mobile), Tamagui UI, TypeScript, monorepo with Nx
- Integration points: Shared components, types, and utilities across web/mobile platforms

**Enhancement Details:**

- What's being added/changed: Replace static placeholder screens with functional implementations using existing components
- How it integrates: Connect existing component library to main application screens and navigation
- Success criteria: Both web and mobile apps display functional interfaces with real cycle tracking, privacy controls, and data entry capabilities

## Stories

### Story 1: Mobile App Screen Integration

**Goal:** Replace mobile placeholder screens with functional implementations using existing components

**Scope:**

- Integrate `PeriodCalendar`, `FlowIntensitySelector`, `SymptomSelector` into `DataEntryScreen`
- Connect `PrivacyModeStateManager`, `StealthNavigationWrapper` to app navigation
- Implement functional `DashboardScreen` with cycle overview using existing tracking components
- Wire up `PrivacyControlsScreen` with existing privacy components

**Acceptance Criteria:**

- Mobile app launches with functional screens instead of placeholders
- Data entry screen allows period tracking with existing flow/symptom components
- Privacy controls are accessible and functional
- Dashboard shows cycle data and insights
- Stealth mode navigation works correctly

### Story 2: Web App Component Integration

**Goal:** Transform web app placeholder page into functional dashboard using existing component patterns

**Scope:**

- Create responsive web versions of mobile components where needed
- Integrate existing hooks like `useResponsiveNavigation`
- Build functional navigation between different app sections
- Implement web-specific layouts while maintaining mobile component compatibility

**Acceptance Criteria:**

- Web app displays functional dashboard with cycle tracking capabilities
- Quick actions in dashboard lead to working features
- Privacy settings are functional and accessible
- Responsive design works across desktop/tablet/mobile
- Shared components work consistently across platforms

### Story 3: Cross-Platform Data Flow & Navigation

**Goal:** Ensure proper data flow and navigation between integrated components

**Scope:**

- Verify shared types and utilities work correctly across platforms
- Test component state management and data persistence
- Implement proper error handling and loading states
- Ensure cultural stealth modes work on both platforms
- Test offline functionality and sync capabilities

**Acceptance Criteria:**

- Data entered on mobile/web persists correctly
- Navigation flows work smoothly between screens
- Error states are handled gracefully
- Stealth mode transitions work on both platforms
- Offline capabilities function as designed

## Compatibility Requirements

- [x] Existing component APIs remain unchanged
- [x] Shared types and utilities continue to work across platforms
- [x] Mobile navigation structure is preserved but enhanced
- [x] Web responsive design patterns are maintained
- [x] Existing development setup (`pnpm dev`) continues to work

## Risk Mitigation

- **Primary Risk:** Component integration breaks existing functionality or development workflow
- **Mitigation:**
  - Incremental integration of components one screen at a time
  - Thorough testing of each component integration before moving to next
  - Maintain existing component structure and API contracts
- **Rollback Plan:** Revert to placeholder implementations while maintaining new component connections

## Definition of Done

- [x] Mobile app displays functional screens with real cycle tracking capabilities
- [x] Web app shows working dashboard and navigation instead of placeholders
- [x] All existing components are properly integrated and functional
- [x] Data entry, privacy controls, and dashboard work on both platforms
- [x] Stealth mode and cultural privacy features function correctly
- [x] Development workflow remains intact (`pnpm dev` continues to work)
- [x] No regression in existing component functionality
- [x] Cross-platform shared components work seamlessly

## Technical Integration Points

**Mobile Components to Integrate:**

- `/apps/mobile/src/components/cycle-tracking/`: PeriodCalendar, FlowIntensitySelector, SymptomSelector
- `/apps/mobile/src/components/privacy/`: StealthNavigationWrapper, PrivacyModeStateManager
- `/apps/mobile/src/components/ui/`: Button, Card, Text

**Web Components to Connect:**

- `/apps/web/src/components/`: Existing component library
- `/apps/web/src/hooks/`: useResponsiveNavigation and other existing hooks
- Tamagui components already used in placeholder page

**Shared Dependencies:**

- `@aura/shared-types`: Ensure all type definitions are properly used
- `@aura/ui`: Shared UI components (Tamagui)
- Component state management patterns established in existing code

## Success Criteria

The epic is successful when:

1. Development team can run `pnpm dev` and see functional applications instead of placeholders
2. Mobile app provides complete cycle tracking, data entry, and privacy features
3. Web app offers responsive dashboard and functional navigation
4. All existing components are utilized and working correctly
5. Cross-platform consistency is maintained for shared functionality
6. Development can continue with full application functionality available

## Important Notes

- This epic focuses on INTEGRATION of existing components, not creating new functionality
- Preserve all existing component APIs and shared utilities
- Maintain development setup and build processes
- Priority is to unlock development by making existing work visible and functional
- Component testing should verify integration doesn't break existing functionality

---

**Story Manager Handoff:**

"Please develop detailed user stories for this component integration epic. Key considerations:

- This integrates existing components into placeholder screens in a Next.js/React Native monorepo
- Integration points: Mobile screens in `apps/mobile/src/screens/`, web pages in `apps/web/src/app/`
- Existing patterns to follow: Tamagui UI system, shared types from `@aura/shared-types`
- Critical compatibility requirements: Maintain existing component APIs, preserve development workflow
- Each story must include verification that existing component functionality remains intact

The epic should transform placeholder interfaces into functional applications while maintaining system integrity."
