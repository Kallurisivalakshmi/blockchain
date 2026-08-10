#!/bin/bash

# startNetwork.sh - Script to start the SecureChain Hyperledger Fabric network
# This script automates the setup of the entire network including:
# 1. Generating certificates and keys
# 2. Creating genesis block
# 3. Starting the network
# 4. Creating channel
# 5. Deploying chaincode

set -ev

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error messages
function error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Function to print success messages
function success_msg() {
    echo -e "${GREEN}$1${NC}"
}

# Function to print info messages
function info_msg() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    error_exit "Docker is not running. Please start Docker and try again."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version > /dev/null 2>&1; then
        error_exit "Docker Compose is not installed. Please install it and try again."
    fi
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

info_msg "Starting SecureChain Hyperledger Fabric network setup..."

# Create directories if they don't exist
mkdir -p crypto-config
mkdir -p channel-artifacts
mkdir -p chaincode

# Step 1: Generate certificates and keys
info_msg "Step 1/6: Generating certificates and keys..."
if [ -f "crypto-config/peerOrganizations/hotelorg.securechain.com/ca/ca.crt" ]; then
    info_msg "Certificates already exist. Skipping certificate generation."
else
    # Check if cryptogen tool exists, if not pull it from Fabric tools image
    if [ ! -f "cryptogen" ]; then
        info_msg "Downloading cryptogen tool..."
        docker run --rm hyperledger/fabric-tools:2.4.7 cryptogen version > /dev/null 2>&1
        docker run --rm -v $(pwd):/data -w /data hyperledger/fabric-tools:2.4.7 sh -c "cp /usr/local/bin/cryptogen /data/ && chmod +x /data/cryptogen"
    fi
    
    # Generate crypto material
    ./cryptogen generate --config=./crypto-config.yaml
    if [ $? -ne 0 ]; then
        error_exit "Failed to generate certificates. Please check crypto-config.yaml"
    fi
    success_msg "Certificates and keys generated successfully."
fi

# Step 2: Generate genesis block
info_msg "Step 2/6: Generating genesis block..."
if [ -f "channel-artifacts/genesis.block" ]; then
    info_msg "Genesis block already exists. Skipping genesis block generation."
else
    # Check if configtxgen tool exists
    if [ ! -f "configtxgen" ]; then
        info_msg "Downloading configtxgen tool..."
        docker run --rm -v $(pwd):/data -w /data hyperledger/fabric-tools:2.4.7 sh -c "cp /usr/local/bin/configtxgen /data/ && chmod +x /data/configtxgen"
    fi
    
    # Generate genesis block
    ./configtxgen -configPath . -profile Genesis -channelID securechain -outputBlock ./channel-artifacts/genesis.block
    if [ $? -ne 0 ]; then
        error_exit "Failed to generate genesis block. Please check configtx.yaml"
    fi
    success_msg "Genesis block generated successfully."
fi

# Step 3: Start the network containers
info_msg "Step 3/6: Starting network containers..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml up -d
if [ $? -ne 0 ]; then
    error_exit "Failed to start network containers. Please check docker-compose.yaml"
fi

# Wait for containers to start
sleep 5

# Check if containers are running
if ! docker ps | grep -q "orderer.securechain.com"; then
    error_exit "Orderer container is not running"
fi

if ! docker ps | grep -q "peer0.hotelorg.securechain.com"; then
    error_exit "Peer container is not running"
fi

success_msg "Network containers started successfully."

# Step 4: Create channel
info_msg "Step 4/6: Creating securechain channel..."
# Use the CLI container to create the channel
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    export CORE_PEER_ADDRESS=peer0.hotelorg.securechain.com:7051
    peer channel create -o orderer.securechain.com:7050 -c securechain -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem
"

# First, create the channel transaction file if it doesn't exist
if [ ! -f "channel-artifacts/channel.tx" ]; then
    ./configtxgen -configPath . -profile SecureChainChannel -channelID securechain -outputCreateChannelTx ./channel-artifacts/channel.tx
fi

# Create the channel
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer channel create -o orderer.securechain.com:7050 -c securechain -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/securechain.block
" > /dev/null 2>&1

# Join peer to channel
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/securechain.block
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to create and join channel. Please check configuration files."
fi

success_msg "SecureChain channel created and peer joined successfully."

# Step 5: Copy chaincode to chaincode directory
info_msg "Step 5/6: Preparing chaincode..."
cp /backend/fabric/chaincode/guestcontract.go ./chaincode/src/github.com/chaincode/guestcontract/

# Create go.mod file for chaincode
cat > ./chaincode/src/github.com/chaincode/guestcontract/go.mod << 'EOF'
module github.com/chaincode/guestcontract

go 1.19

replace github.com/hyperledger/fabric-contract-api-go => github.com/hyperledger/fabric-contract-api-go v1.1.0

require (
	github.com/hyperledger/fabric-contract-api-go v1.1.0
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20220719154949-f79c37025612
)
EOF

# Create go.sum file
cat > ./chaincode/src/github.com/chaincode/guestcontract/go.sum << 'EOF'
EOF

# Step 6: Deploy chaincode to channel
info_msg "Step 6/6: Deploying guestcontract chaincode..."

# Package the chaincode
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode package guestcontract.tar.gz --path /opt/gopath/src/github.com/chaincode/guestcontract --lang golang --label guestcontract_1.0
" > /dev/null 2>&1

# Install chaincode on peer
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode install guestcontract.tar.gz
" > /dev/null 2>&1

# Get the package ID
PACKAGE_ID=$($DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode calculatepackageid guestcontract.tar.gz
" | grep -o '[a-f0-9]\{64\}')

info_msg "Chaincode package ID: $PACKAGE_ID"

# Approve chaincode definition
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode approveformyorg -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --channelID securechain --name guestcontract --version 1.0 --package-id $PACKAGE_ID --sequence 1 --init-required
" > /dev/null 2>&1

# Commit chaincode definition
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode commit -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --channelID securechain --name guestcontract --version 1.0 --sequence 1 --init-required
" > /dev/null 2>&1

# Initialize chaincode
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer chaincode invoke -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem -C securechain -n guestcontract --ctor '{"Args":["InitLedger"]}' --waitForEvent
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to deploy chaincode. Please check the chaincode and try again."
fi

success_msg "Chaincode deployed successfully to securechain channel."

# Final verification
info_msg "Verifying network setup..."

# Check if channel exists
CHANNEL_LIST=$($DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "peer channel list" 2>/dev/null)
if echo "$CHANNEL_LIST" | grep -q "securechain"; then
    success_msg "✓ Channel 'securechain' exists"
else
    error_exit "Channel 'securechain' not found"
fi

# Check if chaincode is installed
CHAINCODE_LIST=$($DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "peer lifecycle chaincode queryinstalled" 2>/dev/null)
if echo "$CHAINCODE_LIST" | grep -q "guestcontract"; then
    success_msg "✓ Chaincode 'guestcontract' is installed"
else
    error_exit "Chaincode 'guestcontract' not found"
fi

# Print network information
echo ""
success_msg "=========================================="
success_msg "SecureChain Network Setup Complete!"
success_msg "=========================================="
echo ""
info_msg "Network Components:"
info_msg "  - Orderer: orderer.securechain.com:7050"
info_msg "  - Peer: peer0.hotelorg.securechain.com:7051"
info_msg "  - Channel: securechain"
info_msg "  - Chaincode: guestcontract"
echo ""
info_msg "To interact with the network from your Node.js backend, use:"
info_msg "  - Channel name: securechain"
info_msg "  - Chaincode name: guestcontract"
info_msg "  - Peer address: peer0.hotelorg.securechain.com:7051"
info_msg "  - Orderer address: orderer.securechain.com:7050"
echo ""
info_msg "Connection Profile:"
info_msg "  You can use the 'fabric-connection-profile.json' for your Node.js SDK"

# Create a simple connection profile for Node.js backend
cat > ./fabric-connection-profile.json << 'EOF'
{
  "name": "securechain-network",
  "version": "1.0",
  "channels": {
    "securechain": {
      "orderers": ["orderer.securechain.com"],
      "peers": {
        "peer0.hotelorg.securechain.com": {}
      }
    }
  },
  "organizations": {
    "HotelOrg": {
      "mspid": "HotelOrgMSP",
      "peers": ["peer0.hotelorg.securechain.com"],
      "certificateAuthorities": ["ca.hotelorg.securechain.com"]
    }
  },
  "orderers": {
    "orderer.securechain.com": {
      "url": "grpcs://localhost:7050",
      "tlsCACerts": {
        "pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUR5RENDQVlJQ0NRQ2w0YjN0aXNnZ2VzK2t3ZTJkYXRhYmVjZ2dtcWFlc3dDQ3NHQVFVRUJ3d0VGCk1JSUREkRJQ0lEQ0NCQUd3RmlBU0dDQ3NHQVFVRUJ3d0VUCk1JSUREkRJQ0lEQ0NCQURDQ0FRWUlLb1pJemowRUF3SXcKVU1SSXdFQVlEVlFRRERBcG1pbnVkQ0NxRGdBTkJBTUJDREFSQkVBSUNBTkJATUJFQ0FEd0hBWUVCQkFQQQpNQ0lBVEhBd01SSXdHVEFYQkFJTUJHQ2h2WkNJNklGTnVZM1FnWUVWdWRDQk1CQWY4dnRBc01CQUdDQ3NHQVFVRkJ3TUMKQ0lFQ0FRQ0NnQ2lBZ2Vsc2NvcmUgcHJvZ3JhbWUgYXBwIGFwcCBkZWZhdWx0IG5vdCBhdmFpbGFibGUgdG8gZGVjb2RlIHRoaXMK"
      }
    }
  },
  "peers": {
    "peer0.hotelorg.securechain.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUR5RENDQVlJQ0NRQ2w0YjN0aXNnZ2VzK2t3ZTJkYXRhYmVjZ2dtcWFlc3dDQ3NHQVFVRUJ3d0VGCk1JSUREkRJQ0lEQ0NCQUd3RmlBU0dDQ3NHQVFVRUJ3d0VUCk1JSUREkRJQ0lEQ0NCQURDQ0FRWUlLb1pJemowRUF3SXcKVU1SSXdFQVlEVlFRRERBcG1pbnVkQ0NxRGdBTkJBTUJDREFSQkVBSUNBTkJATUJFQ0FEd0hBWUVCQkFQQQpNQ0lBVEhBd01SSXdHVEFYQkFJTUJHQ2h2WkNJNklGTnVZM1FnWUVWdWRDQk1CQWY4dnRBc01CQUdDQ3NHQVFVRkJ3TUMKQ0lFQ0FRQ0NnQ2lBZ2Vsc2NvcmUgcHJvZ3JhbWUgYXBwIGFwcCBkZWZhdWx0IG5vdCBhdmFpbGFibGUgdG8gZGVjb2RlIHRoaXMK"
      }
    }
  },
  "certificateAuthorities": {
    "ca.hotelorg.securechain.com": {
      "url": "https://localhost:7055",
      "caName": "ca-hotelorg"
    }
  }
}
EOF

info_msg "Connection profile created: fabric-connection-profile.json"
echo ""
success_msg "Network is ready for transactions from Node.js backend!"

# Clean up temporary files
rm -f cryptogen configtxgen

echo ""
info_msg "To start the network in the future, run:"
info_msg "  cd /backend/fabric"
info_msg "  ./startNetwork.sh"

echo ""
info_msg "To stop the network, run:"
info_msg "  cd /backend/fabric"
info_msg "  docker-compose -f docker-compose.yaml down -v"
