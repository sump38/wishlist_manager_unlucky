
import React from "react";
import { Route, Switch } from 'react-router-dom';
import { WishlistItemIndex } from "../item";
import { EditWishlist } from "./edit";
import { LoadWishlist } from "./load";
import { NewWishlist } from "./new";
import { ImportWishlist } from "./import";
import { ExportWishlistModal } from "./export";

export const WishlistsIndex = () => {
    return (
        <Switch>
            <Route exact path="/wishlist/new" component={NewWishlist}></Route>
            <Route exact path="/wishlist/load" component={LoadWishlist}></Route>
            <Route exact path="/wishlist/import" component={ImportWishlist}></Route>
            <Route exact path="/wishlist/e/:wishlistId/export" component={ExportWishlistModal}></Route>
            <Route path="/wishlist/e/:wishlistId/item" component={WishlistItemIndex}></Route>
            <Route exact path="/wishlist/e/:wishlistId" component={EditWishlist}></Route>
        </Switch>
    );
};

export default WishlistsIndex;