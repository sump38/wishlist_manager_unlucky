import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, AppBar, Box, Button, CircularProgress, Container, IconButton, InputAdornment, Paper, TextField, Toolbar, Typography } from "@mui/material";
import React, { useState } from "react";
import { RouteChildrenProps } from "react-router-dom";
import { useGithub } from "../../hooks/useGithub";


const useStyles = {
    noPadding: {
        padding: 0,
        margin: 0,
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

export const RepoList = ({ history, location }: RouteChildrenProps) => {

    const classes = useStyles;
    const [repoName, setRepoName] = useState("");
    const { repoExists, wishlistJsonExists, loading, repoError, wishlistError, linkRepo } = useGithub();

    const goToMain = () => {
        history.push("/");
    }

    const handleRepoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRepoName(event.target.value);
    }

    const handleTestRepo = () => {
        linkRepo(repoName);
    }

return (
    <Container maxWidth="sm">
        <Box sx={classes.root}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton edge="start" color="inherit" aria-label="menu" onClick={goToMain}>
                        <FontAwesomeIcon icon={faArrowLeft}></FontAwesomeIcon>
                    </IconButton>
                    <Typography>Load Github Repository</Typography>
                </Toolbar>
            </AppBar>
            <Paper>
                <Box p={2}>
                    <TextField
                        fullWidth
                        label="GitHub Repository"
                        placeholder="username/repository-name"
                        value={repoName}
                        onChange={handleRepoChange}
                        variant="outlined"
                        helperText="Enter the repository name in the format: owner/repo"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    https://github.com/
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Box mt={2} display="flex" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleTestRepo}
                            disabled={!repoName.trim() || loading}
                            startIcon={loading ? <CircularProgress size={20} /> : undefined}
                        >
                            {loading ? "Linking..." : "Link Repository"}
                        </Button>
                    </Box>
                    {repoExists && loading !== undefined && !loading && (
                        <Box mt={2}>
                            {/* Repository Status */}
                            {repoError ? (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    Repository Error: {repoError}
                                </Alert>
                            ) : repoExists ? (
                                <Alert severity="success" sx={{ mb: 1 }}>
                                    Repository "{repoName}" found and accessible
                                </Alert>
                            ) : null}
                            
                            {/* Wishlist.json Status */}
                            {repoExists && (
                                <>
                                    {wishlistError ? (
                                        <Alert severity="warning">
                                            Wishlist File: {wishlistError}
                                        </Alert>
                                    ) : wishlistJsonExists ? (
                                        <Alert severity="success">
                                            wishlist.json file found in repository
                                        </Alert>
                                    ) : (
                                        <Alert severity="info">
                                            No wishlist.json file found in repository
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    </Container >);
};