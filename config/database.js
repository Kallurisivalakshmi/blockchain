/**
 * Database configuration file
 * This file contains database connection settings and utilities
 */

const mongoose = require('mongoose');
const path = require('path');

// Environment variables (should be set in .env file)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_security';
const MONGODB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
};

// Database connection
let connection = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<MongoClient>}
 */
async function connectToDatabase() {
    if (connection) {
        return connection;
    }

    try {
        console.log('Connecting to MongoDB...');
        
        connection = await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
        
        console.log(`✅ MongoDB connected successfully`);
        console.log(`   Host: ${connection.connection.host}`);
        console.log(`   Port: ${connection.connection.port}`);
        console.log(`   Database: ${connection.connection.name}`);
        
        // Connection event listeners
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connection established');
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB connection disconnected');
            connection = null;
        });
        
        mongoose.connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
        return connection;
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
async function disconnectFromDatabase() {
    if (!connection) {
        return;
    }

    try {
        await mongoose.disconnect();
        connection = null;
        console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
        console.error('❌ MongoDB disconnection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Check database connection status
 * @returns {boolean}
 */
function isConnected() {
    return mongoose.connection.readyState === 1;
}

/**
 * Get database connection
 * @returns {Connection}
 */
function getConnection() {
    return mongoose.connection;
}

/**
 * Drop all collections (for testing purposes only)
 * WARNING: This will delete all data!
 * @returns {Promise<void>}
 */
async function dropAllCollections() {
    if (!isConnected()) {
        await connectToDatabase();
    }

    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    
    console.log('All collections cleared');
}

/**
 * Seed initial data
 * @returns {Promise<void>}
 */
async function seedDatabase() {
    if (!isConnected()) {
        await connectToDatabase();
    }

    const User = require('../models/User');
    const Guest = require('../models/Guest');
    const Watchlist = require('../models/Watchlist');
    const Alert = require('../models/Alert');

    // Check if admin user already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
        const adminUser = new User({
            username: 'admin',
            email: 'admin@hotel.com',
            password: 'admin123',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            hotel: 'Main Hotel'
        });
        
        await adminUser.save();
        console.log('✅ Admin user created');
    }

    console.log('✅ Database seeding completed');
}

module.exports = {
    connectToDatabase,
    disconnectFromDatabase,
    isConnected,
    getConnection,
    dropAllCollections,
    seedDatabase,
    mongoose,
    MONGODB_URI,
    MONGODB_OPTIONS
};