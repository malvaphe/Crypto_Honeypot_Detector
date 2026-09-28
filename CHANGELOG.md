# Changelog

## 2.0.0

Complete rewrite.

### Detection
- No contract to deploy and no funds needed: the new `HoneypotSimulator` is injected in a read-only
  `eth_call` with state overrides, at a random address on every check.
- New wallet simulation (`eth_simulateV1`): a normal wallet buys, approves and sells in separate
  blocks. Detects honeypots that fool contract-based simulators (issue #5).
- Simulations run with a real gas price (defeats `tx.gasprice == 0` checks).
- Transfer test (wallet-to-wallet transfers blocked or taxed).
- Readable revert reasons of the token instead of "TRANSFER_FROM_FAILED".
- Static checks: owner / renounced, EIP-1967 upgradeable proxy, max transaction and max wallet.
- Risk levels and flags instead of a single `problem` boolean; a failed buy is "unknown", never "safe".
- Uniswap V3 no longer depends on The Graph (the hosted service was shut down, issue #6): pools are
  read directly from the factory and swapped directly, which also enables every V3 fork.
- Automatic pool discovery on-chain across all DEXes and base tokens (WETH/WBNB/..., USDT, USDC).

### Chains and DEXes
- Added Base, Arbitrum, Optimism, PancakeSwap V3, Uniswap V2/V3 on more chains, SushiSwap on more chains.
- Custom Uniswap V2 routers and V3 factories, custom chains through the library.
- Fantom is kept as "legacy" (the network migrated to Sonic).

### Project
- npm workspaces: `core` (library + CLI), `server` (REST API), `webapp` (UI). The web app no longer
  duplicates the backend.
- web3.js v1 (deprecated) replaced by viem; Express 5; React 19, Vite 8, Tailwind CSS 4.
- New REST API (`/api/v1/check/:chain/:token`, batch endpoint, chains endpoint), caching, rate
  limiting, security headers, input validation. The v1 route `/api/:dex/:token/:base` still works.
- CLI with exit codes, Dockerfile, local demo (`npm run demo`), tests on a local anvil node with the
  official Uniswap bytecode, GitHub Actions CI.
- Security review: [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md).

## 1.0.0

First version: Multicall contract deployed and funded by the user, one file per DEX.
