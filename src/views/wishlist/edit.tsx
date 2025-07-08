import { faArrowLeft, faDownload, faPlusCircle, faSave, faSignOutAlt, faUser, faSync, faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppBar, Box, Button, CircularProgress, IconButton, Menu, MenuItem, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import { keyBy as _keyBy, map as _map, countBy, orderBy as _orderBy, groupBy } from "lodash";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, RouteChildrenProps } from "react-router-dom";
import ScrollContainer from 'react-scrollbars-custom';
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from "react-window";
import { WeaponListItem } from "../../components/weapon_list_item/weapon_list_item.component";
import * as events from "../../events";
import Wishlist from "../../interfaces/wishlist.interface";
import { ExtendedCollectible, getFilterableWeapons } from "../../services/weapons.service";
import { getBuilds } from "../../services/wishlistBuild.service";
import { getWishlist } from "../../services/wishlists.service";
import { useGithubLogin } from "../../hooks/useGithubLogin.hook";
import { useBungieAuth } from "../../contexts/BungieAuthContext";
import { useBungieVaultWeapons } from "../../hooks/useBungieVaultWeapons.hook";
import { count } from "console";

interface BuildCount {
    itemHash: number;
    count: number;
    existsInUserCollection?: boolean;
    isTrash?: boolean;
}

const CustomScrollbars = ({ children,
    forwardedRef,
    onScroll,
    style,
    className }: any) => {
    return (
        <ScrollContainer
            disableTracksWidthCompensation={true}
            className={className}
            style={style}
            scrollerProps={{
                renderer: props => {
                    const { elementRef, onScroll: rscOnScroll, ...restProps } = props;

                    return (
                        <div
                            {...restProps}
                            onScroll={e => {
                                onScroll(e);
                                if (rscOnScroll && e) {
                                    rscOnScroll(e);
                                }
                            }}
                            ref={ref => {
                                forwardedRef(ref);
                                if (elementRef) {
                                    elementRef(ref);
                                }
                            }}
                        />
                    );
                }
            }}
        >
            {children}
        </ScrollContainer>
    );
};
const CustomScrollbarsVirtualList = React.forwardRef((props, ref) => (
    <CustomScrollbars {...props} forwardedRef={ref} />
));

const useStyles = {
    root: {
        flexGrow: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
    },
    menuButton: {
        marginRight: 2,
    },
    title: {
        flexGrow: 1,
    },
};

export const EditWishlist = ({ match, history }: RouteChildrenProps) => {
    const { wishlistId } = match?.params as any;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('xs'));
    const classes = useStyles;
    const [wishlist, setWishlist] = useState<Wishlist>();
    const [definitions, setDefinitions] = useState<{ [hash: number]: ExtendedCollectible }>()
    const [items, setItems] = useState<BuildCount[]>();
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
    const [bungieMenuAnchor, setBungieMenuAnchor] = useState<null | HTMLElement>(null);
    const outerRef = useRef();

    // Add GitHub login hook
    const { isLoggedIn, user, login, logout, isLoading } = useGithubLogin();

    // Add Bungie login hook
    const { 
        isLoggedIn: isBungieLoggedIn, 
        user: bungieUser, 
        login: bungieLogin, 
        logout: bungieLogout,
        isLoggingIn: isBungieLoading,
        error: _bungieError
    } = useBungieAuth();

    const { vaultWeapons, loading: isVaultWeaponsLoading, error: vaultWeaponsError, refresh: refreshVault } = useBungieVaultWeapons();

    function goToMain() {
        history.push("/");
    }

    function handleAuthAction() {
        if (isLoggedIn) {
            logout();
        } else {
            login();
        }
    }

    function handleUserMenuOpen(event: React.MouseEvent<HTMLElement>) {
        setUserMenuAnchor(event.currentTarget);
    }

    function handleUserMenuClose() {
        setUserMenuAnchor(null);
    }

    function handleLogout() {
        logout();
        handleUserMenuClose();
    }

    function handleBungieLogout() {
        bungieLogout();
        handleBungieMenuClose();
    }

    function handleBungieAuthAction(event: React.MouseEvent<HTMLElement>) {
        if (isBungieLoggedIn) {
            handleBungieMenuOpen(event);
        } else {
            bungieLogin();
        }
    }

    function handleBungieMenuOpen(event: React.MouseEvent<HTMLElement>) {
        setBungieMenuAnchor(event.currentTarget);
    }

    function handleBungieMenuClose() {
        setBungieMenuAnchor(null);
    }

    function handleRefreshVault() {
        if (refreshVault) {
            refreshVault();
        }
        handleBungieMenuClose();
    }

    function handleSave() {
        handleUserMenuClose();
        history.push(`/wishlist/e/${wishlistId}/save-to-github`);
    }

    useEffect(() => {
        async function refreshItems() {
            let builds = await getBuilds(parseInt(wishlistId));
            if (vaultWeapons && vaultWeapons.length > 0) {
                try {
                    
                    //go over builds and add existsInUserCollection property if itemHash and plugs exist in userBungieItems
                    builds = builds.map(build => {
                        const item = vaultWeapons.find(i => i.itemHash === build.itemHash);
                        if( item && item.plugsHashes) {
                            //check build plugs against item plugs to see if they exist
                            let buildMatches = true;
                            for (const plug of build.plugs) { //plug is an array of plug hashes
                                //check if at least one hash exists in item plugs
                                const match = plug.some(p => item.plugsHashes.includes(p));
                                if (!match) {
                                    buildMatches = false;
                                    break;
                                }
                            }
                            if (buildMatches) {
                                return {
                                    ...build,
                                    existsInUserCollection: true
                                };
                            }
                        }
                        return build;
                    });

                } catch (error) {
                    console.error('Failed to load Bungie items:', error);
                }
            }


            const itemGroups = groupBy(builds, (b) => b.itemHash);
            
            
            let items: BuildCount[] = _map(itemGroups, (v, k) => {
                const itemHash = parseInt(k);
                // Check if any build for this itemHash has existsInUserCollection: true
                const existsInUserCollection = v.some((build: any) => 
                    build.existsInUserCollection === true
                );
                const isTrash = v.some((build: any) => 
                    build.name.toLowerCase().trim() === 'trash'
                );
                return {
                    itemHash, 
                    count: v.length, 
                    existsInUserCollection, 
                    isTrash
                };
            });
            
            
            setItems(items);
        }

        async function load() {

            let id = parseInt(wishlistId);
            let w = await getWishlist(id);
            setWishlist(w);
            let c = await getFilterableWeapons()
            let mappedCollectible = _keyBy(c, 'hash')

            setDefinitions(mappedCollectible)
            refreshItems();
        }
        load();

        async function onDbChanges(changes: any) {
            refreshItems();
        }

        const unsubscribe = events.bus.subscribe(events.wishlists.OnWishlistBuildUpdated, onDbChanges);

        return () => {
            unsubscribe();
        };
    }, [wishlistId, isBungieLoggedIn, vaultWeapons]);

    return <Box sx={classes.root}>
        <AppBar color="primary" position="static">
            <Toolbar sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                    <IconButton edge="start" color="inherit" aria-label="menu" onClick={goToMain}>
                        <FontAwesomeIcon
                            // sx={classes.menuButton} 
                            icon={faArrowLeft}></FontAwesomeIcon>
                    </IconButton>
                    <Typography variant="h6" >
                        {wishlist?.name}
                    </Typography>
                    {/* Only show sync button if wishlist has linkedRepo */}
                    {wishlist?.linkedRepo && (
                        <>
                            <Box p={isMobile ? 0 : 1}></Box>
                            {
                                isMobile ?
                                    <IconButton color="secondary" aria-label="sync" component={Link} to={`/wishlist/e/${wishlist?.id}/sync-from-github`}>
                                        <FontAwesomeIcon icon={faSync}></FontAwesomeIcon>
                                    </IconButton>
                                    :
                                    <Button color="secondary" variant="contained" component={Link} to={`/wishlist/e/${wishlist?.id}/sync-from-github`}>Sync</Button>
                            }
                        </>
                    )}
                </Box>



                {isMobile ?
                    <IconButton edge="start" color="inherit" aria-label="menu" component={Link} to={`/wishlist/e/${wishlist?.id}/item/add`}>
                        <FontAwesomeIcon icon={faPlusCircle}></FontAwesomeIcon>
                    </IconButton>
                    :
                    <Button color="primary" variant="contained" component={Link} to={`/wishlist/e/${wishlist?.id}/item/add`}>Add Item</Button>
                }
                <Box p={isMobile ? 0 : 1}></Box>

                {
                    isMobile ?
                        <IconButton color="inherit" aria-label="menu" component={Link} to={`/wishlist/e/${wishlist?.id}/export`}>
                            <FontAwesomeIcon icon={faDownload}></FontAwesomeIcon>
                        </IconButton>
                        :
                        <Button color="primary" variant="contained" component={Link} to={`/wishlist/e/${wishlist?.id}/export`}>Export Wishlist</Button>
                }
                <Box p={isMobile ? 0 : 1}></Box>

                {/* User authentication section - rightmost */}
                {isLoggedIn && user ? (
                    // User menu dropdown when logged in
                    <>
                        <Button
                            color="inherit"
                            onClick={handleUserMenuOpen}
                            startIcon={<FontAwesomeIcon icon={faUser} />}
                            disabled={isLoading}
                        >
                            {!isMobile && user.login}
                        </Button>
                        <Menu
                            anchorEl={userMenuAnchor}
                            open={Boolean(userMenuAnchor)}
                            onClose={handleUserMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            {isMobile && (
                                <MenuItem disabled>
                                    <Typography variant="body2" color="textSecondary">
                                        {user.login}
                                    </Typography>
                                </MenuItem>
                            )}
                            <MenuItem onClick={handleSave}>
                                <FontAwesomeIcon icon={faSave} style={{ marginRight: 8 }} />
                                Save to GitHub
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>
                                <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: 8 }} />
                                Logout GitHub
                            </MenuItem>
                            {isBungieLoggedIn && (
                                <MenuItem onClick={handleBungieLogout}>
                                    <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: 8 }} />
                                    Logout Bungie
                                </MenuItem>
                            )}
                        </Menu>
                    </>
                ) : (
                    // Login button when not logged in
                    isMobile ?
                        <IconButton
                            color="inherit"
                            aria-label="login"
                            onClick={handleAuthAction}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faUser}></FontAwesomeIcon>
                        </IconButton>
                        :
                        <Button
                            color="inherit"
                            onClick={handleAuthAction}
                            disabled={isLoading}
                            startIcon={<FontAwesomeIcon icon={faUser} />}
                        >
                            {isLoading ? 'Loading...' : 'Login GitHub'}
                        </Button>
                )}

                {/* Bungie authentication section */}
                <Box p={isMobile ? 0 : 1}></Box>
                {isBungieLoading || isVaultWeaponsLoading ? (
                    // Show loading spinner when logging in or loading vault
                    <Box display="flex" alignItems="center">
                        <CircularProgress size={isMobile ? 24 : 28} color="secondary" />
                        {!isMobile && (
                            <Box ml={1}>
                                <Typography variant="body2" color="textSecondary">
                                    {isBungieLoading ? 'Logging in...' : 'Loading vault...'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ) : isBungieLoggedIn && bungieUser ? (
                    // Bungie user info when logged in - with dropdown
                    <>
                        {isMobile ? (
                            <IconButton
                                color="secondary"
                                onClick={(e) => handleBungieMenuOpen(e)}
                            >
                                {bungieUser.profilePicturePath ? (
                                    <img 
                                        src={`https://www.bungie.net${bungieUser.profilePicturePath}`} 
                                        alt={bungieUser.displayName}
                                        style={{ width: 24, height: 24, borderRadius: '50%' }}
                                    />
                                ) : (
                                    <FontAwesomeIcon icon={faUser} />
                                )}
                            </IconButton>
                        ) : (
                            <Button
                                color="secondary"
                                onClick={(e) => handleBungieMenuOpen(e)}
                                startIcon={
                                    bungieUser.profilePicturePath ? (
                                        <img 
                                            src={`https://www.bungie.net${bungieUser.profilePicturePath}`} 
                                            alt={bungieUser.displayName}
                                            style={{ width: 20, height: 20, borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <FontAwesomeIcon icon={faUser} />
                                    )
                                }
                            >
                                {bungieUser.displayName}
                            </Button>
                        )}
                        <Menu
                            anchorEl={bungieMenuAnchor}
                            open={Boolean(bungieMenuAnchor)}
                            onClose={handleBungieMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            {isMobile && (
                                <MenuItem disabled>
                                    <Typography variant="body2" color="textSecondary">
                                        {bungieUser.displayName}
                                    </Typography>
                                </MenuItem>
                            )}
                            <MenuItem onClick={handleRefreshVault}>
                                <FontAwesomeIcon icon={faRedo} style={{ marginRight: 8 }} />
                                Refresh Vault
                            </MenuItem>
                            <MenuItem onClick={handleBungieLogout}>
                                <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: 8 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    </>
                ) : (
                    // Bungie login button when not logged in
                    isMobile ? (
                        <IconButton
                            color="secondary"
                            aria-label="bungie-login"
                            onClick={(e) => handleBungieAuthAction(e)}
                        >
                            <FontAwesomeIcon icon={faUser}></FontAwesomeIcon>
                        </IconButton>
                    ) : (
                        <Button
                            color="secondary"
                            onClick={(e) => handleBungieAuthAction(e)}
                            startIcon={<FontAwesomeIcon icon={faUser} />}
                        >
                            Login Bungie
                        </Button>
                    )
                )}
            </Toolbar>
        </AppBar>
        {useMemo(() => <Box flexGrow="1" >
            <AutoSizer style={{ width: "100%", height: "100%" }}>
                {({ height, width }: { height: number, width: number }) => {
                    let totalItems = items?.length || 0;
                    let columnCount = isMobile ? 1 : 3;
                    let rowCount = Math.ceil(totalItems / columnCount);
                    return (
                        <FixedSizeGrid
                            outerElementType={CustomScrollbarsVirtualList}
                            outerRef={outerRef}
                            columnCount={columnCount}
                            columnWidth={width / columnCount}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={80}
                            width={width}
                        >
                            {({ style, rowIndex, columnIndex }) => {
                                let index = rowIndex * columnCount + columnIndex;
                                let item = items ? items[index] : null;
                                if (!item) return <Box style={style}></Box>
                                return <Box style={style}>
                                    <Box padding={1}>
                                        <WeaponListItem 
                                            definition={definitions[item.itemHash]} 
                                            itemHash={item.itemHash} 
                                            wishlistId={wishlistId}
                                            existsInUserCollection={item.existsInUserCollection}
                                            isTrash={item.isTrash}
                                        />
                                    </Box>
                                </Box>
                            }}
                        </FixedSizeGrid>
                    );
                }}
            </AutoSizer>
        </Box>, [items, isMobile, definitions, wishlistId])}
    </Box>
};
