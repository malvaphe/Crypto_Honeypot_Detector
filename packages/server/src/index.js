// Entry point: configuration from environment variables (and an optional .env file).
import { fileURLToPath } from 'node:url';
import { createDetector } from '@honeypot-detector/core';
import { createApp } from './app.js';

try {
  process.loadEnvFile();
} catch {
  // no .env file
}

const env = process.env;
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const thresholds = {};
if (env.MAX_BUY_TAX) thresholds.maxBuyTax = Number(env.MAX_BUY_TAX);
if (env.MAX_SELL_TAX) thresholds.maxSellTax = Number(env.MAX_SELL_TAX);
if (env.HONEYPOT_TAX) thresholds.honeypotTax = Number(env.HONEYPOT_TAX);

const detector = createDetector({ thresholds });
const defaultWebapp = fileURLToPath(new URL('../../webapp/dist', import.meta.url));

const app = createApp({
  detector,
  corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((s) => s.trim()) : '*',
  rateLimitPerMinute: num(env.RATE_LIMIT_PER_MINUTE, 30),
  cacheTtlSeconds: num(env.CACHE_TTL_SECONDS, 30),
  webappDir: env.WEBAPP_DIR === '' ? null : (env.WEBAPP_DIR ?? defaultWebapp),
  trustProxy: env.TRUST_PROXY === undefined ? false : /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY === 'true',
});

const port = num(env.PORT, 8080);
const host = env.HOST ?? '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Crypto Honeypot Detector running on http://localhost:${port}`);
  console.log(`Try it: http://localhost:${port}/api/v1/check/bsc/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82`);
});
