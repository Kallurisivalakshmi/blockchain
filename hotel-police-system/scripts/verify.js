/**
 * @title Contract Verification Script
 * @dev Script for verifying deployed contracts on Etherscan
 * @notice Verifies all deployed contracts on the specified network
 */

const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Network configuration for verification
const VERIFICATION_CONFIG = {
  mainnet: {
    etherscan: "etherscan",
    chainId: 1,
  },
  sepolia: {
    etherscan: "etherscan",
    chainId: 11155111,
  },
  polygon: {
    etherscan: "polygonscan",
    chainId: 137,
  },
  mumbai: {
    etherscan: "polygonscan",
    chainId: 80001,
  },
  localhost: {
    etherscan: null,
    chainId: 31337,
  },
  hardhat: {
    etherscan: null,
    chainId: 31337,
  },
};

// Contract information for verification
const CONTRACTS = [
  {
    name: "AccessControl",
    path: "contracts/AccessControl.sol:AccessControl",
    constructorArgs: [],
  },
  {
    name: "DataStorage",
    path: "contracts/DataStorage.sol:DataStorage",
    constructorArgs: ["${AccessControl}"],
  },
  {
    name: "GuestVerification",
    path: "contracts/GuestVerification.sol:GuestVerification",
    constructorArgs: ["${AccessControl}", "${DataStorage}"],
  },
  {
    name: "AlertSystem",
    path: "contracts/AlertSystem.sol:AlertSystem",
    constructorArgs: ["${AccessControl}", "${GuestVerification}"],
  },
  {
    name: "HotelPoliceRegistry",
    path: "contracts/HotelPoliceRegistry.sol:HotelPoliceRegistry",
    constructorArgs: [],
  },
];

/**
 * @dev Load deployment information from file
 * @param networkName Network name
 * @return Object with deployment information
 */
function loadDeploymentInfo(networkName) {
  const deploymentsDir = path.join(__dirname, "..", "deployments", networkName);
  
  if (!fs.existsSync(deploymentsDir)) {
    console.warn(`⚠️  Deployment directory not found: ${deploymentsDir}`);
    return {};
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir);
  const deployments = {};

  for (const file of deploymentFiles) {
    if (file.endsWith(".json") && !file.includes("summary")) {
      const contractName = file.replace(".json", "");
      const filePath = path.join(deploymentsDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const deployment = JSON.parse(content);
      deployments[contractName] = deployment;
    }
  }

  return deployments;
}

/**
 * @dev Resolve constructor arguments with dependencies
 * @param constructorArgs Array of constructor argument templates
 * @param deployments Object with deployment information
 * @return Resolved constructor arguments
 */
function resolveConstructorArgs(constructorArgs, deployments) {
  return constructorArgs.map(arg => {
    if (arg.startsWith("${") && arg.endsWith("}")) {
      const refName = arg.slice(2, -1);
      if (deployments[refName]) {
        return deployments[refName].address;
      }
      return arg; // Keep template if not found
    }
    return arg;
  });
}

/**
 * @dev Verify a single contract
 * @param contractName Contract name
 * @param contractPath Contract path
 * @param address Contract address
 * @param constructorArgs Constructor arguments
 * @param config Verification configuration
 * @return Promise that resolves when verification is complete
 */
async function verifyContract(contractName, contractPath, address, constructorArgs, config) {
  if (!config.etherscan) {
    console.log(`⏭️  Skipping verification for ${contractName} (no etherscan for ${network.name})`);
    return;
  }

  try {
    console.log(`🔍 Verifying ${contractName} at ${address}...`);
    
    // Prepare verification arguments
    const verificationArgs = constructorArgs.map(arg => {
      if (typeof arg === "string" && arg.startsWith("0x") && arg.length === 42) {
        return arg;
      }
      return arg.toString();
    });

    // Verify contract
    await run("verify:verify", {
      address: address,
      constructorArguments: verificationArgs,
      contract: contractPath,
    });

    console.log(`✅ ${contractName} verified on ${config.etherscan}`);
    
  } catch (error) {
    console.warn(`⚠️  Verification failed for ${contractName}: ${error.message}`);
    console.log("   This is not critical - contract is still deployed and functional");
    throw error;
  }
}

/**
 * @dev Main verification function
 */
async function main() {
  console.log("🚀 Starting contract verification for Hotel-Police Collaboration System...");
  
  // Get network configuration
  const networkName = network.name;
  const config = VERIFICATION_CONFIG[networkName] || VERIFICATION_CONFIG["localhost"];
  
  console.log(`📡 Network: ${network.name} (Chain ID: ${config.chainId})`);
  
  if (!config.etherscan) {
    console.log("⚠️  Verification is not supported for this network");
    console.log("   Only Ethereum, Sepolia, Polygon, and Mumbai networks support verification");
    return;
  }

  // Load deployment information
  console.log("\n📂 Loading deployment information...");
  const deployments = loadDeploymentInfo(networkName);
  
  if (Object.keys(deployments).length === 0) {
    console.error("❌ No deployment information found");
    console.log("   Please deploy contracts first using: npm run deploy");
    return;
  }

  console.log(`✅ Found ${Object.keys(deployments).length} deployed contracts`);

  // Verify contracts
  console.log("\n🔍 Verifying contracts...");
  
  const verificationResults = {
    success: [],
    failed: [],
  };

  for (const contract of CONTRACTS) {
    try {
      if (!deployments[contract.name]) {
        console.warn(`⚠️  Deployment info not found for ${contract.name}, skipping...`);
        continue;
      }

      const address = deployments[contract.name].address;
      const resolvedArgs = resolveConstructorArgs(contract.constructorArgs, deployments);

      await verifyContract(
        contract.name,
        contract.path,
        address,
        resolvedArgs,
        config
      );

      verificationResults.success.push({
        name: contract.name,
        address: address,
        path: contract.path,
      });

    } catch (error) {
      verificationResults.failed.push({
        name: contract.name,
        address: deployments[contract.name]?.address || "unknown",
        error: error.message,
      });
    }
  }

  // Log verification summary
  console.log("\n📊 Verification Summary:");
  console.log("=".repeat(60));
  console.log(`✅ Successfully verified: ${verificationResults.success.length}`);
  console.log(`❌ Failed to verify: ${verificationResults.failed.length}`);
  console.log("=".repeat(60));

  if (verificationResults.success.length > 0) {
    console.log("\n✅ Successfully Verified Contracts:");
    for (const { name, address } of verificationResults.success) {
      console.log(`   - ${name}: ${address}`);
    }
  }

  if (verificationResults.failed.length > 0) {
    console.log("\n❌ Failed to Verify Contracts:");
    for (const { name, address, error } of verificationResults.failed) {
      console.log(`   - ${name}: ${address}`);
      console.log(`     Error: ${error}`);
    }
  }

  // Save verification report
  const reportPath = path.join(__dirname, "..", "reports", "verification-report.json");
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(verificationResults, null, 2));
  console.log(`\n💾 Verification report saved to: ${reportPath}`);

  if (verificationResults.failed.length > 0) {
    console.log("\n⚠️  Some contracts failed verification");
    console.log("   This is usually due to:");
    console.log("   - Missing or incorrect constructor arguments");
    console.log("   - Contract already verified");
    console.log("   - Network issues with Etherscan");
    console.log("   - Rate limiting by Etherscan");
    console.log("\n   You can manually verify contracts using:");
    console.log("   npx hardhat verify --network <network> <address> <constructor-args>");
  }

  console.log("\n✨ Contract verification completed!");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });

// Export for testing
module.exports = {
  main,
  loadDeploymentInfo,
  resolveConstructorArgs,
  verifyContract,
  VERIFICATION_CONFIG,
  CONTRACTS,
};
