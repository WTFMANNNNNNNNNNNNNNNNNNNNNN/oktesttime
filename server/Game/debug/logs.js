/*class logs {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }
    action = (() => {
        // Make a speed monitor
        function set(obj) {
            obj.time = performance.now();
        }

        function mark(obj) {
            obj.data.push(performance.now() - obj.time);
        }

        function record(obj) {
            let o = util.averageArray(obj.data);
            obj.data = [];
            return o;
        }

        function sum(obj) {
            let o = util.sumArray(obj.data);
            obj.data = [];
            return o;
        }

        function tally(obj) {
            obj.count++;
        }

        function count(obj) {
            let o = obj.count;
            obj.count = 0;
            return o;
        }

        let logger = function() {
            let internal = {
                data: [],
                time: util.time(),
                count: 0,
            };
            // Return the new logger
            return {
                set: () => set(internal),
                mark: () => mark(internal),
                record: () => record(internal),
                sum: () => sum(internal),
                count: () => count(internal),
                tally: () => tally(internal),
            };
        };
        return {
            entities: logger(),
            collide: logger(),
            network: logger(),
            minimap: logger(),
            misc2: logger(),
            misc3: logger(),
            physics: logger(),
            life: logger(),
            selfie: logger(),
            master: logger(),
            activation: logger(),
            loops: logger(),
        };
    })();
}

module.exports = { logs };*/

class Logger {
    constructor() {
        this.logTimes = [];
        this.trackingStart = performance.now();
        this.tallyCount = 0;
    }
    set() {
        this.trackingStart = performance.now();
    }
    mark() {
        this.logTimes.push(performance.now() - this.trackingStart);
    }
    record() {
        let average = util.averageArray(this.logTimes);
        this.logTimes = [];
        return average;
    }
    sum() {
        let sum = util.sumArray(this.logTimes);
        this.logTimes = [];
        return sum;
    }
    tally() {
        this.tallyCount++;
    }
    getTallyCount() {
        let tally = this.tallyCount;
        this.tallyCount = 0;
        return tally;
    }
}

let logs = {
    entities: new Logger(),
    update: new Logger(),
    collide: new Logger(),
    network: new Logger(),
    minimap: new Logger(),
    misc2: new Logger(),
    misc3: new Logger(),
    physics: new Logger(),
    life: new Logger(),
    selfie: new Logger(),
    master: new Logger(),
    activation: new Logger(),
    loops: new Logger(),
    gamemodeLoop: new Logger(),
    lagtesting: new Logger(),
};

module.exports = { logs };