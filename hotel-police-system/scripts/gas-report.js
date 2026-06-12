/**
 * @title Gas Report Script
 * @dev Script for generating gas usage reports for the Hotel-Police Collaboration System
 * @notice Analyzes contract functions and generates gas usage reports
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const GAS_PRICE_GWEI = 20; // Default gas price in gwei
const ETH_PRICE_USD = 1800; // Default ETH price in USD
const OUTPUT_DIR = path.join(__dirname, "..", "reports");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "gas-report.md");

// Contract function test cases
const TEST_CASES = {
  AccessControl: {
    functions: [
      { name: "assignRole", args: ["0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", 1] },
      { name: "revokeRole", args: ["0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", 1] },
    ],
  },
};

// Export for testing
module.exports = {
  GAS_PRICE_GWEI,
  ETH_PRICE_USD,
  OUTPUT_DIR,
  OUTPUT_FILE,
  TEST_CASES,
};
