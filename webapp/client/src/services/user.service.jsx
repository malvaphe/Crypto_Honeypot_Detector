// For doing the requestes
import axios from 'axios';

// For apis requests
import { apisUrl } from '../const';

// Honeypot check
const honeypotcheck = (dex, address, address2) => {
  return axios.get(apisUrl + dex + '/' + address + '/' + address2);
};

const UserService = {
  honeypotcheck
};
export default UserService;
