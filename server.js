/**
 * Main server file for Hotel Security System
 * This file demonstrates how to use the MongoDB models in a Node.js backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env' });

// Import database configuration
const { connectToDatabase, disconnectFromDatabase } = require('./config/database');

// Import models
const { Guest, Watchlist, Alert, User } = require('./models');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection middleware
const connectDB = async (req, res, next) => {
    try {
        if (!req.dbConnected) {
            await connectToDatabase();
            req.dbConnected = true;
        }
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
};

// Apply database connection middleware
app.use(connectDB);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Guest Routes
app.get('/api/guests', async (req, res) => {
    try {
        const { hotel, verified, search, limit = 10, page = 1 } = req.query;
        
        let query = {};
        
        if (hotel) query.hotel = hotel;
        if (verified) query.verification = verified === 'true';
        if (search) {
            query.$text = { $search: search };
        }
        
        const guests = await Guest.find(query)
            .sort({ checkIn: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        
        const total = await Guest.countDocuments(query);
        
        res.json({
            success: true,
            data: guests,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching guests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch guests'
        });
    }
});

app.post('/api/guests', async (req, res) => {
    try {
        const { name, idNumber, hotel, checkIn, verification, transactionId } = req.body;
        
        // Validate required fields
        if (!name || !idNumber || !hotel) {
            return res.status(400).json({
                success: false,
                message: 'Name, ID number, and hotel are required'
            });
        }
        
        // Check for duplicate ID number
        const existingGuest = await Guest.findOne({ idNumber });
        if (existingGuest) {
            return res.status(400).json({
                success: false,
                message: 'Guest with this ID number already exists'
            });
        }
        
        // Create new guest
        const guest = new Guest({
            name,
            idNumber,
            hotel,
            checkIn: checkIn || new Date(),
            verification: verification || false,
            transactionId
        });
        
        await guest.save();
        
        // Check if guest matches any watchlist entries
        const watchlistMatches = await Watchlist.find({
            $or: [
                { name: { $regex: name, $options: 'i' } },
                { aliases: { $regex: name, $options: 'i' } }
            ]
        });
        
        if (watchlistMatches.length > 0) {
            // Create alert for each match
            for (const match of watchlistMatches) {
                const alert = new Alert({
                    guest: guest._id,
                    hotel,
                    type: 'MATCH_FOUND',
                    status: 'PENDING',
                    priority: match.severity || 'MEDIUM',
                    message: `Guest matches watchlist entry: ${match.name} (${match.crime})`
                });
                await alert.save();
            }
        }
        
        res.status(201).json({
            success: true,
            data: guest,
            matches: watchlistMatches.length,
            alertsCreated: watchlistMatches.length
        });
    } catch (error) {
        console.error('Error creating guest:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create guest'
        });
    }
});

app.get('/api/guests/:id', async (req, res) => {
    try {
        const guest = await Guest.findById(req.params.id).lean();
        
        if (!guest) {
            return res.status(404).json({
                success: false,
                message: 'Guest not found'
            });
        }
        
        res.json({
            success: true,
            data: guest
        });
    } catch (error) {
        console.error('Error fetching guest:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch guest'
        });
    }
});

// Watchlist Routes
app.get('/api/watchlist', async (req, res) => {
    try {
        const { status, severity, search, limit = 10, page = 1 } = req.query;
        
        let query = {};
        
        if (status) query.status = status;
        if (severity) query.severity = severity;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { crime: { $regex: search, $options: 'i' } },
                { aliases: { $regex: search, $options: 'i' } }
            ];
        }
        
        const watchlist = await Watchlist.find(query)
            .sort({ severity: -1, updatedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        
        const total = await Watchlist.countDocuments(query);
        
        res.json({
            success: true,
            data: watchlist,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch watchlist'
        });
    }
});

app.post('/api/watchlist', async (req, res) => {
    try {
        const { name, status, crime, severity, aliases, notes } = req.body;
        
        // Validate required fields
        if (!name || !status || !crime) {
            return res.status(400).json({
                success: false,
                message: 'Name, status, and crime are required'
            });
        }
        
        // Create new watchlist entry
        const watchlistEntry = new Watchlist({
            name,
            status,
            crime,
            severity: severity || 'MEDIUM',
            aliases: aliases || [],
            notes: notes || ''
        });
        
        await watchlistEntry.save();
        
        res.status(201).json({
            success: true,
            data: watchlistEntry
        });
    } catch (error) {
        console.error('Error creating watchlist entry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create watchlist entry'
        });
    }
});

// Alert Routes
app.get('/api/alerts', async (req, res) => {
    try {
        const { status, type, priority, hotel, limit = 10, page = 1 } = req.query;
        
        let query = {};
        
        if (status) query.status = status;
        if (type) query.type = type;
        if (priority) query.priority = priority;
        if (hotel) query.hotel = hotel;
        
        const alerts = await Alert.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('guest', 'name idNumber hotel checkIn')
            .populate('createdBy', 'username fullName role')
            .populate('resolvedBy', 'username fullName role')
            .lean();
        
        const total = await Alert.countDocuments(query);
        
        res.json({
            success: true,
            data: alerts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch alerts'
        });
    }
});

app.post('/api/alerts', async (req, res) => {
    try {
        const { guest, hotel, type, message, priority } = req.body;
        
        // Validate required fields
        if (!guest || !hotel) {
            return res.status(400).json({
                success: false,
                message: 'Guest and hotel are required'
            });
        }
        
        // Create new alert
        const alert = new Alert({
            guest,
            hotel,
            type: type || 'CHECK_IN',
            message: message || '',
            priority: priority || 'MEDIUM',
            status: 'PENDING'
        });
        
        await alert.save();
        
        res.status(201).json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create alert'
        });
    }
});

app.put('/api/alerts/:id/acknowledge', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        // Update alert status
        alert.status = 'ACKNOWLEDGED';
        alert.updatedAt = Date.now();
        
        await alert.save();
        
        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to acknowledge alert'
        });
    }
});

app.put('/api/alerts/:id/resolve', async (req, res) => {
    try {
        const { resolvedBy, notes } = req.body;
        
        const alert = await Alert.findById(req.params.id);
        
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        // Update alert status
        alert.status = 'RESOLVED';
        alert.resolvedBy = resolvedBy;
        alert.resolvedAt = Date.now();
        alert.notes = notes || alert.notes;
        alert.updatedAt = Date.now();
        
        await alert.save();
        
        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve alert'
        });
    }
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role, hotel, phone } = req.body;
        
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }
        
        // Check for existing user
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        // Create new user
        const user = new User({
            username,
            email,
            password,
            firstName: firstName || '',
            lastName: lastName || '',
            role: role || 'staff',
            hotel: hotel || '',
            phone: phone || ''
        });
        
        await user.save();
        
        // Generate token
        const token = user.generateAuthToken();
        
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    hotel: user.hotel,
                    fullName: user.fullName
                },
                token
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register user'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate required fields
        if (!password || (!username && !email)) {
            return res.status(400).json({
                success: false,
                message: 'Username/email and password are required'
            });
        }
        
        // Find user
        let user;
        if (email) {
            user = await User.findOne({ email }).select('+password');
        } else {
            user = await User.findOne({ username }).select('+password');
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check if account is locked
        if (user.isLocked()) {
            return res.status(403).json({
                success: false,
                message: 'Account is temporarily locked due to too many failed login attempts'
            });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            // Increment login attempts
            await user.incrementLoginAttempts();
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lastLogin = Date.now();
        await user.save();
        
        // Generate token
        const token = user.generateAuthToken();
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    hotel: user.hotel,
                    fullName: user.fullName
                },
                token
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login'
        });
    }
});

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Find user
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid'
            });
        }
        
        // Check if password was changed after token was issued
        if (user.isPasswordChangedAfterTokenIssued(decoded.iat)) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid due to password change'
            });
        }
        
        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Middleware to authorize by role
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this resource'
            });
        }
        
        next();
    };
};

// Protected route example
app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                hotel: req.user.hotel,
                fullName: req.user.fullName,
                lastLogin: req.user.lastLogin
            }
        }
    });
});

// Admin route example
app.get('/api/admin/users', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const server = app.listen(PORT, async () => {
    try {
        await connectToDatabase();
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
        console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    
    try {
        await disconnectFromDatabase();
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
        
        // Force shutdown after 5 seconds
        setTimeout(() => {
            console.log('⚠️  Forcing shutdown after timeout');
            process.exit(1);
        }, 5000);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received. Shutting down gracefully...');
    
    try {
        await disconnectFromDatabase();
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error, promise) => {
    console.error('❌ Unhandled Rejection:', error);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    server.close(() => process.exit(1));
});

// Export app for testing
module.exports = app;