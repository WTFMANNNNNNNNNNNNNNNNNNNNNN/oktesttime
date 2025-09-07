const prefix = "$";

/** COMMANDS **/
let commands = [
  {
        command: ["help"],
        description: "Show this help menu.",
        level: 0,
        run: ({ socket, level }) => {
            let useOldMenu = false;
            let lines = [
            "Help menu:",
            ...commands.filter((c) => level >= c.level && !c.hidden).map((c) => {
                    let cmdData = [c.command];
                    let commandText = cmdData.map((e) => e.map((name) => name).join(` or ${prefix} `)).join(" ")
                    let description = c.description ?? false;
                    let text = `- ${prefix} ${commandText}`;
                    if (description) text += ` - ${description}`;
                    return text;
                }),
            ];
            if (useOldMenu) {
                for (let line of lines.reverse()) {
                    socket.talk("m", 15_000, line);
                }
            } else socket.talk("Em", 15_000, JSON.stringify(lines));
        },
    },
    {
        command: ["leaderboard", "b"],
        description: "Select the leaderboard to display.",
        level: 0,
        run: ({ socket, args }) => {
            let sendAvailableLeaderboardMessage = () => {
                let lines = [
                    "Available leaderboards:",
                    ...leaderboards.map(lb => `- ${lb}`)
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };

            const leaderboards = [
                "default",
                "players",
                "bosses",
                "global",
            ];
            const choice = args[0];

            if (!choice) {
                sendAvailableLeaderboardMessage(socket);
                return;
            }

            if (leaderboards.includes(choice)) {
                socket.status.selectedLeaderboard = choice;
                socket.status.forceNewBroadcast = true;
                socket.talk("m", 4_000, "Leaderboard changed.");
            } else {
                socket.talk("m", 4_000, "Unknown leaderboard.");
            }
        }
    },
    {
        command: ["toggle", "t"],
        description: "Enable or disable chat",
        level: 0,
        run: ({ socket }) => {
            if (!socket.status.disablechat) {
                socket.status.disablechat = true;
                socket.talk("m", 3_000, "In-game chat disabled.");
            } else {
                socket.status.disablechat = false;
                socket.talk("m", 3_000, "In-game chat enabled.");
            }
        }
    },
    {
        command: ["arena"],
        description: "Enable or disable chat",
        level: 1,
        hidden: true,
        run: ({ socket, args, gameManager }) => {
            let sendAvailableArenaMessage = () => {
                let lines = [
                    "Help menu:",
                    "- $ arena size dynamic - Make the size of the arena dynamic, depending on the number of players",
                    "- $ arena size <width> <height> - Set the size of the arena",
                    "- $ arena team <team> - Set the number of teams, from 0 (FFA) to 4 (4TDM)",
                    "- $ arena spawnpoint [x] [y] - Set a location where all players spawn on default",
                    "- $ arena close - Close the arena",
                ];
                if (!Config.SANDBOX) lines.splice(1, 1)
                socket.talk("Em", 10_000, JSON.stringify(lines));
            }
            if (!args[0]) sendAvailableArenaMessage(); else {
                if (args[0] == "size") {
                    if (args[1] == "dynamic") {
                        if (!Config.SANDBOX) return socket.talk("m", 3_000, "This command is only available on sandbox.");
                        gameManager.room.settings.sandbox.do_not_change_arena_size = false;
                    } else {
                        if (!args[1]) return socket.talk("m", 3_000, "Invalid arguments.");
                        if (!args[2]) return socket.talk("m", 3_000, "Invalid arguments.");
                        if (args[1] % 2 === 0 && args[2] % 2 === 0) {
                            if (Config.SANDBOX) gameManager.room.settings.sandbox.do_not_change_arena_size = true;
                            gameManager.updateBounds(args[1] * 30, args[2] * 30);
                        } else socket.talk("m", 3_000, "Arena size must be even.");
                    }
                } else if (args[0] == "team") {
                    if (!args[1]) return socket.talk("m", 3_000, "Invalid argument.");
                    if (args[1] == "0") {
                        Config.MODE = "ffa";
                        Config.TEAMS = null;
                        socket.rememberedTeam = undefined;
                    } else {
                        Config.MODE = "tdm";
                        Config.TEAMS = args[1];
                        socket.rememberedTeam = undefined;
                    }
                } else if (args[0] == "spawnpoint") {
                    if (!args[1]) return socket.talk("m", 3_000, "Invalid arguments.");
                    if (!args[2]) return socket.talk("m", 3_000, "Invalid arguments.");
                    socket.talk("m", 4_000, "Spawnpoint set.");
                    global.spawnPoint = {
                        x: parseInt(args[1] * 30),
                        y: parseInt(args[2] * 30),
                    }
                } else if (args[0] == "close") {
                    util.warn(`${socket.player.body.name == "" ? `A unnamed player (ip: ${socket.ip})` : socket.player.body.name} has closed the arena.`);
                    gameManager.closeArena();
                } else socket.talk("m", 4_000, "Unknown subcommand.");
            }
        }
    },
    {
        command: ["developer", "dev"],
        description: "Developer commands, go troll some players or just take a look for yourself.",
        level: 3,
        run: ({ socket, args, gameManager }) => {
            let sendAvailableDevCommandsMessage = () => {
                let lines = [
                    "Help menu:",
                    "- $ (developer / dev) reloaddefs - reloads definitions.",
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            }
            let command = args[0];
            if (command == "reloaddefs" || command == "redefs") {
                /* IMPORT FROM (defsReloadCommand.js) */
                if (!global.reloadDefinitionsInfo) {
                    global.reloadDefinitionsInfo = {
                        lastReloadTime: 1,
                    };
                }
                // Rate limiter for anti-lag
                let time = performance.now();
                let sinceLastReload = time - global.reloadDefinitionsInfo.lastReloadTime;
                if (sinceLastReload < 5000) {
                    socket.talk('m', Config.MESSAGE_DISPLAY_TIME, `Wait ${Math.floor((5000 - sinceLastReload) / 100) / 10} seconds and try again.`);
                    return;
                };
                // Set the timeout timer ---
                lastReloadTime = time;

                // Remove function so all for(let x in arr) loops work
                delete Array.prototype.remove;

                // Before we purge the class, we are going to stop the game interval first
                gameManager.gameHandler.stop();

                // Now we can purge Class
                Class = {};

                // Log it.
                util.warn(`[IMPORTANT] Definitions are going to be reloaded on server ${gameManager.gamemode} (${gameManager.webProperties.id})!`);

                // Purge all cache entries of every file in definitions
                for (let file in require.cache) {
                    if (!file.includes('definitions') || file.includes(__filename)) continue;
                    delete require.cache[file];
                }

                // Load all definitions
                gameManager.reloadDefinitions();

                // Put the removal function back
                Array.prototype.remove = function (index) {
                    if (index === this.length - 1) return this.pop();
                    let r = this[index];
                    this[index] = this.pop();
                    return r;
                };

                // Redefine all tanks and bosses
                for (let entity of entities.values()) {
                    // If it's a valid type and it's not a turret
                    if (!['tank', 'miniboss', 'food'].includes(entity.type)) continue;
                    if (entity.bond) continue;

                    let entityDefs = JSON.parse(JSON.stringify(entity.defs));
                    // Save color to put it back later
                    let entityColor = entity.color.compiled;

                    // Redefine all properties and update values to match
                    entity.upgrades = [];
                    entity.define(entityDefs);
                    for (let instance of entities.values()) {
                        if (
                            instance.settings.clearOnMasterUpgrade &&
                            instance.master.id === entity.id
                        ) {
                            instance.kill();
                        }
                    }
                    entity.skill.update();
                    entity.syncTurrets();
                    entity.refreshBodyAttributes();
                    entity.color.interpret(entityColor);
                }

                // Tell the command sender
                socket.talk('m', Config.MESSAGE_DISPLAY_TIME, "Successfully reloaded all definitions.");


                // Erase mockups so it can rebuild.
                mockupData = [];
                // Load all mockups if enabled in configuration
                if (Config.LOAD_ALL_MOCKUPS) global.loadAllMockups(false);

                setTimeout(() => { // Let it sit for a second.
                    // Erase cached mockups for each connected clients.
                    gameManager.clients.forEach(socket => {
                        socket.status.mockupData = socket.initMockupList();
                        socket.status.selectedLeaderboard2 = socket.status.selectedLeaderboard;
                        socket.status.selectedLeaderboard = "stop";
                        socket.talk("RE"); // Also reset the global.entities in client so it can refresh.
                        if (Config.LOAD_ALL_MOCKUPS) for (let i = 0; i < mockupData.length; i++) {
                            socket.talk("M", mockupData[i].index, JSON.stringify(mockupData[i]));
                        }
                        socket.status.selectedLeaderboard = socket.status.selectedLeaderboard2;
                        delete socket.status.selectedLeaderboard2;
                        socket.talk("CC"); // Clear cache
                    });
                    // Log it again.
                    util.warn(`[IMPORTANT] Definitions are successfully reloaded on server ${gameManager.gamemode} (${gameManager.webProperties.id})!`);
                    gameManager.gameHandler.run();
                }, 1000)
            } else socket.talk("m", 4_000, "Unknown subcommand, here's a help list."), sendAvailableDevCommandsMessage();
        },
    },
]

/** COMMANDS RUN FUNCTION **/
function runCommand(socket, message, gameManager) {
    if (!message.startsWith(prefix) || !socket?.player?.body) return;

    let args = message.slice(prefix.length).split(" ");
    let commandName = args.shift();
    let command = commands.find((command) => command.command.includes(commandName));
    if (command) {
        let permissionsLevel = socket.permissions?.level ?? 0;
        let level = command.level;

        if (permissionsLevel >= level) {
            try {
                command.run({ socket, message, args, level: permissionsLevel, gameManager: gameManager });
            } catch (e) {
                console.error("Error while running ", commandName);
                console.error(e);
            }
        } else socket.talk("m", 5_000, "You do not have access to this command.");
    } else socket.talk("m", 5_000, "Unknown command.");

    return true;
}

/** CHAT MESSAGE EVENT **/
module.exports = ({ Events }) => {
    Events.on("chatMessage", ({ socket, message, preventDefault, gameManager }) => {
        if (message.startsWith(prefix)) {
            preventDefault();
            runCommand(socket, message, gameManager);
        }
    });
};