import { useState, useCallback } from 'react';

interface UseLoadRepoWishListResult {
    repoExists: boolean;
    wishlistJsonExists: boolean;
    loading: boolean;
    repoError: string | null;
    wishlistError: string | null;
    wishlistData: any | null;
    loadWishlist: (repoName: string) => Promise<any | null>;
}

export const useLoadRepoWishList = (): UseLoadRepoWishListResult => {
    const [repoExists, setRepoExists] = useState<boolean>(false);
    const [wishlistJsonExists, setWishlistJsonExists] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [repoError, setRepoError] = useState<string | null>(null);
    const [wishlistError, setWishlistError] = useState<string | null>(null);
    const [wishlistData, setWishlistData] = useState<any | null>(null);

    const loadWishlist = useCallback(async (repoName: string) => {
        if (!repoName || repoName.trim() === '') {
            setRepoExists(false);
            setRepoError(null);
            setWishlistJsonExists(false);
            setWishlistError(null);
            setWishlistData(null);
            return;
        }

        setLoading(true);
        setRepoError(null);
        setWishlistError(null);
        setWishlistData(null);

        try {
            // Check if repository exists
            const repoResponse = await fetch(`https://api.github.com/repos/${repoName}`);
            const repoExistsResult = repoResponse.status === 200;
            setRepoExists(repoExistsResult);

            if (!repoExistsResult) {
                setRepoError('Repository does not exist or is not accessible');
                setWishlistJsonExists(false);
                return;
            }

            // Check if wishlist.json exists in the repository
            const wishlistResponse = await fetch(`https://api.github.com/repos/${repoName}/contents/wishlist.json`);
            const wishlistExistsResult = wishlistResponse.status === 200;
            setWishlistJsonExists(wishlistExistsResult);

            if (!wishlistExistsResult) {
                setWishlistError('wishlist.json file not found in repository');
            } else {
                // File exists, fetch and convert to JSON
                try {
                    const fileData = await wishlistResponse.json();
                    // GitHub API returns file content as base64 encoded
                    const content = atob(fileData.content);
                    const jsonData = JSON.parse(content);

                    console.log('Successfully fetched and parsed wishlist.json:', jsonData);

                    // Check if uniqueId field exists and is populated
                    if (!jsonData.uniqueId || jsonData.uniqueId.trim() === '') {
                        setWishlistError('wishlist.json is missing a required fields');
                        console.error('Validation error: uniqueId field missing ');
                        return;
                    } else {
                        jsonData.linkedRepo = repoName;
                        jsonData.sha = fileData.sha;
                        setWishlistData(jsonData);
                        console.log('Success: Wishlist data loaded successfully!');
                        return jsonData; // Return the data for further processing
                    }

                } catch (parseError) {
                    setWishlistError('Error parsing wishlist.json file - invalid JSON format');
                    console.error('JSON parsing error:', parseError);
                }
            }
        } catch (wishlistErr) {
            setWishlistError('Error checking for wishlist.json file');
            setWishlistJsonExists(false);
        } finally {
            setLoading(false);
        }
        
        return null; // Return null if no data was loaded
    }, []);

    return {
        repoExists,
        wishlistJsonExists,
        loading,
        repoError,
        wishlistError,
        wishlistData,
        loadWishlist
    };
};
