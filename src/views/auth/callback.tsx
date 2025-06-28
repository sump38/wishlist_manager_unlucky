import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useGithubLogin } from '../../hooks/useGithubLogin.hook';

export const AuthCallback: React.FC = () => {
  const history = useHistory();
  const { handleOAuthCallback, error } = useGithubLogin();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the code and state from URL parameters
      // Since we're using HashRouter, parameters are in the hash fragment
      const hash = window.location.hash;
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const urlParams = new URLSearchParams(queryString);
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
      const savedState = sessionStorage.getItem('github_oauth_state');
      if (state !== savedState) {
        console.error('Invalid state parameter - possible CSRF attack');
        history.push('/');
        return;
      }

      try {
        await handleOAuthCallback(code);
        // Clean up the URL by removing query parameters and redirect to home page
        history.replace('/');
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
          Completing GitHub login...
        </Typography>
      </Box>
    </Box>
  );
};
