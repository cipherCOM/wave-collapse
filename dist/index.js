// src/prio-list.ts
var PrioList = class {
  constructor(prioAccess) {
    this.prioAccess = prioAccess;
  }
  head;
  prios = [];
  prioLookup = /* @__PURE__ */ new Map();
  push(item) {
    const node = new ListNode(item);
    item.listNode = node;
    this.insertNodeInPrios(node);
    if (!this.head || this.head.prev == node) {
      this.head = node;
    }
  }
  pop() {
    if (!this.head) {
      return void 0;
    }
    const node = this.head;
    this.removeNodeFromPrios(node, this.prioAccess(node.value));
    this.head = node.next;
    node.value.listNode = void 0;
    return node.value;
  }
  refresh(item, oldPriority) {
    if (!item.listNode) {
      throw new Error("Item is not in the list");
    }
    if (this.prioAccess(item) == oldPriority) {
      return;
    }
    this.removeNodeFromPrios(item.listNode, oldPriority);
    if (this.head == item.listNode) {
      this.head = item.listNode.next;
    }
    this.insertNodeInPrios(item.listNode);
    if (!this.head || this.head.prev == item.listNode) {
      this.head = item.listNode;
    }
  }
  isEmpty() {
    return !this.head;
  }
  insertNodeInPrios(node) {
    const prio = this.prioAccess(node.value);
    let other;
    if (other = this.prioLookup.get(prio)) {
      if (other.next) other.next.prev = node;
      node.next = other.next;
      node.prev = other;
      other.next = node;
      this.prioLookup.set(prio, node);
      return;
    }
    let foundIdx;
    for (let [idx, other2] of this.prios.entries()) {
      if (other2 > prio) {
        foundIdx = idx;
        break;
      }
    }
    if (foundIdx === void 0) {
      const last = this.prioLookup.get(this.prios[this.prios.length - 1]);
      if (last) {
        last.next = node;
        node.prev = last;
      }
      this.prios.push(prio);
      this.prioLookup.set(prio, node);
      return;
    }
    other = this.prioLookup.get(this.prios[foundIdx]);
    if (other.prev) other.prev.next = node;
    node.prev = other.prev;
    node.next = other;
    other.prev = node;
    this.prios.splice(foundIdx, 0, prio);
    this.prioLookup.set(prio, node);
  }
  removeNodeFromPrios(node, prio) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node !== this.prioLookup.get(prio)) {
      return;
    }
    if (!node.prev || this.prioAccess(node.prev.value) != prio) {
      this.prioLookup.delete(prio);
      this.prios.splice(this.prios.indexOf(prio), 1);
      return;
    }
    this.prioLookup.set(prio, node.prev);
  }
};
var ListNode = class {
  constructor(value, prev = void 0, next = void 0) {
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
};

// src/wave-collapse.ts
var WaveCollapse = class {
  definition;
  /** The tiles objects derived from their definitions. */
  tiles;
  /** The grid of cells. */
  grid = [[]];
  _retryCount = 0;
  constructor(definition) {
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
    if (definition.options?.startCell?.cell === "defined" && !definition.options.startCell.cellCoords) {
      throw new Error(
        "The start cell is 'defined', but no coordinates are given."
      );
    }
    this.definition = { options: {}, ...definition };
    this.definition.options.defaultTileWeight ??= 10;
    this.definition.options.startCell ??= {
      cell: "random",
      tileIndex: Math.floor(Math.random() * definition.tiles.length)
    };
    this.definition.options.maxRetryCount ??= 100;
    this.tiles = definition.tiles.map(
      (_, index) => new Tile(
        definition.tiles,
        index,
        this.definition.options.defaultTileWeight
      )
    );
  }
  _clear() {
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        this.grid[y][x].clear();
      }
    }
  }
  _initializeGrid(width, height) {
    this.grid = new Array(height);
    for (let y = 0; y < height; y++) {
      const row = new Array(width);
      for (let x = 0; x < width; x++) {
        row[x] = new Cell(x, y, this.tiles);
      }
      this.grid[y] = row;
    }
  }
  _pickStartingCell() {
    const { startCell } = this.definition.options;
    if (!startCell) {
      throw new Error("No start cell is defined.");
    }
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
        ;
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
    this._initializeGrid(width, height);
    this._retryCount = 0;
    while (this._retryCount < this.definition.options.maxRetryCount) {
      this._pickStartingCell();
      const waveHeap = new PrioList(
        (a) => a.entropy
        // (a, b) => a.entropy - b.entropy || a.randomIndex - b.randomIndex,
      );
      for (const row of this.grid) {
        for (const cell of row) {
          waveHeap.push(cell);
        }
      }
      wave: while (!waveHeap.isEmpty()) {
        const cell = waveHeap.pop();
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
      if (waveHeap.isEmpty()) {
        return this.grid.map((row) => row.map((cell) => cell.tileIndex));
      }
      this._retryCount++;
      this._clear();
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
  /**
   * Update the neighbor's possible tiles based on the updated cell.
   *
   * If any of the neighbor's possible tiles are updated, they will be added to the propagation queue.
   *
   * @returns `true` whether the neighbor was successfully updated or `false` if a contradiction was found.
   */
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
      waveHeap.refresh(neighbor, oldEntropy);
      propagationQueue.push(neighbor);
    }
    return true;
  }
};
var Tile = class {
  /** The index of the tile within the tile definitions. */
  index;
  /** The compatibility edges of the tile. Only matching edges can be placed next to each other.
   *
   * A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left".
   *
   * Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom. */
  edges;
  /** The exceptions for the tile. If the tile has a type, the exceptions can be defined by the type. */
  exceptions;
  /** A custom type given by the user of the tile (e.g., 'floor', 'wall'). This is used to define exceptions for the tile. */
  type;
  /** The weight of the tile. Can also be 0, which effectively removes the tile from the generation. */
  weight;
  /** The weight of the tile multiplied by the logarithm of the weight. */
  weightLogWeight;
  /** The possible tiles (via index) that can be placed above this tile. */
  possibleTilesUp;
  /** The possible tiles (via index) that can be placed to the right of this tile. */
  possibleTilesRight;
  /** The possible tiles (via index) that can be placed below this tile. */
  possibleTilesDown;
  /** The possible tiles (via index) that can be placed to the left of this tile. */
  possibleTilesLeft;
  constructor(tileDefinitions, tileIndex, defaultWeight = 10) {
    const definition = tileDefinitions[tileIndex];
    this.index = tileIndex;
    this.edges = definition.edges;
    this.exceptions = definition.exceptions;
    this.weight = definition.weight ?? defaultWeight;
    this.weightLogWeight = this.weight ? this.weight * Math.log2(this.weight) : 0;
    this.type = definition.type;
    const checkExceptions = (tile, otherTile) => {
      const exceptions = tile.exceptions;
      if (!exceptions || !otherTile.type) {
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
  x;
  y;
  randomIndex;
  /** The available tiles for the whole generation. */
  availableTiles;
  /** The possible tiles that can be placed in this cell. */
  possibleTiles = [];
  /** The index of the tile that was collapsed to this cell. */
  tileIndex = null;
  /** The Shannon entropy of the cell. See: https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/ */
  entropy = 0;
  listNode;
  _sumOfWeights = 0;
  _sumOfWeightLogWeights = 0;
  constructor(x, y, availableTiles) {
    this.x = x;
    this.y = y;
    this.randomIndex = Math.floor(Math.random() * 4294967295);
    this.availableTiles = availableTiles;
    this.clear();
  }
  clear() {
    this.tileIndex = null;
    this.updatePossibleTiles(this.availableTiles.map((_, index) => index));
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
export {
  WaveCollapse
};
//# sourceMappingURL=index.js.map