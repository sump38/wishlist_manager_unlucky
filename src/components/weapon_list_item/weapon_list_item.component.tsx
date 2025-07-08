import { Box, Button, Divider } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { ExtendedCollectible } from "../../services/weapons.service";
import { bungieURL } from "../../utils/bungie_url";
import { Tooltip } from "react-tippy";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

interface WeaponListItemProps {
    definition: ExtendedCollectible
    itemHash: number;
    wishlistId: number;
    existsInUserCollection?: boolean;
    isTrash?: boolean;
}

export const WeaponListItem = ({ itemHash, wishlistId, definition, existsInUserCollection, isTrash }: WeaponListItemProps) => {
    const season = definition?.season
    const confirmed = definition?.confirmed
    const name = definition?.displayProperties?.name
    const icon = definition?.displayProperties?.icon
    
    const trashGradient = 'linear-gradient(135deg, rgba(220, 53, 69, 0.3) 0%, rgba(201, 42, 42, 0.2) 50%, rgba(239, 68, 68, 0.1) 100%)';
    
    const goldenGradient = existsInUserCollection 
        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 193, 7, 0.2) 50%, rgba(255, 235, 59, 0.1) 100%)'
        : 'none';
    
    // Determine the background gradient
    const backgroundGradient = isTrash 
        ? trashGradient 
        : goldenGradient;
    
    const button =
        <Button
            variant="outlined"
            color= {confirmed ? 'primary' : 'error'}
            fullWidth
            sx={{
                padding: 0,
                justifyContent: "left",
                color: confirmed ? 'white' : 'error.light',
                background: backgroundGradient,
                '&:hover': {
                    background: isTrash
                        ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.4) 0%, rgba(201, 42, 42, 0.3) 50%, rgba(239, 68, 68, 0.2) 100%)'
                        : existsInUserCollection 
                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 193, 7, 0.3) 50%, rgba(255, 235, 59, 0.2) 100%)'
                            : undefined
                }
            }}
            component={Link}
            to={`/wishlist/e/${wishlistId}/item/e/${itemHash}`}
        >
            <img width={64} height={64} alt={name} src={bungieURL(icon)} />
            <Divider flexItem orientation="vertical"></Divider>
            <Box p={1} minWidth={0} sx={{ flexGrow: 1 }}>
                <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis"><strong>{name}</strong></Box>
                <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis"><strong>{season ? `Season ${season}` : null} {!confirmed ? ' (unconfirmed)' : null}</strong></Box>
            </Box>
            {isTrash && (
                <Box pr={2} display="flex" alignItems="center">
                    <FontAwesomeIcon icon={faTrash} style={{ color: 'rgba(220, 53, 69, 0.8)', fontSize: '24px' }} />
                </Box>
            )}
        </Button>

    if(!confirmed){
        const tooltip = <Box>
            This item wasn't confirmed through collections or craftable items and may not be a real item in the game
        </Box>
        return <Tooltip trigger="mouseenter" html={tooltip} >
            {button}
        </Tooltip>
    }

    return button

}