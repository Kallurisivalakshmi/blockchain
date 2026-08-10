# SecureChain Hyperledger Fabric Network

This directory contains the configuration and scripts for setting up a Hyperledger Fabric network for the SecureChain prototype. The network consists of:

- **1 Organization**: HotelOrg
- **1 Peer**: peer0.hotelorg.securechain.com
- **1 Orderer**: orderer.securechain.com
- **1 Channel**: securechain
- **Chaincode**: guestcontract.go

## Directory Structure

```
backend/fabric/
├── chaincode/                    # Chaincode directory
│   └── guestcontract.go          # Guest contract chaincode
├── crypto-config/                # Certificate and key files (generated)
├── channel-artifacts/            # Channel configuration artifacts (generated)
├── chaincode/                    # Chaincode packages (generated)
├── docker-compose.yaml           # Docker Compose configuration
├── crypto-config.yaml            # Certificate generation configuration
├── configtx.yaml                # Channel configuration
├── startNetwork.sh              # Network startup script
├── createChannel.sh             # Channel creation script
├── deployChaincode.sh           # Chaincode deployment script
├── stopNetwork.sh               # Network cleanup script
├── Makefile                     # Convenient commands
├── fabric-connection-profile.json # Connection profile for Node.js SDK
└── README.md                    # This file
```

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- Git
- Go (optional, for local development)
- Node.js (for backend integration)

## Quick Start

### 1. Start the Network

```bash
cd /backend/fabric
chmod +x *.sh
./startNetwork.sh
```

Or use Make:
```bash
cd /backend/fabric
make start
```

This will:
1. Generate certificates and keys
2. Create genesis block
3. Start all containers (orderer, peer, CA, CouchDB, CLI)
4. Create the 'securechain' channel
5. Deploy the guestcontract chaincode
6. Initialize the chaincode

### 2. Verify Network Status

```bash
# Check running containers
docker ps

# Check network status
make status

# Test chaincode
docker exec cli peer chaincode query -C securechain -n guestcontract -c '{"Args":["GetAllGuests"]}'
```

### 3. Stop the Network

```bash
./stopNetwork.sh
```

Or:
```bash
make stop
```

## Configuration Files

### crypto-config.yaml

Defines the certificate authority structure:
- **OrdererOrg**: Orderer organization with domain `securechain.com`
- **HotelOrg**: Peer organization with domain `hotelorg.securechain.com`

### configtx.yaml

Defines the network configuration:
- **Organizations**: OrdererMSP and HotelOrgMSP
- **Channel Profile**: SecureChainChannel with solo orderer
- **Capabilities**: V2_0 for all components

### docker-compose.yaml

Defines the Docker services:
- **ca-orderer**: Certificate Authority for Orderer
- **ca-hotelorg**: Certificate Authority for HotelOrg
- **orderer.securechain.com**: Orderer node
- **couchdb-hotelorg**: CouchDB state database
- **peer0.hotelorg.securechain.com**: Peer node
- **cli**: CLI container for network operations

## Using with Node.js Backend

The network is configured to work with the Node.js backend. Use the following connection details:

```javascript
const connectionProfile = {
  name: 'securechain-network',
  channels: {
    securechain: {
      orderers: ['orderer.securechain.com'],
      peers: {
        'peer0.hotelorg.securechain.com': {}
      }
    }
  },
  organizations: {
    HotelOrg: {
      mspid: 'HotelOrgMSP',
      peers: ['peer0.hotelorg.securechain.com'],
      certificateAuthorities: ['ca.hotelorg.securechain.com']
    }
  },
  orderers: {
    'orderer.securechain.com': {
      url: 'grpcs://localhost:7050'
    }
  },
  peers: {
    'peer0.hotelorg.securechain.com': {
      url: 'grpcs://localhost:7051'
    }
  }
};
```

### Connection Profile

A pre-configured connection profile is available at `fabric-connection-profile.json`. Import this into your Node.js application:

```javascript
const fs = require('fs');
const path = require('path');

const connectionProfile = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fabric-connection-profile.json'), 'utf8')
);
```

## Chaincode Functions

The `guestcontract.go` chaincode provides the following functions:

- `InitLedger()` - Initialize the ledger
- `CreateGuest(id, name, email, phone, roomNumber, checkIn, checkOut, status)` - Create a new guest
- `ReadGuest(id)` - Read a guest by ID
- `UpdateGuest(id, name, email, phone, roomNumber, checkIn, checkOut, status)` - Update a guest
- `DeleteGuest(id)` - Delete a guest
- `GetAllGuests()` - Get all guests

## Network Management Commands

### Start Network
```bash
make start
# or
./startNetwork.sh
```

### Stop Network
```bash
make stop
# or
./stopNetwork.sh
```

### Restart Network
```bash
make restart
```

### Create Channel Only
```bash
make channel
# or
./createChannel.sh
```

### Deploy Chaincode Only
```bash
make deploy
# or
./deployChaincode.sh
```

### Check Status
```bash
make status
```

### Test Network
```bash
make test
```

## Troubleshooting

### Common Issues

1. **Docker not running**: Ensure Docker is started before running any scripts.
2. **Port conflicts**: Make sure ports 7050, 7051, 7054, 7055, 5984 are available.
3. **Permission issues**: Run `chmod +x *.sh` to make scripts executable.
4. **Certificate generation fails**: Delete the `crypto-config` directory and try again.
5. **Chaincode deployment fails**: Check that the chaincode compiles correctly.

### Debugging

- **View container logs**: `docker logs <container_name>`
- **Enter CLI container**: `docker exec -it cli bash`
- **Check peer logs**: `docker logs peer0.hotelorg.securechain.com`
- **Check orderer logs**: `docker logs orderer.securechain.com`

### Clean Start

If you encounter persistent issues, do a clean start:

```bash
# Stop and remove everything
./stopNetwork.sh

# Remove generated files
rm -rf crypto-config/ channel-artifacts/ chaincode/src/

# Remove Docker containers, networks, and volumes
docker system prune -a -f --volumes

# Start fresh
./startNetwork.sh
```

## Security Considerations

- The network uses TLS for all communications
- Certificates are generated with proper organizational units
- The orderer uses solo consensus (suitable for development)
- For production, consider:
  - Using a more robust consensus mechanism (Raft, Kafka)
  - Implementing proper certificate rotation
  - Using a production-ready CA
  - Enabling mutual TLS

## Performance Optimization

For better performance in development:
- Increase Docker resources (CPU, memory)
- Use `--tls` flag for secure communication
- Consider using `couchdb` indexes for complex queries

## Integration with Node.js Backend

To integrate with your existing Node.js backend:

1. **Install Fabric SDK**:
```bash
npm install fabric-network fabric-ca-client
```

2. **Connect to the network**:
```javascript
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function connectToNetwork() {
  const walletPath = path.join(__dirname, 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  
  const connectionProfile = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fabric-connection-profile.json'), 'utf8')
  );
  
  const gateway = new Gateway();
  await gateway.connect(connectionProfile, {
    wallet,
    identity: 'admin',
    discovery: { enabled: true, asLocalhost: true }
  });
  
  const network = await gateway.getNetwork('securechain');
  const contract = network.getContract('guestcontract');
  
  return { gateway, contract };
}
```

3. **Invoke chaincode functions**:
```javascript
// Create a guest
await contract.submitTransaction(
  'CreateGuest',
  'guest1', 'John Doe', 'john@example.com', '1234567890',
  '101', '2024-01-01', '2024-01-10', 'checked_in'
);

// Read a guest
const guest = await contract.evaluateTransaction('ReadGuest', 'guest1');
```

## File Descriptions

| File | Purpose |
|------|---------|
| `crypto-config.yaml` | Certificate generation configuration |
| `configtx.yaml` | Channel configuration |
| `docker-compose.yaml` | Docker service definitions |
| `startNetwork.sh` | Main network startup script |
| `createChannel.sh` | Channel creation script |
| `deployChaincode.sh` | Chaincode deployment script |
| `stopNetwork.sh` | Network cleanup script |
| `Makefile` | Convenient commands |
| `fabric-connection-profile.json` | Node.js SDK connection profile |

## License

This configuration is provided as-is for the SecureChain prototype. Modify as needed for your specific use case.
