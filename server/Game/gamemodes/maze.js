class Maze {
    constructor(gameManager, type) {
        this.gameManager = gameManager;
        this.type = type;
    }
    generate() {
        // Spawn maze
        let mazeGenerator = new global.mazeGenerator.MazeGenerator(this.type);
        let { squares, width, height } = mazeGenerator.placeMinimal();
        for (let instance of entities) {
            if (instance.type == "wall") instance.kill();
        }
        squares.forEach(element => {
            let wall = new Entity({
                x: this.gameManager.room.width / width * element.x - this.gameManager.room.width / 2 + this.gameManager.room.width / width / 2 * element.size, 
                y: this.gameManager.room.height / height * element.y - this.gameManager.room.height / 2 + this.gameManager.room.height / height / 2 * element.size
            }, false, this.gameManager)
            wall.define("wall");
            wall.SIZE = this.gameManager.room.width / width / 2 * element.size / lazyRealSizes[4] * Math.SQRT2 - 2;
            wall.protect();
        });
    }
    redefine(theshit, type) {
        this.gameManager = theshit;
        this.type = type;
    }
}

module.exports = { Maze };