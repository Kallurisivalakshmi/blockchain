# Hotel Security System - MongoDB Models

This project provides MongoDB schema and models for a hotel security system using Mongoose in Node.js. The models include Guests, Watchlist, Alerts, and User authentication.

## 📁 Project Structure

```
project/
├── models/
│   ├── index.js          # Centralized model exports
│   ├── Guest.js          # Guest model
│   ├── Watchlist.js      # Watchlist model
│   ├── Alert.js          # Alert model
│   └── User.js           # User authentication model
├── config/
│   └── database.js       # Database configuration
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
└── README.md             # Project documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Environment Variables

Create a `.env` file based on the `.env.example` template:

```bash
cp .env.example .env
```

Edit the `.env` file with your MongoDB connection string and JWT secret:

```env
MONGODB_URI=mongodb://localhost:27017/hotel_security
JWT_SECRET=your-secret-key
JWT_EXPIRE=1h
NODE_ENV=development
PORT=5000
```

### 3. Start MongoDB

Make sure MongoDB is running locally or update the connection string in `.env`.

### 4. Run the Application

```bash
npm start
```

### 5. Development Mode

```bash
npm run dev
```

## 📋 Models Overview

### Guest Model

Represents hotel guests with the following fields:

- `name`: Guest's full name (required)
- `idNumber`: Government ID or passport number (required, unique)
- `hotel`: Hotel name (required)
- `checkIn`: Check-in date (required, default: current date)
- `verification`: Verification status (boolean, default: false)
- `transactionId`: Payment transaction ID
- `createdAt` / `updatedAt`: Timestamps

**Features:**
- Full-text search on name and hotel
- Indexes for fast queries
- Virtual properties for formatted information
- Static methods for common queries
- Instance methods for status updates

### Watchlist Model

Represents individuals on security watchlists:

- `name`: Person's name (required)
- `status`: Current status (WANTED, ARRESTED, MISSING, SUSPECTED, CLEARED)
- `crime`: Description of crime (required)
- `severity`: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
- `aliases`: Array of known aliases
- `notes`: Additional information
- `createdAt` / `updatedAt`: Timestamps

**Features:**
- Full-text search on name, crime, and aliases
- Indexes for status, severity, and name
- Virtual properties for formatted information
- Static methods for filtering by status and severity
- Instance methods for status updates

### Alert Model

Represents security alerts related to guests:

- `guest`: Reference to Guest document (required)
- `hotel`: Hotel name (required)
- `status`: Alert status (PENDING, ACKNOWLEDGED, RESOLVED, ESCALATED)
- `type`: Alert type (CHECK_IN, MATCH_FOUND, SUSPICIOUS_ACTIVITY, VERIFICATION_FAILED)
- `priority`: Priority level (LOW, MEDIUM, HIGH, CRITICAL)
- `message`: Alert message
- `createdBy` / `resolvedBy`: References to User documents
- `resolvedAt`: Timestamp when resolved
- `notes`: Additional information
- `createdAt` / `updatedAt`: Timestamps

**Features:**
- Population of guest and user references
- Indexes for fast filtering
- Virtual properties for formatted information
- Static methods for finding active, unresolved, and high-priority alerts
- Instance methods for acknowledging, resolving, and escalating alerts

### User Model

Handles user authentication and authorization:

- `username`: Unique username (required)
- `email`: Unique email address (required)
- `password`: Hashed password (required, min 8 characters)
- `firstName` / `lastName`: User's name
- `role`: User role (admin, manager, staff, security)
- `hotel`: Associated hotel
- `phone`: Contact phone number
- `isActive`: Account status (default: true)
- `lastLogin`: Last login timestamp
- `loginAttempts`: Failed login attempts counter
- `lockUntil`: Account lockout timestamp
- `passwordChangedAt`: When password was last changed
- `passwordResetToken` / `passwordResetExpires`: For password reset functionality
- `createdAt` / `updatedAt`: Timestamps

**Features:**
- Password hashing with bcrypt
- JWT token generation
- Account locking after failed attempts
- Password reset functionality
- Virtual properties for full name and display name
- Static methods for finding users by email, username, role, or hotel
- Instance methods for authentication and account management

## 🔧 Usage Examples

### Importing Models

```javascript
// Import individual models
const Guest = require('./models/Guest');
const Watchlist = require('./models/Watchlist');
const Alert = require('./models/Alert');
const User = require('./models/User');

// Or import all models at once
const { Guest, Watchlist, Alert, User } = require('./models');
```

### Database Connection

```javascript
const { connectToDatabase } = require('./config/database');

// Connect to database
connectToDatabase().then(() => {
    console.log('Database connected');
    // Start your application
}).catch(error => {
    console.error('Database connection error:', error);
});
```

### Creating Documents

```javascript
// Create a new guest
const newGuest = new Guest({
    name: 'John Doe',
    idNumber: 'PASS123456',
    hotel: 'Grand Hotel',
    checkIn: new Date(),
    verification: true,
    transactionId: 'TXN789012'
});

await newGuest.save();

// Create a watchlist entry
const watchlistEntry = new Watchlist({
    name: 'Jane Smith',
    status: 'WANTED',
    crime: 'Fraud',
    severity: 'HIGH',
    aliases: ['Jane Doe', 'J. Smith'],
    notes: 'Known for credit card fraud'
});

await watchlistEntry.save();

// Create a user
const user = new User({
    username: 'johndoe',
    email: 'john@hotel.com',
    password: 'securePassword123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'security',
    hotel: 'Grand Hotel'
});

await user.save();
```

### Querying Documents

```javascript
// Find guests by hotel
const guests = await Guest.findByHotel('Grand Hotel');

// Find verified guests
const verifiedGuests = await Guest.findVerified();

// Find guests by date range
const recentGuests = await Guest.findByDateRange('2023-01-01', '2023-12-31');

// Find watchlist entries by status
const wanted = await Watchlist.findByStatus('WANTED');

// Search watchlist
const results = await Watchlist.search('fraud');

// Find active alerts
const activeAlerts = await Alert.findActive();

// Find unresolved alerts by hotel
const hotelAlerts = await Alert.findByHotel('Grand Hotel');

// Find high priority alerts
const highPriority = await Alert.findHighPriority();
```

### Authentication Example

```javascript
const User = require('./models/User');

// User login
const user = await User.findByEmail('john@hotel.com');
if (!user) {
    throw new Error('User not found');
}

const isMatch = await user.comparePassword('securePassword123');
if (!isMatch) {
    throw new Error('Invalid credentials');
}

// Update last login
user.updateLastLogin();

// Generate JWT token
const token = user.generateAuthToken();

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

## 🔌 Database Indexes

All models include strategic indexes for optimal query performance:

- **Guest**: idNumber (unique), hotel, checkIn, verification, text search on name and hotel
- **Watchlist**: name, status, severity, crime (text), compound index on name+status
- **Alert**: guest, hotel, status, type, priority, createdAt, compound indexes for common queries
- **User**: email (unique), username (unique), role, hotel, isActive

## 🛡️ Security Features

### User Authentication
- Password hashing with bcrypt
- JWT token generation and validation
- Account locking after failed attempts
- Password reset functionality
- Timestamps for password changes

### Data Validation
- Required fields validation
- String length limits
- Enum validation for status fields
- Email format validation
- Custom regex patterns

### Security Best Practices
- Passwords are never returned in queries (`select: false`)
- Rate limiting configuration in `.env`
- CORS configuration
- Helmet middleware for security headers

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Test in Watch Mode

```bash
npm run test:watch
```

## 📊 Seeding the Database

```bash
npm run seed
```

This will create an admin user with the following credentials:
- Username: `admin`
- Email: `admin@hotel.com`
- Password: `admin123`
- Role: `admin`

## 🔄 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hotel_security` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `1h` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `BCRYPT_ROUNDS` | Hashing rounds | `10` |
| `MAX_LOGIN_ATTEMPTS` | Max failed login attempts | `5` |
| `LOCKOUT_DURATION_MINUTES` | Account lockout duration | `15` |

## 📚 Dependencies

### Required Dependencies
- **mongoose**: MongoDB ODM
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation
- **dotenv**: Environment variables
- **express**: Web framework (for backend)
- **helmet**: Security middleware
- **cors**: CORS middleware
- **morgan**: Request logging

### Development Dependencies
- **nodemon**: Auto-restart server on changes
- **jest**: Testing framework
- **supertest**: HTTP testing

## 🎯 Best Practices

1. **Always use environment variables** for sensitive data (MongoDB URI, JWT secret)
2. **Use indexes** for frequently queried fields
3. **Validate all inputs** using Mongoose schema validation
4. **Hash passwords** before saving to database
5. **Use JWT tokens** for authentication
6. **Implement rate limiting** to prevent brute force attacks
7. **Use HTTPS** in production
8. **Regularly update dependencies**

## 🔧 Customization

### Adding New Fields

To add a new field to any model:

1. Add the field definition to the schema
2. Add appropriate validation
3. Consider adding indexes if the field will be queried frequently
4. Add virtual properties if needed

### Example: Adding a Field to Guest Model

```javascript
// In models/Guest.js
const GuestSchema = new Schema({
    // ... existing fields
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters'],
        match: [/^\d{10,15}$/, 'Please enter a valid phone number']
    },
    // ... other fields
});

// Add index if needed
GuestSchema.index({ phone: 1 });
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure MongoDB is running and the connection string is correct
2. **Authentication Failed**: Check username/password and ensure user has correct permissions
3. **Index Duplication**: Drop existing indexes before recreating them
4. **Validation Errors**: Check that all required fields are provided and meet validation criteria

### Debugging

Enable Mongoose debugging:

```javascript
mongoose.set('debug', true);
```

This will log all MongoDB queries to the console.

## 📞 Support

For issues or questions:

1. Check the documentation above
2. Verify your MongoDB connection
3. Check your environment variables
4. Review the error messages for specific details

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.