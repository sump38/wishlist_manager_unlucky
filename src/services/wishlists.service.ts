import db from "./database.service";
import Wishlist from "../interfaces/wishlist.interface";
import { nanoid } from "nanoid";

export async function createWishlist(wishlist: Wishlist): Promise<Wishlist> {
    if (!wishlist.uniqueId) {
        wishlist.uniqueId = nanoid();
    }
    let key = await db.wishlists?.add(wishlist);
    return {
        ...wishlist,
        id: key
    };
}

export async function deleteWishlist(wishlist: Wishlist): Promise<void> {
    await db.wishlists?.delete(wishlist.id!);
    await db.wishlistBuilds.where('wishlistId').equals(wishlist.id).delete();
}

export async function getWishlist(id: number): Promise<Wishlist | undefined> {
    let wishlist = await db.wishlists?.get(id);
    return wishlist;
}

export async function getAllWishlists(): Promise<Wishlist[] | undefined> {
    let wishlists = await db.wishlists?.toArray();
    return wishlists;
}

export async function updateWishlist(wishlist: Wishlist): Promise<Wishlist> {
    if (!wishlist.id) {
        throw new Error("Wishlist must have an ID to be updated");
    }
    await db.wishlists?.put(wishlist);
    return wishlist;
}
