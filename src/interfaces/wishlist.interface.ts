export enum WishlistTag{
    GodPvE="GodPvE",
    GodPvP="GodPvP",
    PvE="PvE",
    PvP="PvP",
    Trash="Trash",
    Curated="Curated",
    Mouse="Mouse",
    Controller="Controller",
    None="None"
}

export interface WishlistBuild{
    id?:number;
    wishlistId?:number;
    itemHash?:number;
    name?:string;
    description?:string;
    tags?:WishlistTag[];
    plugs?:number[][];
    uniqueId?:string;
}

export interface Wishlist{
    id?:number;
    name?:string;
    description?:string;
    linkedRepo?: string;
    sha?: string;
    uniqueId?: string;
    status?: string;
}

export default Wishlist;