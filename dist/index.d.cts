type CellCoords = {
    x: number;
    y: number;
};
type StartPosition = 'random' | 'middle' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'defined';
type StartCell = {
    /** The starting position of the first collapsed cell. */
    cell: StartPosition;
    /** The coordinates of the starting cell, only used if 'defined' is selected. */
    cellCoords?: CellCoords;
    /** The used tile index of the starting cell. */
    tileIndex: number;
};
type Options = {
    /** The base weight value, if the property is omitted on the tile. Default is 10. */
    defaultTileWeight?: number;
    /** The starting cell configuration. Default is 'random'. */
    startCell?: StartCell;
    /** The maximum number of retries before the generation is considered failed. Default is 100. */
    maxRetryCount?: number;
};
type Exceptions = {
    /** Exceptions for the left edge. */
    left?: string[];
    /** Exceptions for the right edge. */
    right?: string[];
    /** Exceptions for the bottom edge. */
    down?: string[];
    /** Exceptions for the top edge. */
    up?: string[];
};
type TileDefinition = {
    /**
     * The compatibility edges of the tile. Only matching edges can be placed next to each other.
     *
     * A good notation is e.g. 'ABC' or 'AAA' describing how the edge "looks like". The order is "top", "right", "bottom", "left".
     *
     * Mind that when describing the edges when looking at a visual tileset top and bottomedges are written from left to right and left and right edges from top to bottom. */
    edges: [string, string, string, string];
    /** A custom type given by the user of the tile (e.g., 'floor', 'wall'). This is used to define exceptions for the tile. */
    type?: string;
    /** The exceptions for the tile. If the tile has a type, the exceptions can be defined by the type. */
    exceptions?: Exceptions | string[];
    /** The weight of the tile. Can also be 0, which effectively removes the tile from the generation. */
    weight?: number;
};
type AlgorithmDefinition = {
    options?: Options;
    tiles: TileDefinition[];
};
declare class WaveCollapse {
    private definition;
    /** The tiles objects derived from their definitions. */
    private tiles;
    /** The grid of cells. */
    private grid;
    private _retryCount;
    constructor(definition: AlgorithmDefinition);
    private _clear;
    private _initializeGrid;
    private _pickStartingCell;
    generate(width: number, height: number): number[][] | null;
    private _propagateToNeighbors;
    /**
     * Update the neighbor's possible tiles based on the updated cell.
     *
     * If any of the neighbor's possible tiles are updated, they will be added to the propagation queue.
     *
     * @returns `true` whether the neighbor was successfully updated or `false` if a contradiction was found.
     */
    private _propagate;
}

export { WaveCollapse };
