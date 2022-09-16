import {
  // Http providers
  BSChttpprovider,
  ETHERhttpprovider,
  AVAXhttpprovider,
  FTMhttpprovider,
  MATIChttpprovider,
  XDAIhttpprovider,
} from './config/const.js';

// For Web3 connection
import Web3 from 'web3';

const options = {
  keepAlive: true,
  timeout: 10000,
};

export const BSCprovider = new Web3.providers.HttpProvider(BSChttpprovider, options);
export const FTMprovider = new Web3.providers.HttpProvider(FTMhttpprovider, options);
export const ETHERprovider = new Web3.providers.HttpProvider(ETHERhttpprovider, options);
export const AVAXprovider = new Web3.providers.HttpProvider(AVAXhttpprovider, options);
export const MATICprovider = new Web3.providers.HttpProvider(MATIChttpprovider, options);
export const XDAIprovider = new Web3.providers.HttpProvider(XDAIhttpprovider, options);
