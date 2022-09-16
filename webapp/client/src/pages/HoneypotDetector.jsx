// Main
import React, { useState, useRef } from 'react';
import {
  PancakeSwapApi,
  SushiSwapApi,
  UniSwap2Api,
  UniSwap3Api,
  TraderJoeApi,
  PangolinApi,
  SpookySwapApi,
  QuickSwapApi,
  HoneySwapApi
} from '../const';

// User services for api
import UserService from '../services/user.service';

function HoneypotDetector() {
  // Auto detect main token
  async function autoDetect() {
    var theToken = token.toLowerCase();
    var pairs = [];
    switch (dex) {
      case 'PancakeSwap':
        var response = await fetch(PancakeSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(PancakeSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'SushiSwap':
        var response = await fetch(SushiSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(SushiSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'UniSwap2':
        var response = await fetch(UniSwap2Api, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(UniSwap2Api, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'UniSwap3':
        var response = await fetch(UniSwap3Api, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pools(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:totalValueLockedUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          totalValueLockedUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pools && responseBody.data.pools.length > 0) {
          for (var i = 0; i < responseBody.data.pools.length; i++) {
            pairs.push({
              token: responseBody.data.pools[i].token1.id,
              usd: responseBody.data.pools[i].totalValueLockedUSD
            });
          }
        }
        response = await fetch(UniSwap3Api, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pools(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:totalValueLockedUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          totalValueLockedUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pools && responseBody.data.pools.length > 0) {
          for (var i = 0; i < responseBody.data.pools.length; i++) {
            pairs.push({
              token: responseBody.data.pools[i].token0.id,
              usd: responseBody.data.pools[i].totalValueLockedUSD
            });
          }
        }
        break;
      case 'TraderJoe':
        var response = await fetch(TraderJoeApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(TraderJoeApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'Pangolin':
        var response = await fetch(PangolinApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(PangolinApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'SpookySwap':
        var response = await fetch(SpookySwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(SpookySwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'QuickSwap':
        var response = await fetch(QuickSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(QuickSwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      case 'HoneySwap':
        var response = await fetch(HoneySwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token0:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token1 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        var responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token1.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        response = await fetch(HoneySwapApi, {
          method: 'POST',
          headesrs: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            query:
              `
                     {
                        pairs(where:{
                          token1:"` +
              theToken +
              `"
                        } orderBy:reserveUSD, orderDirection:desc){
                          token0 {
                            id
                          }
                          reserveUSD
                        }
                      }
            `
          })
        });
        responseBody = await response.json();
        if (responseBody.data && responseBody.data.pairs && responseBody.data.pairs.length > 0) {
          for (var i = 0; i < responseBody.data.pairs.length; i++) {
            pairs.push({ token: responseBody.data.pairs[i].token0.id, usd: responseBody.data.pairs[i].reserveUSD });
          }
        }
        break;
      default:
        console.log(`Bro!`);
    }
    if (pairs.length == 0) {
      return 'default';
    } else {
      var best = pairs[0].usd;
      var bestToken = pairs[0].token;
      for (var i = 1; i < pairs.length; i++) {
        if (pairs[i].usd > best) {
          best = pairs[i].usd;
          bestToken = pairs[i].token;
        }
      }
      return bestToken;
    }
  }

  // Chains
  const chains = ['BSC', 'ETH', 'AVAX', 'FTM', 'MATIC', 'XDAI'];
  const [chain, setChain] = useState('BSC');
  const onChangeChain = (e) => {
    const chain = e.target.value;
    setChain(chain);
    switch (e.target.value) {
      case 'BSC':
        setDexs(['PancakeSwap']);
        setDex('PancakeSwap');
        break;
      case 'ETH':
        setDexs(['SushiSwap', 'UniSwap2', 'UniSwap3']);
        setDex('SushiSwap');
        break;
      case 'AVAX':
        setDexs(['TraderJoe', 'Pangolin']);
        setDex('TraderJoe');
        break;
      case 'FTM':
        setDexs(['SpookySwap']);
        setDex('SpookySwap');
        break;
      case 'MATIC':
        setDexs(['QuickSwap']);
        setDex('QuickSwap');
        break;
      case 'XDAI':
        setDexs(['HoneySwap']);
        setDex('HoneySwap');
        break;
      default:
        console.log(`There is no dex for this chain.`);
    }
  };

  // Dexs
  const [dexs, setDexs] = useState(['PancakeSwap']);
  const [dex, setDex] = useState('PancakeSwap');
  const onChangeDex = (e) => {
    const dex = e.target.value;
    setDex(dex);
  };

  // Options
  const options = ['Use default wrapped token', 'Auto detect', 'Specify the token'];
  const [option, setOption] = useState('Use default wrapped token');
  const [visibleBuy, setVisibleBuy] = useState(false);
  const onChangeOption = (e) => {
    const option = e.target.value;
    setOption(option);
    switch (e.target.value) {
      case 'Use default wrapped token':
        setMaintoken('default');
        setVisibleBuy(false);
        break;
      case 'Auto detect':
        setMaintoken('autodetect');
        setVisibleBuy(false);
        break;
      case 'Specify the token':
        setMaintoken('0xmaintokenaddress');
        setVisibleBuy(true);
        break;
      default:
        console.log(`What are you doing?`);
    }
  };

  // Form
  const form = useRef();
  const [token, setToken] = useState('');
  const [maintoken, setMaintoken] = useState('default');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(false);
  const onChangeToken = (e) => {
    const token = e.target.value;
    setToken(token);
  };
  const onChangeMaintoken = (e) => {
    const maintoken = e.target.value;
    setMaintoken(maintoken);
  };

  // When submit the form
  const handleCheck = async (e) => {
    setResult(false);
    setLoading(true);
    e.preventDefault();
    var honey = maintoken;
    if (maintoken === 'autodetect') {
      honey = await autoDetect();
    }
    UserService.honeypotcheck(dex.toLowerCase(), token.toLowerCase(), honey.toLowerCase()).then(
      (response) => {
        setResult(response.data.data);
        setLoading(false);
      },
      (error) => {
        //setResult(error.response.data);
        console.log(error);
        setLoading(false);
      }
    );
  };

  // Return
  return (
    <div className='flex flex-col min-h-screen overflow-hidden'>
      <main className='grow'>
        <section>
          <div className='max-w-6xl mx-auto px-4 sm:px-6'>
            <div className='pt-32 pb-12 md:pt-40 md:pb-20'>
              <div className='max-w-3xl mx-auto text-center pb-12 md:pb-16'>
                <h1 className='h1' data-aos='zoom-y-out'>
                  <span className='text-yellow-300'>Honeypot detector</span> for all chains. Choose a chain, a dex and
                  the token.
                </h1>
              </div>
              <form
                className='max-w-xl mx-auto'
                data-aos='zoom-y-out'
                data-aos-delay='150'
                onSubmit={handleCheck}
                ref={form}
              >
                <div className='flex flex-wrap -mx-3 mb-4'>
                  <div className='w-full px-3'>
                    <label className='block text-gray-800 text-sm font-medium mb-1' htmlFor='chain'>
                      Chain
                    </label>
                    <select
                      id='chain'
                      className='form-select w-full text-gray-500'
                      value={chain}
                      onChange={onChangeChain}
                    >
                      {chains.map((chain) => (
                        <option key={chain} value={chain}>
                          {chain}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className='flex flex-wrap -mx-3 mb-4'>
                  <div className='w-full px-3'>
                    <label className='block text-gray-800 text-sm font-medium mb-1' htmlFor='dex'>
                      Dex
                    </label>
                    <select id='dex' className='form-select w-full text-gray-500' value={dex} onChange={onChangeDex}>
                      {dexs.map((dex) => (
                        <option key={dex} value={dex}>
                          {dex}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className='flex flex-wrap -mx-3 mb-4'>
                  <div className='w-full md:w-1/2 px-3 mb-4 md:mb-0'>
                    <label className='block text-gray-800 text-sm font-medium mb-1' htmlFor='token'>
                      Token address <span className='text-red-600'>*</span>
                    </label>
                    <input
                      id='token'
                      type='text'
                      className='form-input w-full text-gray-800'
                      placeholder='Enter the token address'
                      value={token}
                      onChange={onChangeToken}
                      required
                    />
                  </div>
                  <div className='w-full md:w-1/2 px-3'>
                    <label className='block text-gray-800 text-sm font-medium mb-1' htmlFor='buywith'>
                      Buy with <span className='text-red-600'></span>
                    </label>
                    <select
                      id='dex'
                      className='form-select w-full text-gray-500'
                      value={option}
                      onChange={onChangeOption}
                    >
                      {options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {visibleBuy && (
                  <div className='flex flex-wrap -mx-3 mb-4'>
                    <div className='w-full px-3'>
                      <label className='block text-gray-800 text-sm font-medium mb-1' htmlFor='token'>
                        Main token address <span className='text-red-600'>*</span>
                      </label>
                      <input
                        id='token'
                        type='text'
                        className='form-input w-full text-gray-800'
                        placeholder='Enter the token address'
                        value={maintoken}
                        onChange={onChangeMaintoken}
                        required
                      />
                    </div>
                  </div>
                )}
                <div className='flex flex-wrap -mx-3 mt-4'>
                  <div className='w-full px-3'>
                    <button className='btn text-white bg-yellow-300 hover:bg-yellow-400 w-full' disabled={loading}>
                      {loading && (
                        <svg
                          role='status'
                          className='inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 fill-yellow-500'
                          viewBox='0 0 100 101'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                            fill='currentColor'
                          />
                          <path
                            d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                            fill='currentFill'
                          />
                        </svg>
                      )}
                      Is this token an honeypot?
                    </button>
                    <p className='text-center'>
                      Made with Love by <a href='https://github.com/malvaphe'>@malvaphe.</a>
                    </p>
                  </div>
                </div>
              </form>
            </div>
            {result &&
              (result.problem || result.error ? (
                <div className='max-w-6xl mx-auto px-4 sm:px-6' data-aos='zoom-y-out'>
                  <div className='pb-12 md:pb-20'>
                    <div className='bg-red-500 rounded py-10 px-8 md:py-16 md:px-12 shadow-2xl' data-aos='zoom-y-out'>
                      {result.data && result.data.ExError ? (
                        <div className='flex flex-col lg:flex-row justify-between items-center'>
                          <div className='mb-6 lg:mr-16 lg:mb-0 text-center lg:text-left'>
                            <h3 className='h3 text-white mb-2'>We can't test this token!</h3>
                            <p className='text-white text-lg opacity-75'>{result.data.extra}</p>
                          </div>
                        </div>
                      ) : result.error ? (
                        <div className='flex flex-col lg:flex-row justify-between items-center'>
                          <div className='mb-6 lg:mr-16 lg:mb-0 text-center lg:text-left'>
                            <h3 className='h3 text-white mb-2'>We can't test this token!</h3>
                            <p className='text-white text-lg opacity-75'>{result.msg}</p>
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col lg:flex-row justify-between items-center'>
                          <div className='mb-6 lg:mr-16 lg:mb-0 text-center lg:text-left'>
                            <h3 className='h3 text-white mb-2'>This token ({result.tokenSymbol}) is Dangerous!</h3>
                            <p className='text-white text-lg opacity-75'>
                              {'Is this token an honeypot? ' + result.isHoneypot}
                            </p>
                            {result.mainTokenSymbol && (
                              <p className='text-white text-lg opacity-75'>
                                {'Token used to purchase the token: ' + result.mainTokenSymbol}
                              </p>
                            )}
                            {result.buyGas && (
                              <p className='text-white text-lg opacity-75'>
                                {'Gas used to buy the token: ' + result.buyGas}
                              </p>
                            )}
                            {result.sellGas != 0 && (
                              <p className='text-white text-lg opacity-75'>
                                {'Gas used to sell the token: ' + result.sellGas}
                              </p>
                            )}
                            {result.buyFee && (
                              <p className='text-white text-lg opacity-75'>{'Buy fee: ' + result.buyFee + '%'}</p>
                            )}
                            {result.sellFee && (
                              <p className='text-white text-lg opacity-75'>{'Sell fee: ' + result.sellFee + '%'}</p>
                            )}
                            {result.maxTokenTransaction && (
                              <p className='text-white text-lg opacity-75'>
                                {'Token has max allowed transaction amount: ' +
                                  result.maxTokenTransaction +
                                  ' ' +
                                  result.tokenSymbol}
                              </p>
                            )}
                            {result.maxTokenTransactionMain && (
                              <p className='text-white text-lg opacity-75'>
                                {'with is like: ' + result.maxTokenTransactionMain + ' ' + result.mainTokenSymbol}
                              </p>
                            )}
                            {result.priceImpact && (
                              <p className='text-white text-lg opacity-75'>
                                {'Price impact of the transaction: ' + result.priceImpact + '%'}
                              </p>
                            )}
                            {result.extra && <p className='text-white text-lg opacity-75'>{result.extra}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='max-w-6xl mx-auto px-4 sm:px-6' data-aos='zoom-y-out'>
                  <div className='pb-12 md:pb-20'>
                    <div className='bg-green-500 rounded py-10 px-8 md:py-16 md:px-12 shadow-2xl' data-aos='zoom-y-out'>
                      <div className='flex flex-col lg:flex-row justify-between items-center'>
                        <div className='mb-6 lg:mr-16 lg:mb-0 text-center lg:text-left'>
                          <h3 className='h3 text-white mb-2'>This token ({result.tokenSymbol}) seems to be safe.</h3>
                          <p className='text-white text-lg opacity-75'>
                            {'Is this token an honeypot? ' + result.isHoneypot}
                          </p>
                          {result.mainTokenSymbol && (
                            <p className='text-white text-lg opacity-75'>
                              {'Token used to purchase the token: ' + result.mainTokenSymbol}
                            </p>
                          )}
                          {result.buyGas && (
                            <p className='text-white text-lg opacity-75'>
                              {'Gas used to buy the token: ' + result.buyGas}
                            </p>
                          )}
                          {result.sellGas != 0 && (
                            <p className='text-white text-lg opacity-75'>
                              {'Gas used to sell the token: ' + result.sellGas}
                            </p>
                          )}
                          {result.buyFee && (
                            <p className='text-white text-lg opacity-75'>{'Buy fee: ' + result.buyFee + '%'}</p>
                          )}
                          {result.sellFee && (
                            <p className='text-white text-lg opacity-75'>{'Sell fee: ' + result.sellFee + '%'}</p>
                          )}
                          {result.maxTokenTransaction && (
                            <p className='text-white text-lg opacity-75'>
                              {'Token has max allowed transaction amount: ' +
                                result.maxTokenTransaction +
                                ' ' +
                                result.tokenSymbol}
                            </p>
                          )}
                          {result.maxTokenTransactionMain && (
                            <p className='text-white text-lg opacity-75'>
                              {'with is like: ' + result.maxTokenTransactionMain + ' ' + result.mainTokenSymbol}
                            </p>
                          )}
                          {result.priceImpact && (
                            <p className='text-white text-lg opacity-75'>
                              {'Price impact of the transaction: ' + result.priceImpact + '%'}
                            </p>
                          )}
                          {result.extra && <p className='text-white text-lg opacity-75'>{result.extra}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HoneypotDetector;
