let spawnPermanentAntiTankMachineGun = (loc, gameManager) => {
    let o = new Entity(loc, false, gameManager);
    o.define('antiTankMachineGun');
    o.define({
      BODY: { FOV: 0.8, },
      FACING_TYPE: "spinWhenIdle",
    })
    o.controllers = [new ioTypes.nearestDifferentMaster(o, {}, gameManager)]
    o.team = TEAM_ROOM;
    o.SIZE = 15;
    o.color.base = getTeamColor(TEAM_RED);
    o.on('dead', () => spawnPermanentAntiTankMachineGun(loc, gameManager));
};

tileClass.normal = new Tile({
  COLOR: "white",
  NAME: "Default Tile",
  DATA: {
    allowMazeWallToBeSpawned: true,
    foodSpawnCooldown: 0, foodCount: 0
  },
  INIT: (tile, room) => room.spawnableDefault.push(tile),
});
tileClass.nest = new Tile({
    DATA: {
        allowMazeWallToBeSpawned: true,
        foodSpawnCooldown: 0, foodCount: 0
    },
    COLOR: "nest",
    NAME: "Nest Tile",
    INIT: (tile, room) => {
        if (!room.spawnable[TEAM_ENEMIES]) room.spawnable[TEAM_ENEMIES] = [];
        room.spawnable[TEAM_ENEMIES].push(tile);
    },
});
tileClass.wall = new Tile({
    COLOR: "white",
    NAME: "Wall Tile",
    INIT: (tile, room, gameManager) => {
        let o = new Entity(tile.loc, false, gameManager);
        o.define("wall");
        o.team = TEAM_ROOM;
        o.SIZE = room.tileWidth / 2 / lazyRealSizes[4] * Math.SQRT2 - 2;
        o.protect();
        o.life();
    }
});
tileClass.atmg = new Tile({
    COLOR: "white",
    NAME: "ATMG Tile",
    INIT: (tile, room, gameManager) => spawnPermanentAntiTankMachineGun(tile.loc, gameManager)
})