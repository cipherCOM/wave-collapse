# Installing

```bash
npm install wave-collapse
```

# Usage

```javascript
import { WaveCollapse } from "wave-collapse";

const definition = {
  tiles: [
    { id: 0, weight: 1, color: "red" },
    { id: 1, weight: 1, color: "green" },
    { id: 2, weight: 1, color: "blue" },
  ],
};
const waveCollapse = new WaveCollapse(definition);
const map = waveCollapse.generate(100, 100);
```

# Definition Options
