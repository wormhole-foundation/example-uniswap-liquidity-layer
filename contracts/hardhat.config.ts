import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();
const zaddr =
  "0000000000000000000000000000000000000000000000000000000000000000";
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_URL ? process.env.MAINNET_URL : zaddr,
        blockNumber: 14546835,
      },
      mining: {
        auto: true,
      },
    },
    mainnet: {
      url: process.env.MAINNET_URL ? process.env.MAINNET_URL : zaddr,
      accounts: [
        process.env.MAINNET_PRIVATE_KEY
          ? process.env.MAINNET_PRIVATE_KEY
          : zaddr,
        process.env.PERSONAL_PRIVATE_KEY
          ? process.env.PERSONAL_PRIVATE_KEY
          : zaddr
      ],
      minGasPrice: 32000000000,
    },
    op: {
      url: process.env.OP_URL ? process.env.OP_URL : zaddr,
      accounts: [
        process.env.MAINNET_PRIVATE_KEY
          ? process.env.MAINNET_PRIVATE_KEY
          : zaddr,
        process.env.PERSONAL_PRIVATE_KEY
          ? process.env.PERSONAL_PRIVATE_KEY
          : zaddr
      ],
      minGasPrice: 32000000000,
      chainId: 10

    },
    goerli: {
      url: process.env.GOERLI_URL ? process.env.GOERLI_URL : zaddr,
      accounts: [
        process.env.MAINNET_PRIVATE_KEY
          ? process.env.MAINNET_PRIVATE_KEY
          : zaddr
      ],
      minGasPrice: 32000000000,
      chainId: 5
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              orderLiterals: true,
              deduplicate: true,
              cse: true,
              yul: true,
            },
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.API_KEY!,
      goerli: process.env.API_KEY!,
      polygon: process.env.ETHERSCAN_POLYGON_KEY!,
      optimisticEthereum: process.env.OP_KEY!
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
    alwaysGenerateOverloads: true, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  }
};

export default config;
