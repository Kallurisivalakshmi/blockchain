# Node.js + Express Backend with MongoDB and Hyperledger Fabric

## Project Structure

```
backend/
├── controllers/           # Controller files
├── routes/               # Route files
├── models/               # Data models
├── middleware/           # Middleware functions
├── fabric/
│   └── chaincode/
│       └── guestcontract.go  # Hyperledger Fabric chaincode
├── server.js             # Main server file
├── package.json          # NPM dependencies
├── .env                  # Environment configuration
└── README.md             # Project documentation
```

## Prerequisites

- Node.js 18+ 
- MongoDB 6+
- Hyperledger Fabric 2.5+
- Go 1.20+

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up MongoDB:
- Install MongoDB locally or use a cloud service like MongoDB Atlas
- Update the connection string in `.env` file

4. Set up Hyperledger Fabric:
- Install Fabric SDK and necessary tools
- Configure the Fabric network connection in `.env`

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /` - Health check endpoint
- More endpoints to be added in the routes directory

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/backend
FABRIC_NETWORK_CONFIG_PATH=./fabric/network-config.json
FABRIC_CA_URL=http://localhost:7054
FABRIC_PEER_URL=grpc://localhost:7051
JWT_SECRET=your-secret-key-here
```

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- fabric-client: Hyperledger Fabric client
- fabric-ca-client: Fabric CA client
- fabric-network: Fabric network utilities
- cors: Cross-Origin Resource Sharing
- helmet: Security middleware
- morgan: HTTP request logger
- dotenv: Environment variable loader

## License

ISC