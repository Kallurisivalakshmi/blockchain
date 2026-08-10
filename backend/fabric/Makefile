# Makefile for SecureChain Hyperledger Fabric network
# This provides convenient commands for managing the network

.PHONY: all start stop restart clean setup generate deploy test

# Default target
all: start

# Start the network
start:
	chmod +x ./startNetwork.sh
	./startNetwork.sh

# Stop the network
stop:
	chmod +x ./stopNetwork.sh
	./stopNetwork.sh

# Restart the network
restart: stop start

# Clean up network (same as stop)
clean: stop

# Setup network - alias for start
setup: start

# Generate certificates and configuration
generate:
	chmod +x ./startNetwork.sh
	./startNetwork.sh generate

# Create channel only
channel:
	chmod +x ./createChannel.sh
	./createChannel.sh

# Deploy chaincode only
deploy:
	chmod +x ./deployChaincode.sh
	./deployChaincode.sh

# Test the network
test:
	@echo "Testing SecureChain network..."
	@if docker ps | grep -q "orderer.securechain.com"; then \
		echo "✓ Network is running"; \
	else \
		echo "✗ Network is not running"; \
		false; \
	fi
	@if docker ps | grep -q "peer0.hotelorg.securechain.com"; then \
		echo "✓ Peer is running"; \
	else \
		echo "✗ Peer is not running"; \
		false; \
	fi

# Show network status
status:
	@echo "SecureChain Network Status:"
	@echo "=========================="
	@docker ps --filter "name=securechain" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "Channels:"
	@docker exec cli peer channel list 2>/dev/null || echo "CLI container not available"

# Show help
help:
	@echo "SecureChain Hyperledger Fabric Network Management"
	@echo "=================================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make start    - Start the network (certificates, containers, channel, chaincode)"
	@echo "  make stop     - Stop and clean up the network"
	@echo "  make restart  - Restart the network"
	@echo "  make clean    - Clean up the network (same as stop)"
	@echo "  make channel  - Create the securechain channel only"
	@echo "  make deploy   - Deploy chaincode only"
	@echo "  make test     - Test if network is running"
	@echo "  make status   - Show network status"
	@echo "  make generate - Generate certificates and configuration only"
	@echo "  make help     - Show this help message"
	@echo ""
	@echo "Usage:"
	@echo "  Run commands from the /backend/fabric directory"
	@echo "  Example: cd /backend/fabric && make start"