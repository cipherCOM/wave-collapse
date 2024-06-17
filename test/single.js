import { WaveCollapse } from "../src/wave-collapse.js";

const wfc = new WaveCollapse({
  tiles: [{ edges: ["A", "A", "A", "A"] }],
});
wfc.generate(1_000, 1_000);
