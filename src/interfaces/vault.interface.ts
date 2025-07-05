export interface VaultItem {
  itemInstanceId: string;
  itemName: string;
  itemHash: number;
  plugsHashes: number[]; // Array of plug (perk/mod) hashes
  // Additional weapon properties can be added as needed
}

export interface VaultData {
  id?: number; // Dexie will auto-increment if not provided
  userId: string;
  createdAt: number; // Timestamp in milliseconds
  vault: VaultItem[]; // Array of vault items
}
