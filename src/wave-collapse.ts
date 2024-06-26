import { ListNode, PrioList } from './prio-list'

type CellCoords = {
  x: number
  y: number
}

type Direction = 'Up' | 'Right' | 'Down' | 'Left'

type StartPosition =
  | 'random'
  | 'middle'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'defined'

type StartCell = {
  /** The starting position of the first collapsed cell. */
  cell: StartPosition
  /** The coordinates of the starting cell, only used if 'defined' is selected. */
  cellCoords?: CellCoords
  /** The used tile index of the starting cell. */
  tileIndex: number
}

type Options = {
  /** The base weight value, if the property is omitted on the tile. Default is 10. */
  defaultTileWeight?: number
  /** The starting cell configuration. Default is 'random'. */
  startCell?: StartCell
  /** The maximum number of retries before the generation is considered failed. Default is 100. */
  maxRetryCount?: number
}

type Exceptions = {
  /** Exceptions for the left edge. */
  left?: string[]
  /** Exceptions for the right edge. */
  right?: string[]
  /** Exceptions for the bottom edge. */
  down?: string[]
  /** Exceptions for the top edge. */
  up?: string[]
}

type TileDefinition = {
  /**
   * The compatibility edges of the tile. Only matching edges can be placed next to each other.
   *
   * A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left".
   *
   * Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom. */
  edges: [string, string, string, string]
  /** A custom type given by the user of the tile (e.g., 'floor', 'wall'). This is used to define exceptions for the tile. */
  type?: string
  /** The exceptions for the tile. If the tile has a type, the exceptions can be defined by the type. */
  exceptions?: Exceptions | string[]
  /** The weight of the tile. Can also be 0, which effectively removes the tile from the generation. */
  weight?: number
}

type AlgorithmDefinition = {
  options?: Options
  tiles: TileDefinition[]
}

export class WaveCollapse {
  private definition: AlgorithmDefinition & { options: Options }
  /** The tiles objects derived from their definitions. */
  private tiles: Tile[]
  /** The grid of cells. */
  private grid: Cell[][] = [[]]
  private _retryCount: number = 0

  constructor(definition: AlgorithmDefinition) {
    if (!definition.tiles || definition.tiles.length === 0) {
      throw new Error('No tiles are defined.')
    }
    if (
      definition.tiles.some((tile) => !tile.edges || tile.edges.length !== 4)
    ) {
      throw new Error('All tiles must have exactly 4 edges.')
    }
    if (
      definition.tiles.some((tile) =>
        tile.edges.some((edge) => edge.length === 0),
      )
    ) {
      throw new Error('All edges must have a length of at least 1.')
    }
    if (
      definition.options?.startCell?.cell === 'defined' &&
      !definition.options.startCell.cellCoords
    ) {
      throw new Error(
        "The start cell is 'defined', but no coordinates are given.",
      )
    }

    this.definition = { options: {}, ...definition }
    this.definition.options.defaultTileWeight ??= 10
    this.definition.options.startCell ??= {
      cell: 'random',
      tileIndex: Math.floor(Math.random() * definition.tiles.length),
    }
    this.definition.options.maxRetryCount ??= 100
    this.tiles = definition.tiles.map(
      (_, index) =>
        new Tile(
          definition.tiles,
          index,
          this.definition.options.defaultTileWeight!,
        ),
    )

    this._clear()
  }

  private _clear(): void {
    // Clear the wave collapse data from any previous runs.
    this.grid = [[]]
    this._retryCount = 0
  }

  private _initializeGrid(width: number, height: number): void {
    this.grid = []
    for (let y = 0; y < height; y++) {
      const row: Cell[] = []
      for (let x = 0; x < width; x++) {
        row.push(new Cell(x, y, this.tiles))
      }
      this.grid.push(row)
    }
  }

  private _pickStartingCell(): Cell {
    const { startCell } = this.definition.options
    if (!startCell) {
      throw new Error('No start cell is defined.')
    }

    let x: number, y: number
    switch (startCell.cell) {
      case 'middle':
        x = Math.floor(this.grid[0].length / 2)
        y = Math.floor(this.grid.length / 2)
        break
      case 'topLeft':
        x = 0
        y = 0
        break
      case 'topRight':
        x = this.grid[0].length - 1
        y = 0
        break
      case 'bottomLeft':
        x = 0
        y = this.grid.length - 1
        break
      case 'bottomRight':
        x = this.grid[0].length - 1
        y = this.grid.length - 1
        break
      case 'defined':
        if (!startCell.cellCoords) {
          throw new Error(
            "The start cell is 'defined', but no coordinates are given.",
          )
        }
        ;({ x, y } = startCell.cellCoords)
        break
      case 'random':
      default:
        x = Math.floor(Math.random() * this.grid[0].length)
        y = Math.floor(Math.random() * this.grid.length)
        break
    }
    this.grid[y][x].tileIndex = startCell.tileIndex
    this.grid[y][x].updatePossibleTiles([startCell.tileIndex])
    return this.grid[y][x]
  }

  generate(width: number, height: number): number[][] | null {
    if (width <= 0 || height <= 0) {
      return []
    }
    this._clear()

    while (this._retryCount < this.definition.options.maxRetryCount!) {
      // Setup all necessary data structures for the algorithm.
      this._initializeGrid(width, height)

      // Pick the starting cell. Since it has its possibilities reduced to one, it will be the first cell to collapse.
      this._pickStartingCell()

      // const waveHeap: Cell[] = []
      const waveHeap = new PrioList<Cell>(
        (a) => a.entropy,
        // (a, b) => a.entropy - b.entropy || a.randomIndex - b.randomIndex,
      )
      for (const row of this.grid) {
        for (const cell of row) {
          waveHeap.push(cell)
        }
      }

      // Continue collapsing cells until the grid is filled.
      wave: while (!waveHeap.isEmpty()) {
        // Pick next cell with lowest entropy and collapse it.
        const cell = waveHeap.pop()!
        cell.collapse()

        // Heap for all the remaining propagations.
        const propagationQueue: Cell[] = []
        propagationQueue.push(cell)
        while (propagationQueue.length > 0) {
          const nextCell = propagationQueue.pop()!
          // Update its neighbors and collect all updated neighbors in the propagation heap.
          if (
            !this._propagateToNeighbors(nextCell, waveHeap, propagationQueue)
          ) {
            break wave
          }
        }
      }

      // If the grid is filled, return the result.
      if (waveHeap.isEmpty()) {
        return this.grid.map((row) => row.map((cell) => cell.tileIndex!))
      }
      this._retryCount++
    }

    return null
  }

  private _propagateToNeighbors(
    updatedCell: Cell,
    waveHeap: PrioList<Cell>,
    propagationQueue: Cell[],
  ): boolean {
    // Roll out the direction "loop" and avoid even optimized stuff like generators.
    if (updatedCell.y > 0) {
      const neighbor = this.grid[updatedCell.y - 1][updatedCell.x]
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          'possibleTilesUp',
          waveHeap,
          propagationQueue,
        )
      ) {
        return false
      }
    }
    if (updatedCell.x < this.grid[0].length - 1) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x + 1]
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          'possibleTilesRight',
          waveHeap,
          propagationQueue,
        )
      ) {
        return false
      }
    }
    if (updatedCell.y < this.grid.length - 1) {
      const neighbor = this.grid[updatedCell.y + 1][updatedCell.x]
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          'possibleTilesDown',
          waveHeap,
          propagationQueue,
        )
      ) {
        return false
      }
    }
    if (updatedCell.x > 0) {
      const neighbor = this.grid[updatedCell.y][updatedCell.x - 1]
      if (
        !this._propagate(
          updatedCell,
          neighbor,
          'possibleTilesLeft',
          waveHeap,
          propagationQueue,
        )
      ) {
        return false
      }
    }
    return true
  }

  /**
   * Update the neighbor's possible tiles based on the updated cell.
   *
   * If any of the neighbor's possible tiles are updated, they will be added to the propagation queue.
   *
   * @returns `true` whether the neighbor was successfully updated or `false` if a contradiction was found.
   */
  private _propagate(
    updatedCell: Cell,
    neighbor: Cell,
    possibleTilesDirection: keyof Tile,
    waveHeap: PrioList<Cell>,
    propagationQueue: Cell[],
  ): boolean {
    const possibleTiles: number[] = []
    for (const tileIndex of updatedCell.possibleTiles) {
      for (const possibleTile of this.tiles[tileIndex][
        possibleTilesDirection
      ] as number[]) {
        if (
          neighbor.possibleTiles.includes(possibleTile) &&
          !possibleTiles.includes(possibleTile)
        ) {
          possibleTiles.push(possibleTile)
        }
      }
    }

    if (possibleTiles.length === 0) {
      // Contradiction found
      return false
    }
    if (possibleTiles.length !== neighbor.possibleTiles.length) {
      const oldEntropy = neighbor.entropy
      neighbor.updatePossibleTiles(possibleTiles)
      waveHeap.refresh(neighbor, oldEntropy)

      if (!propagationQueue.includes(neighbor)) {
        propagationQueue.push(neighbor)
      }
    }
    return true
  }
}

class Tile {
  /** The index of the tile within the tile definitions. */
  public index: number
  /** The compatibility edges of the tile. Only matching edges can be placed next to each other.
   *
   * A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left".
   *
   * Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom. */
  public edges: [string, string, string, string]
  /** The exceptions for the tile. If the tile has a type, the exceptions can be defined by the type. */
  public exceptions?: Exceptions | string[]
  /** A custom type given by the user of the tile (e.g., 'floor', 'wall'). This is used to define exceptions for the tile. */
  public type?: string
  /** The weight of the tile. Can also be 0, which effectively removes the tile from the generation. */
  public weight: number
  /** The weight of the tile multiplied by the logarithm of the weight. */
  public weightLogWeight: number
  /** The possible tiles (via index) that can be placed above this tile. */
  public possibleTilesUp: number[]
  /** The possible tiles (via index) that can be placed to the right of this tile. */
  public possibleTilesRight: number[]
  /** The possible tiles (via index) that can be placed below this tile. */
  public possibleTilesDown: number[]
  /** The possible tiles (via index) that can be placed to the left of this tile. */
  public possibleTilesLeft: number[]

  constructor(
    tileDefinitions: TileDefinition[],
    tileIndex: number,
    defaultWeight: number = 10,
  ) {
    const definition = tileDefinitions[tileIndex]
    this.index = tileIndex
    this.edges = definition.edges
    this.exceptions = definition.exceptions
    this.weight = definition.weight ?? defaultWeight
    this.weightLogWeight = this.weight
      ? this.weight * Math.log2(this.weight)
      : 0
    this.type = definition.type

    const checkExceptions = (
      tile: Tile,
      otherTile: TileDefinition,
    ): boolean => {
      const exceptions = tile.exceptions
      if (!exceptions || !otherTile.type) {
        return true
      }
      if (Array.isArray(exceptions)) {
        return !exceptions.includes(otherTile.type)
      }
      if (exceptions.left && exceptions.left.includes(otherTile.type)) {
        return false
      }
      if (exceptions.right && exceptions.right.includes(otherTile.type)) {
        return false
      }
      if (exceptions.up && exceptions.up.includes(otherTile.type)) {
        return false
      }
      if (exceptions.down && exceptions.down.includes(otherTile.type)) {
        return false
      }
      return true
    }

    this.possibleTilesUp = tileDefinitions
      .map((otherTile, otherIndex) => {
        return this.edges[0] === otherTile.edges[2] &&
          checkExceptions(this, otherTile)
          ? otherIndex
          : null
      })
      .filter((index): index is number => index !== null)

    this.possibleTilesRight = tileDefinitions
      .map((otherTile, otherIndex) => {
        return this.edges[1] === otherTile.edges[3] &&
          checkExceptions(this, otherTile)
          ? otherIndex
          : null
      })
      .filter((index): index is number => index !== null)

    this.possibleTilesDown = tileDefinitions
      .map((otherTile, otherIndex) => {
        return this.edges[2] === otherTile.edges[0] &&
          checkExceptions(this, otherTile)
          ? otherIndex
          : null
      })
      .filter((index): index is number => index !== null)

    this.possibleTilesLeft = tileDefinitions
      .map((otherTile, otherIndex) => {
        return this.edges[3] === otherTile.edges[1] &&
          checkExceptions(this, otherTile)
          ? otherIndex
          : null
      })
      .filter((index): index is number => index !== null)
  }
}

class Cell {
  public x: number
  public y: number
  public randomIndex: number
  /** The available tiles for the whole generation. */
  public availableTiles: Tile[]
  /** The possible tiles that can be placed in this cell. */
  public possibleTiles: number[] = []
  /** The index of the tile that was collapsed to this cell. */
  public tileIndex: number | null
  /** The Shannon entropy of the cell. See: https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/ */
  public entropy: number = 0
  public listNode: ListNode<any> | undefined
  private _sumOfWeights: number = 0
  private _sumOfWeightLogWeights: number = 0

  constructor(x: number, y: number, availableTiles: Tile[]) {
    this.x = x
    this.y = y
    this.randomIndex = Math.floor(Math.random() * 0xffffffff)
    this.availableTiles = availableTiles

    this.tileIndex = null
    this.updatePossibleTiles(availableTiles.map((_, index) => index))
  }

  updatePossibleTiles(possibleTiles: number[]): void {
    this.possibleTiles = possibleTiles
    this._sumOfWeights = possibleTiles.reduce((sum, tileIndex) => {
      return sum + this.availableTiles[tileIndex].weight
    }, 0)
    this._sumOfWeightLogWeights = possibleTiles.reduce((sum, tileIndex) => {
      return sum + this.availableTiles[tileIndex].weightLogWeight
    }, 0)
    this.entropy = this._sumOfWeights
      ? Math.log2(this._sumOfWeights) -
        this._sumOfWeightLogWeights / this._sumOfWeights
      : 0
  }

  collapse(): void {
    if (this.possibleTiles.length === 0) {
      throw new Error('No possible tiles to collapse to.')
    }

    // Selects tile based on weights randomly.
    const weights = this.possibleTiles.map(
      (tileIndex) => this.availableTiles[tileIndex].weight,
    )
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

    let randomWeight = Math.random() * totalWeight
    for (let i = 0; i < weights.length; i++) {
      randomWeight -= weights[i]
      if (randomWeight <= 0) {
        const chosenTile = this.possibleTiles[i]
        this.tileIndex = chosenTile
        this.possibleTiles = [chosenTile]
        this.entropy = 0 // Entropy is zero since the cell is collapsed
        return
      }
    }

    throw new Error('No tile was chosen.')
  }
}
