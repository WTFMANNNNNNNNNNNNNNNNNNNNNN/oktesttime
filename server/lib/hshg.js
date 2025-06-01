// Hierarchical Spatial Hash Grid: HSHG (Optimized & Modernized by LA3T)

(function (root) {
    // Utility: Clamp a value between min and max
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // Utility: Fast AABB overlap test
    function testAABBOverlap(objA, objB) {
        const a = objA.getAABB(), b = objB.getAABB();
        return !(a.min[0] > b.max[0] || a.max[0] < b.min[0] ||
                 a.min[1] > b.max[1] || a.max[1] < b.min[1]);
    }

    // Utility: Get the longest edge of an AABB
    function getLongestAABBEdge(min, max) {
        return Math.max(Math.abs(max[0] - min[0]), Math.abs(max[1] - min[1]));
    }

    // HSHG Constructor
    function HSHG() {
        this.MAX_OBJECT_CELL_DENSITY = 1 / 8;
        this.INITIAL_GRID_LENGTH = 256;
        this.HIERARCHY_FACTOR = 2;
        this.HIERARCHY_FACTOR_SQRT = Math.SQRT2;
        this.UPDATE_METHOD = update_RECOMPUTE;
        this._grids = [];
        this._globalObjects = [];
    }

    // Update: Only move objects if their hash changes
    function update_RECOMPUTE() {
        for (let i = 0; i < this._globalObjects.length; i++) {
            const obj = this._globalObjects[i];
            const meta = obj.HSHG;
            const grid = meta.grid;
            const objAABB = obj.getAABB();
            const newObjHash = grid.toHash(objAABB.min[0], objAABB.min[1]);
            if (newObjHash !== meta.hash) {
                grid.removeObject(obj);
                grid.addObject(obj, newObjHash);
            }
        }
    }

    // Add object to the best grid, or create a new grid if needed
    HSHG.prototype.addObject = function (obj) {
        const objAABB = obj.getAABB();
        const objSize = getLongestAABBEdge(objAABB.min, objAABB.max);
        obj.HSHG = { globalObjectsIndex: this._globalObjects.length };
        this._globalObjects.push(obj);

        let grid, cellSize, i;
        if (this._grids.length === 0) {
            cellSize = objSize * this.HIERARCHY_FACTOR_SQRT;
            grid = new Grid(cellSize, this.INITIAL_GRID_LENGTH, this);
            grid.initCells();
            grid.addObject(obj);
            this._grids.push(grid);
            return;
        }

        for (i = 0; i < this._grids.length; i++) {
            grid = this._grids[i];
            if (objSize < grid.cellSize) {
                let x = grid.cellSize / this.HIERARCHY_FACTOR;
                if (objSize < x) {
                    while (objSize < x) x /= this.HIERARCHY_FACTOR;
                    const newGrid = new Grid(x * this.HIERARCHY_FACTOR, this.INITIAL_GRID_LENGTH, this);
                    newGrid.initCells();
                    newGrid.addObject(obj);
                    this._grids.splice(i, 0, newGrid);
                } else {
                    grid.addObject(obj);
                }
                return;
            }
        }

        let x = this._grids[this._grids.length - 1].cellSize;
        while (objSize >= x) x *= this.HIERARCHY_FACTOR;
        const newGrid = new Grid(x, this.INITIAL_GRID_LENGTH, this);
        newGrid.initCells();
        newGrid.addObject(obj);
        this._grids.push(newGrid);
    };

    // Remove object from grid and global list
    HSHG.prototype.removeObject = function (obj) {
        const meta = obj.HSHG;
        if (!meta) throw Error(obj + ' was not in the HSHG.');
        const idx = meta.globalObjectsIndex;
        const last = this._globalObjects.length - 1;
        if (idx !== last) {
            const replacement = this._globalObjects[last];
            replacement.HSHG.globalObjectsIndex = idx;
            this._globalObjects[idx] = replacement;
        }
        this._globalObjects.pop();
        meta.grid.removeObject(obj);
        delete obj.HSHG;
    };

    // Update all objects' positions
    HSHG.prototype.update = function () {
        this.UPDATE_METHOD.call(this);
    };

    // Query for all collision pairs
    HSHG.prototype.queryForCollisionPairs = function (broadOverlapTestCallback) {
        const broadOverlapTest = broadOverlapTestCallback || testAABBOverlap;
        const possibleCollisions = [];
        for (let i = 0; i < this._grids.length; i++) {
            const grid = this._grids[i];
            for (let j = 0; j < grid.occupiedCells.length; j++) {
                const cell = grid.occupiedCells[j];
                // Intra-cell
                for (let k = 0; k < cell.objectContainer.length; k++) {
                    const objA = cell.objectContainer[k];
                    for (let l = k + 1; l < cell.objectContainer.length; l++) {
                        const objB = cell.objectContainer[l];
                        if (broadOverlapTest(objA, objB)) possibleCollisions.push([objA, objB]);
                    }
                }
                // Adjacent cells (first 4 neighbors)
                for (let c = 0; c < 4; c++) {
                    const offset = cell.neighborOffsetArray[c];
                    const adjacentCell = grid.allCells[cell.allCellsIndex + offset];
                    for (let k = 0; k < cell.objectContainer.length; k++) {
                        const objA = cell.objectContainer[k];
                        for (let l = 0; l < adjacentCell.objectContainer.length; l++) {
                            const objB = adjacentCell.objectContainer[l];
                            if (broadOverlapTest(objA, objB)) possibleCollisions.push([objA, objB]);
                        }
                    }
                }
            }
            // Cross-grid
            for (let j = 0; j < grid.allObjects.length; j++) {
                const objA = grid.allObjects[j];
                const objAAABB = objA.getAABB();
                for (let k = i + 1; k < this._grids.length; k++) {
                    const biggerGrid = this._grids[k];
                    const objAHashInBiggerGrid = biggerGrid.toHash(objAAABB.min[0], objAAABB.min[1]);
                    const cell = biggerGrid.allCells[objAHashInBiggerGrid];
                    for (let c = 0; c < cell.neighborOffsetArray.length; c++) {
                        const offset = cell.neighborOffsetArray[c];
                        const adjacentCell = biggerGrid.allCells[cell.allCellsIndex + offset];
                        for (let l = 0; l < adjacentCell.objectContainer.length; l++) {
                            const objB = adjacentCell.objectContainer[l];
                            if (broadOverlapTest(objA, objB)) possibleCollisions.push([objA, objB]);
                        }
                    }
                }
            }
        }
        return possibleCollisions;
    };

    // Grid class
    function Grid(cellSize, cellCount, parentHierarchy) {
        this.cellSize = cellSize;
        this.inverseCellSize = 1 / cellSize;
        this.rowColumnCount = Math.floor(Math.sqrt(cellCount));
        this.xyHashMask = this.rowColumnCount - 1;
        this.occupiedCells = [];
        this.allCells = Array(this.rowColumnCount * this.rowColumnCount);
        this.allObjects = [];
        this.sharedInnerOffsets = [];
        this._parentHierarchy = parentHierarchy || null;
    }

    // Initialize grid cells and neighbor offsets
    Grid.prototype.initCells = function () {
        const wh = this.rowColumnCount;
        const gridLength = this.allCells.length;
        const innerOffsets = [
            wh - 1, wh, wh + 1,
            -1, 0, 1,
            -1 - wh, -wh, -wh + 1
        ];
        this.sharedInnerOffsets = innerOffsets;
        for (let i = 0; i < gridLength; i++) {
            const cell = new Cell();
            const y = Math.floor(i / wh), x = i % wh;
            const isOnRightEdge = (x + 1) % wh === 0;
            const isOnLeftEdge = x % wh === 0;
            const isOnTopEdge = (y + 1) % wh === 0;
            const isOnBottomEdge = y % wh === 0;
            if (isOnRightEdge || isOnLeftEdge || isOnTopEdge || isOnBottomEdge) {
                const rightOffset = isOnRightEdge ? -wh + 1 : 1;
                const leftOffset = isOnLeftEdge ? wh - 1 : -1;
                const topOffset = isOnTopEdge ? -gridLength + wh : wh;
                const bottomOffset = isOnBottomEdge ? gridLength - wh : -wh;
                cell.neighborOffsetArray = [
                    leftOffset + topOffset, topOffset, rightOffset + topOffset,
                    leftOffset, 0, rightOffset,
                    leftOffset + bottomOffset, bottomOffset, rightOffset + bottomOffset
                ];
            } else {
                cell.neighborOffsetArray = this.sharedInnerOffsets;
            }
            cell.allCellsIndex = i;
            this.allCells[i] = cell;
        }
    };

    // Hash function for coordinates
    Grid.prototype.toHash = function (x, y) {
        let i, xHash, yHash;
        if (x < 0) {
            i = (-x) * this.inverseCellSize;
            xHash = this.rowColumnCount - 1 - (~~i & this.xyHashMask);
        } else {
            i = x * this.inverseCellSize;
            xHash = ~~i & this.xyHashMask;
        }
        if (y < 0) {
            i = (-y) * this.inverseCellSize;
            yHash = this.rowColumnCount - 1 - (~~i & this.xyHashMask);
        } else {
            i = y * this.inverseCellSize;
            yHash = ~~i & this.xyHashMask;
        }
        return xHash + yHash * this.rowColumnCount;
    };

    // Add object to grid
    Grid.prototype.addObject = function (obj, hash) {
        let objHash = hash;
        if (objHash === undefined) {
            const objAABB = obj.getAABB();
            objHash = this.toHash(objAABB.min[0], objAABB.min[1]);
        }
        const targetCell = this.allCells[objHash];
        if (targetCell.objectContainer.length === 0) {
            targetCell.occupiedCellsIndex = this.occupiedCells.length;
            this.occupiedCells.push(targetCell);
        }
        obj.HSHG.objectContainerIndex = targetCell.objectContainer.length;
        obj.HSHG.hash = objHash;
        obj.HSHG.grid = this;
        obj.HSHG.allGridObjectsIndex = this.allObjects.length;
        targetCell.objectContainer.push(obj);
        this.allObjects.push(obj);
        if (this.allObjects.length / this.allCells.length > this._parentHierarchy.MAX_OBJECT_CELL_DENSITY) {
            this.expandGrid();
        }
    };

    // Remove object from grid
    Grid.prototype.removeObject = function (obj) {
        const meta = obj.HSHG;
        const hash = meta.hash;
        const containerIndex = meta.objectContainerIndex;
        const allGridObjectsIndex = meta.allGridObjectsIndex;
        const cell = this.allCells[hash];
        // Remove from cell
        if (cell.objectContainer.length === 1) {
            cell.objectContainer.length = 0;
            if (cell.occupiedCellsIndex === this.occupiedCells.length - 1) {
                this.occupiedCells.pop();
            } else {
                const replacementCell = this.occupiedCells.pop();
                replacementCell.occupiedCellsIndex = cell.occupiedCellsIndex;
                this.occupiedCells[cell.occupiedCellsIndex] = replacementCell;
            }
            cell.occupiedCellsIndex = null;
        } else {
            if (containerIndex === cell.objectContainer.length - 1) {
                cell.objectContainer.pop();
            } else {
                const replacementObj = cell.objectContainer.pop();
                replacementObj.HSHG.objectContainerIndex = containerIndex;
                cell.objectContainer[containerIndex] = replacementObj;
            }
        }
        // Remove from grid-global object list
        if (allGridObjectsIndex === this.allObjects.length - 1) {
            this.allObjects.pop();
        } else {
            const replacementObj = this.allObjects.pop();
            replacementObj.HSHG.allGridObjectsIndex = allGridObjectsIndex;
            this.allObjects[allGridObjectsIndex] = replacementObj;
        }
    };

    // Expand grid size and rehash all objects
    Grid.prototype.expandGrid = function () {
        const allObjects = this.allObjects.slice();
        for (let i = 0; i < allObjects.length; i++) {
            this.removeObject(allObjects[i]);
        }
        this.rowColumnCount = Math.floor(Math.sqrt(this.allCells.length * 4));
        this.allCells = Array(this.rowColumnCount * this.rowColumnCount);
        this.xyHashMask = this.rowColumnCount - 1;
        this.initCells();
        for (let i = 0; i < allObjects.length; i++) {
            this.addObject(allObjects[i]);
        }
    };

    // Cell class
    function Cell() {
        this.objectContainer = [];
        this.neighborOffsetArray = null;
        this.occupiedCellsIndex = null;
        this.allCellsIndex = null;
    }

    // Exports
    root.HSHG = HSHG;
    HSHG._private = {
        Grid,
        Cell,
        testAABBOverlap,
        getLongestAABBEdge
    };
})(this);
