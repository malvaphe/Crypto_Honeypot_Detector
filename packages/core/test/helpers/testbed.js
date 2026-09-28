// Local EVM testbed: anvil + real Uniswap V2/V3 bytecode + configurable scam tokens.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';
import { createPublicClient, createWalletClient, http, parseEther, maxUint256, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { compile } from '../../scripts/solc.js';

const require = createRequire(import.meta.url);

// Anvil's first well-known development key (public, test only).
const DEV_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export const FLAGS = {
  BLOCK_SELLS: 1n,
  SELL_ONLY_IF_ZERO_GASPRICE: 2n,
  BLOCK_EOA_SELLS: 4n,
  ALLOWANCE_SAME_BLOCK: 8n,
  BLOCK_TRANSFERS: 16n,
  TRADING_DISABLED: 32n,
  BLOCK_KNOWN_ADDRESS: 64n,
};

let fixtures;
function loadFixtures() {
  if (!fixtures) {
    const source = readFileSync(new URL('../fixtures/Fixtures.sol', import.meta.url), 'utf8');
    fixtures = compile({ 'Fixtures.sol': source })['Fixtures.sol'];
  }
  return fixtures;
}

function uniswapArtifact(path) {
  const json = require(path);
  const bytecode = json.bytecode?.object ?? json.bytecode ?? json.evm?.bytecode?.object;
  return { abi: json.abi, bytecode: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function anvilBinary() {
  if (process.env.ANVIL_PATH) return { cmd: process.env.ANVIL_PATH, args: [] };
  const bin = join(dirname(require.resolve('@foundry-rs/anvil/package.json')), 'bin.mjs');
  return { cmd: process.execPath, args: [bin] };
}

async function waitForRpc(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('anvil exited early');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('anvil did not start');
}

export async function startTestbed() {
  const port = await freePort();
  const { cmd, args } = anvilBinary();
  const child = spawn(cmd, [...args, '--port', String(port), '--silent', '--chain-id', '31337', '--balance', '10000000'], { stdio: 'ignore' });
  const rpcUrl = `http://127.0.0.1:${port}`;
  await waitForRpc(rpcUrl, child);

  const chain = defineChain({
    id: 31337,
    name: 'Anvil',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const account = privateKeyToAccount(DEV_KEY);
  // cacheTime: 0 -> getBlockNumber() always returns the latest block (tests mine blocks quickly)
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl), cacheTime: 0 });
  const wallet = createWalletClient({ chain, account, transport: http(rpcUrl) });
  const fx = loadFixtures();

  async function deploy({ abi, bytecode }, args = []) {
    const hash = await wallet.deployContract({ abi, bytecode, args });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt.contractAddress;
  }
  async function send(address, abi, functionName, args = [], value) {
    const hash = await wallet.writeContract({ address, abi, functionName, args, value, gas: 8_000_000n });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${functionName} reverted`);
    return receipt;
  }
  const read = (address, abi, functionName, args = []) => publicClient.readContract({ address, abi, functionName, args });

  const wethArt = { abi: fx.WETH9.abi, bytecode: '0x' + fx.WETH9.evm.bytecode.object };
  const tokenArt = { abi: fx.TestToken.abi, bytecode: '0x' + fx.TestToken.evm.bytecode.object };
  const helperArt = { abi: fx.V3LiquidityHelper.abi, bytecode: '0x' + fx.V3LiquidityHelper.evm.bytecode.object };
  const v2FactoryArt = uniswapArtifact('@uniswap/v2-core/build/UniswapV2Factory.json');
  const v2RouterArt = uniswapArtifact('@uniswap/v2-periphery/build/UniswapV2Router02.json');
  const v3FactoryArt = uniswapArtifact('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
  const v3PoolArt = uniswapArtifact('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');

  const weth = await deploy(wethArt);
  const usd = await deploy(tokenArt, ['Test USD', 'TUSD', parseEther('100000000')]);
  const v2Factory = await deploy(v2FactoryArt, [account.address]);
  const v2Router = await deploy(v2RouterArt, [v2Factory, weth]);
  const v3Factory = await deploy(v3FactoryArt);
  const v3Helper = await deploy(helperArt);

  await send(weth, wethArt.abi, 'deposit', [], parseEther('1000000'));
  await send(weth, wethArt.abi, 'approve', [v2Router, maxUint256]);
  await send(weth, wethArt.abi, 'approve', [v3Helper, maxUint256]);
  await send(usd, tokenArt.abi, 'approve', [v2Router, maxUint256]);
  await send(usd, tokenArt.abi, 'approve', [v3Helper, maxUint256]);

  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

  async function addV2Liquidity(tokenA, tokenB, amountA, amountB) {
    await send(v2Router, v2RouterArt.abi, 'addLiquidity', [tokenA, tokenB, amountA, amountB, 0n, 0n, account.address, deadline()]);
    return read(v2Factory, v2FactoryArt.abi, 'getPair', [tokenA, tokenB]);
  }

  // Full-range V3 position at price 1:1 (sqrtPriceX96 = 2^96), fee 3000 (tick spacing 60)
  async function addV3Liquidity(tokenA, tokenB, fee = 3000, liquidity = parseEther('1000')) {
    await send(v3Factory, v3FactoryArt.abi, 'createPool', [tokenA, tokenB, fee]);
    const pool = await read(v3Factory, v3FactoryArt.abi, 'getPool', [tokenA, tokenB, fee]);
    await send(pool, v3PoolArt.abi, 'initialize', [2n ** 96n]);
    const spacing = Number(await read(v3Factory, v3FactoryArt.abi, 'feeAmountTickSpacing', [fee]));
    const maxTick = Math.floor(887272 / spacing) * spacing;
    await send(v3Helper, helperArt.abi, 'mint', [pool, -maxTick, maxTick, liquidity]);
    return pool;
  }

  // Base liquidity: WETH/TUSD on both DEX versions
  await addV2Liquidity(weth, usd, parseEther('1000'), parseEther('2000000'));
  await addV3Liquidity(weth, usd, 3000);

  /**
   * Deploy a TestToken with the given behaviour and pair it with `base` (default WETH).
   */
  async function createToken({
    name = 'Test Token',
    symbol = 'TEST',
    flags = 0n,
    buyTax = 0n,
    sellTax = 0n,
    transferTax = 0n,
    maxTx = maxUint256,
    base = weth,
    v2 = true,
    v3 = false,
    renounce = false,
  } = {}) {
    const token = await deploy(tokenArt, [name, symbol, parseEther('1000000000')]);
    await send(token, tokenArt.abi, 'approve', [v2Router, maxUint256]);
    await send(token, tokenArt.abi, 'approve', [v3Helper, maxUint256]);
    let pair, pool;
    if (v2) {
      pair = await addV2Liquidity(token, base, parseEther('100000000'), parseEther('100'));
      await send(token, tokenArt.abi, 'setPair', [pair, true]);
    }
    if (v3) {
      pool = await addV3Liquidity(token, base, 3000, parseEther('200'));
      await send(token, tokenArt.abi, 'setPair', [pool, true]);
    }
    await send(token, tokenArt.abi, 'configure', [flags, buyTax, sellTax, transferTax, maxTx]);
    if (renounce) await send(token, tokenArt.abi, 'renounceOwnership');
    return { token, pair, pool };
  }

  async function stop() {
    child.kill('SIGTERM');
    await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
  }

  return {
    rpcUrl,
    chain,
    publicClient,
    account,
    weth,
    usd,
    v2Factory,
    v2Router,
    v3Factory,
    tokenAbi: tokenArt.abi,
    createToken,
    send,
    read,
    stop,
  };
}
