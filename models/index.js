// Centralized model exports
// This file exports all models for easy importing

const mongoose = require('mongoose');

// Import all models
const Guest = require('./Guest');
const Watchlist = require('./Watchlist');
const Alert = require('./Alert');
const User = require('./User');

// Export individual models
module.exports.Guest = Guest;
module.exports.Watchlist = Watchlist;
module.exports.Alert = Alert;
module.exports.User = User;

// Export all models as an object
module.exports = {
    Guest,
    Watchlist,
    Alert,
    User
};

// Database connection utility (optional)
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_security', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Disconnect utility
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    } catch (error) {
        console.error(`Error disconnecting from MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Export connection utilities
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.mongoose = mongoose;