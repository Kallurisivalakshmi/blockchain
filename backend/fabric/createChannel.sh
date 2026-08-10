#!/bin/bash

# createChannel.sh - Script to create the securechain channel
# This script is called by startNetwork.sh but can also be run independently

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

# Check if we have the configtx.yaml file
if [ ! -f "configtx.yaml" ]; then
    error_exit "configtx.yaml not found. Please run this script from the fabric directory."
fi

# Check if we have the crypto-config directory
if [ ! -d "crypto-config" ]; then
    error_exit "crypto-config directory not found. Please generate certificates first."
fi

info_msg "Creating securechain channel..."

# Create channel-artifacts directory if it doesn't exist
mkdir -p channel-artifacts

# Generate channel configuration transaction
if [ ! -f "channel-artifacts/channel.tx" ]; then
    info_msg "Generating channel configuration transaction..."
    if [ ! -f "configtxgen" ]; then
        docker run --rm -v $(pwd):/data -w /data hyperledger/fabric-tools:2.4.7 sh -c "cp /usr/local/bin/configtxgen /data/ && chmod +x /data/configtxgen"
    fi
    
    ./configtxgen -configPath . -profile SecureChainChannel -channelID securechain -outputCreateChannelTx ./channel-artifacts/channel.tx
    if [ $? -ne 0 ]; then
        error_exit "Failed to generate channel configuration transaction"
    fi
    success_msg "Channel configuration transaction generated successfully."
fi

# Check if Docker Compose is running
if ! docker ps > /dev/null 2>&1; then
    error_exit "Docker is not running. Please start Docker."
fi

# Check if network containers are running
if ! docker ps | grep -q "orderer.securechain.com"; then
    error_exit "Network containers are not running. Please start the network first."
fi

# Create the channel
info_msg "Creating channel on orderer..."
if [ -f "docker-compose.yaml" ]; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    
    $DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
        peer channel create -o orderer.securechain.com:7050 -c securechain -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/securechain.block
    " > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        error_exit "Failed to create channel"
    fi
    
    # Join peer to channel
    info_msg "Joining peer to channel..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
        peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/securechain.block
    " > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        error_exit "Failed to join peer to channel"
    fi
    
    success_msg "Channel 'securechain' created and peer joined successfully."
else
    error_exit "docker-compose.yaml not found. Please run this script from the fabric directory."
fi

# Update anchor peers
info_msg "Updating anchor peers..."
./configtxgen -configPath . -profile SecureChainChannel -channelID securechain -outputAnchorPeersUpdate ./channel-artifacts/HotelOrgMSPanchors.tx

$DOCKER_COMPOSE_CMD -f docker-compose.yaml exec cli bash -c "
    peer channel update -o orderer.securechain.com:7050 -c securechain -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/HotelOrgMSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/securechain.com/orderers/orderer.securechain.com/msp/tlscacerts/tlsca.securechain.com-cert.pem
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    info_msg "Warning: Failed to update anchor peers. This might not be critical for a single peer network."
else
    success_msg "Anchor peers updated successfully."
fi

success_msg "Channel setup complete!"
