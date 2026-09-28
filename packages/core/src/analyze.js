// Turns raw simulation results into taxes, flags and a verdict. Pure function: no I/O.
import { lossPercent } from './utils.js';

export const DEFAULT_THRESHOLDS = {
  maxBuyTax: 10, // % above which the buy tax is considered high
  maxSellTax: 10, // % above which the sell tax is considered high
  honeypotTax: 90, // % of sell tax above which the token is treated as a honeypot
  taxMismatch: 2, // % of difference between wallet and contract taxes considered suspicious
};

const SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical'];

function stepTaxes(sim) {
  if (!sim?.ok) return {};
  return {
    buyTax: sim.buy.success ? lossPercent(sim.buy.expected, sim.buy.received) : null,
    sellTax: sim.sell.success ? lossPercent(sim.sell.expected, sim.sell.received) : null,
    transferTax: sim.transfer.success ? lossPercent(sim.transfer.expected, sim.transfer.received) : null,
  };
}

/**
 * @param {object} input
 * @param {'v2'|'v3'} input.kind
 * @param {object} input.contract          result of simulateWithContract
 * @param {object|null} input.wallet       result of simulateWithWallet (null when not run)
 * @param {string|null} [input.walletUnavailableReason]
 * @param {object|null} [input.security]   result of getTokenSecurityInfo
 * @param {bigint|null} [input.totalSupply]
 * @param {bigint|undefined} [input.liquidityNative]
 * @param {bigint|undefined} [input.lowLiquidity]
 * @param {Partial<typeof DEFAULT_THRESHOLDS>} [input.thresholds]
 */
export function analyze(input) {
  const t = { ...DEFAULT_THRESHOLDS, ...(input.thresholds ?? {}) };
  const flags = [];
  const flag = (code, severity, message) => flags.push({ code, severity, message });
  const { contract, wallet } = input;
  const walletOk = !!wallet?.ok;
  const primary = walletOk ? wallet : contract;

  let isHoneypot = false;
  let unknown = false;

  if (!contract?.ok) {
    flag('SIMULATION_FAILED', 'high', `The simulation could not run: ${contract?.reason ?? 'unknown error'}`);
    return finish({ isHoneypot: null, unknown: true });
  }

  const c = stepTaxes(contract);
  const w = stepTaxes(wallet);
  const taxes = walletOk ? w : c;

  // ---- Buy
  if (!primary.buy.success || primary.buy.received === 0n) {
    const reason = primary.buy.error ?? 'no tokens received';
    flag('BUY_FAILED', 'high', `The token cannot be bought: ${reason}. Trading may be disabled, liquidity missing or buyers restricted.`);
    return finish({ isHoneypot: null, unknown: true });
  }

  // ---- Sell
  const contractSellOk = contract.sell.success && contract.approveOk;
  const walletSellOk = walletOk ? wallet.sell.success && wallet.approveOk : null;

  if (walletOk) {
    if (!wallet.approveOk) {
      isHoneypot = true;
      flag('APPROVE_FAILED', 'critical', 'A wallet cannot approve the router to spend the token, so it can never be sold.');
    } else if (!walletSellOk && contractSellOk) {
      isHoneypot = true;
      flag(
        'WALLET_SELL_BLOCKED',
        'critical',
        `Selling works from a contract but fails from a normal wallet (${wallet.sell.error ?? 'reverted'}). This is a honeypot designed to fool simulators.`
      );
    } else if (!walletSellOk) {
      isHoneypot = true;
      flag('SELL_FAILED', 'critical', `The token cannot be sold: ${wallet.sell.error ?? 'reverted'}.`);
    } else if (!contractSellOk) {
      flag('CONTRACT_SELL_BLOCKED', 'info', `Sells from smart contracts are blocked (${contract.sell.error ?? 'reverted'}), wallets can sell normally (anti-bot protection).`);
    }
  } else if (!contract.approveOk) {
    isHoneypot = true;
    flag('APPROVE_FAILED', 'critical', 'The router cannot be approved to spend the token, so it can never be sold.');
  } else if (!contractSellOk) {
    isHoneypot = true;
    const err = contract.sell.error ?? 'reverted';
    const hint =
      input.kind === 'v3' && /IIA|STF|TF/.test(err)
        ? ' (Uniswap V3 pools do not support fee-on-transfer tokens: check a V2 pool too)'
        : '';
    flag('SELL_FAILED', 'critical', `The token cannot be sold: ${err}${hint}.`);
  }

  // ---- Taxes
  if (taxes.sellTax != null && taxes.sellTax >= t.honeypotTax) {
    isHoneypot = true;
    flag('EXTREME_SELL_TAX', 'critical', `Sell tax is ${taxes.sellTax}%: selling returns almost nothing.`);
  } else if (taxes.sellTax != null && taxes.sellTax > t.maxSellTax) {
    flag('HIGH_SELL_TAX', 'high', `Sell tax is ${taxes.sellTax}% (above ${t.maxSellTax}%).`);
  }
  if (taxes.buyTax != null && taxes.buyTax > t.maxBuyTax) {
    flag('HIGH_BUY_TAX', 'high', `Buy tax is ${taxes.buyTax}% (above ${t.maxBuyTax}%).`);
  }
  if (walletOk) {
    for (const k of ['buyTax', 'sellTax']) {
      if (c[k] != null && w[k] != null && Math.abs(c[k] - w[k]) > t.taxMismatch) {
        flag('TAX_MISMATCH', 'medium', `The ${k === 'buyTax' ? 'buy' : 'sell'} tax differs between a wallet (${w[k]}%) and a contract (${c[k]}%): the token treats simulators differently.`);
      }
    }
  }

  // ---- Transfers
  const transferStep = primary.transfer;
  if (primary.transferAmount > 0n) {
    if (!transferStep.success) {
      flag('TRANSFER_BLOCKED', 'high', `Wallet-to-wallet transfers fail: ${transferStep.error ?? 'reverted'}.`);
    } else if (taxes.transferTax != null && taxes.transferTax > t.maxSellTax) {
      flag('HIGH_TRANSFER_TAX', 'medium', `Transfer tax is ${taxes.transferTax}%.`);
    }
  }

  // ---- Static checks
  const sec = input.security;
  if (sec?.proxy) {
    flag('UPGRADEABLE', 'medium', `The token is an upgradeable proxy (implementation ${sec.proxy.implementation}): its code can be changed at any time.`);
  }
  if (sec?.ownershipRenounced === false) {
    flag('OWNER_NOT_RENOUNCED', 'low', `The contract has an owner (${sec.owner}) who may be able to change taxes, limits or blacklist wallets.`);
  }
  const supply = input.totalSupply;
  if (sec?.maxTransaction && (supply == null || sec.maxTransaction.raw < supply)) {
    flag('MAX_TX_LIMIT', 'low', `Transactions are limited to ${sec.maxTransaction.formatted ?? sec.maxTransaction.raw} tokens.`);
  }
  if (sec?.maxWallet && (supply == null || sec.maxWallet.raw < supply)) {
    flag('MAX_WALLET_LIMIT', 'low', `Wallets are limited to ${sec.maxWallet.formatted ?? sec.maxWallet.raw} tokens.`);
  }
  if (input.lowLiquidity !== undefined && input.liquidityNative !== undefined && input.liquidityNative < input.lowLiquidity) {
    flag('LOW_LIQUIDITY', 'medium', 'The pool has low liquidity: prices can move a lot and results are less reliable.');
  }
  if (!walletOk && input.walletUnavailableReason) {
    flag('WALLET_SIMULATION_UNAVAILABLE', 'info', `Wallet simulation not performed: ${input.walletUnavailableReason}. Only the contract simulation was used.`);
  }

  return finish({ isHoneypot, unknown });

  function finish({ isHoneypot, unknown }) {
    const maxSeverity = flags.reduce((m, f) => Math.max(m, SEVERITY_ORDER.indexOf(f.severity)), 0);
    let risk;
    if (isHoneypot) risk = 'honeypot';
    else if (unknown) risk = 'unknown';
    else if (maxSeverity >= 3) risk = 'high';
    else if (maxSeverity === 2) risk = 'medium';
    else risk = 'low';
    flags.sort((a, b) => SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity));
    return {
      isHoneypot,
      risk,
      buyTax: taxesOrNull('buyTax'),
      sellTax: taxesOrNull('sellTax'),
      transferTax: taxesOrNull('transferTax'),
      buyGas: primary?.buy?.success ? primary.buy.gasUsed : null,
      sellGas: primary?.sell?.success ? primary.sell.gasUsed : null,
      flags,
    };
  }

  function taxesOrNull(k) {
    const v = (walletOk ? stepTaxes(wallet) : stepTaxes(contract))[k];
    return v === undefined ? null : v;
  }
}
