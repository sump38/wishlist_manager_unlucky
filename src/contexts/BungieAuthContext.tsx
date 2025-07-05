import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { BungieAuthManager, AuthStatus } from '../services/BungieAuthManager';
import { BungieUser } from '../interfaces/bungie-auth.interface';

interface BungieAuthContextType {
  authManager: BungieAuthManager;
}

const BungieAuthContext = createContext<BungieAuthContextType | undefined>(undefined);

interface BungieAuthProviderProps {
  children: ReactNode;
}

export const BungieAuthProvider: React.FC<BungieAuthProviderProps> = ({ children }) => {
  // Create a single instance of BungieAuthManager that persists across re-renders
  const authManager = useMemo(() => new BungieAuthManager(), []);

  const value = {
    authManager
  };

  return (
    <BungieAuthContext.Provider value={value}>
      {children}
    </BungieAuthContext.Provider>
  );
};

interface UseBungieAuthReturn {
  isLoggingIn: boolean;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  handleOAuthCallback: (code: string, state: string) => Promise<void>;
  parseReturnPath: (state: string) => string;
  error: string | null;
  user: BungieUser | null;
  accessToken: string | null;
}

export const useBungieAuth = (): UseBungieAuthReturn => {
  const context = useContext(BungieAuthContext);
  if (context === undefined) {
    throw new Error('useBungieAuth must be used within a BungieAuthProvider');
  }

  const { authManager } = context;
  const [authState, setAuthState] = useState<AuthStatus>({
    isLoggedIn: false,
    isLoggingIn: false,
    user: null,
    error: null,
    accessToken: null,
    membershipId: null
  });

  useEffect(() => {
    // Subscribe to auth status changes
    const subscription = authManager.getAuthStatus$().subscribe(setAuthState);
    
    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [authManager]);

  return {
    isLoggingIn: authState.isLoggingIn,
    isLoggedIn: authState.isLoggedIn,
    login: () => authManager.login(),
    logout: () => authManager.logout(),
    handleOAuthCallback: (code: string, state: string) => authManager.handleCallback(code, state),
    parseReturnPath: (state: string) => authManager.parseReturnPath(state),
    error: authState.error,
    user: authState.user,
    accessToken: authState.accessToken
  };
};
