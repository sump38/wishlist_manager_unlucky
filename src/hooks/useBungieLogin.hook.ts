import { useState, useCallback, useEffect } from 'react';

const BUNGIE_OAUTH_URL = process.env.REACT_APP_BUNGIE_OAUTH_URL || 'https://www.bungie.net/en/OAuth/Authorize';
const BUNGIE_CLIENT_ID = process.env.REACT_APP_BUNGIE_CLIENT_ID || '';
const APP_AUTH_SERVER_URL = process.env.REACT_APP_AUTH_SERVER_BUNGIE_URL || '';
const BUNGIE_API_KEY = process.env.REACT_APP_BUNGIE_API_KEY || '';

interface BungieUser {
  membershipId: string;
  uniqueName: string;
  displayName: string;
  profilePicturePath?: string;
  membershipType: number;
  isPublic: boolean;
  locale: string;
}

interface UseBungieLoginReturn {
  isLoggedIn: boolean;
  user: BungieUser | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  handleOAuthCallback: (code: string) => Promise<void>;
  parseReturnPath: (state: string) => string;
}

export const useBungieLogin = (): UseBungieLoginReturn => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<BungieUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processedCodes, setProcessedCodes] = useState<Set<string>>(new Set());

  // Check for existing login state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('bungie_user');
    const accessToken = localStorage.getItem('bungie_access_token');
    
    if (savedUser && accessToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (err) {
        // Clear invalid data
        localStorage.removeItem('bungie_user');
        localStorage.removeItem('bungie_access_token');
      }
    }
  }, []);

  const fetchUserData = async (accessToken: string): Promise<BungieUser> => {
    const response = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': BUNGIE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data from Bungie');
    }

    const data = await response.json();
    
    if (!data.Response || !data.Response.bungieNetUser) {
      throw new Error('Invalid response from Bungie API');
    }

    const bungieNetUser = data.Response.bungieNetUser;
    
    return {
      membershipId: bungieNetUser.membershipId,
      uniqueName: bungieNetUser.uniqueName,
      displayName: bungieNetUser.displayName,
      profilePicturePath: bungieNetUser.profilePicturePath,
      membershipType: bungieNetUser.membershipType || 0,
      isPublic: bungieNetUser.isPublic || false,
      locale: bungieNetUser.locale || 'en',
    };
  };

  const handleOAuthCallback = useCallback(async (code: string): Promise<void> => {
    // Prevent processing the same code multiple times
    if (processedCodes.has(code)) {
      console.log('Code already processed, skipping duplicate request');
      return;
    }

    // Prevent multiple simultaneous requests
    if (isLoading) {
      console.log('Already processing OAuth callback, skipping duplicate request');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mark this code as being processed
      setProcessedCodes(prev => new Set([...prev, code]));

      // Exchange code for access token using your auth server
      const response = await fetch(APP_AUTH_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
      }

      const { access_token } = await response.json();

      if (!access_token) {
        throw new Error('No access token received');
      }

      // Fetch user data from Bungie API
      const userData = await fetchUserData(access_token);

      // Store user data and token
      localStorage.setItem('bungie_user', JSON.stringify(userData));
      localStorage.setItem('bungie_access_token', access_token);

      setUser(userData);
      setIsLoggedIn(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth callback failed');
      setIsLoggedIn(false);
      setUser(null);
      // Remove the code from processed set on error so it can be retried
      setProcessedCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(code);
        return newSet;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, processedCodes]);

  const login = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current page path for redirect after auth
      const currentPath = window.location.pathname + window.location.search;
      const returnPath = currentPath === '/' ? '' : currentPath; // Don't include '/' in state to keep it shorter
      
      // Create OAuth URL with required parameters
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/bungie');
      const randomState = Math.random().toString(36).substring(2, 15);
      // Combine random state with return path, separated by a delimiter
      const stateWithReturn = returnPath ? `${randomState}|${returnPath}` : randomState;
      const state = encodeURIComponent(stateWithReturn);
      
      const oauthUrl = `${BUNGIE_OAUTH_URL}?client_id=${BUNGIE_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
      
      // Store state for validation (in a real app, this should be more secure)
      sessionStorage.setItem('bungie_oauth_state', randomState);
      
      // Redirect to Bungie OAuth
      window.location.href = oauthUrl;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoggedIn(false);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    setIsLoggedIn(false);
    setUser(null);
    setError(null);
    
    // Clear stored tokens and session data
    sessionStorage.removeItem('bungie_oauth_state');
    localStorage.removeItem('bungie_access_token');
    localStorage.removeItem('bungie_user');
    
    console.log('Bungie logout completed');
  }, []);

  const parseReturnPath = useCallback((state: string): string => {
    try {
      // Check if state contains return path (format: randomState|returnPath)
      const decodedState = decodeURIComponent(state);
      const parts = decodedState.split('|');
      
      if (parts.length === 2) {
        // State contains return path
        return parts[1] || '/';
      } else {
        // No return path, default to home
        return '/';
      }
    } catch (err) {
      console.error('Error parsing return path from state:', err);
      return '/';
    }
  }, []);

  return {
    isLoggedIn,
    user,
    isLoading,
    error,
    login,
    logout,
    handleOAuthCallback,
    parseReturnPath,
  };
};
