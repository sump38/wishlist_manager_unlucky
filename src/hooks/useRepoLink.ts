import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { createWishlist } from '../services/wishlists.service';
import { saveBuild } from '../services/wishlistBuild.service';
import { importLittleLight } from '../utils/converters/littlelight.converter';
import { useLoadRepoWishList } from './useLoadRepoWishList';

interface UseRepoLinkResult {
    repoExists: boolean;
    wishlistJsonExists: boolean;
    loading: boolean;
    repoError: string | null;
    wishlistError: string | null;
    wishlistData: any | null;
    linkRepo: (repoName: string) => Promise<void>;
}

export const useRepoLink = (): UseRepoLinkResult => {
    const hookResult = useLoadRepoWishList();
    const history = useHistory();

    const linkRepo = useCallback(async (repoName: string) => {
        // Load wishlist from the repository (includes repo name validation and existence check)
        const wishlistData = await hookResult.loadWishlist(repoName);
        
        // If wishlist data was successfully loaded, process it
        if (wishlistData) {
            try {
                // Convert the Little Light wishlist format to our internal format
                let convertedList = importLittleLight(wishlistData);

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
            } catch (error) {
                console.error('Error processing wishlist data:', error);
            }
        }
    }, [hookResult.loadWishlist, history]);

    return {
        ...hookResult,
        linkRepo
    };
};
