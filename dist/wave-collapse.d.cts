type CellCoords = {
    x: number;
    y: number;
};
type StartPosition = "random" | "middle" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "defined";
type StartCell = {
    cell: StartPosition;
    cellCoords?: CellCoords;
    tileIndex: number;
};
type Options = {
    defaultTileWeight?: number;
    startCell?: StartCell;
    maxRetryCount?: number;
};
type Exceptions = {
    left?: string[];
    right?: string[];
    down?: string[];
    up?: string[];
};
type TileDefinition = {
    edges: [string, string, string, string];
    type?: string;
    exceptions?: Exceptions | string[];
    weight?: number;
};
type AlgorithmDefinition = {
    options: Options;
    tiles: TileDefinition[];
};
declare class WaveCollapse {
    private definition;
    private tiles;
    private grid;
    private _retryCount;
    constructor(definition: AlgorithmDefinition);
    private _clear;
    private _initializeGrid;
    private _pickStartingCell;
    generate(width: number, height: number): number[][] | null;
    private _propagateToNeighbors;
    private _propagate;
}

export { WaveCollapse };
