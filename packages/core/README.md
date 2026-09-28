# @honeypot-detector/core

Detection engine of [Crypto Honeypot Detector](../../README.md): JavaScript library and CLI.

```js
import { createDetector } from '@honeypot-detector/core';
const detector = createDetector();
const r = await detector.check({ chain: 'bsc', token: '0x...' });
```

```bash
node src/cli.js 0x... --chain bsc
```

- `src/chains.js`: chains and DEXes
- `src/detector.js`: orchestration (`createDetector`, `check`)
- `src/simulate-contract.js`: `eth_call` + state override simulation
- `src/simulate-wallet.js`: `eth_simulateV1` wallet simulation
- `src/discovery.js`: on-chain pool discovery
- `src/analyze.js`: taxes, flags and verdict
- `scripts/build-contract.js`: compiles `contracts/HoneypotSimulator.sol` into `src/simulator-artifact.js`
