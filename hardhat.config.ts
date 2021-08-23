import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@typechain/hardhat/dist/type-extensions';
import 'dotenv/config';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import { removeConsoleLog } from 'hardhat-preprocessor';
import { HardhatUserConfig, NetworksUserConfig } from 'hardhat/types';
import 'solidity-coverage';
import 'tsconfig-paths/register';
import { accounts, getNodeUrl } from './utils/network';

const networks: NetworksUserConfig = process.env.TEST
  ? {}
  : {
      hardhat: {
        forking: {
          enabled: process.env.FORK ? true : false,
          url: getNodeUrl('ropsten'),
        },
      },
      localhost: {
        url: getNodeUrl('localhost'),
        accounts: accounts('localhost'),
      },
      kovan: {
        url: getNodeUrl('kovan'),
        accounts: accounts('kovan'),
        gasPrice: 'auto',
      },
      rinkeby: {
        url: getNodeUrl('rinkeby'),
        accounts: accounts('rinkeby'),
        gasPrice: 'auto',
      },
      ropsten: {
        url: getNodeUrl('ropsten'),
        accounts: accounts('ropsten'),
        gasPrice: 'auto',
      },
      mainnet: {
        url: getNodeUrl('mainnet'),
        accounts: accounts('mainnet'),
        gasPrice: 'auto',
      },
    };

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks,
  solidity: {
    compilers: [
      {
        version: '0.8.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
  },
  gasReporter: {
    currency: process.env.COINMARKETCAP_DEFAULT_CURRENCY || 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    enabled: process.env.REPORT_GAS ? true : false,
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat'),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: 'typechained',
    target: 'ethers-v5',
  },
  namedAccounts: {
    deployer: 0,
    governor: 1,
  },
  paths: {
    sources: './solidity',
  },
};

export default config;
