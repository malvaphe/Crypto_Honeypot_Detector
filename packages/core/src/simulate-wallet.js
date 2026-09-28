// "Wallet" simulation: the same buy -> approve -> sell -> transfer flow performed by a
// plain wallet (EOA), with each step in its own simulated block, exactly like a real user.
//
// It uses `eth_simulateV1` (execution-apis standard, supported by geth, reth, erigon,
// nethermind, besu, anvil and their forks). It catches tokens that behave differently
// for contracts and for wallets, or across blocks (e.g. approvals that silently expire),
// which a single-call simulation cannot see.
//
// Only Uniswap V2 style routers are supported: V3 pools require a callback contract.
import { decodeFunctionResult, encodeFunctionData, maxUint256, numberToHex, parseEther } from 'viem';
import { erc20Abi, v2RouterAbi } from './abis.js';
import { decodeRevert } from './errors.js';
import { randomAddress } from './utils.js';

const EOA_BALANCE = parseEther('1000000000');

export class SimulateUnsupportedError extends Error {}

/**
 * @param {import('viem').PublicClient} client
 * @param {object} p
 * @param {`0x${string}`} p.router
 * @param {`0x${string}`} p.wrappedNative
 * @param {`0x${string}`} p.base
 * @param {`0x${string}`} p.token
 * @param {`0x${string}`} p.pool   pair of base/token (used to diagnose failed sells)
 * @param {bigint} p.amountIn     native amount
 * @param {bigint} p.baseAmount   base amount to spend (known from the contract simulation)
 * @param {number} p.sellBps
 * @param {bigint} p.blockNumber
 * @param {bigint} p.gas
 * @param {bigint | undefined} p.gasPrice
 */
export async function simulateWithWallet(client, p) {
  const wallet = randomAddress();
  const recipient = randomAddress();
  const deadline = maxUint256;

  const call = (to, abi, functionName, args = [], value) => ({
    to,
    abi,
    functionName,
    data: encodeFunctionData({ abi, functionName, args }),
    value,
  });

  // Block 1: get the base token, buy
  const block1 = [call(p.wrappedNative, erc20Abi, 'deposit', [], p.amountIn)];
  if (p.base.toLowerCase() !== p.wrappedNative.toLowerCase()) {
    block1.push(
      call(p.wrappedNative, erc20Abi, 'approve', [p.router, maxUint256]),
      call(p.router, v2RouterAbi, 'swapExactTokensForTokensSupportingFeeOnTransferTokens', [
        p.amountIn,
        0n,
        [p.wrappedNative, p.base],
        wallet,
        deadline,
      ])
    );
  }
  const buyIndex = {
    approve: block1.push(call(p.base, erc20Abi, 'approve', [p.router, maxUint256])) - 1,
    quote: block1.push(call(p.router, v2RouterAbi, 'getAmountsOut', [p.baseAmount, [p.base, p.token]])) - 1,
    before: block1.push(call(p.token, erc20Abi, 'balanceOf', [wallet])) - 1,
    swap:
      block1.push(
        call(p.router, v2RouterAbi, 'swapExactTokensForTokensSupportingFeeOnTransferTokens', [
          p.baseAmount,
          0n,
          [p.base, p.token],
          wallet,
          deadline,
        ])
      ) - 1,
    after: block1.push(call(p.token, erc20Abi, 'balanceOf', [wallet])) - 1,
  };

  // Phase 1: buy only, to learn how many tokens the wallet receives
  const phase1 = await runBlocks(client, p, wallet, [block1]);
  const b1 = phase1[0];
  const buy = {
    success: b1[buyIndex.swap].success,
    expected: b1[buyIndex.quote].success ? decode(v2RouterAbi, 'getAmountsOut', b1[buyIndex.quote]).at(-1) : 0n,
    received: 0n,
    gasUsed: b1[buyIndex.swap].gasUsed,
    error: b1[buyIndex.swap].error,
  };
  if (!b1[buyIndex.approve].success) {
    return { ok: false, reason: 'Approval of the base token failed', wallet };
  }
  if (!buy.success) return { ok: true, wallet, buy, approveOk: false, sellAmount: 0n, sell: emptyStep(), transferAmount: 0n, transfer: emptyStep() };
  const balance = decode(erc20Abi, 'balanceOf', b1[buyIndex.after]);
  buy.received = balance - decode(erc20Abi, 'balanceOf', b1[buyIndex.before]);
  if (balance === 0n) return { ok: true, wallet, buy, approveOk: false, sellAmount: 0n, sell: emptyStep(), transferAmount: 0n, transfer: emptyStep() };

  const sellAmount = (balance * BigInt(p.sellBps)) / 10000n;
  const transferAmount = balance - sellAmount;

  // Block 2: approve (separate block, like a real user)
  const block2 = [call(p.token, erc20Abi, 'approve', [p.router, maxUint256])];
  // Block 3: sell
  const block3 = [
    call(p.router, v2RouterAbi, 'getAmountsOut', [sellAmount, [p.token, p.base]]),
    call(p.base, erc20Abi, 'balanceOf', [wallet]),
    call(p.router, v2RouterAbi, 'swapExactTokensForTokensSupportingFeeOnTransferTokens', [
      sellAmount,
      0n,
      [p.token, p.base],
      wallet,
      deadline,
    ]),
    call(p.base, erc20Abi, 'balanceOf', [wallet]),
  ];
  // Block 4: wallet-to-wallet transfer of the remaining tokens
  const block4 =
    transferAmount > 0n
      ? [
          call(p.token, erc20Abi, 'balanceOf', [recipient]),
          call(p.token, erc20Abi, 'transfer', [recipient, transferAmount]),
          call(p.token, erc20Abi, 'balanceOf', [recipient]),
        ]
      : [];

  // Last block: direct transfer to the pair. Only used when the sell failed, to recover the
  // token's own revert reason (routers replace it with "TRANSFER_FROM_FAILED").
  const probe = [call(p.token, erc20Abi, 'transfer', [p.pool, sellAmount])];

  const blocks = [block1, block2, block3];
  if (block4.length) blocks.push(block4);
  blocks.push(probe);
  const results = await runBlocks(client, p, wallet, blocks);
  const [r1, r2, r3] = results;
  const r4 = block4.length ? results[3] : undefined;
  const probeResult = results.at(-1)[0];

  // Buy must be identical to phase 1 (same state, same calls)
  buy.gasUsed = r1[buyIndex.swap].gasUsed;

  const approveOk = r2[0].success && (r2[0].returnData === '0x' || decode(erc20Abi, 'approve', r2[0]) === true);
  const sell = {
    success: r3[2].success,
    expected: r3[0].success ? decode(v2RouterAbi, 'getAmountsOut', r3[0]).at(-1) : 0n,
    received: r3[2].success ? decode(erc20Abi, 'balanceOf', r3[3]) - decode(erc20Abi, 'balanceOf', r3[1]) : 0n,
    gasUsed: r3[2].gasUsed,
    error: r3[2].error,
  };
  if (!sell.success && !probeResult.success && probeResult.error && probeResult.error !== 'Reverted') {
    sell.error = probeResult.error;
  }
  if (!approveOk && !sell.error) sell.error = 'Approve failed';

  let transfer = emptyStep();
  if (r4) {
    transfer = {
      success: r4[1].success,
      expected: transferAmount,
      received: r4[1].success ? decode(erc20Abi, 'balanceOf', r4[2]) - decode(erc20Abi, 'balanceOf', r4[0]) : 0n,
      gasUsed: r4[1].gasUsed,
      error: r4[1].error,
    };
  }

  return { ok: true, wallet, buy, approveOk, sellAmount, sell, transferAmount, transfer };
}

function emptyStep() {
  return { success: false, expected: 0n, received: 0n, gasUsed: 0n, error: null };
}

function decode(abi, functionName, res) {
  return decodeFunctionResult({ abi, functionName, data: res.returnData });
}

async function runBlocks(client, p, wallet, blocks) {
  const gasPrice = p.gasPrice;
  const payload = {
    blockStateCalls: blocks.map((calls, i) => ({
      ...(i === 0 ? { stateOverrides: { [wallet]: { balance: numberToHex(EOA_BALANCE) } } } : {}),
      calls: calls.map((c) => ({
        from: wallet,
        to: c.to,
        data: c.data,
        gas: numberToHex(p.gas),
        ...(c.value ? { value: numberToHex(c.value) } : {}),
        ...(gasPrice ? { gasPrice: numberToHex(gasPrice) } : {}),
      })),
    })),
    validation: false,
  };

  let response;
  try {
    response = await client.request({ method: 'eth_simulateV1', params: [payload, numberToHex(p.blockNumber)] });
  } catch (err) {
    const msg = String(err?.details ?? err?.message ?? '');
    if (/method.*(not found|not supported|does not exist|not available|unsupported)|-32601|unknown method/i.test(msg)) {
      throw new SimulateUnsupportedError('The RPC node does not support eth_simulateV1');
    }
    throw err;
  }
  if (!Array.isArray(response) || response.length !== blocks.length) {
    throw new SimulateUnsupportedError('Unexpected eth_simulateV1 response');
  }
  return response.map((block) =>
    block.calls.map((c) => {
      const success = c.status === '0x1';
      return {
        success,
        returnData: c.returnData ?? '0x',
        gasUsed: BigInt(c.gasUsed ?? 0),
        error: success ? null : decodeRevert(c.error?.data ?? c.returnData) ?? c.error?.message ?? 'Reverted',
      };
    })
  );
}
