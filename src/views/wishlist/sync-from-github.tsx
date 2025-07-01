import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AppBar, Box, IconButton, Paper, Toolbar, Typography, CircularProgress, Alert, Button } from "@mui/material";
import React, { useEffect, useCallback, useState } from "react";
import { RouteChildrenProps } from "react-router-dom";
import { DefaultModal } from "../../components/default_modal/defaultModal.component";
import { useLoadRepoWishList } from "../../hooks/useLoadRepoWishList";
import { getWishlist, updateWishlist } from "../../services/wishlists.service";
import { deleteBuildsByWishlistId, saveBuild } from "../../services/wishlistBuild.service";
import { importLittleLight } from "../../utils/converters/littlelight.converter";

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

export const SyncFromGithubModal = ({ match, history }: RouteChildrenProps) => {
    let { wishlistId } = match!.params as any;
    const classes = useStyles;
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [currentWishlist, setCurrentWishlist] = useState<any>(null);
    
    const { loadWishlist, loading, repoError, wishlistError } = useLoadRepoWishList();

    const close = useCallback(() => {
        if (!isSyncing) {
            history.replace(`/wishlist/e/${wishlistId}`);
        }
    }, [history, wishlistId, isSyncing]);

    // Load current wishlist data to extract linkedRepo and sha
    useEffect(() => {
        const loadCurrentWishlist = async () => {
            try {
                const wishlist = await getWishlist(parseInt(wishlistId));
                setCurrentWishlist(wishlist);
            } catch (error) {
                console.error('Error loading current wishlist:', error);
            }
        };
        
        if (wishlistId) {
            loadCurrentWishlist();
        }
    }, [wishlistId]);

    const handleSync = useCallback(async (wishlistData: any) => {
        try {
            setSyncMessage("Converting wishlist data...");
            
            // Convert the Little Light wishlist format to our internal format
            const convertedList = importLittleLight(wishlistData);
            
            if (!convertedList || !convertedList.wishlist) {
                throw new Error("Failed to convert wishlist data");
            }

            setSyncMessage("Deleting existing builds...");
            
            // Delete all current builds for this wishlist
            await deleteBuildsByWishlistId(parseInt(wishlistId));

            setSyncMessage("Adding new builds...");
            
            // Add the new builds from the updated wishlist
            for (let i in convertedList.builds) {
                const build = convertedList.builds[parseInt(i)];
                await saveBuild({
                    wishlistId: parseInt(wishlistId),
                    ...build
                });
            }

            setSyncMessage("Updating wishlist metadata...");
            
            // Update the wishlist with new data (including updated SHA)
            const updatedWishlist = {
                ...currentWishlist,
                ...convertedList.wishlist,
                id: parseInt(wishlistId), // Preserve the original ID
                linkedRepo: wishlistData.linkedRepo, // Preserve the linked repo
                sha: wishlistData.sha // Update with new SHA
            };
            
            await updateWishlist(updatedWishlist);

            setSyncMessage("Sync completed successfully!");
            setTimeout(() => {
                history.replace(`/wishlist/e/${wishlistId}`);
            }, 2000);
            
        } catch (error) {
            console.error('Sync error:', error);
            setSyncMessage("An error occurred during sync. Please try again.");
            setTimeout(() => {
                setIsSyncing(false);
                setSyncMessage(null);
            }, 3000);
        }
    }, [history, wishlistId, currentWishlist]);

    const startSync = useCallback(async () => {
        if (!currentWishlist) {
            setSyncMessage("Current wishlist data not loaded.");
            return;
        }

        setIsSyncing(true);
        setSyncMessage("Loading wishlist from repository...");

        try {
            const linkedRepo = currentWishlist.linkedRepo;
            if (!linkedRepo) {
                setSyncMessage("No linked repository found for this wishlist.");
                setTimeout(() => {
                    setIsSyncing(false);
                    setSyncMessage(null);
                }, 3000);
                return;
            }
            
            const wishlistData = await loadWishlist(linkedRepo);
            
            if (wishlistData) {
                const remoteSha = wishlistData.sha;
                const currentSha = currentWishlist.sha;
                
                if (remoteSha === currentSha) {
                    setSyncMessage("Wishlist is already up to date. No sync needed.");
                    setTimeout(() => {
                        setIsSyncing(false);
                        setSyncMessage(null);
                    }, 3000);
                } else {
                    setSyncMessage("Changes detected. Syncing wishlist...");
                    await handleSync(wishlistData);
                }
            } else {
                setSyncMessage("Failed to load wishlist data.");
                setTimeout(() => {
                    setIsSyncing(false);
                    setSyncMessage(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Sync error:', error);
            setSyncMessage("An error occurred during sync.");
            setTimeout(() => {
                setIsSyncing(false);
                setSyncMessage(null);
            }, 3000);
        }
    }, [loadWishlist, currentWishlist, handleSync]);

    return (
        <DefaultModal width={500} display="flex" flexDirection="column">
            <AppBar position="static">
                <Toolbar sx={classes.toolbar}>
                    <Typography>Sync from GitHub</Typography>
                    <IconButton 
                        edge="end" 
                        color="inherit" 
                        aria-label="menu" 
                        onClick={close}
                        disabled={isSyncing}
                    >
                        <FontAwesomeIcon icon={faTimes}></FontAwesomeIcon>
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Paper>
                <Box p={2}>
                    <Typography variant="h6" gutterBottom>
                        Sync Wishlist from GitHub Repository
                    </Typography>
                    
                    {!isSyncing ? (
                        <>
                            <Typography variant="body1" color="textSecondary" paragraph>
                                This will sync your wishlist with the latest version from the linked GitHub repository.
                            </Typography>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Warning:</strong> This action will overwrite all current wishlist data, including any local changes you've made. 
                                    All builds and modifications will be replaced with the data from the GitHub repository.
                                </Typography>
                            </Alert>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Important:</strong> Please do not close your browser window while the sync process is running. 
                                    This may interrupt the synchronization and leave your data in an incomplete state.
                                </Typography>
                            </Alert>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
                            <CircularProgress size={24} />
                            <Typography variant="body1">
                                {syncMessage || "Syncing..."}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button 
                            variant="outlined" 
                            onClick={close}
                            disabled={isSyncing}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={startSync}
                            disabled={isSyncing || loading || !currentWishlist}
                        >
                            {isSyncing ? "Syncing..." : "Start Sync"}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </DefaultModal>
    );
};
