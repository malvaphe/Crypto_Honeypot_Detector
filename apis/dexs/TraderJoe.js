// Web3js
import Web3 from 'web3';
import { priceImp, maxBuyFee, maxSellFee, AVAXaddress } from '../../config/const.js';
import { AVAXprovider as provider } from '../../startConnection.js';
var web3 = new Web3(provider);

// const
const mainTokenAddress = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'; // WAVAX
const routerAddress = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4';
const multicallAddress = AVAXaddress;
const mainTokentoSell = '0.01';
const maxgas = 2000000;
const minMain = 4;

// ABIs
const routerAbi = [
  {
    inputs: [
      { internalType: 'address', name: '_factory', type: 'address' },
      { internalType: 'address', name: '_WAVAX', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'WAVAX', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'amountB', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountTokenDesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAXMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidityAVAX',
    outputs: [
      { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAX', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  { inputs: [], name: 'factory', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveIn', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveOut', type: 'uint256' },
    ],
    name: 'getAmountIn',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveIn', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveOut', type: 'uint256' },
    ],
    name: 'getAmountOut',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsIn',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveA', type: 'uint256' },
      { internalType: 'uint256', name: 'reserveB', type: 'uint256' },
    ],
    name: 'quote',
    outputs: [{ internalType: 'uint256', name: 'amountB', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'removeLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'amountB', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAXMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'removeLiquidityAVAX',
    outputs: [
      { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAX', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAXMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'removeLiquidityAVAXSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256', name: 'amountAVAX', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAXMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bool', name: 'approveMax', type: 'bool' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'removeLiquidityAVAXWithPermit',
    outputs: [
      { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAX', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAVAXMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bool', name: 'approveMax', type: 'bool' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'removeLiquidityAVAXWithPermitSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256', name: 'amountAVAX', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bool', name: 'approveMax', type: 'bool' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'removeLiquidityWithPermit',
    outputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'amountB', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapAVAXForExactTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactAVAXForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactAVAXForTokensSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForAVAX',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForAVAXSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint256', name: 'amountInMax', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapTokensForExactAVAX',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint256', name: 'amountInMax', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapTokensForExactTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
];
const tokenAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'decimals', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: '_maxTxAmount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
];
const multicallAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'ethtosell',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'gastouse',
            type: 'uint256',
          },
        ],
        internalType: 'struct Multicall.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
      {
        internalType: 'bytes[]',
        name: 'returnData',
        type: 'bytes[]',
      },
      {
        internalType: 'uint256[]',
        name: 'gasUsed',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'rescueBNB',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
    ],
    name: 'getBlockHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockCoinbase',
    outputs: [
      {
        internalType: 'address',
        name: 'coinbase',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockDifficulty',
    outputs: [
      {
        internalType: 'uint256',
        name: 'difficulty',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockGasLimit',
    outputs: [
      {
        internalType: 'uint256',
        name: 'gaslimit',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockTimestamp',
    outputs: [
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'getEthBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLastBlockHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Number of tokens with fixed decimals (return a string)
function setDecimals(number, decimals) {
  number = number.toString();
  var numberAbs = number.split('.')[0];
  var numberDecimals = number.split('.')[1] ? number.split('.')[1] : '';
  while (numberDecimals.length < decimals) {
    numberDecimals += '0';
  }
  return numberAbs + numberDecimals;
}

// Honeypot test
async function testHoneypot(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain) {
  return new Promise(async (resolve) => {
    try {
      // Create contracts
      var mainTokencontract = new web3.eth.Contract(tokenAbi, mainTokenAddress);
      var tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);
      var routerContract = new web3.eth.Contract(routerAbi, routerAddress);
      var multicallContract = new web3.eth.Contract(multicallAbi, multicallAddress);

      // Read decimals and symbols
      var mainTokenDecimals = await mainTokencontract.methods.decimals().call();
      var mainTokensymbol = await mainTokencontract.methods.symbol().call();
      var tokenSymbol = await tokenContract.methods.symbol().call();
      var tokenDecimals = await tokenContract.methods.decimals().call();

      // For swaps, 20 minutes from now in time
      var timeStamp = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);

      // Fixed value of MainTokens to sell
      var mainTokentoSellfixed = setDecimals(mainTokentoSell, mainTokenDecimals);

      // Approve to sell the MainToken in the Dex call
      var approveMainToken = mainTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
      var approveMainTokenABI = approveMainToken.encodeABI();

      // Swap MainToken to Token call
      var swapMainforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSellfixed, 0, [mainTokenAddress, tokenAddress], multicallAddress, timeStamp);
      var swapMainforTokensABI = swapMainforTokens.encodeABI();

      var calls = [
        { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
        { target: routerAddress, callData: swapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
      ];

      // Before running the main multicall
      // Run another multicall that return the number of Tokens expected to receive from the swap (liquidity check also...)
      // We will try to sell half of the expected tokens
      var tokensToSell = null;
      var tokensToSellfixed = null;
      var result = await multicallContract.methods
        .aggregate(calls)
        .call()
        .catch((err) => console.log(err));

      // If error it means there is not enough liquidity
      var error = false;
      if (result.returnData[0] != '0x00' && result.returnData[1] != '0x00') {
        var receivedTokens = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[1]).amounts[1] * 10 ** -tokenDecimals;

        // We will try to sell half of the Tokens
        var fixd = tokenDecimals;
        if (fixd > 8) fixd = 8;
        tokensToSell = parseFloat(receivedTokens / 2).toFixed(fixd);
        tokensToSellfixed = setDecimals(tokensToSell, tokenDecimals);
      } else {
        error = true;
      }

      // Honeypot check variable
      var honeypot = false;
      if (!error) {
        // For checking if some problems and extra messages
        var problem = false;
        var extra = null;

        // Approve to sell the MainToken in the Dex call
        var approveMainToken = mainTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
        var approveMainTokenABI = approveMainToken.encodeABI();

        // Swap MainToken to Token call
        var swapMainforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSellfixed, 0, [mainTokenAddress, tokenAddress], multicallAddress, timeStamp);
        var swapMainforTokensABI = swapMainforTokens.encodeABI();

        // Approve to sell the Token in the Dex call
        var approveToken = tokenContract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
        var approveTokenABI = approveToken.encodeABI();

        // Swap Token to MainToken call
        var swapTokensforMain = routerContract.methods.swapExactTokensForTokens(tokensToSellfixed, 0, [tokenAddress, mainTokenAddress], multicallAddress, timeStamp);
        var swapTokensforMainABI = swapTokensforMain.encodeABI();

        // Swap Token to MainToken call if the previous one fails
        var swapTokensforMainFees = routerContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          tokensToSellfixed,
          0,
          [tokenAddress, mainTokenAddress],
          multicallAddress,
          timeStamp
        );
        var swapTokensforMainFeesABI = swapTokensforMainFees.encodeABI();

        // MainToken Balance call
        var mainTokenBalance = mainTokencontract.methods.balanceOf(multicallAddress);
        var mainTokenBalanceABI = mainTokenBalance.encodeABI();

        // Token Balance call
        var tokenBalance = tokenContract.methods.balanceOf(multicallAddress);
        var tokenBalanceABI = tokenBalance.encodeABI();

        // Expected MainToken from the Token to MainToken swap call
        var amountOut = routerContract.methods.getAmountsOut(tokensToSellfixed, [tokenAddress, mainTokenAddress]);
        var amountOutABI = amountOut.encodeABI();

        // Initial price in MainToken of 1 Token, for calculating price impact
        var amountOutAsk = routerContract.methods.getAmountsOut(setDecimals(1, tokenDecimals), [tokenAddress, mainTokenAddress]);
        var amountOutAskABI = amountOutAsk.encodeABI();
        var initialPrice = 0;
        var finalPrice = 0;
        var priceImpact = 0;
        try {
          initialPrice = await amountOutAsk.call();
          initialPrice = initialPrice[1];
        } catch (err) {}

        // Check if Token has Max Transaction amount
        var maxTokenTransaction = null;
        var maxTokenTransactionMain = null;
        try {
          maxTokenTransaction = await tokenContract.methods._maxTxAmount().call();
          maxTokenTransactionMain = await routerContract.methods.getAmountsOut(maxTokenTransaction, [tokenAddress, mainTokenAddress]).call();
          maxTokenTransactionMain = parseFloat(maxTokenTransactionMain[1] * 10 ** -mainTokenDecimals).toFixed(4);
          maxTokenTransaction = maxTokenTransaction * 10 ** -tokenDecimals;
        } catch (err) {}

        // Calls to run in the multicall
        var calls = [
          { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
          { target: routerAddress, callData: swapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
          { target: tokenAddress, callData: tokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // Token balance
          { target: tokenAddress, callData: approveTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve Token sell
          { target: routerAddress, callData: swapTokensforMainABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
          { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
          { target: routerAddress, callData: amountOutABI, ethtosell: 0, gastouse: maxgas }, // Expected MainToken from the Token to MainToken swap
          { target: routerAddress, callData: swapTokensforMainFeesABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
          { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
          { target: routerAddress, callData: amountOutAskABI, ethtosell: 0, gastouse: maxgas }, // Final price of the Token
        ];

        // Run the multicall
        var result = await multicallContract.methods
          .aggregate(calls)
          .call()
          .catch((err) => console.log(err));

        // Variables useful for calculating fees
        var output = 0; // Expected Tokens
        var realOutput = 0; // Obtained Tokens
        var expected = 0; // Expected MainTokens
        var obtained = 0; // Obtained MainTokens
        var buyGas = 0;
        var sellGas = 0;

        // Simulate the steps
        if (result.returnData[1] != '0x00') {
          output = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[1]).amounts[1] * 10 ** -tokenDecimals;
          buyGas = result.gasUsed[1];
        }
        if (result.returnData[2] != '0x00') {
          realOutput = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[2])[0] * 10 ** -tokenDecimals;
        }
        if (result.returnData[4] != '0x00') {
          obtained = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[4]).amounts[1] * 10 ** -mainTokenDecimals;
          sellGas = result.gasUsed[4];
        } else {
          if (result.returnData[7] != '0x00') {
            obtained = (result.returnData[8] - result.returnData[5]) * 10 ** -mainTokenDecimals;
            sellGas = result.gasUsed[7];
          } else {
            // If so... this is honeypot!
            honeypot = true;
            problem = true;
          }
        }
        if (result.returnData[6] != '0x00') {
          expected = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[6]).amounts[1] * 10 ** -mainTokenDecimals;
        }
        if (result.returnData[9] != '0x00') {
          finalPrice = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[9]).amounts[1];
          priceImpact = parseFloat(((finalPrice - initialPrice) / initialPrice) * 100).toFixed(1);
          if (priceImpact > priceImp) {
            problem = true;
            extra = 'Price change after the swaps is ' + priceImpact + '%, which is really high! (Too high percentages can cause false positives)';
          }
        }

        // Calculate the fees
        var buyTax = ((realOutput - output) / output) * -100;
        var sellTax = ((obtained - expected) / expected) * -100;
        if (buyTax < 0.0) buyTax = 0.0;
        if (sellTax < 0.0) sellTax = 0.0;
        buyTax = parseFloat(buyTax).toFixed(1);
        sellTax = parseFloat(sellTax).toFixed(1);
        if (buyTax > maxBuyFee || sellTax > maxSellFee) {
          problem = true;
        }
        if (maxTokenTransactionMain && maxTokenTransactionMain < minMain) {
          problem = true;
        }

        // Return the result
        resolve({
          isHoneypot: honeypot,
          buyFee: buyTax,
          sellFee: sellTax,
          buyGas: buyGas,
          sellGas: sellGas,
          maxTokenTransaction: maxTokenTransaction,
          maxTokenTransactionMain: maxTokenTransactionMain,
          tokenSymbol: tokenSymbol,
          mainTokenSymbol: mainTokensymbol,
          priceImpact: priceImpact < 0.0 ? '0.0' : priceImpact,
          problem: problem,
          extra: extra,
        });
      } else {
        resolve({
          isHoneypot: false,
          tokenSymbol: tokenSymbol,
          mainTokenSymbol: mainTokensymbol,
          problem: true,
          liquidity: true,
          extra: 'Token liquidity is extremely low or has problems with the purchase!',
        });
      }
    } catch (err) {
      if (err.message.includes('Invalid JSON')) {
        resolve({
          error: true,
        });
      } else {
        // Probably the contract is self-destructed
        resolve({
          ExError: true,
          isHoneypot: false,
          tokenSymbol: null,
          mainTokenSymbol: mainTokensymbol,
          problem: true,
          extra: 'Token probably destroyed itself or does not exist!',
        });
      }
    }
  });
}

// HoneypotPlus test
async function testHoneypotPlus(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain, myToken) {
  return new Promise(async (resolve) => {
    try {
      // Create contracts
      var mainTokencontract = new web3.eth.Contract(tokenAbi, mainTokenAddress);
      var myTokencontract = new web3.eth.Contract(tokenAbi, myToken);
      var tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);
      var routerContract = new web3.eth.Contract(routerAbi, routerAddress);
      var multicallContract = new web3.eth.Contract(multicallAbi, multicallAddress);

      // Read decimals and symbols
      var myTokenDecimals = await myTokencontract.methods.decimals().call();
      var mainTokenDecimals = await mainTokencontract.methods.decimals().call();
      var mainTokensymbol = await mainTokencontract.methods.symbol().call();
      var tokenSymbol = await tokenContract.methods.symbol().call();
      var tokenDecimals = await tokenContract.methods.decimals().call();

      // For swaps, 20 minutes from now in time
      var timeStamp = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);

      // Fixed value of MyToken to sell
      var mainTokentoSellfixed = setDecimals(mainTokentoSell, myTokenDecimals);

      // Approve to sell MyToken in the Dex call
      var approveMyToken = myTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
      var approveMyTokenABI = approveMyToken.encodeABI();

      // Swap MyToken to MainToken call
      var swapMyforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSellfixed, 0, [myToken, mainTokenAddress], multicallAddress, timeStamp);
      var swapMyforTokensABI = swapMyforTokens.encodeABI();

      var calls = [
        { target: myToken, callData: approveMyTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MyToken sell
        { target: routerAddress, callData: swapMyforTokensABI, ethtosell: 0, gastouse: maxgas }, // MyToken -> MainToken
      ];

      // Before running the main multicall
      // Run another multicall that return the number of MainToken expected to receive from the swap
      // We will try to sell half of the expected tokens
      var result = await multicallContract.methods
        .aggregate(calls)
        .call()
        .catch((err) => console.log(err));

      var mainTokentoSell2 = 0;
      var mainTokentoSell2fixed = 0;
      if (result.returnData[0] != '0x00' && result.returnData[1] != '0x00') {
        mainTokentoSell2 = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[1]).amounts[1] * 10 ** -mainTokenDecimals;

        // We will try to sell half of the Tokens
        var fixd = mainTokenDecimals;
        if (fixd > 8) fixd = 8;
        mainTokentoSell2 = parseFloat(mainTokentoSell2 / 2).toFixed(fixd);
        mainTokentoSell2fixed = setDecimals(mainTokentoSell2, mainTokenDecimals);
      }

      // Approve to sell the MainToken in the Dex call
      var approveMainToken = mainTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
      var approveMainTokenABI = approveMainToken.encodeABI();

      // Swap MainToken to Token call
      var swapMainforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSell2fixed, 0, [mainTokenAddress, tokenAddress], multicallAddress, timeStamp);
      var firstSwapMainforTokensABI = swapMainforTokens.encodeABI();

      var calls = [
        { target: myToken, callData: approveMyTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MyToken sell
        { target: routerAddress, callData: swapMyforTokensABI, ethtosell: 0, gastouse: maxgas }, // MyToken -> MainToken
        { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
        { target: routerAddress, callData: firstSwapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
      ];

      // Before running the main multicall
      // Run another multicall that return the number of Tokens expected to receive from the swap (liquidity check also...)
      // We will try to sell half of the expected tokens
      var tokensToSell = null;
      var tokensToSellfixed = null;
      result = await multicallContract.methods
        .aggregate(calls)
        .call()
        .catch((err) => console.log(err));

      // If error it means there is not enough liquidity
      var error = false;
      if (result.returnData[2] != '0x00' && result.returnData[3] != '0x00') {
        var receivedTokens = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[3]).amounts[1] * 10 ** -tokenDecimals;

        // We will try to sell half of the Tokens
        var fixd = tokenDecimals;
        if (fixd > 8) fixd = 8;
        tokensToSell = parseFloat(receivedTokens / 2).toFixed(fixd);
        tokensToSellfixed = setDecimals(tokensToSell, tokenDecimals);
      } else {
        error = true;
      }

      // Honeypot check variable
      var honeypot = false;
      if (!error) {
        // Check if some problems and extra messages
        var problem = false;
        var extra = null;

        // Approve to sell the Token in the Dex call
        var approveToken = tokenContract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
        var approveTokenABI = approveToken.encodeABI();

        // Swap Token to MainToken call
        var swapTokensforMain = routerContract.methods.swapExactTokensForTokens(tokensToSellfixed, 0, [tokenAddress, mainTokenAddress], multicallAddress, timeStamp);
        var swapTokensforMainABI = swapTokensforMain.encodeABI();

        // Swap Token to MainToken call if the previous one fails
        var swapTokensforMainFees = routerContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          tokensToSellfixed,
          0,
          [tokenAddress, mainTokenAddress],
          multicallAddress,
          timeStamp
        );
        var swapTokensforMainFeesABI = swapTokensforMainFees.encodeABI();

        // MainToken Balance call
        var mainTokenBalance = mainTokencontract.methods.balanceOf(multicallAddress);
        var mainTokenBalanceABI = mainTokenBalance.encodeABI();

        // Token Balance call
        var tokenBalance = tokenContract.methods.balanceOf(multicallAddress);
        var tokenBalanceABI = tokenBalance.encodeABI();

        // Expected MainToken from the Token to MainToken swap call
        var amountOut = routerContract.methods.getAmountsOut(tokensToSellfixed, [tokenAddress, mainTokenAddress]);
        var amountOutABI = amountOut.encodeABI();

        // Initial price in MainToken of 1 Token, for calculating price impact
        var amountOutAsk = routerContract.methods.getAmountsOut(setDecimals(1, tokenDecimals), [tokenAddress, mainTokenAddress]);
        var amountOutAskABI = amountOutAsk.encodeABI();
        var initialPrice = 0;
        var finalPrice = 0;
        var priceImpact = 0;
        try {
          initialPrice = await amountOutAsk.call();
          initialPrice = initialPrice[1];
        } catch (err) {}

        // Check if Token has Max Transaction amount
        var maxTokenTransaction = null;
        var maxTokenTransactionMain = null;
        try {
          maxTokenTransaction = await tokenContract.methods._maxTxAmount().call();
          maxTokenTransactionMain = await routerContract.methods.getAmountsOut(maxTokenTransaction, [tokenAddress, mainTokenAddress]).call();
          maxTokenTransactionMain = parseFloat(maxTokenTransactionMain[1] * 10 ** -mainTokenDecimals).toFixed(4);
          maxTokenTransaction = maxTokenTransaction * 10 ** -tokenDecimals;
        } catch (err) {}

        // Calls to run in the multicall
        var calls = [
          { target: myToken, callData: approveMyTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MyToken sell
          { target: routerAddress, callData: swapMyforTokensABI, ethtosell: 0, gastouse: maxgas }, // MyToken -> MainToken
          { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
          { target: routerAddress, callData: firstSwapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
          { target: tokenAddress, callData: tokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // Token balance
          { target: tokenAddress, callData: approveTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve Token sell
          { target: routerAddress, callData: swapTokensforMainABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
          { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
          { target: routerAddress, callData: amountOutABI, ethtosell: 0, gastouse: maxgas }, // Expected MainToken from the Token to MainToken swap
          { target: routerAddress, callData: swapTokensforMainFeesABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
          { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
          { target: routerAddress, callData: amountOutAskABI, ethtosell: 0, gastouse: maxgas }, // Final price of the Token
        ];

        // Run the multicall
        var result = await multicallContract.methods
          .aggregate(calls)
          .call()
          .catch((err) => console.log(err));

        // Variables useful for calculating fees
        var output = 0; // Expected Tokens
        var realOutput = 0; // Obtained Tokens
        var expected = 0; // Expected MainTokens
        var obtained = 0; // Obtained MainTokens
        var buyGas = 0;
        var sellGas = 0;

        // Simulate the steps
        if (result.returnData[3] != '0x00') {
          output = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[3]).amounts[1] * 10 ** -tokenDecimals;
          buyGas = result.gasUsed[3];
        }
        if (result.returnData[4] != '0x00') {
          realOutput = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[4])[0] * 10 ** -tokenDecimals;
        }
        if (result.returnData[6] != '0x00') {
          obtained = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[6]).amounts[1] * 10 ** -mainTokenDecimals;
          sellGas = result.gasUsed[6];
        } else {
          if (result.returnData[9] != '0x00') {
            obtained = (result.returnData[10] - result.returnData[7]) * 10 ** -mainTokenDecimals;
            sellGas = result.gasUsed[9];
          } else {
            // If so... this is honeypot!
            honeypot = true;
            problem = true;
          }
        }
        if (result.returnData[8] != '0x00') {
          expected = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[8]).amounts[1] * 10 ** -mainTokenDecimals;
        }
        if (result.returnData[11] != '0x00') {
          finalPrice = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[11]).amounts[1];
          priceImpact = parseFloat(((finalPrice - initialPrice) / initialPrice) * 100).toFixed(1);
          if (priceImpact > priceImp) {
            problem = true;
            extra = 'Price change after the swaps is ' + priceImpact + '%, which is really high! (Too high percentages can cause false positives)';
          }
        }

        // Calculate the fees
        var buyTax = ((realOutput - output) / output) * -100;
        var sellTax = ((obtained - expected) / expected) * -100;
        if (buyTax < 0.0) buyTax = 0.0;
        if (sellTax < 0.0) sellTax = 0.0;
        buyTax = parseFloat(buyTax).toFixed(1);
        sellTax = parseFloat(sellTax).toFixed(1);
        if (buyTax > maxBuyFee || sellTax > maxSellFee) {
          problem = true;
        }
        if (maxTokenTransactionMain && maxTokenTransactionMain < minMain) {
          problem = true;
        }

        // Return the result
        resolve({
          isHoneypot: honeypot,
          buyFee: buyTax,
          sellFee: sellTax,
          buyGas: buyGas,
          sellGas: sellGas,
          maxTokenTransaction: maxTokenTransaction,
          maxTokenTransactionMain: maxTokenTransactionMain,
          tokenSymbol: tokenSymbol,
          mainTokenSymbol: mainTokensymbol,
          priceImpact: priceImpact < 0.0 ? '0.0' : priceImpact,
          problem: problem,
          extra: extra,
        });
      } else {
        resolve({
          isHoneypot: false,
          tokenSymbol: tokenSymbol,
          mainTokenSymbol: mainTokensymbol,
          problem: true,
          liquidity: true,
          extra: 'Token liquidity is extremely low or has problems with the purchase!',
        });
      }
    } catch (err) {
      if (err.message.includes('Invalid JSON')) {
        resolve({
          error: true,
        });
      } else {
        // Probably the contract is self-destructed
        resolve({
          ExError: true,
          isHoneypot: false,
          tokenSymbol: null,
          mainTokenSymbol: mainTokensymbol,
          problem: true,
          extra: 'Token probably destroyed itself or does not exist!',
        });
      }
    }
  });
}

export async function main(req, res) {
  const tokenAddress = req.params.address;
  if (`${req.params.address2}`.toLowerCase() == mainTokenAddress.toLowerCase() || `${req.params.address2}`.toLowerCase() == 'default') {
    var honeypot = await testHoneypot(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain);
    if (honeypot.error)
      return res.status(403).json({
        error: true,
        msg: 'Error testing the honeypot, retry!',
      });
    if (honeypot.ExError)
      return res.status(404).json({
        error: true,
        data: honeypot,
      });
    res.json({
      data: honeypot,
    });
  } else {
    var honeypotPlus = await testHoneypotPlus(web3, tokenAddress, req.params.address2, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain, mainTokenAddress);
    if (honeypotPlus.error)
      return res.status(403).json({
        error: true,
        msg: 'Error testing the honeypot, retry!',
      });
    if (honeypotPlus.ExError)
      return res.status(404).json({
        error: true,
        data: honeypotPlus,
      });
    res.json({
      data: honeypotPlus,
    });
  }
}
