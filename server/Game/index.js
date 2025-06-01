class gameHandler {
    constructor(gameManager) {
        if (!gameManager) {
            console.error(`No game manager detected! Please check your code.`);
            throw new Error("No game manager detected!");
        }
        this.gameManager = gameManager;
        this.loopCounter = 0;
        this.loophealCounter = 0;
        this.bots = [];
        this.foods = [];
        this.nestFoods = [];
        this.enemyFoods = [];
        this.auraCollideTypes = ["miniboss", "tank", "food", "crasher"]
        this.active = false;
    }

    // Collision stuff
    collide = (collide) => {
        const [instance, other] = collide;
    
        // Fast exit for noclip or ghosts
        if (instance.noclip || other.noclip) return 0;
    
        // Emit collision events
        instance.emit('collide', { body: instance, instance, other });
        other.emit('collide', { body: other, instance: other, other: instance });
    
        // Ghost checks (merged for less code repetition)
        for (const obj of [instance, other]) {
            if (obj.isGhost) {
                util.error("GHOST FOUND");
                util.error(obj.label);
                util.error(`x: ${obj.x} y: ${obj.y}`);
                util.error(obj.collisionArray);
                util.error(`health: ${obj.health.amount}`);
                if (grid.checkIfInHSHG(obj)) {
                    obj.kill();
                    util.warn("Ghost removed.");
                    grid.removeObject(obj);
                }
                return 0;
            }
        }
    
        // Fast exit for inactive or invisible entities
        if (
            (!instance.activation.check() && !other.activation.check()) ||
            (instance.isArenaCloser && !instance.alpha) ||
            (other.isArenaCloser && !other.alpha)
        ) return 0;
    
        // Fast exit for wall-vs-wall with never-collide
        if (
            instance.settings.hitsOwnType === "never" &&
            other.settings.hitsOwnType === "never" &&
            instance.team === other.team &&
            instance.type === "wall" && other.type === "wall"
        ) return;
    
        // Advanced collision handling
        if (instance.type === "wall" || other.type === "wall") {
            if (instance.type === "wall" && other.type === "wall") return;
            if (instance.type === "aura" || other.type === "aura") return;
            if (instance.type === "satellite" || other.type === "satellite") return;
            const wall = instance.type === "wall" ? instance : other;
            const entity = instance.type === "wall" ? other : instance;
            if (entity.isArenaCloser || entity.master.isArenaCloser) return;
            if (wall.shape === 4) {
                if (wall.walltype === 1) {
                    mazewallcollide(wall, entity);
                } else {
                    mazewallcustomcollide(wall, entity);
                }
            } else {
                mooncollide(wall, entity);
            }
            return;
        }
    
        // Push-only-team logic
        if (
            instance.team === other.team &&
            (instance.settings.hitsOwnType === "pushOnlyTeam" ||
                other.settings.hitsOwnType === "pushOnlyTeam")
        ) {
            const pusher = instance.settings.hitsOwnType === "pushOnlyTeam" ? instance : other;
            const entity = pusher === instance ? other : instance;
            if (
                instance.settings.hitsOwnType === other.settings.hitsOwnType ||
                entity.settings.hitsOwnType === "never"
            ) return;
            const a = 1 + 10 / (Math.max(entity.velocity.length, pusher.velocity.length) + 10);
            advancedcollide(pusher, entity, false, false, a);
            return;
        }
    
        // Crasher-food team logic
        if (
            (instance.type === "crasher" && other.type === "food" && instance.team === other.team) ||
            (other.type === "crasher" && instance.type === "food" && other.team === instance.team)
        ) {
            firmcollide(instance, other);
            return;
        }
    
        // Team/enemy or healer logic
        if (
            instance.team !== other.team ||
            (instance.team === other.team && (instance.healer || other.healer))
        ) {
            // Aura collision filtering
            if (instance.type === "aura") {
                if (!this.auraCollideTypes.includes(other.type)) return;
            } else if (other.type === "aura") {
                if (!this.auraCollideTypes.includes(instance.type)) return;
            }
            advancedcollide(instance, other, true, true);
            return;
        }
    
        // Standard collision resolution
        if (instance.settings.hitsOwnType === other.settings.hitsOwnType) {
            switch (instance.settings.hitsOwnType) {
                case 'assembler': {
                    if (instance.assemblerLevel == null) instance.assemblerLevel = 1;
                    if (other.assemblerLevel == null) other.assemblerLevel = 1;
                    const [target1, target2] = (instance.id > other.id) ? [instance, other] : [other, instance];
                    if (
                        target2.assemblerLevel >= 10 || target1.assemblerLevel >= 10 ||
                        target1.isDead() || target2.isDead() ||
                        (target1.parent.id !== target2.parent.id &&
                            target1.parent.id != null &&
                            target2.parent.id != null)
                    ) {
                        advancedcollide(instance, other, false, false); // continue push
                        break;
                    }
                    const better = (state) => (target1[state] > target2[state] ? target1[state] : target2[state]);
                    target1.assemblerLevel = Math.min(target2.assemblerLevel + target1.assemblerLevel, 10);
                    target1.SIZE = better('SIZE') * 1.15;
                    target1.SPEED = better('SPEED') * 0.9;
                    target1.HEALTH = better('HEALTH') * 1.2;
                    target1.health.amount = target1.health.max;
                    target1.DAMAGE = better('DAMAGE') * 1.1;
                    target2.kill();
                    target1.refreshBodyAttributes();
                    for (let i = 0; i < 10; ++i) {
                        const o = new Entity(target1, target1, this.gameManager);
                        o.define('assemblerEffect');
                        o.team = target1.team;
                        o.color = target1.color;
                        o.SIZE = target1.SIZE / 1.5;
                        o.velocity = new Vector((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 15);
                        o.refreshBodyAttributes();
                        o.life();
                    }
                }
                // fallthrough
                case "push":
                    advancedcollide(instance, other, false, false);
                    break;
                case "hard":
                    firmcollide(instance, other);
                    break;
                case "hardWithBuffer":
                    firmcollide(instance, other, 30);
                    break;
                case "hardOnlyTanks":
                    if (
                        instance.type === "tank" &&
                        other.type === "tank" &&
                        !instance.isDominator &&
                        !other.isDominator
                    ) {
                        firmcollide(instance, other);
                    }
                    // fallthrough
                case "hardOnlyBosses":
                    if (instance.type === other.type && instance.type === "miniboss")
                        firmcollide(instance, other);
                    // fallthrough
                case "repel":
                    simplecollide(instance, other);
                    break;
            }
        }
    };

    entitiesactivationloop(my) {
        // Update collisions.
        my.collisionArray = []; 
        // Activation
        my.activation.update();
        my.updateAABB(my.activation.check());
        my.emit('tick', { body: my });
    };

    entitiesliveloop(my) {
        // Check for death first - early exit
        if (my.contemplationOfMortality()) {
            my.destroy();
            return;
        }
        
        // Reset collision array once at the beginning
        my.collisionArray = []; 
        
        // Handle physics only if not bonded
        if (my.bond == null) {
            logs.physics.set();
            my.physics();
            logs.physics.mark();
        }
        
        // Handle active entities
        const isActive = my.activation.check();
        if (isActive || my.isPlayer) {
            logs.entities.tally();
            
            // Batch lifecycle operations
            logs.life.set();
            my.life();
            logs.life.mark();
            
            logs.selfie.set();
            my.takeSelfie();
            logs.selfie.mark();
            
            // Apply movement behaviors
            my.friction();
            my.confinementToTheseEarthlyShackles();
        }
        
        // Update activation only once
        my.activation.update();
        my.updateAABB(isActive);
        my.emit('tick', { body: my });
    }
    gameloop() {
        logs.loops.tally();
        logs.master.set();
        logs.activation.set();
        logs.activation.mark();

        // Cache frequently used variables
        const players = this.gameManager.socketManager.players;
        const ents = entities;

        // Do collisions
        logs.collide.set();
        if (ents.length > 1) {
            grid.update();
            const pairs = grid.queryForCollisionPairs();
            for (let i = 0, len = pairs.length; i < len; i++) {
                this.collide(pairs[i]);
            }
        }
        logs.collide.mark();

        // Do entities life
        logs.entities.set();
        for (let e of ents) this.entitiesliveloop(e);
        logs.entities.mark();
        logs.master.mark();

        // Remove dead entities
        purgeEntities();

        // Update lastCycle only once
        this.gameManager.room.lastCycle = util.time();
    };

    foodloop() {
        if (this.gameManager.arenaClosed) return;

        // Helper to pick a type from a weighted set
        const pickFromChanceSet = (set) => {
            while (Array.isArray(set)) {
                set = set[ran.chooseChance(...set.map(e => e[0]))][1];
            }
            return set;
        };

        // Helper to spawn a food entity
        const spawnFoodEntity = (tile, layeredSet) => {
            const o = new Entity(tile, false, this.gameManager);
            const type = pickFromChanceSet(layeredSet);
            o.define(type);
            o.facing = ran.randomAngle();
            o.team = TEAM_ENEMIES;
            o.isFood = true;
            return o;
        };

        if (Math.random() >= 0.1) return; // 1/10 chance to spawn food

        let totalFoods = 1;
        if (Math.random() < 0.2) { // 1/5 chance to spawn a group
            totalFoods = 1 + Math.floor(Math.random() * this.gameManager.gameSettings.FOOD_MAX_GROUP_TOTAL);
        }

        // Helper for cleanup interval
        const setupCleanup = (arr, o) => {
            const loop = setInterval(() => {
                if (o.isDead()) {
                    util.remove(arr, arr.indexOf(o));
                    clearInterval(loop);
                }
            }, 1500);
        };

        // Nest food/enemy spawn
        if (Math.random() < 1 / 3 && this.gameManager.room.spawnable[TEAM_ENEMIES]) {
            // Enemy spawn
            if (Math.random() < 1 / 3 && this.enemyFoods.length < this.gameManager.gameSettings.ENEMY_CAP_NEST) {
                const tile = ran.choose(this.gameManager.room.spawnable[TEAM_ENEMIES]).randomInside();
                const o = spawnFoodEntity(tile, this.gameManager.gameSettings.ENEMY_TYPES_NEST);
                this.enemyFoods.push(o);
                setupCleanup(this.enemyFoods, o);
            }
            // Nest food spawn
            if (this.nestFoods.length < this.gameManager.gameSettings.FOOD_CAP_NEST) {
                const tile = ran.choose(this.gameManager.room.spawnable[TEAM_ENEMIES]).randomInside();
                for (let i = 0; i < totalFoods; i++) {
                    const o = spawnFoodEntity(tile, this.gameManager.gameSettings.FOOD_TYPES_NEST);
                    this.nestFoods.push(o);
                    setupCleanup(this.nestFoods, o);
                }
            }
        } else if (this.foods.length < this.gameManager.gameSettings.FOOD_CAP) {
            // Regular food spawn
            const tile = ran.choose(this.gameManager.room.spawnableDefault).randomInside();
            for (let i = 0; i < totalFoods; i++) {
                const o = spawnFoodEntity(tile, this.gameManager.gameSettings.FOOD_TYPES);
                this.foods.push(o);
                setupCleanup(this.foods, o);
            }
        }
    }

    regenHealthAndShield() {
        for (let instance of entities) {
            if (instance.shield.max) {
                instance.shield.regenerate();
            }
            if (instance.health.amount) {
                instance.health.regenerate(instance.shield.max && instance.shield.max === instance.shield.amount);
            }
        }
    };
    
    maintainloop = () => {   
        // Upgrade bots's skill
        for (let i = 0; i < this.bots.length; i++) {
            let o = this.bots[i];
            if (o.skill.level < Config.LEVEL_CAP && o.skill.level >= this.gameManager.gameSettings.BOT_START_LEVEL) {
                o.skill.score += this.gameManager.gameSettings.BOT_XP;            
            }
        }
    };

    quickMaintainLoop = () => {
        // Auto get score
        for (let i = 0; i < this.bots.length; i++) {
            let o = this.bots[i];
            o.skill.maintain();
            o.skillUp([ "atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi" ][ran.chooseChance(...this.gameManager.gameSettings.BOT_CLASS_UPGRADE_CHANCES)]);
            if (o.leftoverUpgrades && o.upgrade(ran.irandomRange(0, o.upgrades.length))) {
                o.leftoverUpgrades--;
            }
        }
        // Add new bots if arena is open
        if (!this.gameManager.arenaClosed && !global.cannotRespawn && this.bots.length < this.gameManager.gameSettings.BOTS) {
            let team = this.gameManager.gameSettings.MODE === "tdm" || this.gameManager.gameSettings.MODE === "tag" ? getWeakestTeam(this.gameManager) : undefined,
            limit = 20, // give up after 20 attempts and just pick whatever is currently chosen
            loc;
            do {
                loc = getSpawnableArea(team, this.gameManager);
            } while (limit-- && dirtyCheck(loc, 50, this.gameManager))

            this.spawnBots(loc, team);
        }
    }

    spawnBots(loc, team) {
        let botName = this.gameManager.gameSettings.BOT_NAME_PREFIX + ran.chooseBotName();
        let o = new Entity(loc, false, this.gameManager);
        o.define(this.gameManager.gameSettings.SPAWN_CLASS);
        o.define({ CONTROLLERS: ["nearestDifferentMaster"] });
        o.refreshBodyAttributes();
        o.isBot = true;
        o.name = botName;
        o.invuln = true;
        o.leftoverUpgrades = ran.chooseChance(...this.gameManager.gameSettings.BOT_CLASS_UPGRADE_CHANCES);
        let color = this.gameManager.gameSettings.RANDOM_COLORS ? Math.floor(Math.random() * 20) : team ? getTeamColor(team) : "darkGrey";
        o.color.base = color;
        o.skill.reset();
        let leveling = setInterval(() => {
            if (o.skill.level < this.gameManager.gameSettings.BOT_START_LEVEL) {
                o.skill.score += o.skill.levelScore;
                o.skill.maintain();
            } else clearInterval(leveling);
        }, 100)
        o.refreshBodyAttributes();
        if (team) o.team = team;
        this.bots.push(o);
        if (this.gameManager.gameSettings.TAG) c.TAG_DATA.addBot(o), global.nextTagBotTeam = null;
        setTimeout(() => {
            // allow them to move
            // Set it to false to not overwrite bot Class's index
            o.define('bot', true, false);
            o.name = botName;
            o.refreshBodyAttributes();
            o.invuln = false;
            o.on("define", () => {
                o.define({ FACING_TYPE: Class.bot.FACING_TYPE }, false) // Just reoverride the facing type.
            })
        }, 3000 + Math.floor(Math.random() * 7000));
        o.on('dead', () => {
            setTimeout(() => {
                if (global.nextTagBotTeam) {
                    let loc = getSpawnableArea(global.nextTagBotTeam, this.gameManager);
                    this.spawnBots(loc, global.nextTagBotTeam);
                }
            }, 10)
            util.remove(this.bots, this.bots.indexOf(o));
        });
    };

    run() {
        this.active = true;
        let gameLoop = setInterval(() => {
            if (!this.active) return clearInterval(gameLoop);
            if (this.gameManager.clients.length >= 1) { // If there arent clients in the server, then just dont run the run function.
                try {
                    this.gameloop();
                    if (this.gameManager.gameSettings.ENABLE_FOOD) this.foodloop();
                    this.gameManager.roomLoop();
                    this.gameManager.gamemodeManager.request("quickloop");
                } catch (e) {
                    this.gameManager.gameSpeedCheckHandler.onError(e);
                    this.stop();
                };
            }
        }, this.gameManager.room.cycleSpeed);
        let maintainloop = setInterval(() => {
            if (!this.active) return clearInterval(maintainloop);
            this.gameManager.gameSpeedCheckHandler.update();
            this.gameManager.socketManager.chatLoop();
            this.gameManager.gamemodeManager.request("loop");
            this.maintainloop();
        }, 1000);
        let otherloop = setInterval(() => {
            if (!this.active) return clearInterval(otherloop);
            this.quickMaintainLoop();
        }, 200)
        let healingLoop = setInterval(() => {
            if (!this.active) return clearInterval(healingLoop);
            this.regenHealthAndShield();
        }, 100);
    }
    stop() {
        this.active = false;
    }
}

module.exports = { gameHandler };
