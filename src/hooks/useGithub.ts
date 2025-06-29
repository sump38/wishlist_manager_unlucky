import { useState, useEffect, useCallback } from 'react';
import { createWishlist } from '../services/wishlists.service';
import { saveBuild } from '../services/wishlistBuild.service';
import { useHistory } from 'react-router-dom';
import { importLittleLight } from '../utils/converters/littlelight.converter';

interface UseGithubResult {
    repoExists: boolean;
    wishlistJsonExists: boolean;
    loading: boolean;
    repoError: string | null;
    wishlistError: string | null;
    wishlistData: any | null;
    linkRepo: (repoName: string) => Promise<void>;
}

export const useGithub = (): UseGithubResult => {
    const [repoExists, setRepoExists] = useState<boolean>(false);
    const [wishlistJsonExists, setWishlistJsonExists] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [repoError, setRepoError] = useState<string | null>(null);
    const [wishlistError, setWishlistError] = useState<string | null>(null);
    const [wishlistData, setWishlistData] = useState<any | null>(null);

    const history = useHistory();

    const linkRepo = useCallback(async (repoName: string) => {
        if (!repoName || repoName.trim() === '') {
            setRepoExists(false);
            setWishlistJsonExists(false);
            setRepoError(null);
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
            try {
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
                        setWishlistData(jsonData);
                        console.log('Successfully fetched and parsed wishlist.json:', jsonData);
                        console.log('Success: Wishlist data loaded successfully!');

                        //add linkedRepo and sha to the wishlist data
                        jsonData.linkedRepo = repoName;
                        jsonData.sha = fileData.sha;

                        let convertedList = importLittleLight(jsonData);

                        // save the wishlist data to local storage
                        let w = await createWishlist(convertedList?.wishlist!);
                        for (let i in convertedList?.builds) {
                            let build = convertedList?.builds[parseInt(i)];
                            await saveBuild({
                                wishlistId: w.id,
                                ...build
                            });
                        }
                        console.log('Successfully saved wishlist data to local storage');
                        history.push(`/wishlist/e/${w.id}`);

                    } catch (parseError) {
                        setWishlistError('Error parsing wishlist.json file - invalid JSON format');
                        console.error('JSON parsing error:', parseError);
                    }
                }
            } catch (wishlistErr) {
                setWishlistError('Error checking for wishlist.json file');
                setWishlistJsonExists(false);
            }
        } catch (err) {
            setRepoError(err instanceof Error ? err.message : 'An error occurred while checking the repository');
            setRepoExists(false);
            setWishlistJsonExists(false);
        } finally {
            setLoading(false);
        }
    }, [history]);

    return {
        repoExists,
        wishlistJsonExists,
        loading,
        repoError,
        wishlistError,
        wishlistData,
        linkRepo
    };
};
