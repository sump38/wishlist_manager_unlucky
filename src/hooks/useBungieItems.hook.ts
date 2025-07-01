import { useState, useCallback, useEffect } from "react";
import { useBungieLogin } from './useBungieLogin.hook';

const BUNGIE_API_KEY = process.env.REACT_APP_BUNGIE_API_KEY || '';

export const useBungieItems = () => {
    const { isLoggedIn, user } = useBungieLogin();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUserItems = useCallback(async (): Promise<void> => {
        if (!isLoggedIn || !user) {
            setError('User not logged in to Bungie');
            return;
        }

        const accessToken = localStorage.getItem('bungie_access_token');
        if (!accessToken) {
            setError('No Bungie access token found');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // First, get the user's Destiny memberships
            const membershipsResponse = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-API-Key': BUNGIE_API_KEY,
                },
            });

            if (!membershipsResponse.ok) {
                throw new Error('Failed to fetch user memberships from Bungie');
            }

            const membershipsData = await membershipsResponse.json();
            
            if (!membershipsData.Response || !membershipsData.Response.destinyMemberships || membershipsData.Response.destinyMemberships.length === 0) {
                throw new Error('No Destiny memberships found for user');
            }

            // Use the first Destiny membership
            const destinyMembership = membershipsData.Response.destinyMemberships[0];
            const membershipType = destinyMembership.membershipType;
            const membershipId = destinyMembership.membershipId;

            // Fetch the user's profile with inventory data
            /*
                components:
                - 102: vault inventory
                - 201: Character Equipment
                - 205: equipped
                - 202: postmaster
                - 305: Profile Records (optional, not used here)
            */
            const profileResponse = await fetch(
                `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,201,202,205,305`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'X-API-Key': BUNGIE_API_KEY,
                    },
                }
            );

            if (!profileResponse.ok) {
                throw new Error('Failed to fetch user profile from Bungie');
            }

            const profileData = await profileResponse.json();
            
            if (!profileData.Response) {
                throw new Error('Invalid response from Bungie API');
            }

            const response = profileData.Response;
            const allItems: any[] = [];

            console.log('About to process items');
            
            // Process character inventories - simplified approach
            if (response.characterInventories && response.characterInventories.data) {
                const inventoryData = response.characterInventories.data;
                for (const characterId in inventoryData) {
                    const inventory = inventoryData[characterId];
                    const characterItems = inventory.items || [];
                    allItems.push(...characterItems);
                }
            }

            // Process character equipment
            if (response.characterEquipment && response.characterEquipment.data) {
                const equipmentData = response.characterEquipment.data;
                for (const characterId in equipmentData) {
                    const equipment = equipmentData[characterId];
                    const equipmentItems = equipment.items || [];
                    allItems.push(...equipmentItems);
                }
            }

            // Process vault items (profile-level inventory)
            if (response.profileInventory && response.profileInventory.data && response.profileInventory.data.items) {
                allItems.push(...response.profileInventory.data.items);
            }

            console.log('Bungie items retrieved:', allItems);
            
            setItems(allItems);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch user items');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user]);

    // Auto-fetch items when user logs in
    useEffect(() => {
        if (isLoggedIn && user) {
            fetchUserItems();
        } else {
            // Clear data when user logs out
            setItems([]);
            setError(null);
        }
    }, [isLoggedIn, user, fetchUserItems]);

    const refresh = useCallback(async (): Promise<void> => {
        await fetchUserItems();
    }, [fetchUserItems]);

    return {
        items,
        loading,
        error,
        refresh,
    };
};
    