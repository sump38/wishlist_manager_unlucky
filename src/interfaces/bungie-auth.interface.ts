export interface BungieUser {
  membershipId: string; // Bungie.net membership ID
  displayName: string; // User's display name
  profilePicturePath?: string;  // Optional profile picture path
  membershipType: number; // Destiny membership type (e.g., 1 for Xbox, 2 for PSN, etc.)
  isPublic: boolean;
  locale: string;
  // Additional Destiny-specific properties
  destinyMembershipId?: string | null; // Destiny-specific membership ID
  destinyDisplayName?: string | null; // Destiny-specific display name
  platformType?: number | null; // Platform type for Destiny membership
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
