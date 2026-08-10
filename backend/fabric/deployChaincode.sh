#!/bin/bash

# deployChaincode.sh - Script to deploy the guestcontract chaincode to the securechain channel
# This script can be run independently or as part of the network setup

set -ev

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

function error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

function success_msg() {
    echo -e "${GREEN}$1${NC}"
}

function info_msg() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if chaincode file exists
CHAINCODE_PATH="/backend/fabric/chaincode/guestcontract.go"
if [ ! -f "$CHAINCODE_PATH" ] && [ ! -f "./chaincode/guestcontract.go" ]; then
    error_exit "guestcontract.go not found. Please ensure the chaincode exists."
fi

# Check if Docker Compose is running
if ! docker ps > /dev/null 2>&1; then
    error_exit "Docker is not running. Please start Docker."
fi

# Check if network containers are running
if ! docker ps | grep -q "orderer.securechain.com"; then
    error_exit "Network containers are not running. Please start the network first."
fi

# Check if we have the crypto-config directory
if [ ! -d "crypto-config" ]; then
    error_exit "crypto-config directory not found. Please generate certificates first."
fi

info_msg "Starting chaincode deployment to securechain channel..."

# Prepare chaincode directory structure
mkdir -p chaincode/src/github.com/chaincode/guestcontract

# Copy chaincode to chaincode directory
if [ -f "/backend/fabric/chaincode/guestcontract.go" ]; then
    cp /backend/fabric/chaincode/guestcontract.go ./chaincode/src/github.com/chaincode/guestcontract/
else
    cp ./chaincode/guestcontract.go ./chaincode/src/github.com/chaincode/guestcontract/
fi

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

# Create go.sum file (empty initially)
touch ./chaincode/src/github.com/chaincode/guestcontract/go.sum

# Check if Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Package the chaincode
info_msg "Packaging chaincode..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode package guestcontract.tar.gz --path /opt/gopath/src/github.com/chaincode/guestcontract --lang golang --label guestcontract_1.0
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to package chaincode"
fi
success_msg "Chaincode packaged successfully."

# Install chaincode on peer
info_msg "Installing chaincode on peer..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode install guestcontract.tar.gz
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to install chaincode on peer"
fi
success_msg "Chaincode installed on peer successfully."

# Get the package ID
info_msg "Getting package ID..."
PACKAGE_ID=$($DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode calculatepackageid guestcontract.tar.gz
" | grep -o '[a-f0-9]\{64\}')

if [ -z "$PACKAGE_ID" ]; then
    error_exit "Failed to get package ID"
fi

info_msg "Chaincode package ID: $PACKAGE_ID"

# Approve chaincode definition
info_msg "Approving chaincode definition..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode approveformyorg -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --channelID securechain --name guestcontract --version 1.0 --package-id $PACKAGE_ID --sequence 1 --init-required
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to approve chaincode definition"
fi
success_msg "Chaincode definition approved successfully."

# Commit chaincode definition
info_msg "Committing chaincode definition to channel..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer lifecycle chaincode commit -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --channelID securechain --name guestcontract --version 1.0 --sequence 1 --init-required
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to commit chaincode definition"
fi
success_msg "Chaincode definition committed successfully."

# Initialize chaincode
info_msg "Initializing chaincode..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer chaincode invoke -o orderer.securechain.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem -C securechain -n guestcontract --ctor '{"Args":["InitLedger"]}' --waitForEvent
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error_exit "Failed to initialize chaincode"
fi
success_msg "Chaincode initialized successfully."

# Verify chaincode deployment
info_msg "Verifying chaincode deployment..."
CHAINCODE_LIST=$($DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "peer lifecycle chaincode queryinstalled" 2>/dev/null)
if echo "$CHAINCODE_LIST" | grep -q "guestcontract"; then
    success_msg "✓ Chaincode 'guestcontract' is installed and deployed"
else
    error_exit "Chaincode 'guestcontract' not found after deployment"
fi

# Test chaincode with a simple query
info_msg "Testing chaincode with a simple query..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer chaincode query -C securechain -n guestcontract -c '{"Args":[]}'
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    success_msg "✓ Chaincode is responding to queries"
else
    info_msg "Warning: Chaincode query test failed, but deployment may still be successful"
fi

success_msg "Chaincode deployment complete!"
echo ""
info_msg "Chaincode Details:"
info_msg "  - Name: guestcontract"
info_msg "  - Version: 1.0"
info_msg "  - Channel: securechain"
info_msg "  - Package ID: $PACKAGE_ID"
