
import React from "react";
import { Route, Switch } from 'react-router-dom';
import { SelectWeapon } from "../select_weapon/selectWeapon.view";
import { EditItem } from "./edit";

export const WishlistItemIndex = () => {
    const basePath = "/wishlist/e/:wishlistId/item";
    return (
        <Switch>
            <Route exact path={`${basePath}/add`} component={SelectWeapon}></Route>
            <Route exact path={`${basePath}/e/:itemHash`} component={EditItem}></Route>
        </Switch>
    );
};

export default WishlistItemIndex;