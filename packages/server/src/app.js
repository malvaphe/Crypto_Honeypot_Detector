import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { InputError, TokenNotFoundError, jsonReplacer, LEGACY_DEXES } from '@honeypot-detector/core';
import { TtlCache } from './cache.js';
import { toLegacyResponse } from './legacy.js';

const MAX_BATCH = 10;

/**
 * Build the Express application.
 * @param {object} opts
 * @param {ReturnType<import('@honeypot-detector/core').createDetector>} opts.detector
 * @param {string[] | '*'} [opts.corsOrigins]
 * @param {number} [opts.rateLimitPerMinute]  0 disables rate limiting
 * @param {number} [opts.cacheTtlSeconds]     0 disables caching
 * @param {string | null} [opts.webappDir]    directory of the built web app to serve
 * @param {boolean | number | string} [opts.trustProxy]
 * @param {(msg: string, err?: unknown) => void} [opts.log]
 */
export function createApp({
  detector,
  corsOrigins = '*',
  rateLimitPerMinute = 30,
  cacheTtlSeconds = 30,
  webappDir = null,
  trustProxy = false,
  log = (msg, err) => console.error(`[${new Date().toISOString()}] ${msg}:`, err?.shortMessage ?? err?.message ?? err ?? '', err?.details ?? ''),
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.set('json replacer', jsonReplacer);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );
  app.use('/api', cors({ origin: corsOrigins === '*' ? '*' : corsOrigins, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: '16kb' }));

  const cache = new TtlCache(cacheTtlSeconds * 1000);
  const inFlight = new Map();

  /** Cached + deduplicated check. */
  function check(params) {
    const key = JSON.stringify(params);
    const hit = cache.get(key);
    if (hit) return Promise.resolve({ ...hit, cached: true });
    if (inFlight.has(key)) return inFlight.get(key);
    const p = detector
      .check(params)
      .then((r) => {
        cache.set(key, r);
        return r;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  }

  const api = express.Router();
  if (rateLimitPerMinute > 0) {
    const limiter = (limit) =>
      rateLimit({ windowMs: 60_000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests, retry in a minute.' } });
    // A batch runs up to MAX_BATCH checks: it gets a proportionally smaller budget
    api.use('/v1/check/batch', limiter(Math.max(1, Math.floor(rateLimitPerMinute / MAX_BATCH))));
    api.use(['/v1/check', '/:dex/:token/:base'], limiter(rateLimitPerMinute));
  }

  api.get('/v1/health', (_req, res) => res.json({ status: 'ok' }));

  api.get('/v1/chains', (_req, res) => res.json({ chains: detector.listChains() }));

  api.get('/v1/check/:chain/:token', async (req, res) => {
    try {
      res.json(await check(paramsFrom(req.params.chain, req.params.token, req.query)));
    } catch (err) {
      sendError(res, err, log);
    }
  });

  api.post('/v1/check/batch', async (req, res) => {
    const body = req.body ?? {};
    const tokens = body.tokens;
    if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > MAX_BATCH) {
      return res.status(400).json({ error: `"tokens" must be an array of 1-${MAX_BATCH} addresses` });
    }
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          return { token, ok: true, result: await check(paramsFrom(body.chain, token, body)) };
        } catch (err) {
          const { status, message } = errorInfo(err);
          if (status >= 500) log('check failed', err);
          return { token, ok: false, status, error: message };
        }
      })
    );
    res.json({ results });
  });

  // Backwards compatible route of v1 of the project: /api/:dex/:token/:base
  api.get('/:dex/:token/:base', async (req, res) => {
    const legacy = LEGACY_DEXES[req.params.dex.toLowerCase()];
    if (!legacy) return res.status(404).json({ error: true, msg: `Unknown dex ${req.params.dex}` });
    const [chain, dex] = legacy;
    try {
      const result = await check({ chain, token: req.params.token, dex, base: req.params.base.toLowerCase() === 'default' ? 'default' : req.params.base });
      const { status, body } = toLegacyResponse(result);
      res.status(status).json(body);
    } catch (err) {
      if (err instanceof TokenNotFoundError) {
        return res.status(404).json({
          error: true,
          data: { ExError: true, isHoneypot: false, tokenSymbol: null, mainTokenSymbol: null, problem: true, extra: 'Token probably destroyed itself or does not exist!' },
        });
      }
      if (err instanceof InputError) return res.status(400).json({ error: true, msg: err.message });
      log('legacy check failed', err);
      res.status(403).json({ error: true, msg: 'Error testing the honeypot, retry!' });
    }
  });

  api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  // Web app (single page application)
  if (webappDir && existsSync(join(webappDir, 'index.html'))) {
    const dir = resolve(webappDir);
    app.use(express.static(dir, { index: 'index.html', maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => res.sendFile(join(dir, 'index.html')));
  } else {
    app.get('/', (_req, res) =>
      res.json({
        name: 'Crypto Honeypot Detector API',
        docs: 'https://github.com/malvaphe/Crypto_Honeypot_Detector#api',
        example: '/api/v1/check/bsc/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      })
    );
  }

  // Malformed JSON bodies and other errors
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    log('unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function paramsFrom(chain, token, q) {
  const str = (v) => (v === undefined || v === null || v === '' ? undefined : String(v));
  const bool = (v) => (v === undefined ? undefined : v === true || v === 'true' || v === '1');
  const num = (v) => (str(v) === undefined ? undefined : Number(v));
  const params = {
    chain: str(chain),
    token: str(token),
    dex: str(q.dex),
    base: str(q.base),
    fee: num(q.fee),
    router: str(q.router),
    factory: str(q.factory),
    amount: str(q.amount),
    sellPercent: num(q.sellPercent),
    all: bool(q.all),
    walletSimulation: q.wallet === undefined ? undefined : bool(q.wallet),
  };
  for (const k of Object.keys(params)) if (params[k] === undefined) delete params[k];
  return params;
}

function errorInfo(err) {
  if (err instanceof InputError) return { status: 400, message: err.message };
  if (err instanceof TokenNotFoundError) return { status: 404, message: err.message };
  return { status: 502, message: 'Error while querying the blockchain, retry later.' };
}

function sendError(res, err, log) {
  const { status, message } = errorInfo(err);
  if (status >= 500) log('check failed', err);
  res.status(status).json({ error: message });
}
