import { useState, useCallback, useEffect, useRef } from "react";
import { useBungieAuth } from '../contexts/BungieAuthContext';
import { getFilterableWeapons } from "../services/weapons.service";
import { vaultDB } from "../services/vault.service";
import { VaultItem } from "../interfaces/vault.interface";
import { keyBy as _keyBy, set } from "lodash";

const BUNGIE_API_KEY = process.env.REACT_APP_BUNGIE_API_KEY || '';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const REFRESH_EXPIRY_MS = 60 * 1000; // 1 minute in milliseconds

export const useBungieVaultWeapons = () => {
    const { isLoggedIn, user, accessToken } = useBungieAuth();
    const [vaultWeapons, setVaultWeapons] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchVaultFromAPI = useCallback(async (): Promise<VaultItem[]> => {
        if (!isLoggedIn || !user) {
            throw new Error('fetchVaultFromAPI: User not logged in to Bungie');
        }

        if (!accessToken) {
            throw new Error('fetchVaultFromAPI: No Bungie access token found');
        }

        try {
            // Use the membership ID from the user object directly
            if (!user.destinyMembershipId || !user.membershipType) {
                throw new Error('fetchVaultFromAPI: User membership information is missing');
            }

            const membershipType = user.membershipType;
            const membershipId = user.destinyMembershipId;

            // Fetch the user's profile with vault data
            /*
                components:
                - 102: vault inventory
                - 201: Character Equipment
                - 205: equipped
                - 202: postmaster
                - 305: Profile Records
            */

            const profileResponse = await fetch(
                `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,201,205,202,305`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'X-API-Key': BUNGIE_API_KEY,
                    },
                }
            );

            if (!profileResponse.ok) {
                throw new Error('fetchVaultFromAPI: Failed to fetch user profile from Bungie');
            }

            const profileData = await profileResponse.json();

            if (!profileData.Response) {
                throw new Error('fetchVaultFromAPI: Invalid response from Bungie API');
            }

            const response = profileData.Response;
            const allItems: any[] = [];

            // Fetch filterable weapons data
            const filterableWeaponsData = await getFilterableWeapons();
            const mappedCollectible = _keyBy(filterableWeaponsData, 'hash');

            // Process vault items (profile-level inventory - component 102)
            if (response.profileInventory && response.profileInventory.data && response.profileInventory.data.items) {
                allItems.push(...response.profileInventory.data.items);
            }

            // Process character inventories (component 201)
            if (response.characterInventories && response.characterInventories.data) {
                const inventoryData = response.characterInventories.data;
                for (const characterId in inventoryData) {
                    const inventory = inventoryData[characterId];
                    if (inventory.items) {
                        allItems.push(...inventory.items);
                    }
                }
            }

            // Process character equipment (component 205)
            if (response.characterEquipment && response.characterEquipment.data) {
                const equipmentData = response.characterEquipment.data;
                for (const characterId in equipmentData) {
                    const equipment = equipmentData[characterId];
                    if (equipment.items) {
                        allItems.push(...equipment.items);
                    }
                }
            }

            // Process postmaster items (component 202)
            if (response.profileCurrencies && response.profileCurrencies.data && response.profileCurrencies.data.items) {
                allItems.push(...response.profileCurrencies.data.items);
            }

            if (allItems.length === 0) {
                throw new Error('fetchVaultFromAPI: No items found in response from any source');
            }

            // Filter out items that are not weapons
            const vaultWeapons = allItems.filter(item => {
                return item.itemHash &&
                    mappedCollectible[item.itemHash] &&
                    mappedCollectible[item.itemHash].itemType === 3; // 3 is the item type for weapons
            });

            // Transform to our VaultItem format
            const processedWeapons: VaultItem[] = vaultWeapons.map(item => {
                // Build the vault item with required properties
                const vaultItem: VaultItem = {
                    itemInstanceId: item.itemInstanceId,
                    itemName: mappedCollectible[item.itemHash]?.displayProperties?.name || 'Unknown Weapon',
                    itemHash: item.itemHash,
                    plugsHashes: []
                };

                // Add plugs/perks if available
                if (response.itemComponents &&
                    response.itemComponents.sockets &&
                    response.itemComponents.sockets.data &&
                    response.itemComponents.sockets.data[item.itemInstanceId]) {

                    const socketsData = response.itemComponents.sockets.data[item.itemInstanceId];

                    if (socketsData && socketsData.sockets) {
                        vaultItem.plugsHashes = socketsData.sockets
                            .filter((socket: { plugHash: string }) => socket.plugHash)
                            .map((socket: { plugHash: string }) => socket.plugHash);
                    }
                }

                return vaultItem;
            });

            // Save to DB
            const now = Date.now();
            console.log(`Found ${processedWeapons.length} weapons across all inventory sources`);
            if (user.membershipId) {
                await vaultDB.saveVaultData(user.membershipId, processedWeapons);
            }

            return processedWeapons;

        } catch (err) {
            console.error('fetchVaultFromAPI error:', err);
            throw new Error(err instanceof Error ? err.message : 'Failed to fetch vault weapons from Bungie API');
        }
    }, [isLoggedIn, user, accessToken]);

    const loadVaultWeapons = useCallback(async (forceRefresh: boolean = false) => {
        if (loading) {
            return;
        }
        if (!isLoggedIn || !user?.membershipId) {
            setVaultWeapons([]);
            return;
        }

        setLoading(true);
        //reset timeout

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        setError(null);
        try {
            if (!forceRefresh) {

                // Check if we have data in the DB
                const dbData = await vaultDB.getVaultData(user.membershipId);

                if (dbData) {
                    const now = Date.now();
                    const dataAge = now - dbData.createdAt;

                    // If data is recent (less than 5 minutes old), use it, unless force refresh is true
                    if (dataAge < CACHE_EXPIRY_MS) {
                        setVaultWeapons(dbData.vault as VaultItem[]);
                        return;
                    }
                }
            }

            // If no data or data is old, fetch from API
            const weapons = await fetchVaultFromAPI();
            setVaultWeapons(weapons);

            //set a timer to refresh data after CACHE_EXPIRY_MS
            timerRef.current = setTimeout(() => {
                loadVaultWeapons(true); // Force refresh after expiry
            }, CACHE_EXPIRY_MS);

            return;

        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to load vault weapons');
            setVaultWeapons([]);
            return;
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user, fetchVaultFromAPI]);


    // Load data when user logs in
    useEffect(() => {
        if (isLoggedIn && user?.destinyMembershipId) {
            loadVaultWeapons();
        } else {
            setVaultWeapons([]);
        }
    }, [isLoggedIn, user, loadVaultWeapons]);


    const refresh = useCallback(async (): Promise<void> => {

        if (!isLoggedIn || !user?.membershipId) {
            setVaultWeapons([]);
            return;
        }

        //check if at least 1 minute has passed since last update
        setLoading(true);
        setError(null);
        try {

            const now = Date.now();
            // get data from DB
            const dbData = await vaultDB.getVaultData(user.membershipId);

            if (dbData) {
                const dataAge = now - dbData.createdAt;
                // If data is recent (less than 1 minute old), return cached data
                if (dataAge < REFRESH_EXPIRY_MS) {
                    //do nothing
                    return;
                }
            }
            // If not, fetch from API
            loadVaultWeapons(true);
            
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh vault weapons');
            setVaultWeapons([]);
        } finally {
            setLoading(false);
        }

    }, [fetchVaultFromAPI]);

    return {
        vaultWeapons,
        loading,
        error,
        refresh
    };
};
