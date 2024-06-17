import { WaveCollapse } from "./src/wave-collapse.js";

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
