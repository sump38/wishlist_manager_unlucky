import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useBungieAuth } from '../../contexts/BungieAuthContext';

export const BungieAuthCallback: React.FC = () => {
  const history = useHistory();
  const { handleOAuthCallback, isLoggingIn, error } = useBungieAuth();

  useEffect(() => {
    // Get the code and state from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code || !state) {
      console.error('Missing authorization code or state in callback URL');
      history.push('/');
      return;
    }

    // Trigger the auth callback - manager handles async operations and redirect
    handleOAuthCallback(code, state);
  }, []);

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
        <Box mt={3}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => history.replace('/')}
          >
            Return to Home
          </Button>
        </Box>
      </Box>
    );
  }

  if (isLoggingIn) {
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
  }

  // Default loading state while processing
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
          Processing authentication...
        </Typography>
      </Box>
    </Box>
  );
};
