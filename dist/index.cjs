"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  WaveCollapse: () => WaveCollapse
});
module.exports = __toCommonJS(src_exports);

// src/wave-collapse.ts
var WaveCollapse = class {
  constructor(definition) {
    this.grid = [[]];
    this._retryCount = 0;
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (!definition.tiles || definition.tiles.length === 0) {
      throw new Error("No tiles are defined.");
    }
    if (definition.tiles.some((tile) => !tile.edges || tile.edges.length !== 4)) {
      throw new Error("All tiles must have exactly 4 edges.");
    }
    if (definition.tiles.some(
      (tile) => tile.edges.some((edge) => edge.length === 0)
    )) {
      throw new Error("All edges must have a length of at least 1.");
    }
    if (((_b = (_a = definition.options) == null ? void 0 : _a.startCell) == null ? void 0 : _b.cell) === "defined" && !definition.options.startCell.cellCoords) {
      throw new Error(
        "The start cell is 'defined', but no coordinates are given."
      );
    }
    this.definition = definition;
    (_d = (_c = this.definition).options) != null ? _d : _c.options = {};
    (_f = (_e = this.definition.options).defaultTileWeight) != null ? _f : _e.defaultTileWeight = 10;
    (_h = (_g = this.definition.options).startCell) != null ? _h : _g.startCell = {
      cell: "random",
      tileIndex: Math.floor(Math.random() * definition.tiles.length)
    };
    (_j = (_i = this.definition.options).maxRetryCount) != null ? _j : _i.maxRetryCount = 100;
    this.tiles = definition.tiles.map(
      (_, index) => new Tile(definition.tiles, index, definition.options.defaultTileWeight)
    );
    this._clear();
  }
  _clear() {
    this.grid = [[]];
    this._retryCount = 0;
  }
  _initializeGrid(width, height) {
    this.grid = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(new Cell(x, y, this.tiles));
      }
      this.grid.push(row);
    }
  }
  _pickStartingCell() {
    const { startCell } = this.definition.options;
    let x, y;
    switch (startCell.cell) {
      case "middle":
        x = Math.floor(this.grid[0].length / 2);
        y = Math.floor(this.grid.length / 2);
        break;
      case "topLeft":
        x = 0;
        y = 0;
        break;
      case "topRight":
        x = this.grid[0].length - 1;
        y = 0;
        break;
      case "bottomLeft":
        x = 0;
        y = this.grid.length - 1;
        break;
      case "bottomRight":
        x = this.grid[0].length - 1;
        y = this.grid.length - 1;
        break;
      case "defined":
        if (!startCell.cellCoords) {
          throw new Error(
            "The start cell is 'defined', but no coordinates are given."
          );
        }
        ({ x, y } = startCell.cellCoords);
        break;
      case "random":
      default:
        x = Math.floor(Math.random() * this.grid[0].length);
        y = Math.floor(Math.random() * this.grid.length);
        break;
    }
    this.grid[y][x].tileIndex = startCell.tileIndex;
    this.grid[y][x].updatePossibleTiles([startCell.tileIndex]);
    return this.grid[y][x];
  }
  generate(width, height) {
    if (width <= 0 || height <= 0) {
      return [];
    }
    this._clear();
    while (this._retryCount < this.definition.options.maxRetryCount) {
      this._initializeGrid(width, height);
      this._pickStartingCell();
      const waveHeap = [];
      for (const row of this.grid) {
        for (const cell of row) {
          waveHeap.push(cell);
        }
      }
      waveHeap.sort(
        (a, b) => a.entropy - b.entropy || a.randomIndex - b.randomIndex
      );
      wave: while (waveHeap.length > 0) {
        const cell = waveHeap.shift();
        cell.collapse();
        const propagationQueue = [];
        propagationQueue.push(cell);
        while (propagationQueue.length > 0) {
          const nextCell = propagationQueue.pop();
          if (!this._propagateToNeighbors(nextCell, waveHeap, propagationQueue)) {
            break wave;
          }
        }
      }
      if (waveHeap.length === 0) {
        return this.grid.map((row) => row.map((cell) => cell.tileIndex));
      }
      this._retryCount++;
    }
    return null;
  }
  _propagateToNeighbors(updatedCell, waveHeap, propagationQueue) {
    if (updatedCell.y > 0) {
      const neighbor = this.grid[updatedCell.y - 1][updatedCell.x];
      if (!this._propagate(
        updatedCell,
        neighbor,
        "possibleTilesUp",
        waveHeap,
        propagationQueue
      )) {
        return false;
      }
    }
    if (updatedCell.x < this.grid[0].length - 1) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x + 1];
      if (!this._propagate(
        updatedCell,
        neighbor,
        "possibleTilesRight",
        waveHeap,
        propagationQueue
      )) {
        return false;
      }
    }
    if (updatedCell.y < this.grid.length - 1) {
      const neighbor = this.grid[updatedCell.y + 1][updatedCell.x];
      if (!this._propagate(
        updatedCell,
        neighbor,
        "possibleTilesDown",
        waveHeap,
        propagationQueue
      )) {
        return false;
      }
    }
    if (updatedCell.x > 0) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x - 1];
      if (!this._propagate(
        updatedCell,
        neighbor,
        "possibleTilesLeft",
        waveHeap,
        propagationQueue
      )) {
        return false;
      }
    }
    return true;
  }
  _propagate(updatedCell, neighbor, possibleTilesDirection, waveHeap, propagationQueue) {
    const possibleTiles = [];
    for (const tileIndex of updatedCell.possibleTiles) {
      for (const possibleTile of this.tiles[tileIndex][possibleTilesDirection]) {
        if (neighbor.possibleTiles.includes(possibleTile) && !possibleTiles.includes(possibleTile)) {
          possibleTiles.push(possibleTile);
        }
      }
    }
    if (possibleTiles.length === 0) {
      return false;
    }
    if (possibleTiles.length !== neighbor.possibleTiles.length) {
      const oldEntropy = neighbor.entropy;
      neighbor.updatePossibleTiles(possibleTiles);
      if (neighbor.entropy !== oldEntropy) {
        const index = waveHeap.indexOf(neighbor);
        waveHeap.splice(index, 1);
        let newIndex = waveHeap.findIndex(
          (other) => neighbor.entropy < other.entropy || neighbor.entropy === other.entropy && neighbor.randomIndex < other.randomIndex
        );
        if (newIndex === -1) {
          newIndex = waveHeap.length;
        }
        waveHeap.splice(newIndex, 0, neighbor);
      }
      if (!propagationQueue.includes(neighbor)) {
        propagationQueue.push(neighbor);
      }
    }
    return true;
  }
};
var Tile = class {
  constructor(tileDefinitions, tileIndex, defaultWeight = 10) {
    var _a;
    const definition = tileDefinitions[tileIndex];
    this.index = tileIndex;
    this.edges = definition.edges;
    this.exceptions = definition.exceptions;
    this.weight = (_a = definition.weight) != null ? _a : defaultWeight;
    this.weightLogWeight = this.weight ? this.weight * Math.log2(this.weight) : 0;
    this.type = definition.type;
    const checkExceptions = (tile, otherTile) => {
      const exceptions = tile.exceptions;
      if (!exceptions) {
        return true;
      }
      if (Array.isArray(exceptions)) {
        return !exceptions.includes(otherTile.type);
      }
      if (exceptions.left && exceptions.left.includes(otherTile.type)) {
        return false;
      }
      if (exceptions.right && exceptions.right.includes(otherTile.type)) {
        return false;
      }
      if (exceptions.up && exceptions.up.includes(otherTile.type)) {
        return false;
      }
      if (exceptions.down && exceptions.down.includes(otherTile.type)) {
        return false;
      }
      return true;
    };
    this.possibleTilesUp = tileDefinitions.map((otherTile, otherIndex) => {
      return this.edges[0] === otherTile.edges[2] && checkExceptions(this, otherTile) ? otherIndex : null;
    }).filter((index) => index !== null);
    this.possibleTilesRight = tileDefinitions.map((otherTile, otherIndex) => {
      return this.edges[1] === otherTile.edges[3] && checkExceptions(this, otherTile) ? otherIndex : null;
    }).filter((index) => index !== null);
    this.possibleTilesDown = tileDefinitions.map((otherTile, otherIndex) => {
      return this.edges[2] === otherTile.edges[0] && checkExceptions(this, otherTile) ? otherIndex : null;
    }).filter((index) => index !== null);
    this.possibleTilesLeft = tileDefinitions.map((otherTile, otherIndex) => {
      return this.edges[3] === otherTile.edges[1] && checkExceptions(this, otherTile) ? otherIndex : null;
    }).filter((index) => index !== null);
  }
};
var Cell = class {
  constructor(x, y, availableTiles) {
    this.possibleTiles = [];
    this.entropy = 0;
    this._sumOfWeights = 0;
    this._sumOfWeightLogWeights = 0;
    this.x = x;
    this.y = y;
    this.randomIndex = Math.floor(Math.random() * 4294967295);
    this.availableTiles = availableTiles;
    this.tileIndex = null;
    this.updatePossibleTiles(availableTiles.map((_, index) => index));
  }
  updatePossibleTiles(possibleTiles) {
    this.possibleTiles = possibleTiles;
    this._sumOfWeights = possibleTiles.reduce((sum, tileIndex) => {
      return sum + this.availableTiles[tileIndex].weight;
    }, 0);
    this._sumOfWeightLogWeights = possibleTiles.reduce((sum, tileIndex) => {
      return sum + this.availableTiles[tileIndex].weightLogWeight;
    }, 0);
    this.entropy = this._sumOfWeights ? Math.log2(this._sumOfWeights) - this._sumOfWeightLogWeights / this._sumOfWeights : 0;
  }
  collapse() {
    if (this.possibleTiles.length === 0) {
      throw new Error("No possible tiles to collapse to.");
    }
    const weights = this.possibleTiles.map(
      (tileIndex) => this.availableTiles[tileIndex].weight
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let randomWeight = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      randomWeight -= weights[i];
      if (randomWeight <= 0) {
        const chosenTile = this.possibleTiles[i];
        this.tileIndex = chosenTile;
        this.possibleTiles = [chosenTile];
        this.entropy = 0;
        return;
      }
    }
    throw new Error("No tile was chosen.");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WaveCollapse
});
//# sourceMappingURL=index.cjs.map