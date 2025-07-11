
import { Box, Button, Card, Checkbox, Divider, FormControlLabel, Grid, TextField, useMediaQuery, useTheme } from "@mui/material";
import { DestinyInventoryItemDefinition, DestinyItemSocketCategoryDefinition } from "bungie-api-ts/destiny2/interfaces";
import React, { ChangeEvent, useEffect, useState } from "react";
import ScrollContainer from "react-scrollbars-custom";
import { Tooltip } from 'react-tippy';
import 'react-tippy/dist/tippy.css';
import { InventoryItemImage } from "../../components/inventory_item_image/inventory_item_image.component";
import { ModTooltipContent } from "../../components/mod_tooltip_content/mod_tooltip_content.component";
import { SectionHeader } from "../../components/section_header/section_header.component";
import { WishlistBuild, WishlistTag } from "../../interfaces/wishlist.interface";
import { manifest } from '../../services';
import { getPlugSetDefinition } from "../../services/manifest.service";
import { saveBuild } from "../../services/wishlistBuild.service";

const useStyles = {
    perks: {
        display: "flex",
        flexDirection: "row",
    },
    perkColumn: {
        display: "flex",
        flexDirection: "column",
        width: 48,
    },
    tagCheckBox: {
        width: "50%",
        marginRight: 0,
    },
    perk: {
        width: 48,
        height: 48
    },
    enhancedPerk: {
        width: 48,
        height: 48,
        background: "linear-gradient(0deg, #FFFF0066, transparent)",
        borderRadius: "50%",
    },
}

function createBlankBuild(wishlistId: number, itemHash: number): WishlistBuild {
    return {
        wishlistId: wishlistId,
        itemHash: itemHash,
        tags: [],
        name: "",
        description: ""
    };
}

const ScrollableWhen = ({ children, condition }: any) => {
    if (condition) {
        return <ScrollContainer disableTracksWidthCompensation={true} noScrollX>
            {children}
        </ScrollContainer>;
    }
    return children;
};

const organizePlugs = (buildPlugs: number[][], randomPlugs: number[][], curatedPlugs: number[][]) => {
    let result: number[][] = randomPlugs.map((random, index) => {
        const curated = curatedPlugs[index];
        const mixed = [...curated, ...random];
        const fromBuild = buildPlugs.filter((p) => p.every((p) => mixed.includes(p)))[0];
        if (fromBuild) return fromBuild;
        return [];
    });
    return result;
}

export const WishlistBuildForm = (props: { wishlistId: number, build?: WishlistBuild, def: DestinyInventoryItemDefinition }) => {
    const classes = useStyles;
    const blankBuild: WishlistBuild = createBlankBuild(props.wishlistId, props.def.hash);

    const [curatedPerks, setCuratedPerks] = useState<number[][]>([]);
    const [randomPerks, setRandomPerks] = useState<number[][]>([]);
    const [selectedPerks, setSelectedPerks] = useState<number[][]>([]);
    const [loaded, setLoaded] = useState<boolean>(false);
    let initialBuild = props.build ? { ...props.build } : { ...blankBuild };
    const [build, setBuild] = useState<WishlistBuild>(initialBuild);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('xs'));

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        var fieldName = event.target.id;
        var fieldValue = event.target.value;
        setBuild({
            ...build,
            [fieldName]: fieldValue
        })
    };
    async function save() {
        saveBuild({
            ...build,
            plugs: selectedPerks,
        });
        if (!build.id) {
            setBuild({
                ...blankBuild
            });
            setSelectedPerks(randomPerks.map((_p): number[] => []));
        }
    }

    function removePerk(hash: number, index: number) {
        selectedPerks[index] = selectedPerks[index].filter((p) => p !== hash);
        setSelectedPerks([...selectedPerks]);
    }

    function addPerk(hash: number, index: number) {
        selectedPerks[index].push(hash);
        setSelectedPerks([...selectedPerks]);
    }

    useEffect(() => {
        async function populatePlugArrays(cat: DestinyItemSocketCategoryDefinition, curatedArray?: number[][], randomizedArray?: number[][]) {
            for (var i in cat.socketIndexes) {
                let index = cat.socketIndexes[i];
                let entry = props.def.sockets.socketEntries[index];
                let randomPlugSet = entry.randomizedPlugSetHash ? (getPlugSetDefinition(entry.randomizedPlugSetHash)) : null;
                let reusablePlugSet = entry.reusablePlugSetHash && entry.reusablePlugSetHash !== 1074 ? (getPlugSetDefinition(entry.reusablePlugSetHash)) : null;
                let curated: number[] = [];
                let random: number[] = [];
                if (entry.singleInitialItemHash && entry.singleInitialItemHash !== 2285418970) {
                    curated.push(entry.singleInitialItemHash);
                }

                entry.reusablePlugItems?.forEach((p) => {
                    if (curated.indexOf(p.plugItemHash) === -1) {
                        curated.push(p.plugItemHash);
                    }
                });

                if (reusablePlugSet) {
                    let skip = reusablePlugSet.reusablePlugItems.some((p) => p.plugItemHash === 2285418970);
                    if (!skip) {
                        reusablePlugSet.reusablePlugItems.forEach((p) => {
                            if (curated.indexOf(p.plugItemHash) === -1) {
                                curated.push(p.plugItemHash);
                            }
                        });
                    }
                }
                if (randomPlugSet) {
                    randomPlugSet.reusablePlugItems.forEach((p) => {
                        if (curated.indexOf(p.plugItemHash) === -1 && random.indexOf(p.plugItemHash) === -1) {
                            random.push(p.plugItemHash);
                        }
                    });
                }

                curatedArray?.push(curated);
                randomizedArray?.push(random);
            }
        }

        function getCategories(): { perkCat?: DestinyItemSocketCategoryDefinition, modCat?: DestinyItemSocketCategoryDefinition } {
            let result: { perkCat?: DestinyItemSocketCategoryDefinition, modCat?: DestinyItemSocketCategoryDefinition } = {};
            props.def.sockets?.socketCategories?.forEach((cat) => {
                if (cat.socketCategoryHash === 4241085061) {
                    result.perkCat = cat;
                }
                if (cat.socketCategoryHash === 2685412949) {
                    result.modCat = cat;
                }
            });
            return result;
        }
        async function load() {
            let cats = getCategories();
            let curatedPerks: number[][] = [];
            let randomPerks: number[][] = [];
            if (cats.perkCat) {
                await populatePlugArrays(cats.perkCat, curatedPerks, randomPerks);
            }
            setCuratedPerks(curatedPerks);
            setRandomPerks(randomPerks);

            let buildPlugs: number[][] | null = props.build?.plugs ? [...props.build.plugs] : [];
            let orderedPlugs = organizePlugs(buildPlugs, randomPerks, curatedPerks);
            setSelectedPerks(orderedPlugs);
            setLoaded(true);
        }
        if (props.build) {
            let blank = createBlankBuild(props.wishlistId, props.def.hash);
            let build = { ...blank, ...props.build };
            if (!build.name) build.name = "";
            if (!build.description) build.description = "";
            setBuild({ ...build });
        } else {
            let blank = createBlankBuild(props.wishlistId, props.def.hash);
            setBuild({ ...blank });
        }
        load();
    }, [props.def.sockets, props.build, props.wishlistId, props.def.hash]);


    if (!loaded) {
        return <Box></Box>;
    }

    function containsTag(tag: WishlistTag): boolean {
        if (!build.tags) return false;
        return build.tags?.indexOf(tag) > -1;
    }

    function handleTagChange(tag: WishlistTag, value: any) {
        if (value && !containsTag(tag)) {
            build.tags?.push(tag);
        }
        if (!value && containsTag(tag)) {
            build.tags = build.tags?.filter((t) => t !== tag);
        }
        setBuild({
            ...build
        });
    }

    function buildPerkIcon(p: number, onClick: () => void) {
        const def = manifest.getInventoryItemDefinition(p);
        const isEnhanced = def.inventory.tierType === 3;
        const isTracker = def.plug?.plugCategoryIdentifier?.endsWith('.trackers')
        if(isTracker) return <Box key={p} />
        return <Tooltip key={p} trigger="mouseenter" html={<ModTooltipContent hash={p}></ModTooltipContent>} >
            <Box onClick={(_) => onClick()} 
            sx={isEnhanced ? classes.enhancedPerk : classes.perk}>
                <InventoryItemImage 
                hash={p}
                width='100%'
                height='100%'
                ></InventoryItemImage>
            </Box>
        </Tooltip>;
    }

    return (
        <Card style={{ height: "100%" }}>
            <Box display="flex" flexDirection="column" p={1} height="100%">
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={8}>
                        <form noValidate autoComplete="off" style={{ width: "100%" }}>
                            <Box pb={1}>
                                <TextField id="name" label="Name" variant="outlined" fullWidth onChange={onChange} value={build.name} />
                            </Box>
                            <Box pb={1}>
                                <TextField id="description" label="Description" variant="outlined" fullWidth multiline rows={4} value={build.description} onChange={onChange} />
                            </Box>
                        </form>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <SectionHeader>Tag</SectionHeader>
                        <Card variant="outlined">
                            <Box p={1} py={0} display="flex" flexWrap="wrap">
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.GodPvE)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.GodPvE, value)}
                                        name="GodPvE" />}
                                    label="GodPvE"
                                />
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.PvE)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.PvE, value)}
                                        name="PvE" />}
                                    label="PvE"
                                />
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.GodPvP)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.GodPvP, value)}
                                        name="GodPvP" />}
                                    label="GodPvP"
                                />
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.PvP)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.PvP, value)}
                                        name="PvP" />}
                                    label="PvP"
                                />
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.Mouse)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.Mouse, value)}
                                        name="MnK" />}
                                    label="Mouse"
                                />
                                <FormControlLabel
                                    sx={classes.tagCheckBox}
                                    control={<Checkbox
                                        checked={containsTag(WishlistTag.Controller)}
                                        onChange={(_, value) => handleTagChange(WishlistTag.Controller, value)}
                                        name="Controller" />}
                                    label="Controller"
                                />
                            </Box>
                        </Card>
                    </Grid>
                </Grid>
                <Box flex={1} flexGrow={1} mt={1}>
                    <ScrollableWhen condition={!isMobile}>
                        <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                                <SectionHeader>
                                    Selected Perks
                                </SectionHeader>
                                <Box sx={classes.perks}>
                                    {selectedPerks.map((perks, index) =>
                                        <Box key={index} sx={classes.perkColumn}>
                                            {perks.map((p) =>
                                                buildPerkIcon(p, () => removePerk(p, index)))}
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box mr={1}>
                                    <SectionHeader>
                                        Curated Perks
                                    </SectionHeader>
                                    <Box sx={classes.perks}>
                                        {curatedPerks.map((perks, index) =>
                                            <Box key={index} sx={classes.perkColumn}>
                                                {perks.filter((p) => selectedPerks[index].indexOf(p) === -1).map((p) =>
                                                    buildPerkIcon(p, () => addPerk(p, index)))}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                {randomPerks.some((p) => p.length > 0) ? (
                                    <Box mr={1}>
                                        <SectionHeader>
                                            Random Perks
                                        </SectionHeader>
                                        <Box sx={classes.perks}>
                                            {randomPerks.map((perks, index) =>
                                                <Box key={index} sx={classes.perkColumn}>
                                                    {perks.filter((p) => selectedPerks[index].indexOf(p) === -1).map((p) =>
                                                        buildPerkIcon(p, () => addPerk(p, index)))}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>) : <Box></Box>}
                            </Grid>
                        </Grid>
                    </ScrollableWhen>
                </Box>
                <Box m={1} my={0}>
                    <Divider></Divider>
                </Box>
                <Box m={1} mt={1} display="flex" justifyContent="flex-end">
                    <Button variant="contained" color="primary" onClick={save}>
                        Save Build
                    </Button>
                </Box>
            </Box>
        </Card>);
};
export default WishlistBuildForm;