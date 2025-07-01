import { useState, useCallback } from 'react';
import { useGithubLogin } from './useGithubLogin.hook';
import { getWishlist, updateWishlist } from '../services/wishlists.service';
import { exportLittleLight } from '../utils/converters/littlelight.converter';

interface UseRepoWishlistResult {
    saving: boolean;
    saveError: string | null;
    saveSuccess: boolean;
    saveWishlist: (wishlistId: number) => Promise<void>;
}

export const useRepoWishlist = (): UseRepoWishlistResult => {
    const [saving, setSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
    
    const { isLoggedIn, user } = useGithubLogin();

    const saveWishlist = useCallback(async (wishlistId: number) => {
        // Check if user is logged in
        if (!isLoggedIn || !user) {
            setSaveError('User must be logged in to save to GitHub');
            return;
        }

        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            // Get wishlist data
            const wishlist = await getWishlist(wishlistId);
            if (!wishlist) {
                setSaveError('Wishlist not found');
                return;
            }

            // Check if wishlist has linkedRepo data
            if (!wishlist.linkedRepo) {
                setSaveError('Wishlist is not linked to a GitHub repository');
                return;
            }

            // Check if wishlist has SHA - required for updating existing files
            if (!wishlist.sha) {
                setSaveError('Wishlist does not have a SHA. Cannot update file without the current version identifier.');
                return;
            }

            console.log('Saving to GitHub:', {
                repo: wishlist.linkedRepo,
                sha: wishlist.sha,
                name: wishlist.name
            });

            // Use the exportLittleLight function to generate the JSON content
            const wishlistBlob = await exportLittleLight(wishlistId, { 
                omitDescriptions: false, 
                JSONPrettyPrint: true 
            });
            
            // Convert blob to text
            const jsonContent = await wishlistBlob.text();
            
            // Encode content to base64 (GitHub API requirement)
            const encodedContent = btoa(jsonContent);

            // Get access token from localStorage
            const accessToken = localStorage.getItem('github_access_token');
            if (!accessToken) {
                setSaveError('GitHub access token not found. Please log in again.');
                return;
            }

            // Prepare GitHub API request to update wishlist.json
            const updateData = {
                message: `Update wishlist: ${wishlist.name}`,
                content: encodedContent,
                sha: wishlist.sha // Required for updating existing files
            };

            const apiUrl = `https://api.github.com/repos/${wishlist.linkedRepo}/contents/wishlist.json`;
            console.log('GitHub API URL:', apiUrl);

            // Make API call to update the file
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('GitHub API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: apiUrl,
                    errorData
                });
                
                if (response.status === 404) {
                    throw new Error(`Repository or file not found: ${wishlist.linkedRepo}/wishlist.json. This could be due to insufficient permissions or the file doesn't exist.`);
                } else if (response.status === 409) {
                    throw new Error(`SHA conflict: The file has been modified by someone else. Expected SHA: ${wishlist.sha}. Please refresh the wishlist and try again.`);
                } else if (response.status === 422) {
                    throw new Error(`Invalid SHA or file state. The provided SHA (${wishlist.sha}) may be incorrect.`);
                } else {
                    throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
                }
            }

            const responseData = await response.json();
            
            // Update the wishlist with new SHA in Dexie database
            if (responseData.content && responseData.content.sha) {
                const updatedWishlist = {
                    ...wishlist,
                    sha: responseData.content.sha
                };
                await updateWishlist(updatedWishlist);
                console.log('Updated wishlist SHA in database:', responseData.content.sha);
            }
            
            console.log('Successfully saved wishlist to GitHub:', responseData);
            
            setSaveSuccess(true);
            
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'An error occurred while saving to GitHub');
            console.error('Save to GitHub error:', err);
        } finally {
            setSaving(false);
        }
    }, [isLoggedIn, user]);

    return {
        saving,
        saveError,
        saveSuccess,
        saveWishlist
    };
};
