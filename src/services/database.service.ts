import Dexie from 'dexie';
import 'dexie-observable';
import Wishlist, { WishlistBuild } from '../interfaces/wishlist.interface';

const db:WishlistBuilderDb = new Dexie('wishlist_builder');

interface WishlistBuilderDb extends Dexie{
    wishlists?:Dexie.Table<Wishlist, number>;
    wishlistBuilds?:Dexie.Table<WishlistBuild, number>;
}

db.version(2).stores({
  wishlists: 'id++,name,description, linkedRepo, sha, &uniqueId',
  wishlistBuilds: 'id++,tags,itemHash,wishlistId,[wishlistId+itemHash], &uniqueId',
  changeList: '++id, wishlistId, uniqueId, changeType, timestamp',
});

export default db;