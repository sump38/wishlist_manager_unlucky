import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AppBar, Box, IconButton, Paper, Toolbar, Typography, CircularProgress, Alert, Button } from "@mui/material";
import React, { useEffect, useCallback } from "react";
import { RouteChildrenProps } from "react-router-dom";
import { DefaultModal } from "../../components/default_modal/defaultModal.component";
import { useRepoWishlist } from "../../hooks/useRepoWishlist";

const useStyles = {
    toolbar: {
        display: "flex",
        justifyContent: "space-between",
    },
    root: {
        display: 'flex',
        minHeight: '100vh',
        flexDirection: "column",
        justifyContent: "center",
        padding: 0,
    },
    card: {
        display: 'flex',
        marginBottom: 1,
    },
    content: {
        padding: 2,
    }
}

export const SaveToGithubModal = ({ match, history }: RouteChildrenProps) => {
    let { wishlistId } = match!.params as any;
    const classes = useStyles;
    const { saving, saveError, saveSuccess, saveWishlist } = useRepoWishlist();

    const close = useCallback(() => {
        history.replace(`/wishlist/e/${wishlistId}`);
    }, [history, wishlistId]);

    // Auto-start saving when component mounts
    useEffect(() => {
        if (wishlistId) {
            saveWishlist(parseInt(wishlistId));
        }
    }, [wishlistId, saveWishlist]);

    return (
        <DefaultModal width={400} display="flex" flexDirection="column">
            <AppBar position="static">
                <Toolbar sx={classes.toolbar}>
                    <Typography>Save to GitHub</Typography>
                    <IconButton edge="end" color="inherit" aria-label="menu" onClick={close}>
                        <FontAwesomeIcon icon={faTimes}></FontAwesomeIcon>
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Paper>
                <Box p={2}>
                    {saving && (
                        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                            <CircularProgress />
                            <Typography variant="body1">
                                Saving wishlist to GitHub...
                            </Typography>
                        </Box>
                    )}
                    
                    {saveSuccess && (
                        <Alert severity="success">
                            <Typography variant="body1">
                                Wishlist successfully saved to GitHub!
                            </Typography>
                            <Box mt={2}>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={close}
                                    disabled={saving}
                                >
                                    Return to List
                                </Button>
                            </Box>
                        </Alert>
                    )}
                    
                    {saveError && (
                        <Alert severity="error">
                            <Typography variant="body1">
                                Failed to save wishlist to GitHub
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {saveError}
                            </Typography>
                        </Alert>
                    )}
                </Box>
            </Paper>
        </DefaultModal>
    );
};
