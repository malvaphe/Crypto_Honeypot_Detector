# Security review

This document covers the smart contract used by version 1 of the project (`contract/multicall.sol`),
why it was replaced, and the security properties of the new design (version 2).

## 1. Version 1: `Multicall` contract

Version 1 required every user to deploy `Multicall` on each chain, fund it with the native coin **and**
the wrapped native token (e.g. BNB + WBNB), and hard-code the funded amounts in each DEX file. The
server then invoked `aggregate()` through `eth_call` (a read-only call, so the swaps were never
actually executed on-chain).

### Findings

| # | Severity | Finding |
|---|----------|---------|
| 1 | High | **Funds at rest in a hot contract.** Real tokens had to sit in the contract forever. `aggregate()` lets the owner make arbitrary calls with arbitrary `value`: whoever controls the owner key controls the funds. The key was also configured in the server (`ownerAddress`) and a server compromise leaked which address to target. |
| 2 | High | **Detection evasion through a fixed, public address.** The contract address never changed and every check came from it. A scam token can whitelist that address (sells allowed only for the simulator) and look safe, or special-case it in any other way. Anyone could read the address from the transactions that funded it. |
| 3 | High | **Same-transaction, contract-only simulation.** Buy, approve and sell ran inside one call made by a contract. Tokens that only let contracts sell, or whose approvals expire after the block they were given in, looked safe while real wallets could not sell ([issue #5](https://github.com/malvaphe/Crypto_Honeypot_Detector/issues/5) is exactly this situation: sells worked from the detector contract, not from a wallet). |
| 4 | Medium | **`withdrawToken` could not withdraw USDT-like tokens.** The call is typed as returning `bool`; tokens that return nothing (USDT on Ethereum) make the ABI decoder revert, so those funds were stuck. |
| 5 | Medium | **`rescueBNB` used `transfer`** (2300 gas stipend): if the owner is a smart-contract wallet (Safe, etc.) the native balance cannot be withdrawn. |
| 6 | Medium | **Simulations with `gasPrice = 0`.** `eth_call` without a gas price runs with `tx.gasprice == 0`. A token can allow sells only when `tx.gasprice == 0` (only possible in a simulation) and block them in real transactions. |
| 7 | Low | Outdated compiler (`^0.6.4`, `pragma experimental ABIEncoderV2`, with several known bugs fixed in later versions) and deprecated opcodes (`block.difficulty`). |
| 8 | Low | No way to transfer or renounce ownership, no events. |
| 9 | Low | Results depended on the contract balance: an underfunded contract returned `0x00` for every call, which the server reported as "low liquidity" or "token destroyed itself" (see issues #1 and #4). |

Server side, v1 also had: no input validation (an invalid address was reported as a self-destructed
token), unhandled promise rejections turned into misleading results, API keys (Infura) committed
in the repository, the subgraph used for auto-detection shut down in 2024 (issue #6), and the web
app duplicated the whole backend.

## 2. Version 2: `HoneypotSimulator`

`contracts/HoneypotSimulator.sol` reaches the same conclusion (can I sell after buying?) without
deploying anything and without real tokens.

### How it works

1. The runtime bytecode of `HoneypotSimulator` is placed at a **random address** through the
   `stateOverride` parameter of `eth_call`; the same override gives that address a native balance.
2. The contract wraps the native balance (`WETH.deposit()`), which is a standard function of every
   wrapped native token, so no token balance ever needs to be faked by guessing storage slots.
3. It buys, approves, sells and transfers, and returns amounts, gas and revert reasons.
4. The call is sent with a **real gas price** (2x the current one) from a random account whose
   balance is also overridden.

In addition, for Uniswap V2 style DEXes, the same flow is replayed by a **plain wallet (EOA)** with
`eth_simulateV1`, with approve and sell in later blocks, exactly as a user would do.

### How each v1 finding is addressed

| v1 finding | v2 |
|---|---|
| 1. Funds at risk | Nothing is deployed and there is nothing to steal: the code and the balance exist only inside a read-only call. No private key is used anywhere. |
| 2. Fixed address | Simulator, caller and transfer recipient are fresh random addresses on every check (covered by a test that whitelists the previous simulator address). |
| 3. Contract-only / same transaction | Wallet simulation with separate blocks. The verdict trusts the wallet result; a mismatch between the two is itself reported (`WALLET_SELL_BLOCKED`, `TAX_MISMATCH`). |
| 4. / 5. Withdrawals | Nothing to withdraw. Approvals tolerate non-standard tokens (no return value, reset to zero first). |
| 6. `gasprice == 0` | The simulation uses a real gas price (covered by a test that shows the naive simulation being fooled). |
| 7. Compiler | Solidity 0.8.37 (checked arithmetic), `evmVersion: paris` so it runs on chains without PUSH0 (a test disassembles the bytecode to prove it). The compiled artifact is reproducible and checked by a test. |
| 9. Balance-dependent results | The balance is provided by the override, always sufficient. Failures are reported with the revert reason of the token, not with a generic message. |

### Properties of the contract

- Every external interaction uses low-level calls: a malicious token cannot abort the simulation,
  it can only make a step fail, and the failure is reported.
- Balance deltas use saturating subtraction: a token whose `balanceOf` lies cannot make the
  simulation panic.
- The V3 swap callback only accepts calls from the pool currently being swapped with.
- `probeTransfer` (used to recover the token's own revert reason, which routers hide behind
  "TRANSFER_FROM_FAILED") can only be called by the contract itself and always reverts, so it never
  changes state.
- Even though the code is never deployed, if someone did deploy it, it would hold no funds between
  calls and has no privileged functions.

### Limits (what no simulation can detect)

- Changes that happen after you buy: the owner raising taxes, blacklisting wallets, pausing trading,
  upgrading a proxy. The detector reports owner, proxy and limits so you can judge this risk.
- Tokens that detect simulations through signals identical to real transactions cannot be caught;
  tokens that detect them through gas price, caller type, fixed addresses or same-block tricks are.
- Tokens that block buys from contracts are reported as `BUY_FAILED` (unknown), never as safe.
- Uniswap V3 pools do not support fee-on-transfer tokens: a failed sell there is reported with a
  hint to test a V2 pool.

## 3. Server

- Input validation (addresses, amounts, percentages, fee tiers) with 400 errors; no user-provided RPC
  URLs are accepted by the API (no SSRF), only addresses.
- Upstream/RPC errors return a generic 502 without internal details.
- `helmet` security headers with a strict Content Security Policy, JSON body limit, configurable
  CORS, rate limiting and caching of identical requests (also deduplicated while in flight).
