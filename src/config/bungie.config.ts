export const BUNGIE_CONFIG = {
  OAUTH_URL: process.env.REACT_APP_BUNGIE_OAUTH_URL || 'https://www.bungie.net/en/OAuth/Authorize',
  CLIENT_ID: process.env.REACT_APP_BUNGIE_CLIENT_ID || '',
  AUTH_SERVER_URL: process.env.REACT_APP_AUTH_SERVER_BUNGIE_URL || '',
  API_KEY: process.env.REACT_APP_BUNGIE_API_KEY || '',
  API_BASE_URL: 'https://www.bungie.net/Platform',
  REDIRECT_PATH: '/auth/bungie',
} as const;
