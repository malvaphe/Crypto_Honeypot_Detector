import fetch from 'node-fetch';

// Web3js
import Web3 from 'web3';
import { priceImp, maxBuyFee, maxSellFee, ETHERaddress } from '../../config/const.js';
import { ETHERprovider as provider } from '../../startConnection.js';
var web3 = new Web3(provider);

// const
const mainTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
const routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const multicallAddress = ETHERaddress;
const mainTokentoSell = '0.0005';
const maxgas = 2000000;
const minMain = 1;

// ABIs
const routerAbi = [
  {
    inputs: [
      { internalType: 'address', name: '_factory', type: 'address' },
      { internalType: 'address', name: '_WETH9', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'WETH9', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
        ],
        internalType: 'struct ISwapRouter.ExactInputParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInput',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
          { internalType: 'uint256', name: 'amountInMaximum', type: 'uint256' },
        ],
        internalType: 'struct ISwapRouter.ExactOutputParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactOutput',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
          { internalType: 'uint256', name: 'amountInMaximum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactOutputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactOutputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  { inputs: [], name: 'factory', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  { inputs: [], name: 'refundETH', outputs: [], stateMutability: 'payable', type: 'function' },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'selfPermit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'selfPermitAllowed',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'selfPermitAllowedIfNecessary',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'selfPermitIfNecessary',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
    ],
    name: 'sweepToken',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' },
    ],
    name: 'sweepTokenWithFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'int256', name: 'amount0Delta', type: 'int256' },
      { internalType: 'int256', name: 'amount1Delta', type: 'int256' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
    ],
    name: 'uniswapV3SwapCallback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
    ],
    name: 'unwrapWETH9',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' },
    ],
    name: 'unwrapWETH9WithFee',
    outputs: [],
    stateMutability: 'payable',
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

// Get pair fee
async function getFee(token0, token1) {
  return new Promise(async (resolve) => {
    var error = false;
    var fee = 0;
    var response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
      method: 'POST',
      headesrs: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query:
          `
            {
               pools(where:{
                 token0:"` +
          token0 +
          `",
                 token1:"` +
          token1 +
          `"
               }){
                 feeTier
               }
             }
   `,
      }),
    });
    var responseBody = await response.json();
    if (responseBody.data && responseBody.data.pools) {
      if (responseBody.data.pools.length > 0) {
        fee = responseBody.data.pools[0].feeTier;
      }
    } else {
      error = true;
    }
    response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
      method: 'POST',
      headesrs: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query:
          `
            {
               pools(where:{
                 token0:"` +
          token1 +
          `",
                 token1:"` +
          token0 +
          `"
               }){
                 feeTier
               }
             }
   `,
      }),
    });
    responseBody = await response.json();
    if (responseBody.data && responseBody.data.pools) {
      if (responseBody.data.pools.length > 0) {
        fee = responseBody.data.pools[0].feeTier;
      }
    } else {
      error = true;
    }
    resolve({
      error: error,
      fee: fee,
    });
  });
}

// Honeypot test
async function testHoneypot(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain, fee) {
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
      var swapMainforTokens = routerContract.methods.exactInputSingle({
        tokenIn: mainTokenAddress,
        tokenOut: tokenAddress,
        fee: fee,
        recipient: multicallAddress,
        deadline: timeStamp,
        amountIn: mainTokentoSellfixed,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      });
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
        var receivedTokens = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[1]).amountOut * 10 ** -tokenDecimals;

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
        var swapMainforTokens = routerContract.methods.exactInputSingle({
          tokenIn: mainTokenAddress,
          tokenOut: tokenAddress,
          fee: fee,
          recipient: multicallAddress,
          deadline: timeStamp,
          amountIn: mainTokentoSellfixed,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        var swapMainforTokensABI = swapMainforTokens.encodeABI();

        // Approve to sell the Token in the Dex call
        var approveToken = tokenContract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
        var approveTokenABI = approveToken.encodeABI();

        // Swap Token to MainToken call
        var swapTokensforMain = routerContract.methods.exactInputSingle({
          tokenIn: tokenAddress,
          tokenOut: mainTokenAddress,
          fee: fee,
          recipient: multicallAddress,
          deadline: timeStamp,
          amountIn: tokensToSellfixed,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        var swapTokensforMainABI = swapTokensforMain.encodeABI();

        // MainToken Balance call
        var mainTokenBalance = mainTokencontract.methods.balanceOf(multicallAddress);
        var mainTokenBalanceABI = mainTokenBalance.encodeABI();

        // Token Balance call
        var tokenBalance = tokenContract.methods.balanceOf(multicallAddress);
        var tokenBalanceABI = tokenBalance.encodeABI();

        // Initial price in MainToken of 1 Token, for calculating price impact
        var initialPrice = 0;
        var finalPrice = 0;
        var priceImpact = 0;

        // Check if Token has Max Transaction amount
        var maxTokenTransaction = null;
        var maxTokenTransactionMain = null;
        try {
          maxTokenTransaction = await tokenContract.methods._maxTxAmount().call();
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
          { target: routerAddress, callData: swapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
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
          output = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[1]).amountOut * 10 ** -tokenDecimals;
          initialPrice = output;
          buyGas = result.gasUsed[1];
        }
        if (result.returnData[2] != '0x00') {
          realOutput = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[2])[0] * 10 ** -tokenDecimals;
        }
        if (result.returnData[4] != '0x00') {
          expected = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[4]).amountOut * 10 ** -mainTokenDecimals;
          sellGas = result.gasUsed[4];
        } else {
          // If so... this is honeypot!
          honeypot = true;
          problem = true;
        }
        if (result.returnData[5] != '0x00') {
          obtained = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[5])[0] * 10 ** -mainTokenDecimals;
        }
        if (result.returnData[6] != '0x00') {
          finalPrice = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[6]).amountOut * 10 ** -tokenDecimals;
          priceImpact = parseFloat(((initialPrice - finalPrice) / finalPrice) * 100).toFixed(1);
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
          priceImpact: priceImpact,
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
async function testHoneypotPlus(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain, myToken, fee, fee2) {
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

      // Approve to sell the MyToken in the Dex call
      var approveMyToken = myTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
      var approveMyTokenABI = approveMyToken.encodeABI();

      // Swap MyToken to MainToken call
      var swapMyforTokens = routerContract.methods.exactInputSingle({
        tokenIn: myToken,
        tokenOut: mainTokenAddress,
        fee: fee2,
        recipient: multicallAddress,
        deadline: timeStamp,
        amountIn: mainTokentoSellfixed,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      });
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
        mainTokentoSell2 = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[1]).amountOut * 10 ** -mainTokenDecimals;

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
      var swapMainforTokens = routerContract.methods.exactInputSingle({
        tokenIn: mainTokenAddress,
        tokenOut: tokenAddress,
        fee: fee,
        recipient: multicallAddress,
        deadline: timeStamp,
        amountIn: mainTokentoSell2fixed,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      });
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
        var receivedTokens = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[3]).amountOut * 10 ** -tokenDecimals;

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
        var swapMainforTokens = routerContract.methods.exactInputSingle({
          tokenIn: mainTokenAddress,
          tokenOut: tokenAddress,
          fee: fee,
          recipient: multicallAddress,
          deadline: timeStamp,
          amountIn: mainTokentoSellfixed,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        var swapMainforTokensABI = swapMainforTokens.encodeABI();

        // Approve to sell the Token in the Dex call
        var approveToken = tokenContract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
        var approveTokenABI = approveToken.encodeABI();

        // Swap Token to MainToken call
        var swapTokensforMain = routerContract.methods.exactInputSingle({
          tokenIn: tokenAddress,
          tokenOut: mainTokenAddress,
          fee: fee,
          recipient: multicallAddress,
          deadline: timeStamp,
          amountIn: tokensToSellfixed,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        var swapTokensforMainABI = swapTokensforMain.encodeABI();

        // MainToken Balance call
        var mainTokenBalance = mainTokencontract.methods.balanceOf(multicallAddress);
        var mainTokenBalanceABI = mainTokenBalance.encodeABI();

        // Token Balance call
        var tokenBalance = tokenContract.methods.balanceOf(multicallAddress);
        var tokenBalanceABI = tokenBalance.encodeABI();

        // Initial price in MainToken of 1 Token, for calculating price impact
        var initialPrice = 0;
        var finalPrice = 0;
        var priceImpact = 0;

        // Check if Token has Max Transaction amount
        var maxTokenTransaction = null;
        var maxTokenTransactionMain = null;
        try {
          maxTokenTransaction = await tokenContract.methods._maxTxAmount().call();
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
          { target: routerAddress, callData: firstSwapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
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
          output = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[3]).amountOut * 10 ** -tokenDecimals;
          initialPrice = output;
          buyGas = result.gasUsed[3];
        }
        if (result.returnData[4] != '0x00') {
          realOutput = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[4])[0] * 10 ** -tokenDecimals;
        }
        if (result.returnData[6] != '0x00') {
          expected = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[6]).amountOut * 10 ** -mainTokenDecimals;
          sellGas = result.gasUsed[6];
        } else {
          // If so... this is honeypot!
          honeypot = true;
          problem = true;
        }
        if (result.returnData[7] != '0x00') {
          obtained = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[7])[0] * 10 ** -mainTokenDecimals;
        }
        if (result.returnData[8] != '0x00') {
          finalPrice = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }], result.returnData[8]).amountOut * 10 ** -tokenDecimals;
          priceImpact = parseFloat(((initialPrice - finalPrice) / finalPrice) * 100).toFixed(1);
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
          priceImpact: priceImpact,
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
  var getFeeResult;
  if (`${req.params.address2}`.toLowerCase() == 'default') {
    getFeeResult = await getFee(`${req.params.address}`.toLowerCase(), mainTokenAddress.toLowerCase());
  } else {
    getFeeResult = await getFee(`${req.params.address}`.toLowerCase(), `${req.params.address2}`.toLowerCase());
  }
  var fee = getFeeResult.fee;

  if (!getFeeResult.error) {
    if (`${req.params.address2}`.toLowerCase() == mainTokenAddress.toLowerCase() || `${req.params.address2}`.toLowerCase() == 'default') {
      var honeypot = await testHoneypot(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain, fee);
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
      var getFeeResult;
      // It should exist
      getFeeResult = await getFee(`${req.params.address2}`.toLowerCase(), mainTokenAddress.toLowerCase());
      var fee2 = getFeeResult.fee;
      var honeypotPlus = await testHoneypotPlus(
        web3,
        tokenAddress,
        req.params.address2,
        routerAddress,
        multicallAddress,
        mainTokentoSell,
        maxgas,
        minMain,
        mainTokenAddress,
        fee,
        fee2
      );
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
  } else {
    res.status(403).json({
      error: true,
      msg: 'This pair does not exist!',
    });
  }
}
