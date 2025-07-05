import { BungieUser } from "../interfaces/bungie-auth.interface";
import { BehaviorSubject, Observable } from "rxjs";

const ONE_MINUTE_IN_MS = 60 * 1000;

export interface AuthStatus {
    isLoggedIn: boolean;
    isLoggingIn: boolean;
    user: BungieUser | null;
    error: string | null;
    accessToken: string | null;
    membershipId: string | null;
}

export interface AuthState {
    clientId: string;
    apiKey: string;
    redirectUri: string;
    accessToken: string | null;
    refreshToken: string | null;
    membershipId: string | null;
    expiresIn: number | null;
    user: BungieUser | null;
    isLoggingIn: boolean;
    isLoggedIn: boolean;
    error: string | null;
}

export class BungieAuthManager implements AuthState {
    public clientId: string;
    public apiKey: string;
    public redirectUri: string;
    public accessToken: string | null = null;
    public refreshToken: string | null = null;
    public membershipId: string | null = null;
    public expiresIn: number | null = null;
    public user: BungieUser | null = null;
    public isLoggingIn: boolean = false;
    public isLoggedIn: boolean = false;
    public error: string | null = null;
    refreshTimeout: NodeJS.Timeout | null = null;

    private authStatus$ = new BehaviorSubject<AuthStatus>({
        isLoggedIn: false,
        isLoggingIn: false,
        user: null,
        error: null,
        accessToken: null,
        membershipId: null
    });

    constructor() {
        console.log('BungieAuthManager instance created');

        // Initialize the required auth parameters from environment variables
        this.clientId = process.env.REACT_APP_BUNGIE_CLIENT_ID || '';
        this.apiKey = process.env.REACT_APP_BUNGIE_API_KEY || '';
        this.redirectUri = `${window.location.origin}/auth/bungie`;

        // Check localStorage for existing tokens
        this.accessToken = localStorage.getItem('bungie_access_token');
        this.refreshToken = localStorage.getItem('bungie_refresh_token');
        this.membershipId = localStorage.getItem('bungie_membership_id');

        this.expiresIn = parseInt(localStorage.getItem('bungie_expires_in') || '0', 10);





        // Update isLoggedIn state
        this.isLoggedIn = this.accessToken !== null && this.membershipId !== null;

        // If already logged in, clear the OAuth state to prevent stale state issues
        if (this.isLoggedIn) {
            localStorage.removeItem('bungie_oauth_state');
        }



        // If already logged in but no user data, fetch it
        if (this.isLoggedIn) {

            this.handleRefreshFlow().then(() => {
                // Fetch user details after handling refresh flow
                this.fetchUserDetails().catch(error => {
                    console.error('Failed to fetch user details on initialization:', error);
                    //logout
                    this.logout();
                })
            }).catch(error => {
                console.error('Failed to handle refresh flow on initialization:', error);
                //logout if refresh fails
                this.logout();
            });
        } else {
            // If not logged in, reset state
            this.resetState();
            this.updateAuthStatus();
        }
    }

    /**
     * Start the login process
     */
    public login(): void {
        // If already authenticated, no need to login again
        if (this.isLoggedIn) {
            return;
        }
        // Set loading state
        this.setLoading(true);

        // Start OAuth flow since no valid tokens found
        this.startAuthFlow();
    }

    private async handleRefreshFlow(): Promise<void> {
        // check time to expiry and set timeout to refresh token if needed
        if (!this.isLoggedIn || !this.accessToken || !this.refreshToken || !this.expiresIn) {
            throw new Error('Not logged in or missing tokens');
        }

        // Check token expiry
        const tokenAboutToExpire = Date.now() + ONE_MINUTE_IN_MS >= this.expiresIn;
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        if (tokenAboutToExpire) {
            //refresh token immediately
            try {
                await this.refreshAccessToken();

            } catch (error) {
                console.error('Failed to refresh access token:', error);
                //logout if refresh fails
                this.logout();
            }
        }
        //set timeout to refresh token
        const timeToExpiry = this.expiresIn - Date.now() - ONE_MINUTE_IN_MS;

        const timeToExpiryInMinutes = Math.max(Math.ceil(timeToExpiry / ONE_MINUTE_IN_MS), 1);
        console.log(`Access token will expire in ${timeToExpiryInMinutes} minutes`);

        this.refreshTimeout = setTimeout(() => {
            this.handleRefreshFlow().catch(error => {
                console.error('Error during scheduled token refresh:', error);
                //logout if refresh fails
                this.logout();
            });
        }, timeToExpiry);
        
        return;
    }




    /**
     * Start the OAuth flow
     */
    private startAuthFlow(): void {
        // Generate state object with hash and return URL
        const hash = Math.random().toString(36).substring(2, 15);
        const state = {
            hash: hash,
            returnUrl: window.location.href
        };

        // Store only the hash in localStorage
        localStorage.setItem('bungie_oauth_state', hash);

        // Ensure we have required OAuth parameters
        if (!this.clientId) {
            console.error('Missing client ID for Bungie OAuth');
            this.setError('Missing Bungie OAuth configuration');
            return;
        }

        // Build authorization URL
        const authUrl = new URL('https://www.bungie.net/en/OAuth/Authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        // Use base64 encoding for state to ensure it's URL-safe
        authUrl.searchParams.append('state', btoa(JSON.stringify(state)));

        // Redirect to Bungie OAuth
        window.location.href = authUrl.toString();
    }

    /**
     * Handle the OAuth callback
     */
    public async handleCallback(code: string, state: string): Promise<void> {
        try {
            if (this.isLoggedIn || this.isLoggingIn) {
                console.warn('Already logged in or logging in, skipping callback handling');
                throw new Error('callback reached when Already logged in or logging in');
            }

            let returnPath = '/';
            let stateObj = null;


            this.setLoading(true);
            this.setError(null);

            // Parse state - decode base64 first
            try {
                const decodedState = atob(state);
                stateObj = JSON.parse(decodedState);
                const storedHash = localStorage.getItem('bungie_oauth_state');

                if (stateObj.hash !== storedHash) {
                    throw new Error('Invalid state parameter');
                }

                // Store return path from state if valid
                if (stateObj && stateObj.returnUrl) {
                    returnPath = stateObj.returnUrl;
                }
            } catch (stateError) {
                console.error('Error parsing state parameter:', stateError);
                throw new Error('Invalid state parameter');
            }

            // Exchange code for tokens
            const authServerUrl = process.env.REACT_APP_AUTH_SERVER_BUNGIE_URL;
            const tokenResponse = await fetch(authServerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                }),
            });

            const tokenData = await tokenResponse.json();

            if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenData.error_description}`);
            }

            // Store tokens
            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.membershipId = tokenData.membership_id;
            this.expiresIn = Date.now() + tokenData.expires_in * 1000;

            // Save to localStorage
            localStorage.setItem('bungie_access_token', this.accessToken);
            localStorage.setItem('bungie_refresh_token', this.refreshToken);
            localStorage.setItem('bungie_membership_id', this.membershipId);
            localStorage.setItem('bungie_expires_in', this.expiresIn.toString());

            // Update auth status after user details are fetched
            this.updateAuthStatus();

            // Redirect to return URL
            window.location.href = returnPath;
        } catch (error) {
            this.setError(error instanceof Error ? error.message : 'Authentication failed');
            throw error;
        } finally {
            // Always clean up the OAuth state regardless of success or failure
            localStorage.removeItem('bungie_oauth_state');
        }
    }


    async fetchUserDetails(): Promise<BungieUser | null> {
        console.log('Fetching user details with access token');
        if (!this.isLoggedIn) {
            console.warn('Cannot fetch user details - not logged in');
            return null;
        }

        try {
            this.setLoading(true);
            const apiUrl = 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/';
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-API-Key': this.apiKey,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const data = await response.json();

            if (!data.Response) {
                throw new Error('Invalid response from Bungie API');
            }

            // Get basic user info
            const bungieNetUser = data.Response.bungieNetUser;

            // Find primary Destiny 2 membership if available
            let destinyMembership = null;
            if (data.Response.destinyMemberships && data.Response.destinyMemberships.length > 0) {
                // Use the first membership or find a specific one if needed
                destinyMembership = data.Response.destinyMemberships[0];
                const steamMembership = data.Response.destinyMemberships.find((m: any) => m.membershipType === 3); // 3 is Steam

                if( steamMembership) {
                    destinyMembership = steamMembership;
                }

            }

            // Create the combined user object with both Bungie.net and Destiny info
            this.user = {
                membershipId: bungieNetUser.membershipId,
                displayName: bungieNetUser.displayName,
                profilePicturePath: bungieNetUser.profilePicturePath,
                membershipType: destinyMembership ? destinyMembership.membershipType : 0,
                isPublic: true,
                locale: bungieNetUser.locale || 'en',
                // Add Destiny-specific properties if available
                destinyMembershipId: destinyMembership ? destinyMembership.membershipId : null,
                destinyDisplayName: destinyMembership ? destinyMembership.displayName : null,
                platformType: destinyMembership ? destinyMembership.membershipType : null
            };

            return this.user;
        } catch (error) {
            this.setError(error instanceof Error ? error.message : 'Failed to fetch user details');

            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Get auth status observable
     */
    public getAuthStatus$(): Observable<AuthStatus> {
        return this.authStatus$.asObservable();
    }

    /**
     * Update auth status and notify subscribers
     */
    private updateAuthStatus(): void {
        // Update isLoggedIn based on token presence
        this.isLoggedIn = this.accessToken !== null && this.membershipId !== null;

        this.authStatus$.next({
            isLoggedIn: this.isLoggedIn,
            isLoggingIn: this.isLoggingIn,
            user: this.user,
            error: this.error,
            accessToken: this.accessToken,
            membershipId: this.membershipId
        });
    }

    /**
     * Set loading state
     */
    private setLoading(isLoading: boolean): void {
        this.isLoggingIn = isLoading;
        this.updateAuthStatus();
    }

    /**
     * Set error state
     */
    private setError(error: string | null): void {
        this.error = error;
        this.isLoggingIn = false;
        this.updateAuthStatus();
    }

    /**
     * Reset all state properties to initial values
     */
    private resetState(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.membershipId = null;
        this.expiresIn = null;
        this.user = null;
        this.isLoggingIn = false;
        this.isLoggedIn = false;
        this.error = null;
    }

    /**
     * Refresh the access token
     */
    public async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const authServerUrl = process.env.REACT_APP_AUTH_SERVER_BUNGIE_URL;
            const refreshResponse = await fetch(authServerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token',
                }),
            });

            const tokenData = await refreshResponse.json();

            if (!refreshResponse.ok) {
                // If refresh fails, clear all tokens and require re-login
                this.logout();
                throw new Error(`Token refresh failed: ${tokenData.error_description}`);
            }

            // Update tokens
            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.membershipId = tokenData.membership_id;
            this.expiresIn = Date.now() + tokenData.expires_in * 1000;

            // Save to localStorage
            localStorage.setItem('bungie_access_token', this.accessToken);
            localStorage.setItem('bungie_refresh_token', this.refreshToken);
            localStorage.setItem('bungie_membership_id', this.membershipId);
            localStorage.setItem('bungie_expires_in', this.expiresIn.toString());

            // Update auth status
            this.updateAuthStatus();
        } catch (error) {
            this.setError(error instanceof Error ? error.message : 'Token refresh failed');
            //logout if refresh fails
            this.logout();
            throw error;
        }
    }

    /**
     * Logout and clear all tokens from localStorage
     */
    public logout(): void {

        // Clear localStorage
        localStorage.removeItem('bungie_access_token');
        localStorage.removeItem('bungie_refresh_token');
        localStorage.removeItem('bungie_membership_id');
        localStorage.removeItem('bungie_expires_in');
        localStorage.removeItem('bungie_oauth_state');

        // Reload the current page
        window.location.reload();
    }

    /**
     * Parse return path from state parameter
     */
    public parseReturnPath(state: string): string {
        try {
            // First decode base64, then get the returnUrl from the state object
            const decodedState = atob(state);
            const stateObj = JSON.parse(decodedState);

            if (stateObj && stateObj.returnUrl) {
                return stateObj.returnUrl || '/';
            } else {
                // No return path, default to home
                return '/';
            }
        } catch (err) {
            console.error('Error parsing return path from state:', err);
            return '/';
        }
    }
}