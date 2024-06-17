"use strict";

import { Heap } from "heap-js";

/**
 * @typedef {Object} CellCoords
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {"Up"|"Right"|"Down"|"Left"} Direction
 */

/**
 * @typedef {"random"|"middle"|"topLeft"|"topRight"|"bottomLeft"|"bottomRight"|"defined"} StartPosition
 */

/**
 * @typedef {Object} StartCell
 * @property {StartPosition} cell - The starting position of the first collapsed cell.
 * @property {CellCoords|undefined} cellCoords - The coordinates of the starting cell, only used if 'defined' is selected.
 * @property {number} tileIndex - The used tile index of the starting cell.
 */

/**
 * @typedef {Object} Options
 * @property {number|undefined} defaultTileWeight - The base weight value, if the property is omitted on the tile. Default is 10.
 * @property {StartCell|undefined} startCell - The starting cell configuration. Default is 'random'.
 * @property {number|undefined} maxRetryCount - The maximum number of retries before the generation is considered failed. Default is 100.
 */

/**
 * @typedef {Object.<string, string[]>} Exceptions
 * @property {string[]|undefined} [left] - Exceptions for the left edge.
 * @property {string[]|undefined} [right] - Exceptions for the right edge.
 * @property {string[]|undefined} [down] - Exceptions for the bottom edge.
 * @property {string[]|undefined} [up] - Exceptions for the top edge.
 */

/**
 * @typedef {Object} TileDefinition
 * @property {[string, string, string, string]} edges - The compatibility edges of the tile. Only matching edges can be placed next to each other. A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left". Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom.
 * @property {string|undefined} type - A custom type given by the user of the tile (e.g., 'floor', 'wall').
 * @property {Exceptions|string[]|undefined} exceptions - The exceptions for the tile.
 * @property {number|undefined} weight - The weight of the tile. Can also be 0, which effectively removes the tile from the generation.
 */

/**
 * @typedef {Object} AlgorithmDefinition
 * @property {Options} options - The options for the definition.
 * @property {TileDefinition[]} tiles - The tiles in the definition.
 */

/**
 * @property {AlgorithmDefinition} definition
 * @property {Tile[]} tiles - The tiles objects derived from their definitions.
 * @property {Cell[][]} grid - The grid of cells.
 */
export class WaveCollapse {
  /**
   * @param {AlgorithmDefinition} definition
   */
  constructor(definition) {
    if (!definition.tiles || definition.tiles.length === 0) {
      throw new Error("No tiles are defined.");
    }
    if (
      definition.tiles.some((tile) => !tile.edges || tile.edges.length !== 4)
    ) {
      throw new Error("All tiles must have exactly 4 edges.");
    }
    if (
      definition.tiles.some((tile) =>
        tile.edges.some((edge) => edge.length === 0)
      )
    ) {
      throw new Error("All edges must have a length of at least 1.");
    }
    if (
      definition.options?.startCell?.cell === "defined" &&
      !definition.options.startCell.cellCoords
    ) {
      throw new Error(
        "The start cell is 'defined', but no coordinates are given."
      );
    }

    this.definition = definition;
    this.definition.options ??= {};
    this.definition.options.defaultTileWeight ??= 10;
    this.definition.options.startCell ??= {
      cell: "random",
      tileIndex: Math.floor(Math.random() * definition.tiles.length),
    };
    this.definition.options.maxRetryCount ??= 100;
    this.tiles = definition.tiles.map(
      (_, index) =>
        new Tile(definition.tiles, index, definition.options.defaultTileWeight)
    );

    this._clear();
  }

  _clear() {
    // Clear the wave collapse data from any previous runs.
    this.grid = [[]];
    this._retryCount = 0;
  }

  /**
   * @param {number} width
   * @param {number} height
   */
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

  //   _saveStep() {
  //     // Save the current state of the generation.
  //     this._savedStates.push(JSON.stringify(this.grid));
  //   }

  //   _rollbackStep() {
  //     // Rollback the last step in the generation.
  //     if (this._savedState.length > 0) {
  //       this.grid = JSON.parse(this._savedState.pop());

  //       this._retryCount++;
  //         if (this._retryCount > this.definition.options.maxRollbackCount) {
  //             throw new Error("Too many rollbacks, probably stuck in a loop.");
  //         }
  //     }
  //   }

  /**
   * @returns {Cell}
   */
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
    this.grid[y][x].updatePossibleTiles(new Set([startCell.tileIndex]));
    return this.grid[y][x];
  }

  /**
   * @param {number} width
   * @param {number} height
   * @returns {number[][]}
   */
  generate(width, height) {
    if (width <= 0 || height <= 0) {
      return [];
    }
    this._clear();

    while (this._retryCount < this.definition.options.maxRetryCount) {
      // Setup all necessary data structures for the algorithm.
      this._initializeGrid(width, height);

      // Pick the starting cell. Since it has its possibilities reduced to one, it will be the first cell to collapse.
      this._pickStartingCell();

      const waveHeap = new Heap((a, b) => a.entropy - b.entropy);
      for (const row of this.grid) {
        for (const cell of row) {
          waveHeap.push(cell);
        }
      }

      // Continue collapsing cells until the grid is filled.
      wave: while (waveHeap.length > 0) {
        // Pick next cell with lowest entropy and collapse it.
        const cell = waveHeap.pop();
        cell.collapse();

        // Heap for all the remaining propagations.
        const propagationHeap = new Heap((a, b) => a.entropy - b.entropy);
        propagationHeap.push(cell);
        while (propagationHeap.length > 0) {
          const nextCell = propagationHeap.pop();
          // Update its neighbors and collect all updated neighbors in the propagation heap.
          if (!this._propagateToNeighbors(nextCell, propagationHeap)) {
            break wave;
          }
        }
      }

      // If the grid is filled, return the result.
      if (waveHeap.length === 0) {
        return this.grid.map((row) => row.map((cell) => cell.tileIndex));
      }
      this._retryCount++;
    }

    return null;
  }

  /**
   * @param {Cell} updatedCell
   * @param {Heap<Cell>} propagationHeap
   * @returns
   */
  _propagateToNeighbors(updatedCell, propagationHeap) {
    // Roll out the direction "loop" and avoid even optimized stuff like generators.
    if (updatedCell.y > 0) {
      const neighbor = this.grid[updatedCell.y - 1][updatedCell.x];
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          "possibleTilesUp",
          propagationHeap
        )
      ) {
        return false;
      }
    }
    if (updatedCell.x < this.grid[0].length - 1) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x + 1];
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          "possibleTilesRight",
          propagationHeap
        )
      ) {
        return false;
      }
    }
    if (updatedCell.y < this.grid.length - 1) {
      const neighbor = this.grid[updatedCell.y + 1][updatedCell.x];
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          "possibleTilesDown",
          propagationHeap
        )
      ) {
        return false;
      }
    }
    if (updatedCell.x > 0) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x - 1];
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          "possibleTilesLeft",
          propagationHeap
        )
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update the neighbor's possible tiles based on the updated cell.
   * @param {Cell} updatedCell
   * @param {Cell} neighbor
   * @param {string} possibleTilesDirection
   * @param {Heap<Cell>} propagationHeap
   * @returns {boolean} - "true" whether the neighbor was successfully updated or "false" if a contradiction was found.
   */
  _propagate(updatedCell, neighbor, possibleTilesDirection, propagationHeap) {
    let directionalPossibleTiles = new Set();
    for (const tileIndex of updatedCell.possibleTiles) {
      directionalPossibleTiles = new Set([
        ...directionalPossibleTiles,
        ...this.tiles[tileIndex][possibleTilesDirection],
      ]);
    }
    const possibleTiles = new Set(
      Array.from(neighbor.possibleTiles).filter((t) =>
        directionalPossibleTiles.has(t)
      )
    );

    if (possibleTiles.size === 0) {
      // Contradiction found
      return false;
    }
    if (possibleTiles.size !== neighbor.possibleTiles.size) {
      propagationHeap.remove(neighbor);
      neighbor.updatePossibleTiles(possibleTiles);
      propagationHeap.push(neighbor);
    }
    return true;
  }
}

/**
 * @typedef {Object} Tile
 * @property {number} index - The index of the tile within the tile definitions.
 * @property {[string, string, string, string]} edges - The compatibility edges of the tile. Only matching edges can be placed next to each other. A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left". Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom.
 * @property {number} weight - The weight of the tile. Can also be 0, which effectively removes the tile from the generation.
 * @property {number} weightLogWeight - The weight of the tile multiplied by the logarithm of the weight.
 * @property {string|undefined} type - A custom type given by the user of the tile (e.g., 'floor', 'wall').
 *
 * @property {Set<number>} possibleTilesUp - The possible tiles (via index) that can be placed above this tile.
 * @property {Set<number>} possibleTilesRight - The possible tiles (via index) that can be placed to the right of this tile.
 * @property {Set<number>} possibleTilesDown - The possible tiles (via index) that can be placed below this tile.
 * @property {Set<number>} possibleTilesLeft - The possible tiles (via index) that can be placed to the left of this tile.
 */
class Tile {
  /**
   * @param {TileDefinition[]} tileDefinition
   * @param {number} tileIndex
   * @param {number} defaultWeight
   */
  constructor(tileDefinitions, tileIndex, defaultWeight = 10) {
    const definition = tileDefinitions[tileIndex];
    this.index = tileIndex;
    this.edges = definition.edges;
    this.exceptions = definition.exceptions;
    this.weight = definition.weight ?? defaultWeight;
    this.weightLogWeight = this.weight
      ? this.weight * Math.log2(this.weight)
      : 0;
    this.type = definition.type;

    function checkExceptions(tile, otherTile) {
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
    }

    this.possibleTilesUp = new Set(
      tileDefinitions
        .map((otherTile, otherIndex) => {
          return this.edges[0] === otherTile.edges[2] &&
            checkExceptions(this, otherTile)
            ? otherIndex
            : null;
        })
        .filter((index) => index !== null)
    );
    this.possibleTilesRight = new Set(
      tileDefinitions
        .map((otherTile, otherIndex) => {
          return this.edges[1] === otherTile.edges[3] &&
            checkExceptions(this, otherTile)
            ? otherIndex
            : null;
        })
        .filter((index) => index !== null)
    );
    this.possibleTilesDown = new Set(
      tileDefinitions
        .map((otherTile, otherIndex) => {
          return this.edges[2] === otherTile.edges[0] &&
            checkExceptions(this, otherTile)
            ? otherIndex
            : null;
        })
        .filter((index) => index !== null)
    );
    this.possibleTilesLeft = new Set(
      tileDefinitions
        .map((otherTile, otherIndex) => {
          return this.edges[3] === otherTile.edges[1] &&
            checkExceptions(this, otherTile)
            ? otherIndex
            : null;
        })
        .filter((index) => index !== null)
    );
  }
}

/**
 * @typedef {Object} Cell
 * @property {number} x
 * @property {number} y
 * @property {Tile[]} availableTiles - The available tiles for the whole generation.
 * @property {Set<number>} possibleTiles - The possible tiles that can be placed in this cell.
 * @property {number|null} tileIndex - The index of the tile that was collapsed to this cell.
 * @property {number} entropy - The Shannon entropy of the cell. See: https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/
 *
 * @property {number} _sumOfWeights
 * @property {number} _sumOfWeightLogWeights
 */
class Cell {
  /**
   * @param {number} x
   * @param {number} y
   * @param {Tile[]} availableTiles
   */
  constructor(x, y, availableTiles) {
    this.x = x;
    this.y = y;
    this.availableTiles = availableTiles;

    this.tileIndex = null;
    this.updatePossibleTiles(new Set(availableTiles.map((_, index) => index)));
  }

  /**
   * @param {Set<number>} possibleTiles
   */
  updatePossibleTiles(possibleTiles) {
    this.possibleTiles = possibleTiles;
    const possibleTilesArray = Array.from(possibleTiles);
    this._sumOfWeights = possibleTilesArray.reduce((sum, tileIndex) => {
      return sum + this.availableTiles[tileIndex].weight;
    }, 0);
    this._sumOfWeightLogWeights = possibleTilesArray.reduce(
      (sum, tileIndex) => {
        return sum + this.availableTiles[tileIndex].weightLogWeight;
      },
      0
    );
    this.entropy = this._sumOfWeights
      ? Math.log2(this._sumOfWeights) -
        this._sumOfWeightLogWeights / this._sumOfWeights
      : 0;
  }

  /**
   * @param {Heap<Cell>} waveHeap
   * @returns
   */
  collapse() {
    if (this.possibleTiles.size === 0) {
      throw new Error("No possible tiles to collapse to.");
    }

    // Selects tile based on weights randomly.
    const possibleTilesArray = Array.from(this.possibleTiles);
    const weights = possibleTilesArray.map(
      (tileIndex) => this.availableTiles[tileIndex].weight
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    let randomWeight = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      randomWeight -= weights[i];
      if (randomWeight <= 0) {
        const chosenTile = possibleTilesArray[i];
        this.tileIndex = chosenTile;
        this.possibleTiles = new Set([chosenTile]);
        this.entropy = 0; // Entropy is zero since the cell is collapsed
        return;
      }
    }

    throw new Error("No tile was chosen.");
  }
}
