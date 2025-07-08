import { WishlistBuild } from "../interfaces/wishlist.interface";
import * as events from '../events';
import { nanoid } from 'nanoid';
import db from "./database.service";
import { getWeaponAlternateVersions } from "./weapons.service";
import { getInventoryItemDefinition, getPlugSetDefinition } from "./manifest.service";
import { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2/interfaces";



export async function getBuildsByBuild(itemHash: number, build: WishlistBuild): Promise<WishlistBuild[]> {
    if (!itemHash || !build) {
        throw new Error("Build must have an itemHash to search for copies");
    }

    //get all wishlistBuild items with itemHash and wishlistId
    //this is to ensure we only get builds for the same wishlist
    if (!build.wishlistId) {
        throw new Error("Build must have a wishlistId to search for copies");
    }
    let builds = await db.wishlistBuilds.where('[wishlistId+itemHash]').equals([build.wishlistId, itemHash]).toArray();

    //if no builds found, return empty array
    if (!builds || builds.length === 0) {
        return [];
    }


    //filter existing builds
    builds = builds.filter((b) => {
        //check name, description, plugs, tags
        if (b.name !== build.name) return false;
        if (b.description !== build.description) return false;
        //deep compare plugs
        if (b.plugs && build.plugs) {
            if (b.plugs.length !== build.plugs.length) return false;
            for (let i = 0; i < build.plugs.length; i++) {
                if (!b.plugs[i] || (b.plugs[i].length !== build.plugs[i].length)) return false;
                for (let j = 0; j < build.plugs[i].length; j++) {
                    if(b.plugs[i].includes(build.plugs[i][j]) === false) {
                        return false;
                    }
                }
            }
        } else if (b.plugs || build.plugs) {
            return false;
        }
        //deep compare tags
        if (b.tags && build.tags) {
            if (b.tags.length !== build.tags.length) return false;
            for (let i = 0; i < b.tags.length; i++) {
                if (!build.tags.includes(b.tags[i])) return false;
            }
        } else if (b.tags || build.tags) return false;

        return true;
    });
    return builds;
}

export async function deleteBuildCopies(id: number): Promise<void> {
    if (!id) {
        throw new Error("Build id is required to delete copies");
    }
    //get original build
    const originalBuild = await db.wishlistBuilds!.get(id);
    if (!originalBuild) {
        throw new Error("Original build not found for id " + id);
    }
    //delete all copies of the original build
    await deleteBuild(id);

    //get alternate versions of the item
    const otherVersions = (await getWeaponAlternateVersions(originalBuild.itemHash)).filter((v) => {
        return v.hash !== originalBuild.itemHash;
    });
    
    //delete build on each other version
    for (const version of otherVersions) {
        //check if build exists for this version
        const existingBuild: WishlistBuild[] = await getBuildsByBuild(version.hash, originalBuild);
        if (existingBuild.length > 0) {
            //delete build on this version
            await deleteBuild(existingBuild[0].id!);
        }
    }
}




export async function saveBuild(build: WishlistBuild): Promise<WishlistBuild> {
    //if item has id, get original build before overwriting

    let originalBuild: WishlistBuild | undefined;
    if (build.id) {
        originalBuild = await db.wishlistBuilds!.get(build.id);
        if (!originalBuild) {
            throw new Error("Original build not found for id " + build.id);
        }
    }
    //save build with the original hash
    const originalSavedBuild = await saveSpecificBuild(build);

    //try to get alternate versions of the item

    const otherVersions = (await getWeaponAlternateVersions(build.itemHash)).filter((v) => {
        return v.hash !== build.itemHash;
    });

    //save build on each other version
    for (const version of otherVersions) {
        //check if build is viable for weapon
        if (!isBuildViableForWeapon(build, version)) {
            continue;
        }

        

        //check if build exists for this version
        const existingBuild: WishlistBuild[] = originalBuild ? await getBuildsByBuild(version.hash, originalBuild) : [];
        const existingBuildId: number = existingBuild[0] ? existingBuild[0].id : undefined;
        const existingBuildUniqueId: string = existingBuild[0] ? existingBuild[0].uniqueId : undefined;


        //save build on this version
        await saveSpecificBuild({
            ...build,
            id: existingBuildId, //if build exists, update it, otherwise create a new one
            uniqueId: existingBuildUniqueId,
            itemHash: version.hash
        });
    }

    return originalSavedBuild;
}

function getAvailablePerksForWeapon(weaponDef: DestinyInventoryItemDefinition): number[] {
    //look up socket indexes
    const perkCategory = weaponDef.sockets?.socketCategories?.filter((c) => {
        return c.socketCategoryHash === 4241085061 //this is the weapon perk category
    })?.[0];
    if(!perkCategory) {
        return [];
    };
    const perks: number[] = perkCategory.socketIndexes.reduce<number[]>((acc, i) => {
        const randomizedPlugSetHash = weaponDef.sockets?.socketEntries[i]?.randomizedPlugSetHash;
        const reusablePlugSetHash = weaponDef.sockets?.socketEntries[i]?.reusablePlugSetHash;
        let perks: number[] = [];
        if (randomizedPlugSetHash) {
            const plugSet = getPlugSetDefinition(randomizedPlugSetHash);
            if(plugSet && plugSet.reusablePlugItems) {
                perks = plugSet.reusablePlugItems.map((p) => p.plugItemHash);
            }
        }
        if (reusablePlugSetHash) {
            const plugSet = getPlugSetDefinition(reusablePlugSetHash);
            if(plugSet && plugSet.reusablePlugItems) {
                perks = [...perks, ...plugSet.reusablePlugItems.map((p) => p.plugItemHash)];
            }
        }
        acc = [...acc, ...perks];
        return acc;
    },[] as number[]);

    return perks;
}

function isBuildViableForWeapon(build: WishlistBuild, weaponDef: DestinyInventoryItemDefinition): boolean {
    if (!build.plugs || build.plugs.length === 0) {
        return true; //no plugs means any build is viable
    }
    //check if all plugs in build are available for weapon
    const availablePerks = getAvailablePerksForWeapon(weaponDef);
    for (const plugArray of build.plugs) {
        for (const plug of plugArray) {
            if (!availablePerks.includes(plug)) {
                return false; //if any plug is not available, build is not viable
            }
        }
    }
    return true; //all plugs are available, build is viable
}

export async function saveSpecificBuild(build: WishlistBuild): Promise<WishlistBuild> {

    //get DestinyInventoryItemDefinition for itemHash
    if (!build.itemHash) {
        throw new Error("Build must have an itemHash to save");
    }


    if (build.id) {
        await db.wishlistBuilds?.update(build.id, build);
        events.bus.publish(events.wishlists.OnWishlistBuildUpdated());
        return build;
    }
    if (!build.uniqueId) {
        build.uniqueId = nanoid();
    }
    let key = await db.wishlistBuilds?.add(build);
    events.bus.publish(events.wishlists.OnWishlistBuildUpdated());
    return {
        ...build,
        id: key
    };
}


export async function getBuilds(wishlistId: number, itemHash?: number): Promise<WishlistBuild[]> {
    let query = db.wishlistBuilds!.where('wishlistId').equals(wishlistId);
    if (itemHash) {
        query = query.and((w) => {
            return w.itemHash === itemHash
        });
    }
    let builds = await query.toArray();

    return builds || [];
}

export async function deleteBuild(id: number) {
    console.log("delete build " + id);
    await db.wishlistBuilds!.delete(id);
    events.bus.publish(events.wishlists.OnWishlistBuildUpdated());
}

export async function deleteBuildsByWishlistId(wishlistId: number) {
    console.log("delete builds for wishlist " + wishlistId);
    await db.wishlistBuilds!.where('wishlistId').equals(wishlistId).delete();
    events.bus.publish(events.wishlists.OnWishlistBuildUpdated());
}