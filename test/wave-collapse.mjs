import { expect } from "chai";
import { it } from "mocha";
import { WaveCollapse } from "../src/wave-collapse.js";

it("generates empty 0x0 grid", () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ["A", "A", "A", "A"] }],
  });
  const level = wfc.generate(0, 0);
  expect(level).deep.equal([]);
});

it("generates simple 1x1 grid with one tile and no constraints", () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ["A", "A", "A", "A"] }],
  });
  const level = wfc.generate(1, 1);
  expect(level).deep.equal([[0]]);
});

it("generates simple 5x5 grid with one tile and no constraints", () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ["A", "A", "A", "A"] }],
  });
  const level = wfc.generate(5, 5);
  expect(level).deep.equal([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
});

it("generates checkerboard 6x6 grid with two tiles", () => {
  const wfc = new WaveCollapse({
    options: {
      startCell: {
        cell: "topLeft",
        tileIndex: 0,
      },
    },
    tiles: [
      { edges: ["A", "A", "A", "A"], type: "white", exceptions: ["white"] },
      { edges: ["A", "A", "A", "A"], type: "black", exceptions: ["black"] },
    ],
  });
  const level = wfc.generate(6, 6);
  expect(level).deep.equal([
    [0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0],
  ]);
});

it("generates 3x3 grid with walls and floor", () => {
  const wfc = new WaveCollapse({
    options: {
      startCell: {
        cell: "middle",
        tileIndex: 8,
      },
    },
    tiles: [
      // edge types: A=outer, B=wall, C=floor
      { edges: ["AAA", "ABC", "ABC", "AAA"] }, // 0: top-left corner
      { edges: ["AAA", "AAA", "CBA", "ABC"] }, // 1: top-right corner
      { edges: ["ABC", "CBA", "AAA", "AAA"] }, // 2: bottom-left corner
      { edges: ["CBA", "AAA", "AAA", "CBA"] }, // 3: bottom-right corner
      { edges: ["AAA", "ABC", "CCC", "ABC"] }, // 4: top wall
      { edges: ["CBA", "AAA", "CBA", "CCC"] }, // 5: right wall
      { edges: ["CCC", "CBA", "AAA", "CBA"] }, // 6: bottom wall
      { edges: ["ABC", "CCC", "ABC", "AAA"] }, // 7: left wall
      {
        edges: ["CCC", "CCC", "CCC", "CCC"],
        type: "floor",
        exceptions: ["floor"],
      }, // 8: floor
    ],
  });
  const level = wfc.generate(3, 3);
  expect(level).deep.equal([
    [0, 4, 1],
    [7, 8, 5],
    [2, 6, 3],
  ]);
});

it("generates grid with different weights", () => {
  const wfc = new WaveCollapse({
    tiles: [
      { edges: ["A", "A", "A", "A"], weight: 1 },
      { edges: ["A", "A", "A", "A"], weight: 10 },
    ],
  });
  const level = wfc.generate(100, 100);
  // The exact grid is not deterministic, but the tile with higher weight should appear more often
  const flatLevel = level.flat();
  const tile0Count = flatLevel.filter((tileIndex) => tileIndex === 0).length;
  const tile1Count = flatLevel.filter((tileIndex) => tileIndex === 1).length;
  expect(tile1Count).greaterThan(tile0Count);
});

it("generates grid with only one tile when weight is 0", () => {
  const wfc = new WaveCollapse({
    options: {
      startCell: {
        cell: "random",
        tileIndex: 0,
      },
    },
    tiles: [
      { edges: ["A", "A", "A", "A"] },
      { edges: ["A", "A", "A", "A"], weight: 0 },
      { edges: ["A", "A", "A", "A"], weight: 0 },
      { edges: ["A", "A", "A", "A"], weight: 0 },
      { edges: ["A", "A", "A", "A"], weight: 0 },
      { edges: ["A", "A", "A", "A"], weight: 0 },
      { edges: ["A", "A", "A", "A"], weight: 0 },
    ],
  });
  const level = wfc.generate(100, 100);
  // The exact grid is not deterministic, but the tile with higher weight should appear more often
  const flatLevel = level.flat();
  const tile0Count = flatLevel.filter((tileIndex) => tileIndex === 0).length;
  expect(tile0Count).equal(10_000);
});

it("fails to generate 3x3 grid due to contradiction", () => {
  const wfc = new WaveCollapse({
    tiles: [
      { edges: ["A", "A", "A", "A"], type: "floor", exceptions: ["floor"] },
    ],
  });
  const level = wfc.generate(3, 3);
  expect(level).equal(null);
});

it("fails to generate 3x3 grid due to contradiction on one side only", () => {
  const wfc = new WaveCollapse({
    tiles: [
      {
        edges: ["A", "A", "A", "A"],
        type: "floor",
        exceptions: { left: ["floor"] },
      },
    ],
  });
  const level = wfc.generate(3, 3);
  expect(level).equal(null);
});

it("can handle basic large grids", () => {
  const wfc = new WaveCollapse({
    tiles: [{ edges: ["A", "A", "A", "A"] }],
  });
  const level = wfc.generate(1_000, 1_000);
  expect(level.length).to.equal(1_000);
  expect(level[0].length).to.equal(1_000);
  level.forEach(
    (row) => expect(row.every((tileIndex) => tileIndex === 0)).true
  );
});

it("performs reasonable well on more complex large grids", () => {
  const wfc = new WaveCollapse({
    tiles: [
      // edge types: A=outer, B=wall, C=floor
      { edges: ["AAA", "ABC", "ABC", "AAA"] }, // 0: top-left corner
      { edges: ["AAA", "AAA", "CBA", "ABC"] }, // 1: top-right corner
      { edges: ["ABC", "CBA", "AAA", "AAA"] }, // 2: bottom-left corner
      { edges: ["CBA", "AAA", "AAA", "CBA"] }, // 3: bottom-right corner
      { edges: ["AAA", "ABC", "CCC", "ABC"] }, // 4: top wall
      { edges: ["CBA", "AAA", "CBA", "CCC"] }, // 5: right wall
      { edges: ["CCC", "CBA", "AAA", "CBA"] }, // 6: bottom wall
      { edges: ["ABC", "CCC", "ABC", "AAA"] }, // 7: left wall
      {
        edges: ["CCC", "CCC", "CCC", "CCC"],
        type: "floor",
        exceptions: ["floor"],
      }, // 8: floor
    ],
  });
  wfc.generate(1_000, 1_000);
});

it("generates 2x2 grid with specific start position 'topRight'", () => {
  const wfc = new WaveCollapse({
    options: {
      startCell: {
        cell: "topRight",
        tileIndex: 1,
      },
    },
    tiles: [
      { edges: ["A", "A", "A", "A"], type: "tile1" },
      { edges: ["A", "A", "A", "A"], type: "tile2" },
    ],
  });
  const level = wfc.generate(2, 2);
  expect(level.flat()).include.members([1]);
});

it("generates 2x2 grid with defined startCell coordinates", () => {
  const wfc = new WaveCollapse({
    options: {
      startCell: {
        cell: "defined",
        cellCoords: { x: 1, y: 1 },
        tileIndex: 1,
      },
    },
    tiles: [{ edges: ["A", "A", "A", "A"] }, { edges: ["A", "A", "A", "A"] }],
  });
  const level = wfc.generate(2, 2);
  expect(level.flat()).include.members([1]);
});

it("throws an error when no tiles are defined", () => {
  expect(() => new WaveCollapse({ tiles: [] })).to.throw(
    "No tiles are defined."
  );
});

it("throws an error when any tile does not have exactly 4 edges", () => {
  expect(
    () =>
      new WaveCollapse({
        tiles: [{ edges: ["A", "A", "A"] }],
      })
  ).to.throw("All tiles must have exactly 4 edges.");
});

it("throws an error when any edge has a length of 0", () => {
  expect(
    () =>
      new WaveCollapse({
        tiles: [{ edges: ["A", "A", "A", ""] }],
      })
  ).to.throw("All edges must have a length of at least 1.");
});

it("throws an error when 'defined' startCell is missing coordinates", () => {
  expect(
    () =>
      new WaveCollapse({
        options: {
          startCell: {
            cell: "defined",
            tileIndex: 0,
          },
        },
        tiles: [{ edges: ["A", "A", "A", "A"] }],
      })
  ).to.throw("The start cell is 'defined', but no coordinates are given.");
});
