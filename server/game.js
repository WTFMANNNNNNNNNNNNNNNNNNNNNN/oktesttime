const http = require("http");
const ws = require("ws");
const fs = require("fs");
const path = require("path");

let { socketManager } = require("./Game/network/sockets.js");
let { LagLogger } = require("./Game/debug/lagLogger.js");
let { speedcheckloop } = require("./Game/debug/speedLoop.js");
let { gameHandler } = require("./Game/index.js");
let { gamemodeManager } = require("./Game/gamemodeManager.js");

// This may look that they are loading from the files,
// but dont be fooled because they are game breakers.
// They do load the addons.
function loadDefinitions(includeGameAddons = true) {
    groups = fs.readdirSync(path.join(__dirname, './lib/definitions/groups'));
    // Load all the groups
    for (let filename of groups) {
        require('./lib/definitions/groups/' + filename);
    }

    // Now we can load the addons
    loadAddons(path.join(__dirname, './lib/definitions/addons'));
    // Also include the Game addons!
    if (includeGameAddons) loadAddons(path.join(__dirname, './Game/addons'));

    // Get each class a unique index
    let i = 0;
    for (let key in Class) {
        if (!Class.hasOwnProperty(key)) continue;
        Class[key].index = i++;
    }
}
// Helper function to load the addons
function loadAddons(directory) {
    // Take the folder
    let folder = fs.readdirSync(directory);
    // And check every file in it
    for (let filename of folder) {
        // Create this file it's own filepath
        let filepath = directory + `/${filename}`;
        let isDirectory = fs.statSync(filepath).isDirectory();
        // If we are fooled and it's a folder, restart it's court
        if (isDirectory) {
            loadAddons(filepath);
        }
        // Now we don't want any html files in!
        if (!filename.endsWith('.js')) continue;
        // Compile the addons
        let result = require(filepath);
        if ('function' === typeof result) {
            result({ Class, Config, Events });
        }
        global.loadedAddons.push(filename.slice(0, -3));
    }
}

// Gamemode names
const nameMap = {
    teams: "TDM",
    ffa: "FFA",
    tag: "Tag",
    opentdm: `Open ${c.TEAMS}TDM`,
    // clanwars: "Clan Wars",
    trainwars: "Train Wars",
    old_dreadnoughts: `Old Dreadnoughts ${c.TEAMS}TDM`,
    siege_blitz: "Siege Blitz",
    siege_citadel: "Siege Citadel",
    siege_fortress: "Siege Fortress",
    siege_og: "OG Siege",
    siege_legacy: "Siege Legacy",
};

// Create a new web server class to handle incoming requests
class webServer {
    // Here we start it...
    startWebServer(socketManager) {
        // Create the socket
        this.wsServer = new ws.WebSocketServer({ noServer: true });
        // Create the http server
        this.httpServer = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            switch (req.url) {
                default: {
                    // Return the file
                    res.writeHead(200);
                    res.end("Not found");
                } break;
            }
        }).listen(this.port);
        // Reroute all the upgrade messages to our socket
        this.httpServer.on("upgrade", (req, socket, head) => {
            this.wsServer.handleUpgrade(req, socket, head, ws => socketManager.connect(ws, req))
        });
    }
}

// Here is our actual game server
class gameServer extends webServer {
    constructor(host, port, gamemode, region, serverProperties, parentPort) {
        // Define host, port, and gamemode.
        super();
        this.host = host;
        this.port = port;
        this.gamemode = gamemode;
        this.region = region;
        this.glitchMode = false;
        this.name = gamemode.map(x => nameMap[x] || (x[0].toUpperCase() + x.slice(1))).join(' ');
        this.serverProperties = {
            hidden: serverProperties.hidden,
            maxPlayers: serverProperties.maxPlayers,
            id: serverProperties.serverID,
            tile_width: serverProperties.TILE_WIDTH,
            tile_height: serverProperties.TILE_HEIGHT,
            enableFood: serverProperties.ENABLE_FOOD,
            gameSpeed: serverProperties.gameSpeed,
            runSpeed: serverProperties.runSpeed,
        }
        this.parentPort = parentPort;
        if (!this.parentPort) this.glitchMode = true;
        // Initalize.
        this.roomSpeed = serverProperties.gameSpeed;
        this.runSpeed = serverProperties.runSpeed;
        this.clients = [];
        this.views = [];
        this.minimap = [];
        this.walls = [];
        this.room = {};
        this.arenaClosed = false;
        this.importedRoom = [];
        this.importRoom = [];
        this.currentRoom = null;
        this.lagLogger = new LagLogger();
        this.socketManager = new socketManager(this);
        this.gameHandler = new gameHandler(this);
        this.gameSpeedCheckHandler = new speedcheckloop(this);
        this.gameSettings = {
            // Amount of player-bots to spawn.
            BOTS: serverProperties.BOTS,

            // How much XP player-bots get until they reach LEVEL_CAP.
            BOT_XP: 60,

            // How much XP player-bots will receive when first created.
            BOT_START_LEVEL: 45,

            // The chances of a player-bot upgrading a specific skill when skill upgrades are available.
            BOT_SKILL_UPGRADE_CHANCES: [1, 1, 3, 4, 4, 4, 4, 2, 1, 1],

            // The chances of a player-bot upgrading a specific amount of times before it stops upgrading.
            BOT_CLASS_UPGRADE_CHANCES: [1, 5, 20, 37, 37],

            // The prefix of the player-bots' names.
            BOT_NAME_PREFIX: '[AI] ',

            // The class that players and player-bots spawn as.
            SPAWN_CLASS: 'basic',

            // How every entity regenerates their health.
            REGENERATE_TICK: 100,

            // How many members a team can have in comparison to an unweighed team.
            // Example: Lets say we have team A and B. If the weigh of A is 2 and B is 1, then the game will try to give A twice as many members as B.
            TEAM_WEIGHTS: {},

            // Natural Spawns

            // Allow foods to be spawned or not.
            // NOTE: Disabling it decreases lagness, also very useful if you don't need foods to be spawned.
            ENABLE_FOOD: this.serverProperties.enableFood,

            FOOD_CAP: serverProperties.FOOD_CAP, // Max normal food per normal tile.
            FOOD_MAX_GROUP_TOTAL: serverProperties.FOOD_MAX_GROUP_TOTAL,
            FOOD_CAP_NEST: serverProperties.FOOD_CAP_NEST, // Max nest food per nest tile.
            ENEMY_CAP_NEST: serverProperties.ENEMY_CAP_NEST, // Max nest enemies per nest tile.

            // The delay (in seconds) between the boss spawns being announced and the bosses actually spawning.
            // NOTE: The spawn message (ex. "A strange trembling...") takes half as long to appear than the boss.
            BOSS_SPAWN_DURATION: 5,

            // The possible food types that can spawn.
            FOOD_TYPES: [
                [2000, [
                    [65, 'egg'], [64, 'triangle'], [45, 'square'], [7, 'pentagon'], [1, 'hexagon']
                ]],
                [1, [
                    [625, 'gem'], [125, 'shinyTriangle'], [25, 'shinySquare'], [5, 'shinyPentagon'], [1, 'shinyHexagon']
                ]],
                [0.1, [
                    [1296, 'jewel'], [216, 'legendaryTriangle'], [36, 'legendarySquare'], [6, 'legendaryPentagon'], [1, 'legendaryHexagon']
                ]]
            ],

            // The possible nest food types that can spawn.
            FOOD_TYPES_NEST: [
                [1, [
                    [16, 'pentagon'], [4, 'betaPentagon'], [1, 'alphaPentagon']
                ]]
            ],

            // The possible nest enemy types that can spawn.
            ENEMY_TYPES_NEST: [
                [1, [
                    [1, 'crasher']
                ]]
            ],

            // Default values for gamemode related things.
            // Do not change these, you'll likely break stuff!
            // Change GAME_MODES instead.
            GAMEMODE_NAME_PREFIXES: [],
            SPECIAL_BOSS_SPAWNS: false,
            CLASSIC_SIEGE: false,
            MOTHERSHIP: false,
            DOMINATION: false,
            RANDOM_COLORS: false,
            SPACE_PHYSICS: false,
            ARENA_TYPE: "rect",
            SPACE_MODE: false,
            GROUPS: false,
            TRAIN: false,
            MAZE: false,
            HUNT: false,
            MODE: "ffa",
            TAG: false,
            SPAWN_CONFINEMENT: {},

            // Room setup
            ROOM_SETUP: ["room_default"],
        };

        // Don't forget to bind our manager!
        this.gamemodeManager = new gamemodeManager(this);

        // Start the party
        this.startServer();
    }

    // Get the game info
    getInfo(includegameManager = false) {
        return {
            ip: this.host === "localhost" ? `${this.host}:${this.port}` : this.host,
            port: this.port,
            players: this.socketManager.clients.length,
            maxPlayers: this.serverProperties.maxPlayers,
            id: this.serverProperties.id,
            region: this.region,
            gameMode: this.name,
            gameManager: includegameManager ? this : false,
        }
    }

    // Start our server
    startServer() {
        // This code is for glitch only!
        if (this.glitchMode) {
            global.servers.push(this.getInfo(true));
            // load the game addons
            loadAddons(path.join(__dirname, './Game/addons'));
            // Start the server
            this.start();
            console.log("Your game server has successfully booted.");
            onServerLoaded();
            return;
        }

        // Start the WS Server
        this.startWebServer(this.socketManager);
        // Send the info to the main server so the client can get the info.
        this.parentPort.postMessage([false, this.getInfo()]);

        // Get the definitions before we can initalize the server.
        loadDefinitions();
        // Also load all mockups if needed.
        if (Config.LOAD_ALL_MOCKUPS) global.loadAllMockups(false);
        // Now start the server!
        this.start();
        console.log("Game Server " + this.name + " Successfully booted up. Listening on port", this.port);
        // let the main server know that it successfully booted.
        this.parentPort.postMessage(["doneLoading"]);
    }

    // Start our game
    start(softStart = false) {
        // Are we restarting?
        if (!softStart) {
            let overrideRoom = true;
            // Get gamemode
            for (let gamemode of this.gamemode) {
                let mode = require(`./Game/gamemodeconfigs/${gamemode}.js`);
                for (let key in mode) {
                    if (key === "TILE_WIDTH") {
                        this.serverProperties.tile_width = mode[key];
                    } else if (key === "TILE_HEIGHT") {
                        this.serverProperties.tile_height = mode[key];
                    } else if (key == "DO_NOT_OVERRIDE_ROOM") {
                        overrideRoom = false;
                    } else if (key == "ROOM_SETUP") {
                        if (overrideRoom) this.gameSettings.ROOM_SETUP = mode[key]; else this.gameSettings[key].push(...mode[key]);
                    } else if (key == "LEVEL_CAP" || key == "LEVEL_SKILL_POINT_FUNCTION") {
                        Config[key] = mode[key];
                    } else {
                        this.gameSettings[key] = mode[key];
                    }
                }
            };

            // Initalize the room
            this.setRoom();
            setTimeout(() => {
                // Set the gamemode manager
                this.gamemodeManager.redefine(this);
                // Wake it up
                setTimeout(() => this.gamemodeManager.request("start"), 100);
            }, 200);
        }
        // If not, then...
        if (softStart) {
            // Reset 2 stats so we can respawn.
            this.arenaClosed = false;
            global.cannotRespawn = false;
            // Redefine the room
            this.defineRoom();
            // Log that we are running again
            util.log(`[${this.name}] New game instance is now running`);

            // Init every tile
            for (let y in this.room.setup) {
                for (let x in this.room.setup[y]) {
                    let tile = this.room.setup[y][x];
                    tile.entities = [];
                    tile.init(tile, this.room, this);
                }
            };


            setTimeout(() => {
                // Set the gamemode manager again.
                this.gamemodeManager.redefine(this);
                // Wake up gamemode manager
                this.gamemodeManager.request("start");
            }, 200);
        }

        // Run the server
        this.gameHandler.run();
    }

    // Define the room itself
    defineRoom() {
        this.room = {
            lastCycle: undefined,
            cycleSpeed: 1000 / this.roomSpeed / 30,
            setup: this.importedRoom,
            roomxgrid: this.importedRoom[0].length,
            roomygrid: this.importedRoom.length,
            xgrid: this.importedRoom[0].length,
            ygrid: this.importedRoom.length,
            spawnableDefault: [],
            center: {},
            spawnable: {},
            settings: {
                sandbox: {
                    do_not_change_arena_size: false
                }
            },
        };
        if (!this.wallGrid) {
            this.room.wallGrid = {
                xgrid: this.gameSettings.SANDBOX ? 10 : 15,
                ygrid: this.gameSettings.SANDBOX ? 10 : 15,
                width: this.gameSettings.SANDBOX ? 600 : 900,
                height: this.gameSettings.SANDBOX ? 600 : 900,
                getGrid: (location) => {
                    let x = Math.floor((location.x + this.room.wallGrid.width / 2) * this.room.wallGrid.xgrid / this.room.wallGrid.width);
                    let y = Math.floor((location.y + this.room.wallGrid.height / 2) * this.room.wallGrid.ygrid / this.room.wallGrid.height);
                    return {
                        x: (x + .5) / this.room.wallGrid.xgrid * this.room.wallGrid.width - this.room.wallGrid.width / 2,
                        y: (y + .5) / this.room.wallGrid.ygrid * this.room.wallGrid.height - this.room.wallGrid.height / 2,
                        id: x * this.room.wallGrid.xgrid + y
                    };
                }
            }
        }

        // Set properties.
        this.setRoomProperties();

        // And bunch of functions to it

        // Are we in the room?
        this.room.isInRoom = location => {
            if (Config.ARENA_TYPE === "circle") {
                return (location.x - this.room.center.x) ** 2 + (location.y - this.room.center.y) ** 2 < this.room.center.x ** 2;
            }
            return location.x >= -this.room.width / 2 && location.x <= this.room.width / 2 && location.y >= -this.room.height / 2 && location.y <= this.room.height / 2
        };

        // Are we near the circle?
        this.room.near = function (position, radius) {
            let point = ran.pointInUnitCircle();
            return {
                x: Math.round(position.x + radius * point.x),
                y: Math.round(position.y + radius * point.y)
            };
        };

        // Get random position in the room
        this.room.random = () => {
            return Config.ARENA_TYPE === "circle" ? this.room.near(this.room.center, this.room.center.x) : {
                x: ran.irandom(this.room.width) - this.room.width / 2,
                y: ran.irandom(this.room.height) - this.room.height / 2
            };
        };

        // Get a tile in the room
        this.room.getAt = location => {
            try {
                if (!this.room.isInRoom(location)) return undefined;
                let a = Math.floor((location.y + this.room.height / 2) / this.room.tileWidth);
                let b = Math.floor((location.x + this.room.width / 2) / this.room.tileHeight);
                return this.room.setup[a][b];
            } catch (e) {
                return undefined;
            }
        };

        // Tile locator
        this.room.isAt = (location) => {
            if (!this.room.isInRoom(location)) return false;
            let x = Math.floor((location.x + this.room.width / 2) * this.room.xgrid / this.room.width);
            let y = Math.floor((location.y + this.room.height / 2) * this.room.ygrid / this.room.height);
            return {
                x: (x + .5) / this.room.xgrid * this.room.width - this.room.width / 2,
                y: (y + .5) / this.room.ygrid * this.room.height - this.room.height / 2,
                id: x * this.room.xgrid + y
            };
        };
    }

    // Define room properties
    setRoomProperties() {
        // It's size
        Object.defineProperties(this.room, {
            tileWidth: { get: () => this.serverProperties.tile_width, set: v => this.serverProperties.tile_width = v },
            tileHeight: { get: () => this.serverProperties.tile_height, set: v => this.serverProperties.tile_height = v },
            width: { get: () => this.room.xgrid * this.serverProperties.tile_width, set: v => this.serverProperties.tile_width = v / this.room.xgrid },
            height: { get: () => this.room.ygrid * this.serverProperties.tile_height, set: v => this.serverProperties.tile_height = v / this.room.ygrid }
        });

        // And center
        Object.defineProperties(this.room.center, {
            x: { get: () => this.room.xgrid * this.serverProperties.tile_width / 2 - this.room.width / 2, set: v => this.serverProperties.tile_width = v * 2 / this.room.xgrid - this.room.width / 2 },
            y: { get: () => this.room.ygrid * this.serverProperties.tile_height / 2 - this.room.height / 2, set: v => this.serverProperties.tile_height = v * 2 / this.room.ygrid - this.room.height / 2 }
        });
    }

    // Setup the room
    setRoom() {
        // Get the room setup(s)
        for (let filename of this.gameSettings.ROOM_SETUP) {
            // ... get the current setup
            this.currentRoom = require(`./Game/room_setup/rooms/${filename}.js`);
            this.gameSettings.roomHeight = this.currentRoom.length;
            this.gameSettings.roomWidth = this.currentRoom[0].length;
            c.roomWidth = this.currentRoom[0].length;
            c.roomHeight = this.currentRoom.length;

            // Now we loop for tiles
            for (let y = 0; y < this.gameSettings.roomHeight; y++) {
                for (let x = 0; x < this.gameSettings.roomWidth; x++) {
                    if (this.importedRoom[y] == null) {
                        this.importedRoom[y] = this.currentRoom[y];
                    } else if (this.currentRoom[y][x]) {
                        this.importedRoom[y][x] = this.currentRoom[y][x];
                    }
                }
            }
        };

        // Set the room
        this.defineRoom();

        // Now lets make the tiles as TileEntity so they can work properly
        for (let y in this.room.setup) {
            for (let x in this.room.setup[y]) {
                let tile = this.room.setup[y][x] = new tileEntity(this.room.setup[y][x], { x, y }, this);
                // Initialize the tile
                tile.init(tile, this.room, this);
            }
        };
    }

    // Room living loop
    roomLoop() {
        // Update all the entities
        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i],
                tile = this.room.getAt(entity);
            if (tile && !entity.bond) tile.entities.push(entity);
        }

        // Update all the tiles
        for (let y = 0; y < this.room.setup.length; y++) {
            for (let x = 0; x < this.room.setup[y].length; x++) {
                let tile = this.room.setup[y][x];
                tile.tick(tile, this.room, this);
                // We can clean the tile entities now
                tile.entities = [];
            }
        }

        // If client doesn't yet know what are we doing, broadcast it to him.
        // But only once
        if (this.room.sendColorsToClient) {
            this.room.sendColorsToClient = false;
            sockets.broadcastRoom();
        }
    }

    // Arena closers here we come
    closeArena() {
        // Check if arena is closed
        if (this.arenaClosed) return;
        // Log this
        util.saveToLog("Game Instance Ending", "Game running " + this.gamemode + " at `" + this.gamemode + "` is now closing.", 0xEE4132);
        util.log(`[${this.name}] Arena Closing initiated`);
        // And broadcast it
        this.socketManager.broadcast("Arena closed: No players may join!");
        this.arenaClosed = true;
        // Now we actually spawn arena closers
        // But only in 5 seconds...
        let spawnTimeout = setTimeout(() => {
            for (let i = 0; i < 15; i++) {
                // Decide where we are facing
                let angle = ((Math.PI * 2) / 15) * i;
                // Spawn the entity
                let o = new Entity({
                    x: (this.room.width / 2 * this.room.xgrid / this.room.width) + (this.room.width / 0.7) * Math.cos(angle),
                    y: (this.room.width / 2 * this.room.xgrid / this.room.width) + (this.room.width / 0.7) * Math.sin(angle),
                }, false, this);

                // Define it as arena closer
                o.define('arenaCloser');
                o.define({
                    COLOR: 3,
                    AI: {
                        FULL_VIEW: true,
                        SKYNET: true,
                        BLIND: true,
                        LIKES_SHAPES: true,
                    },
                    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal"],
                    SKILL: Array(10).fill(9),
                    ACCEPTS_SCORE: false,
                    CAN_BE_ON_LEADERBOARD: false,
                    VALUE: 100000,
                    LEVEL: 45,
                    CAN_GO_OUTSIDE_ROOM: true,
                });
                // Set it's team and name
                o.team = TEAM_ENEMIES;
                o.name = "Arena Closer";
            }
        }, 5000)
        // Every second we check how well arena closers are doing
        let ticks = 0;
        let loop = setInterval(() => {
            ticks++;
            // If they fail, we close anyway
            if (ticks >= 50) return clearInterval(loop), this.close(spawnTimeout);

            let alive = false;
            for (let i = 0; i < entities.length; i++) {
                let instance = entities[i];
                if (
                    (instance.isPlayer && !instance.invuln) || instance.isMothership ||
                    instance.isBot ||
                    (instance.isDominator && instance.team !== TEAM_ENEMIES)
                ) {
                    alive = true;
                }
            }

            // Can we close?
            if (!alive) clearInterval(loop), this.close(spawnTimeout);
        }, 1000);
    }

    // For sandbox mainly
    updateBounds(width, height) {
        // Get room size
        const widthSize = parseInt(width);
        const heightSize = parseInt(height);
        // Update the value
        this.room.width = widthSize;
        this.room.height = heightSize;
        // Rebroadcast the room
        this.socketManager.broadcastRoom();
    }

    close(spawnTimeout) {
        // Log that we are closing
        util.log(`[${this.name}] Ending Game instance`);
        // Clear the timeout if the arena closers did not spawn yet
        if (spawnTimeout) clearTimeout(spawnTimeout);
        // Now broadcast it
        this.socketManager.broadcast("Closing!");
        this.arenaClosed = true;
        for (let entity of entities) if (entity.isPlayer || entity.isBot) entity.kill(); // Kill all players and bots.
        setTimeout(() => {
            // Wipe everyone
            for (let client of this.clients) {
                client.close();
            };
            // Kill the gamemode and the game looper
            this.gamemodeManager.terminate();
            this.gameHandler.stop();

            setTimeout(() => {
                // Wipe everything
                global.entities = [];
                this.views = [];
                this.minimap = [];
                this.walls = [];
                this.gameHandler.bots = [];
                this.gameHandler.foods = [];
                this.gameHandler.nestFoods = [];
                global.grid = new hshg.HSHG();
                global.spawnPoint = undefined;
                this.onEnd();
            }, 1000)
        }, 1000)
    }

    onEnd() {
        // Log that we are restarting
        util.log(`[${this.name}] Game instance is now over. Soft restarting the server.`);
        // Set this to true to run the softstart code
        this.start(true);
    }

    reloadDefinitions = () => loadDefinitions(false); 
}

module.exports = { gameServer };
