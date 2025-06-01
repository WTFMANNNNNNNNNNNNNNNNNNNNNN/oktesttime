let spawnPermanentBaseProtector = (loc, team, gameManager) => {
    let o = new Entity(loc, false, gameManager);
    o.define('baseProtector');
    o.team = team;
    o.color.base = getTeamColor(team);
    o.on('dead', () => spawnPermanentBaseProtector(loc, team, gameManager));
},
teamCheck = (tile, team) => {
    for (let i = 0; i < tile.entities.length; i++) {
        let entity = tile.entities[i];
        if (entity.team !== team && !entity.ac && !entity.master.master.ac && !entity.isArenaCloser && !entity.master.master.isArenaCloser) {
            entity.kill()
        };
    }
},
teamRoomCheck = (tile, team, room) => {
    if (!room.spawnable[team]) room.spawnable[team] = [];
    room.spawnable[team].push(tile);
};

// Team -1 (blue)
tileClass.base1 = new Tile({
    COLOR: "blue",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_BLUE, room),
    TICK: tile => teamCheck(tile, TEAM_BLUE)
})
tileClass.baseprotected1 = new Tile({
    COLOR: "blue",
    INIT: (tile, room, gameManager) => {
        teamRoomCheck(tile, TEAM_BLUE, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_BLUE, gameManager);
    },
    TICK: tile => teamCheck(tile, TEAM_BLUE)
})

// Team -2 (Green)
tileClass.base2 = new Tile({
    COLOR: "green",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_GREEN, room),
    TICK: tile => teamCheck(tile, TEAM_GREEN)
})
tileClass.baseprotected2 = new Tile({
    COLOR: "green",
    INIT: (tile, room, gameManager) => {
        teamRoomCheck(tile, TEAM_GREEN, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_GREEN, gameManager);
    },
    TICK: tile => teamCheck(tile, TEAM_GREEN)
})

// Team -3 (Red)
tileClass.base3 = new Tile({
    COLOR: "red",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_RED, room),
    TICK: tile => teamCheck(tile, TEAM_RED)
})
tileClass.baseprotected3 = new Tile({
    COLOR: "red",
    INIT: (tile, room, gameManager) => {
        teamRoomCheck(tile, TEAM_RED, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_RED, gameManager);
    },
    TICK: tile => teamCheck(tile, TEAM_RED)
})

// Team -4 (Purple)
tileClass.base4 = new Tile({
    COLOR: "magenta",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_PURPLE, room),
    TICK: tile => teamCheck(tile, TEAM_PURPLE)
})
tileClass.baseprotected4 = new Tile({
    COLOR: "magenta",
    INIT: (tile, room, gameManager) => {
        teamRoomCheck(tile, TEAM_PURPLE, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_PURPLE, gameManager);
    },
    TICK: tile => teamCheck(tile, TEAM_PURPLE)
})