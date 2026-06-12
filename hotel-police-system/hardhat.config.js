/**
 * @title Hardhat Configuration
 * @dev Configuration file for the Hotel-Police Collaboration System
 * @notice Sets up the development environment with Solidity, networks, and testing tools
 */

require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-deploy");
require("dotenv").config();

// Helper function to load environment variables with defaults
function getEnvVariable(name, defaultValue) {
  const value = process.env[name];
  return value !== undefined ? value : defaultValue;
}

// Load private keys from environment variables
const PRIVATE_KEYS = [
  getEnvVariable("PRIVATE_KEY_1", ""),
  getEnvVariable("PRIVATE_KEY_2", ""),
  getEnvVariable("PRIVATE_KEY_3", ""),
].filter(key => key !== "");

// Load provider URLs
const MAINNET_URL = getEnvVariable("MAINNET_URL", "");
const SEPOLIA_URL = getEnvVariable("SEPOLIA_URL", "");
const POLYGON_URL = getEnvVariable("POLYGON_URL", "");
const MUMBAI_URL = getEnvVariable("MUMBAI_URL", "");
const LOCALHOST_URL = getEnvVariable("LOCALHOST_URL", "http://127.0.0.1:8545");

// Load API keys
const ETHERSCAN_API_KEY = getEnvVariable("ETHERSCAN_API_KEY", "");
const POLYGONSCAN_API_KEY = getEnvVariable("POLYGONSCAN_API_KEY", "");
const COINMARKETCAP_API_KEY = getEnvVariable("COINMARKETCAP_API_KEY", "");

// Configuration for different networks
const networkConfig = {
  hardhat: {
    forking: {
      url: MAINNET_URL || SEPOLIA_URL,
      enabled: false,
      blockNumber: undefined,
    },
    mining: {
      auto: true,
      interval: 5000,
    },
    initialBaseFeePerGas: 0,
    chainId: 31337,
  },
  localhost: {
    url: LOCALHOST_URL,
    chainId: 31337,
    accounts: PRIVATE_KEYS.length > 0 ? PRIVATE_KEYS : {
      mnemonic: "test test test test test test test test test test test junk",
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 20,
    },
    loggingEnabled: true,
  },
  sepolia: {
    url: SEPOLIA_URL,
    chainId: 11155111,
    accounts: PRIVATE_KEYS,
    gasPrice: "auto",
    gas: "auto",
    gasMultiplier: 1.5,
    timeout: 20000,
  },
  mainnet: {
    url: MAINNET_URL,
    chainId: 1,
    accounts: PRIVATE_KEYS,
    gasPrice: "auto",
    gas: "auto",
    gasMultiplier: 1.2,
    timeout: 60000,
  },
  polygon: {
    url: POLYGON_URL,
    chainId: 137,
    accounts: PRIVATE_KEYS,
    gasPrice: "auto",
    gas: "auto",
    timeout: 60000,
  },
  mumbai: {
    url: MUMBAI_URL,
    chainId: 80001,
    accounts: PRIVATE_KEYS,
    gasPrice: "auto",
    gas: "auto",
    timeout: 60000,
  },
};

// Solidity compiler configuration
const solidityConfig = {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: "london",
    metadata: {
      bytecodeHash: "ipfs",
    },
    outputSelection: {
      "*": {
        "*": ["storageLayout"],
      },
    },
    libraries: {
      // Add library addresses if needed
    },
  },
};

// Gas reporter configuration
const gasReporterConfig = {
  enabled: process.env.REPORT_GAS ? true : false,
  currency: "USD",
  gasPrice: 21,
  coinmarketcap: COINMARKETCAP_API_KEY,
  token: "ETH",
  outputFile: "gas-report.txt",
  noColors: true,
  // excludeContracts: ["test/"],
};

// Deploy configuration
const deployConfig = {
  // Named accounts for deployment
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 0,
    },
    hotelManager: {
      default: 1,
    },
    hotelStaff: {
      default: 2,
    },
    policeAdmin: {
      default: 3,
    },
    policeOfficer: {
      default: 4,
    },
  },
  // Deployment dependencies
  dependencies: {
    // Define deployment order
    AccessControl: [],
    DataStorage: ["AccessControl"],
    GuestVerification: ["AccessControl", "DataStorage"],
    AlertSystem: ["AccessControl", "GuestVerification"],
    HotelPoliceRegistry: ["AccessControl", "DataStorage", "GuestVerification", "AlertSystem"],
  },
};

// Main Hardhat configuration
module.exports = {
  // Solidarity compiler version
  solidity: solidityConfig,

  // Network configurations
  networks: networkConfig,

  // Paths configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deployments",
    deployments: "./deployments",
    imports: "./imports",
  },

  // Testing configuration
  mocha: {
    timeout: 120000, // 2 minutes
    bail: false,
    retries: 1,
    slow: 2000,
    reporter: "spec",
    reporterOptions: {
      showDiff: true,
      showPassed: true,
      showSlow: true,
    },
    ui: "bdd",
    color: true,
    require: [
      "ts-node/register",
      "tsconfig-paths/register",
    ],
    // Test file patterns
    spec: [
      "./test/unit/**/*.test.js",
      "./test/integration/**/*.test.js",
      "./test/security/**/*.test.js",
      "./test/edge-cases/**/*.test.js",
    ],
    // Exclude patterns
    ignore: [
      "./test/*.sol",
      "./node_modules/**/*",
    ],
    // Parallel testing
    parallel: false,
    jobs: 1,
    // Delay between tests
    delay: false,
  },

  // Gas reporter
  gasReporter: gasReporterConfig,

  // Etherscan verification
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
    },
    customChains: [
      // Add custom chains if needed
    ],
  },

  // TypeChain configuration
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/@openzeppelin/contracts/build/contracts/*.json"],
  },

  // Hardhat deploy plugin configuration
  deploy: deployConfig,

  // Named accounts for testing
  namedAccounts: deployConfig.namedAccounts,

  // Preprocessor configuration
  preprocess: {
    eachLine: (hre) => ({
      transform: (line) => {
        // Custom preprocessor transformations if needed
        return line;
      },
    }),
  },

  // Forking configuration for mainnet testing
  forking: {
    url: MAINNET_URL || SEPOLIA_URL,
    enabled: false,
    blockNumber: undefined,
  },

  // Watcher configuration
  watcher: {
    compilation: {
      tasks: ["compile"],
    },
    testing: {
      tasks: ["test"],
    },
  },

  // Tenderly configuration
  tenderly: {
    project: getEnvVariable("TENDERLY_PROJECT", "hotel-police-system"),
    username: getEnvVariable("TENDERLY_USERNAME", ""),
    forkNetwork: "1", // Mainnet
  },

  // Debug configuration
  debug: {
    stacktraces: true,
    failures: true,
    console: true,
    hardhat: true,
  },

  // Warning configuration
  warnings: {
    "*": {
      default: "error",
      "unused-local-variable": "off",
      "unused-parameter": "off",
    },
  },

  // External dependencies
  external: {
    contracts: [
      {
        artifacts: "node_modules/@openzeppelin/contracts/build/contracts",
      },
    ],
    deployments: {
      sepolia: [],
      mainnet: [],
    },
  },

  // Custom tasks
  tasks: {
    // Add custom tasks if needed
  },

  // File server configuration
  fs: {
    enabled: false,
    host: "localhost",
    port: 8080,
    root: ".",
  },
};
