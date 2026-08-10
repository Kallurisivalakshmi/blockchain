#!/bin/bash

# stopNetwork.sh - Script to stop and clean up the SecureChain Hyperledger Fabric network

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

# Check if Docker Compose is running
if ! docker ps > /dev/null 2>&1; then
    info_msg "Docker is not running. Nothing to stop."
    exit 0
fi

info_msg "Stopping SecureChain Hyperledger Fabric network..."

# Check if Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Check if network is running
if docker ps | grep -q "orderer.securechain.com"; then
    info_msg "Network containers are running. Stopping them..."
    
    # Stop and remove containers, networks, volumes, and images
    $DOCKER_COMPOSE_CMD -f docker-compose.yaml down -v --remove-orphans
    
    if [ $? -ne 0 ]; then
        error_exit "Failed to stop network containers"
    fi
    
    success_msg "Network containers stopped and removed successfully."
else
    info_msg "Network containers are not running. Nothing to stop."
fi

# Clean up chaincode containers
info_msg "Cleaning up chaincode containers..."
docker ps -a | grep -E "dev-peer|guestcontract" | awk '{print $1}' | xargs -r docker rm -f

# Clean up temporary files
info_msg "Cleaning up temporary files..."
rm -f cryptogen configtxgen
rm -rf chaincode/src/

# Clean up Docker system (optional - removes all unused containers, networks, images)
# Uncomment the following line if you want to clean up all Docker resources
# docker system prune -a -f --volumes

success_msg "Network cleanup complete!"
echo ""
info_msg "To start the network again, run:"
info_msg "  cd /backend/fabric"
info_msg "  ./startNetwork.sh"
