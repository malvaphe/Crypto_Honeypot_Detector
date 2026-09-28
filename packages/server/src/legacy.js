// Converts a v2 result into the response format of v1 of the project
// (GET /api/:dex/:token/:base), so that existing integrations keep working.

export function toLegacyResponse(r) {
  const v = r.verdict;
  const tokenSymbol = r.token.symbol;
  const mainTokenSymbol = r.pool?.base?.symbol ?? null;
  const firstProblem = v.flags.find((f) => f.severity !== 'info' && f.severity !== 'low');

  if (v.isHoneypot === null) {
    return {
      status: 200,
      body: {
        data: {
          isHoneypot: false,
          tokenSymbol,
          mainTokenSymbol,
          problem: true,
          liquidity: true,
          extra: firstProblem?.message ?? 'Token liquidity is extremely low or has problems with the purchase!',
        },
      },
    };
  }

  const fixed = (x) => (x == null ? null : x.toFixed(1));
  return {
    status: 200,
    body: {
      data: {
        isHoneypot: v.isHoneypot,
        buyFee: fixed(v.buyTax),
        sellFee: fixed(v.sellTax),
        buyGas: v.buyGas == null ? 0 : v.buyGas.toString(),
        sellGas: v.sellGas == null ? 0 : v.sellGas.toString(),
        maxTokenTransaction: r.security?.maxTransaction ? Number(r.security.maxTransaction.amount) : null,
        maxTokenTransactionMain: null,
        tokenSymbol,
        mainTokenSymbol,
        priceImpact: null,
        problem: v.risk !== 'low',
        extra: firstProblem?.message ?? null,
      },
    },
  };
}
