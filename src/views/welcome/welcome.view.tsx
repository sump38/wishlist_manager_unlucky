
import { AppBar, Box, Button, Drawer, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import React, { useState, useEffect } from "react";
import { getAllWishlists } from "../../services/wishlists.service";
import { LoadWishlist } from "../wishlist/load";

export const Welcome = () => {
    const [wishlistsAvailable, setWishlistsAvailable] = useState(false);


    useEffect(() => {
        async function load() {
            let wishlists = await getAllWishlists();
            if ((wishlists?.length || 0) > 0) {
                setWishlistsAvailable(true);
            }
        }
        load();
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Box>
                        <Typography variant="h6" noWrap component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
                            Destiny 2 Wishlist
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>
            <Box sx={{ marginTop: '64px', display: 'flex', height: 'calc(100% - 64px)', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }} >
                    <Drawer
                        variant="permanent"
                        anchor="left"
                        sx={{
                            width: 300,
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: 300,
                                boxSizing: 'border-box',
                                marginTop: '64px',
                                height: 'calc(100vh - 64px)',
                            },
                        }}
                    >
                        <Box display="flex" flexDirection="column" style={{ padding: "16px" }}>
                            <Button size="large" variant="contained" color="primary" fullWidth component={RouterLink} to="/wishlist/new">
                                <Typography>Create new wishlist</Typography>
                            </Button>
                            <Box mb={1} />
                            <Button size="large" variant="contained" color="primary" fullWidth component={RouterLink} to="/wishlist/import">
                                <Typography>Import wishlist</Typography>
                            </Button>
                            <Box mb={1} />
                            <Button size="large" variant="contained" color="primary" fullWidth component={RouterLink} to="/wishlist/repos">
                                <Typography>Load From Github</Typography>
                            </Button>
                            <Box mb={1} />
                            {/* {
                                wishlistsAvailable ? <>
                                    <Button size="large" variant="contained" color="primary" fullWidth component={RouterLink} to="/wishlist/load">
                                        <Typography>Load wishlist</Typography>
                                    </Button><Box mb={1} />
                                </> : <Box />
                            } */}
                            {
                                wishlistsAvailable ? <>
                                    <Button size="large" variant="contained" color="primary" fullWidth component={RouterLink} to="/package">
                                        <Typography>Export Package</Typography>
                                    </Button>
                                </> : <Box />
                            }
                        </Box>
                    </Drawer>
                    <Box sx={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                        <LoadWishlist />
                    </Box>
                </Box>
            </Box>
        </Box>);
};