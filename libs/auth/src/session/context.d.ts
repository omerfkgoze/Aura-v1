import React from 'react';
export declare function AuthProvider({
  children,
  storage,
  config,
  enablePersistence,
}: {
  children: any;
  storage: any;
  config: any;
  enablePersistence?: boolean | undefined;
}): React.JSX.Element;
export declare function useAuth(): never;
export declare function useAuthState(): {
  user: any;
  session: any;
  isAuthenticated: any;
  isLoading: any;
  authMethod: any;
  deviceRegistered: any;
  lastSyncAt: any;
  isInitialized: any;
  error: any;
};
export declare function useAuthActions(): {
  authenticateWithPasskey: any;
  authenticateWithOpaque: any;
  registerDevice: any;
  refreshSession: any;
  logout: any;
  validateRecovery: any;
  clearAuthData: any;
  syncAuthState: any;
};
export declare function withAuthProtection(
  WrappedComponent: any,
  fallback: any
): {
  (props: any): React.JSX.Element;
  displayName: string;
};
