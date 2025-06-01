class Mothership {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.choices = ["mothership"];
        this.defineProperties();
        c.MOTHERSHIP_DATA = {
            getData: () => this.globalMotherships,
        }
    };
    defineProperties() {
        this.motherships = [];
        this.globalMotherships = [];
        this.teamWon = false;
        global.defeatedTeams = [];
    };

    start() {
        this.spawn();
    }

    spawn() {
        let locs = [{
            x: this.gameManager.room.width * 0.1 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.1 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.9 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.9 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.9 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.1 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.1 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.9 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.9 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.5 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.1 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.5 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.5 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.9 - this.gameManager.room.height / 2,
        }, {
            x: this.gameManager.room.width * 0.5 - this.gameManager.room.width / 2,
            y: this.gameManager.room.height * 0.1 - this.gameManager.room.height / 2,
        }].sort(() => 0.5 - Math.random());
        for (let i = 0; i < this.gameManager.gameSettings.TEAMS; i++) {
            let o = new Entity(locs[i], false, this.gameManager),
                team = -i - 1;
            o.define(ran.choose(this.choices));
            o.define({ ACCEPTS_SCORE: false, VALUE: 643890 });
            o.color.base = getTeamColor(team);
            o.team = team;
            o.name = "Mothership";
            o.isMothership = true;
            o.controllers.push(new ioTypes.nearestDifferentMaster(o, {}, this.gameManager), new ioTypes.mapTargetToGoal(o));
            o.refreshBodyAttributes();
            this.motherships.push([o.id, team]);
            this.globalMotherships.push(o);
            o.on("dead", () => {
                this.death(o, team);
            })
        }
    };

    death(entity, team) {
        this.gameManager.socketManager.broadcast(getTeamName(team) + "'s mothership has been killed!");
        if (this.gameManager.arenaClosed) return;
        global.defeatedTeams.push(team);
        let newTeam = getWeakestTeam(this.gameManager);
        for (let e of entities) {
            if (e.team == team && e.isPlayer) {
                e.sendMessage("Your team has been eliminated.");
                e.socket.rememberedTeam = newTeam;
            }
            if (e.team == team) {
                e.godmode = false;
                e.kill();
            }
        }
    };

    winner(teamId) {
        this.gameManager.socketManager.broadcast(getTeamName(teamId) + " has won the game!");
        setTimeout(() => { this.gameManager.closeArena() }, 3000);
    };

    loop() {
        if (this.teamWon) return;
        let aliveNow = this.motherships.map(entry => [...entry, entities.find(entity => entity.id === entry[0])]);
        aliveNow = aliveNow.filter(entry => {
            if (!entry[2] || entry[2].isDead()) return false;
            return true;
        });
        if (aliveNow.length === 1) {
            this.teamWon = true;
            setTimeout(() => {this.winner(aliveNow[0][1])}, 2500);
        }
        this.motherships = aliveNow;
    };

    reset() {
        this.defineProperties();
    };

    redefine(theshit) {
        this.gameManager = theshit;
    };
}

module.exports = { Mothership };