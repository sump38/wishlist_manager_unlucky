import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useBungieLogin } from '../../hooks/useBungieLogin.hook';

export const BungieAuthCallback: React.FC = () => {
  const history = useHistory();
  const { handleOAuthCallback, parseReturnPath, error } = useBungieLogin();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the code and state from URL parameters
      // With BrowserRouter, parameters are in search params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code) {
        console.error('No authorization code found in callback URL');
        history.push('/');
        return;
      }

      if (!state) {
        console.error('No state parameter found in callback URL');
        history.push('/');
        return;
      }

      // Validate state parameter
      const savedState = sessionStorage.getItem('bungie_oauth_state');
      // Extract the random state portion from the full state (format: randomState|returnPath)
      const stateToValidate = state.includes('|') ? state.split('|')[0] : state;
      
      if (stateToValidate !== savedState) {
        console.error('Invalid state parameter - possible CSRF attack');
        console.log('Expected state:', savedState, 'Received state:', stateToValidate);
        history.push('/');
        return;
      }

      try {
        await handleOAuthCallback(code);
        // Get the return path from the state parameter
        const returnPath = parseReturnPath(state);
        // Redirect to the original page or home
        history.replace(returnPath);
      } catch (err) {
        console.error('OAuth callback failed:', err);
        // Redirect to home page even on error so user isn't stuck
        setTimeout(() => history.replace('/'), 3000);
      }
    };

    handleCallback();
  }, [handleOAuthCallback, history]);

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        flexDirection="column" 
        width="100vw" 
        height="100vh"
        textAlign="center"
      >
        <Typography variant="h6" color="error" gutterBottom>
          Login Failed
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Redirecting to home page...
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      flexDirection="column" 
      width="100vw" 
      height="100vh"
    >
      <CircularProgress />
      <Box p={3} color="#FFFFFF">
        <Typography variant="body1">
          Completing Bungie login...
        </Typography>
      </Box>
    </Box>
  );
};
