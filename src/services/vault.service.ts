import Dexie from 'dexie';
import { VaultData } from '../interfaces/vault.interface';

/**
 * VaultDatabase - A separate Dexie database for storing user vault weapons
 */
class VaultDatabase extends Dexie {
  vaultData: Dexie.Table<VaultData, number>;

  constructor() {
    super('VaultDatabase');
    
    // Define the database schema
    this.version(1).stores({
      vaultData: '++id, &userId, createdAt' // Primary key is auto-incremented id, unique userId, index on createdAt
    });
    
    // Define types for the tables
    this.vaultData = this.table('vaultData');
  }

  /**
   * Save vault data for a user
   * @param userId The user's membership ID
   * @param vault Array of vault items
   * @returns Promise with the ID of the updated or inserted record
   */
  async saveVaultData(userId: string, vault: any[]): Promise<number> {

    //attempt to get existing vault data
    const existingVault = await this.getVaultData(userId);
    
    // If existing vault data is found, update it
    if (existingVault) {
      console.log('Updating existing vault data for user:', userId);
      return await this.vaultData.put({
        ...existingVault,
        vault, // Update the vault items
        createdAt: Date.now() // Update the timestamp
      });
    } else {
      console.log('No existing vault data found for user:', userId, 'creating new record');
      // If no existing vault data, create a new record
      return await this.vaultData.put({
        userId,
        vault,
        createdAt: Date.now()
      });
    }
  }

  /**
   * Get vault data for a user
   * @param userId The user's membership ID
   * @returns Promise with the vault data or undefined if not found
   */
  async getVaultData(userId: string): Promise<VaultData | undefined> {
    return await this.vaultData
      .where('userId')
      .equals(userId)
      .first();
  }
}

export const vaultDB = new VaultDatabase();
