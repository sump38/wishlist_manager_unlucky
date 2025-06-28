import { useState, useCallback, useEffect } from 'react';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_CLIENT_ID = 'Ov23liSNxzMqJHCrLz8D';
const APP_AUTH_SERVER_URL = 'https://wishlist-auth-server.vercel.app/api/github-auth';

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

interface UseGitHubLoginReturn {
  isLoggedIn: boolean;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  handleOAuthCallback: (code: string) => Promise<void>;
}

export const useGithubLogin = (): UseGitHubLoginReturn => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing login state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('github_user');
    const accessToken = localStorage.getItem('github_access_token');
    
    if (savedUser && accessToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (err) {
        // Clear invalid data
        localStorage.removeItem('github_user');
        localStorage.removeItem('github_access_token');
      }
    }
  }, []);

  const fetchUserData = async (accessToken: string): Promise<GitHubUser> => {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data from GitHub');
    }

    return await response.json();
  };

  const handleOAuthCallback = async (code: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
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

      // Fetch user data from GitHub API
      const userData = await fetchUserData(access_token);

      // Store user data and token
      localStorage.setItem('github_user', JSON.stringify(userData));
      localStorage.setItem('github_access_token', access_token);

      setUser(userData);
      setIsLoggedIn(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth callback failed');
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create OAuth URL with required parameters
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const scope = encodeURIComponent('user:email');
      const state = encodeURIComponent(Math.random().toString(36).substring(2, 15));
      
      const oauthUrl = `${GITHUB_OAUTH_URL}?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
      
      // Store state for validation (in a real app, this should be more secure)
      sessionStorage.setItem('github_oauth_state', state);
      
      // Redirect to GitHub OAuth
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
    sessionStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_access_token');
    localStorage.removeItem('github_user');
    
    console.log('GitHub logout completed');
  }, []);

  return {
    isLoggedIn,
    user,
    isLoading,
    error,
    login,
    logout,
    handleOAuthCallback,
  };
};