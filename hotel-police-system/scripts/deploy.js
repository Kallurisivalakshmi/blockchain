/**
 * @title Deployment Script
 * @dev Script for deploying the Hotel-Police Collaboration System contracts
 * @notice Deploys all system contracts and verifies them on Etherscan
 */

const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration for different networks
const NETWORK_CONFIG = {
  localhost: {
    name: "Localhost",
    chainId: 31337,
    verify: false,
    deployMocks: true,
  },
  hardhat: {
    name: "Hardhat",
    chainId: 31337,
    verify: false,
    deployMocks: true,
  },
  sepolia: {
    name: "Sepolia",
    chainId: 11155111,
    verify: true,
    deployMocks: false,
    etherscan: "etherscan",
  },
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    verify: true,
    deployMocks: false,
    etherscan: "etherscan",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    verify: true,
    deployMocks: false,
    etherscan: "polygonscan",
  },
  mumbai: {
    name: "Polygon Mumbai",
    chainId: 80001,
    verify: true,
    deployMocks: false,
    etherscan: "polygonscan",
  },
};

// Contract names and their dependencies
const CONTRACTS = [
  {
    name: "AccessControl",
    contractName: "AccessControl",
    dependencies: [],
    args: [],
  },
  {
    name: "DataStorage",
    contractName: "DataStorage",
    dependencies: ["AccessControl"],
    args: ["${AccessControl}"],
  },
  {
    name: "GuestVerification",
    contractName: "GuestVerification",
    dependencies: ["AccessControl", "DataStorage"],
    args: ["${AccessControl}", "${DataStorage}"],
  },
  {
    name: "AlertSystem",
    contractName: "AlertSystem",
    dependencies: ["AccessControl", "GuestVerification"],
    args: ["${AccessControl}", "${GuestVerification}"],
  },
  {
    name: "HotelPoliceRegistry",
    contractName: "HotelPoliceRegistry",
    dependencies: [],
    args: [],
  },
];

// Role definitions for initial setup
const ROLES = {
  SystemAdmin: 5,
  PoliceAdmin: 4,
  PoliceOfficer: 3,
  HotelManager: 2,
  HotelStaff: 1,
  None: 0,
};

// Initial role assignments
const INITIAL_ROLES = [
  {
    address: "${deployer}",
    role: ROLES.SystemAdmin,
  },
];

/**
 * @dev Main deployment function
 */
async function main() {
  console.log("🚀 Starting deployment of Hotel-Police Collaboration System...");
  
  // Get network configuration
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName] || NETWORK_CONFIG["localhost"];
  
  console.log(`📡 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`🔍 Verification: ${config.verify ? "Enabled" : "Disabled"}`);
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  // Create deployment directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments", networkName);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Deploy contracts
  const deployedContracts = {};
  
  try {
    console.log("\n📦 Deploying contracts...");
    
    for (const contract of CONTRACTS) {
      console.log(`\n🔨 Deploying ${contract.name}...`);
      
      // Resolve dependencies
      const resolvedArgs = await resolveArguments(contract.args, deployedContracts, deployer);
      
      // Get contract factory
      const ContractFactory = await ethers.getContractFactory(contract.contractName);
      
      // Deploy contract
      const contractInstance = await ContractFactory.deploy(...resolvedArgs);
      await contractInstance.waitForDeployment();
      
      const contractAddress = await contractInstance.getAddress();
      deployedContracts[contract.name] = {
        address: contractAddress,
        instance: contractInstance,
        factory: ContractFactory,
      };
      
      console.log(`✅ ${contract.name} deployed to: ${contractAddress}`);
      
      // Save deployment info
      saveDeploymentInfo(networkName, contract.name, contractAddress, resolvedArgs);
      
      // Verify contract if enabled
      if (config.verify) {
        await verifyContract(contract.name, contractAddress, resolvedArgs, config);
      }
    }
    
    console.log("\n🎯 All contracts deployed successfully!");
    
    // Setup initial roles
    console.log("\n👥 Setting up initial roles...");
    await setupInitialRoles(deployedContracts, deployer);
    
    // Setup registry
    console.log("\n🏛️  Setting up registry...");
    await setupRegistry(deployedContracts, deployer);
    
    // Log deployment summary
    logDeploymentSummary(deployedContracts, networkName);
    
    console.log("\n✨ Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Update frontend configuration with contract addresses");
    console.log("2. Assign additional roles to users as needed");
    console.log("3. Configure notification preferences for alert system");
    console.log("4. Set up monitoring for contract events");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

/**
 * @dev Resolve contract arguments with dependencies
 * @param args Array of argument templates
 * @param deployedContracts Object with deployed contract info
 * @param deployer Deployer signer
 * @return Resolved arguments array
 */
async function resolveArguments(args, deployedContracts, deployer) {
  const resolvedArgs = [];
  
  for (const arg of args) {
    if (arg.startsWith("${") && arg.endsWith("}")) {
      const refName = arg.slice(2, -1);
      
      if (refName === "deployer") {
        resolvedArgs.push(deployer.address);
      } else if (deployedContracts[refName]) {
        resolvedArgs.push(deployedContracts[refName].address);
      } else {
        throw new Error(`Dependency ${refName} not found`);
      }
    } else {
      resolvedArgs.push(arg);
    }
  }
  
  return resolvedArgs;
}

/**
 * @dev Save deployment information to file
 * @param networkName Network name
 * @param contractName Contract name
 * @param contractAddress Contract address
 * @param args Deployment arguments
 */
function saveDeploymentInfo(networkName, contractName, contractAddress, args) {
  const deploymentsDir = path.join(__dirname, "..", "deployments", networkName);
  const filePath = path.join(deploymentsDir, `${contractName}.json`);
  
  const deploymentInfo = {
    network: networkName,
    contract: contractName,
    address: contractAddress,
    args: args,
    timestamp: new Date().toISOString(),
  };
  
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Saved deployment info: ${filePath}`);
}

/**
 * @dev Verify contract on Etherscan
 * @param contractName Contract name
 * @param contractAddress Contract address
 * @param args Deployment arguments
 * @param config Network configuration
 */
async function verifyContract(contractName, contractAddress, args, config) {
  try {
    console.log(`🔍 Verifying ${contractName} on ${config.etherscan || "Etherscan"}...`);
    
    // Prepare verification arguments
    const verificationArgs = args.map(arg => {
      if (typeof arg === "string" && arg.startsWith("0x") && arg.length === 42) {
        return arg;
      }
      return arg.toString();
    });
    
    // Verify contract
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: verificationArgs,
      contract: `contracts/${contractName}.sol:${contractName}`,
    });
    
    console.log(`✅ ${contractName} verified on ${config.etherscan || "Etherscan"}`);
    
  } catch (error) {
    console.warn(`⚠️  Verification failed for ${contractName}: ${error.message}`);
    console.log("   This is not critical - contract is still deployed and functional");
  }
}

/**
 * @dev Setup initial roles for the system
 * @param deployedContracts Object with deployed contract info
 * @param deployer Deployer signer
 */
async function setupInitialRoles(deployedContracts, deployer) {
  const accessControl = deployedContracts["AccessControl"].instance;
  
  // Assign SystemAdmin role to deployer (should already be done by constructor)
  const deployerRole = await accessControl.getRole(deployer.address);
  if (deployerRole !== ROLES.SystemAdmin) {
    await accessControl.connect(deployer).assignRole(deployer.address, ROLES.SystemAdmin);
    console.log(`👑 Assigned SystemAdmin role to deployer`);
  } else {
    console.log(`👑 Deployer already has SystemAdmin role`);
  }
  
  // Additional initial role assignments can be added here
  // For example:
  // await accessControl.connect(deployer).assignRole(hotelManagerAddress, ROLES.HotelManager);
  
  console.log("✅ Initial roles setup completed");
}

/**
 * @dev Setup the registry with deployed contracts
 * @param deployedContracts Object with deployed contract info
 * @param deployer Deployer signer
 */
async function setupRegistry(deployedContracts, deployer) {
  const registry = deployedContracts["HotelPoliceRegistry"].instance;
  
  // Update registry with deployed contracts
  const contractsToUpdate = [
    "AccessControl",
    "DataStorage", 
    "GuestVerification",
    "AlertSystem",
  ];
  
  for (const contractName of contractsToUpdate) {
    if (deployedContracts[contractName]) {
      try {
        await registry.connect(deployer).updateContract(
          contractName,
          deployedContracts[contractName].address
        );
        console.log(`🏛️  Updated ${contractName} in registry: ${deployedContracts[contractName].address}`);
      } catch (error) {
        console.warn(`⚠️  Failed to update ${contractName} in registry: ${error.message}`);
      }
    }
  }
  
  console.log("✅ Registry setup completed");
}

/**
 * @dev Log deployment summary
 * @param deployedContracts Object with deployed contract info
 * @param networkName Network name
 */
function logDeploymentSummary(deployedContracts, networkName) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));
  console.log(`Network: ${networkName}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("-".repeat(80));
  
  for (const [contractName, { address }] of Object.entries(deployedContracts)) {
    console.log(`${contractName.padEnd(30)}: ${address}`);
  }
  
  console.log("-".repeat(80));
  
  // Save summary to file
  const summaryPath = path.join(__dirname, "..", "deployments", networkName, "summary.json");
  const summary = {
    network: networkName,
    timestamp: new Date().toISOString(),
    contracts: {},
  };
  
  for (const [contractName, { address }] of Object.entries(deployedContracts)) {
    summary.contracts[contractName] = address;
  }
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`💾 Saved deployment summary: ${summaryPath}`);
  console.log("=".repeat(80));
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

// Export for testing
module.exports = {
  main,
  resolveArguments,
  saveDeploymentInfo,
  verifyContract,
  setupInitialRoles,
  setupRegistry,
  logDeploymentSummary,
  NETWORK_CONFIG,
  CONTRACTS,
  ROLES,
  INITIAL_ROLES,
};
