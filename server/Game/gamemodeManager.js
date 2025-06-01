let { bossRush } = require("./gamemodes/bossRush.js");
let { Tag } = require("./gamemodes/tag.js");
let { Domination } = require("./gamemodes/dominator.js");
let { Mothership } = require("./gamemodes/mothership.js");
let { Sandbox } = require("./gamemodes/sandbox.js");
let { Maze } = require("./gamemodes/maze.js");

class gamemodeManager {
    constructor(gameManager) {
        gameManager = ensureIsManager(gameManager);
        this.gameManager = gameManager;
        this.conf = this.gameManager.gameSettings;

        this.gameSiege = new bossRush(this.gameManager);
        this.gameTag = new Tag(this.gameManager);
        this.gameDomination = new Domination(this.gameManager);
        this.gameMothership = new Mothership(this.gameManager);
        this.gameSandbox = new Sandbox(this.gameManager);
        this.gameMaze = new Maze(this.gameManager, null);
    }

    request(type) {
        if (type == "start") {
            if (this.conf.SPECIAL_BOSS_SPAWNS) this.gameSiege.start(this.conf.MAZE_TYPE ?? false);
            if (this.conf.TAG) c.TAG_DATA.initAndStart();
            if (this.conf.DOMINATION) this.gameDomination.start();
            if (this.conf.MOTHERSHIP) this.gameMothership.start();
            if (this.conf.MAZE_TYPE !== undefined && !this.conf.SPECIAL_BOSS_SPAWNS) this.gameMaze.generate();
        }
        if (type == "loop") {
            this.gameManager.lagLogger.set();
            if (this.conf.SPECIAL_BOSS_SPAWNS) this.gameSiege.loop();
            if (this.conf.MOTHERSHIP) this.gameMothership.loop();
            this.gameManager.lagLogger.mark();
            if (this.gameManager.lagLogger.totalTime > 100) {
                console.log("Gamemode loop is taking a long time!");
                console.log(`Gamemode loop took ${this.gameManager.lagLogger.totalTime}ms to complete!`);
                console.log(`Gamemode loop log history: (Last ${this.gameManager.lagLogger.sum.length} entries)`);
                console.log(this.gameManager.lagLogger.sum.map(entry => `Run at: ${entry.at}. Time: ${entry.time}.`).join("\n"));
            }
        }
        if (type == "quickloop") { // Mainly for sandbox only, but you can also put your own gamemode loop here incase the regular loop doesnt fit.
            if (this.conf.SANDBOX) this.gameSandbox.update();
        }
    }

    terminate() {
        if (this.conf.SPECIAL_BOSS_SPAWNS) this.gameSiege.reset();
        if (this.conf.TAG) c.TAG_DATA.resetAndStop();
        if (this.conf.DOMINATION) this.gameDomination.reset();
        if (this.conf.MOTHERSHIP) this.gameMothership.reset();
    }

    redefine(theshit) {
        theshit = ensureIsManager(theshit);
        this.gameManager = theshit;
        this.gameSiege.redefine(theshit);
        this.gameTag.redefine(theshit);
        this.gameDomination.redefine(theshit);
        this.gameMothership.redefine(theshit);
        this.gameSandbox.redefine(theshit);
        this.gameMaze.redefine(theshit, theshit.gameSettings.MAZE_TYPE);
    }
}

module.exports = { gamemodeManager };