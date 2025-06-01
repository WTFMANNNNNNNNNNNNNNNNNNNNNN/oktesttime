const skcnv = {
    rld: 0,
    pen: 1,
    str: 2,
    dam: 3,
    spd: 4,
    shi: 5,
    atk: 6,
    hlt: 7,
    rgn: 8,
    mob: 9,
};

let curvePoints = [];

let curve = (x) => {
    let index = x * c.MAX_SKILL;
    if (!curvePoints[index])
        curvePoints[index] = Math.log(4 * (index / c.MAX_SKILL) + 1) / 1.6;
    return curvePoints[index];
};
function apply(f, x) {
    return x < 0 ? 1 / (1 - x * f) : f * x + 1;
}

class Skill {
    constructor(inital = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
        // Just skill stuff.
        this.raw = inital;
        this.caps = [];
        this.setCaps([ c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL ]);
        this.name = [
            "Reload",
            "Bullet Penetration",
            "Bullet Health",
            "Bullet Damage",
            "Bullet Speed",
            "Shield Capacity",
            "Body Damage",
            "Max Health",
            "Shield Regeneration",
            "Movement Speed",
        ];
        this.atk = 0;
        this.hlt = 0;
        this.spd = 0;
        this.str = 0;
        this.pen = 0;
        this.dam = 0;
        this.rld = 0;
        this.mob = 0;
        this.rgn = 0;
        this.shi = 0;
        this.rst = 0;
        this.brst = 0;
        this.ghost = 0;
        this.acl = 0;
        this.reset();
    }
    reset() {
        this.points = 0;
        this.score = 0;
        this.deduction = 0;
        this.level = 0;
        this.canUpgrade = false;
        this.LSPF = null;
        this.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        this.maintain();
    }
    update() {
        for (let i = 0; i < 10; i++) {
            if (this.raw[i] > this.caps[i]) {
                this.points += this.raw[i] - this.caps[i];
                this.raw[i] = this.caps[i];
            }
        }
        let attrib = [];
        for (let i = 0; i < 10; i++) {
            attrib[i] = curve(this.raw[i] / c.MAX_SKILL);
        }
        this.rld = Math.pow(0.5, attrib[skcnv.rld]);
        this.pen = apply(2.5, attrib[skcnv.pen]);
        this.str = apply(2, attrib[skcnv.str]);
        this.dam = apply(3, attrib[skcnv.dam]);
        this.spd = 0.5 + apply(1.5, attrib[skcnv.spd]);
        this.acl = apply(0.5, attrib[skcnv.rld]);
        this.rst = 0.5 * attrib[skcnv.str] + 2.5 * attrib[skcnv.pen];
        this.ghost = attrib[skcnv.pen];
        this.shi = c.GLASS_HEALTH_FACTOR * apply(3 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.shi]);
        this.atk = apply(0.021, attrib[skcnv.atk]);
        this.hlt = c.GLASS_HEALTH_FACTOR * apply(2 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.hlt]);
        this.mob = apply(0.8, attrib[skcnv.mob]);
        this.rgn = apply(25, attrib[skcnv.rgn]);
        this.brst = 0.3 * (0.5 * attrib[skcnv.atk] + 0.5 * attrib[skcnv.hlt] + attrib[skcnv.rgn]);
    }
    set(thing) {
        this.raw[0] = thing[0];
        this.raw[1] = thing[1];
        this.raw[2] = thing[2];
        this.raw[3] = thing[3];
        this.raw[4] = thing[4];
        this.raw[5] = thing[5];
        this.raw[6] = thing[6];
        this.raw[7] = thing[7];
        this.raw[8] = thing[8];
        this.raw[9] = thing[9];
        this.update();
    }
    setCaps(thing) {
        this.caps[0] = thing[0];
        this.caps[1] = thing[1];
        this.caps[2] = thing[2];
        this.caps[3] = thing[3];
        this.caps[4] = thing[4];
        this.caps[5] = thing[5];
        this.caps[6] = thing[6];
        this.caps[7] = thing[7];
        this.caps[8] = thing[8];
        this.caps[9] = thing[9];
        this.update();
    }
    maintain() {
        if (this.score - this.deduction >= this.levelScore) {
            this.deduction += this.levelScore;
            this.level += 1;
            this.points += this.levelPoints;
            if (this.level < c.LEVEL_CAP) {
                if (this.level % c.TIER_MULTIPLIER && this.level <= c.MAX_UPGRADE_TIER * c.TIER_MULTIPLIER) {
                    this.canUpgrade = true;
                }
                this.update();
                return true;
            }
        }
        return false;
    }
    get levelScore() {
        let sscore = 1.74 * Math.pow(this.level + 1, 1.79503264) - 0.53 * this.level
        return Math.floor(sscore);
    }
    get progress() {
        return this.levelScore ? (this.score - this.deduction) / this.levelScore : 0;
    }
    get levelPoints() {
        return this.LSPF ? this.LSPF(this.level) : c.LEVEL_SKILL_POINT_FUNCTION(this.level);
    }
    cap(skill, real = false) {
        if (!real && this.level < c.LEVEL_SOFT_CAP) {
            return Math.round(this.caps[skcnv[skill]] * c.SOFT_MAX_SKILL);
        }
        return this.caps[skcnv[skill]];
    }
    upgrade(stat) {
        if (this.points && this.amount(stat) < this.cap(stat)) {
            this.change(stat, 1);
            this.points -= 1;
            return true;
        }
        return false;
    }
    title(stat) {
        return this.name[skcnv[stat]];
    }
    amount(skill) {
        return this.raw[skcnv[skill]];
    }
    change(skill, levels) {
        this.raw[skcnv[skill]] += levels;
        this.update();
    }
}

module.exports = { Skill };