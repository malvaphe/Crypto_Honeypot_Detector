// For making the apis
import express from 'express';
const router = express.Router();

// Functions
import { main as PancakeSwap } from './dexs/PancakeSwap.js';
import { main as TraderJoe } from './dexs/TraderJoe.js';
import { main as Pangolin } from './dexs/Pangolin.js';
import { main as SpookySwap } from './dexs/SpookySwap.js';
import { main as QuickSwap } from './dexs/QuickSwap.js';
import { main as HoneySwap } from './dexs/HoneySwap.js';
import { main as SushiSwap } from './dexs/SushiSwap.js';
import { main as UniSwap2 } from './dexs/UniSwap2.js';
import { main as UniSwap3 } from './dexs/UniSwap3.js';

// Honeypot detector apis
router.get('/pancakeswap/:address/:address2', PancakeSwap);
router.get('/traderjoe/:address/:address2', TraderJoe);
router.get('/pangolin/:address/:address2', Pangolin);
router.get('/spookyswap/:address/:address2', SpookySwap);
router.get('/quickswap/:address/:address2', QuickSwap);
router.get('/honeyswap/:address/:address2', HoneySwap);
router.get('/sushiswap/:address/:address2', SushiSwap);
router.get('/uniswap2/:address/:address2', UniSwap2);
router.get('/uniswap3/:address/:address2', UniSwap3);

export default router;
