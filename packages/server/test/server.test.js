import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDetector } from '@honeypot-detector/core';
import { startTestbed, FLAGS } from '../../core/test/helpers/testbed.js';
import { createApp } from '../src/app.js';

let tb, server, base, detector;
const logs = [];

async function listen(app) {
  const s = app.listen(0, '127.0.0.1');
  await new Promise((r) => s.once('listening', r));
  return { s, url: `http://127.0.0.1:${s.address().port}` };
}

before(async () => {
  tb = await startTestbed();
  detector = createDetector({
    rpcUrls: {},
    chains: {
      local: {
        id: 31337,
        name: 'Local',
        nativeSymbol: 'ETH',
        rpcUrls: [tb.rpcUrl],
        wrappedNative: tb.weth,
        defaultAmount: '1',
        bases: [tb.weth, tb.usd],
        dexes: [{ id: 'v2', name: 'Uniswap V2 (local)', kind: 'v2', router: tb.v2Router }],
      },
      // unreachable RPC to test upstream errors
      broken: { id: 1, name: 'Broken', nativeSymbol: 'ETH', rpcUrls: ['http://127.0.0.1:1'], wrappedNative: tb.weth, defaultAmount: '1', dexes: [] },
    },
  });
  const webappDir = mkdtempSync(join(tmpdir(), 'webapp-'));
  writeFileSync(join(webappDir, 'index.html'), '<!doctype html><title>UI</title>');
  ({ s: server, url: base } = await listen(createApp({ detector, rateLimitPerMinute: 0, webappDir, log: (m) => logs.push(m) })));
});

after(async () => {
  server?.close();
  await tb?.stop();
});

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text(), headers: res.headers };
};

describe('REST API', () => {
  test('health and chains', async () => {
    assert.deepEqual((await get('/api/v1/health')).body, { status: 'ok' });
    const chains = (await get('/api/v1/chains')).body.chains;
    assert.ok(chains.find((c) => c.key === 'local'));
    assert.ok(chains.find((c) => c.key === 'bsc'));
  });

  test('check a clean token and a honeypot', async () => {
    const clean = await tb.createToken({ renounce: true });
    const hp = await tb.createToken({ flags: FLAGS.BLOCK_SELLS });
    const a = await get(`/api/v1/check/local/${clean.token}`);
    assert.equal(a.status, 200);
    assert.equal(a.body.verdict.isHoneypot, false);
    assert.equal(typeof a.body.blockNumber, 'string', 'bigints are serialized as strings');
    const b = await get(`/api/v1/check/local/${hp.token}?wallet=false`);
    assert.equal(b.body.verdict.isHoneypot, true);
    assert.equal(b.body.simulations.wallet, null);
  });

  test('results are cached', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const first = await get(`/api/v1/check/local/${token}`);
    const second = await get(`/api/v1/check/local/${token}`);
    assert.equal(first.body.cached, undefined);
    assert.equal(second.body.cached, true);
  });

  test('query options', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const r = await get(`/api/v1/check/local/${token}?amount=0.25&sellPercent=50&dex=v2&base=default`);
    assert.equal(r.status, 200);
    assert.equal(r.body.testedAmount, '0.25 ETH');
  });

  test('errors: 400 invalid input, 404 no contract, 502 RPC down', async () => {
    assert.equal((await get('/api/v1/check/local/0x1234')).status, 400);
    assert.equal((await get(`/api/v1/check/nochain/${tb.usd}`)).status, 400);
    assert.equal((await get(`/api/v1/check/local/${tb.usd}?amount=abc`)).status, 400);
    assert.equal((await get('/api/v1/check/local/0x000000000000000000000000000000000000bEEF')).status, 404);
    const down = await get(`/api/v1/check/broken/${tb.usd}`);
    assert.equal(down.status, 502);
    assert.doesNotMatch(JSON.stringify(down.body), /127\.0\.0\.1/, 'internal details are not leaked');
    assert.equal((await get('/api/v1/nope')).status, 404);
  });

  test('batch endpoint', async () => {
    const a = await tb.createToken({ renounce: true });
    const b = await tb.createToken({ flags: FLAGS.BLOCK_SELLS });
    const res = await fetch(`${base}/api/v1/check/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chain: 'local', tokens: [a.token, b.token, '0xbad'] }),
    });
    const { results } = await res.json();
    assert.equal(results[0].result.verdict.isHoneypot, false);
    assert.equal(results[1].result.verdict.isHoneypot, true);
    assert.equal(results[2].ok, false);
    assert.equal(results[2].status, 400);
    const tooMany = await fetch(`${base}/api/v1/check/batch`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chain: 'local', tokens: Array(11).fill(a.token) }) });
    assert.equal(tooMany.status, 400);
    const badJson = await fetch(`${base}/api/v1/check/batch`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(badJson.status, 400);
  });

  test('security headers and CORS', async () => {
    const r = await get('/api/v1/health');
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(r.headers.get('content-security-policy'));
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  test('serves the web app with SPA fallback', async () => {
    assert.match((await get('/')).body, /<title>UI<\/title>/);
    assert.match((await get('/some/page')).body, /<title>UI<\/title>/);
  });

  test('legacy v1 route keeps the old response format', async () => {
    const legacyDetector = createDetector({ rpcUrls: {}, chains: { bsc: { rpcUrls: [tb.rpcUrl], id: 31337, wrappedNative: tb.weth, bases: [tb.weth], dexes: [{ id: 'pancakeswap-v2', name: 'PancakeSwap V2', kind: 'v2', router: tb.v2Router }] } } });
    const { s, url } = await listen(createApp({ detector: legacyDetector, rateLimitPerMinute: 0 }));
    try {
      const clean = await tb.createToken({ renounce: true, sellTax: 300n });
      const hp = await tb.createToken({ flags: FLAGS.BLOCK_SELLS });
      const a = await (await fetch(`${url}/api/pancakeswap/${clean.token}/default`)).json();
      assert.equal(a.data.isHoneypot, false);
      assert.equal(a.data.sellFee, '3.0');
      assert.equal(a.data.tokenSymbol, 'TEST');
      assert.equal(a.data.mainTokenSymbol, 'WETH');
      const b = await (await fetch(`${url}/api/pancakeswap/${hp.token}/default`)).json();
      assert.equal(b.data.isHoneypot, true);
      assert.equal(b.data.problem, true);
      const nf = await fetch(`${url}/api/pancakeswap/0x000000000000000000000000000000000000bEEF/default`);
      assert.equal(nf.status, 404);
      assert.equal((await nf.json()).data.ExError, true);
    } finally {
      s.close();
    }
  });

  test('rate limiting', async () => {
    const { s, url } = await listen(createApp({ detector, rateLimitPerMinute: 2 }));
    try {
      const codes = [];
      for (let i = 0; i < 3; i++) codes.push((await fetch(`${url}/api/v1/check/local/0x1234`)).status);
      assert.deepEqual(codes, [400, 400, 429]);
      assert.equal((await fetch(`${url}/api/v1/health`)).status, 200, 'health is not rate limited');
    } finally {
      s.close();
    }
  });
});
