
import React from "react";
import { Route, Switch } from 'react-router-dom';
import { WishlistItemIndex } from "../item";
import { EditWishlist } from "./edit";
import { LoadWishlist } from "./load";
import { NewWishlist } from "./new";
import { ImportWishlist } from "./import";
import { ExportWishlistModal } from "./export";
import { SaveToGithubModal } from "./save-to-github";
import { SyncFromGithubModal } from "./sync-from-github";
import { RepoList } from "./load-repo";

export const WishlistsIndex = () => {
    return (
        <Switch>
            <Route exact path="/wishlist/new" component={NewWishlist}></Route>
            <Route exact path="/wishlist/load" component={LoadWishlist}></Route>
            <Route exact path="/wishlist/import" component={ImportWishlist}></Route>
            <Route exact path="/wishlist/repos" component={RepoList}></Route>
            <Route exact path="/wishlist/e/:wishlistId/export" component={ExportWishlistModal}></Route>
            <Route exact path="/wishlist/e/:wishlistId/save-to-github" component={SaveToGithubModal}></Route>
            <Route exact path="/wishlist/e/:wishlistId/sync-from-github" component={SyncFromGithubModal}></Route>
            <Route path="/wishlist/e/:wishlistId/item" component={WishlistItemIndex}></Route>
            <Route exact path="/wishlist/e/:wishlistId" component={EditWishlist}></Route>
        </Switch>
    );
};

export default WishlistsIndex;