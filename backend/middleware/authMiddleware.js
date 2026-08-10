const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { errorHandler } = require('./errorMiddleware');

// Authentication middleware to verify JWT token
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid, user not found'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'User account is inactive'
            });
        }

        // Attach user to request
        req.user = user;
        req.token = token;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if user has required role
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of these roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Middleware to check if user is hotel staff
const isHotelStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }

    const hotelRoles = ['admin', 'manager', 'staff', 'security'];
    if (!hotelRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Hotel staff only.'
        });
    }

    next();
};

// Middleware to check if user is police
const isPolice = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }

    // Check if user has police role (you might need to add 'police' to your User model roles)
    const policeRoles = ['police', 'admin'];
    if (!policeRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Police personnel only.'
        });
    }

    next();
};

// Middleware to check if user belongs to a specific hotel
const isHotelMember = (hotelName) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (req.user.hotel !== hotelName && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not belong to this hotel.'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize,
    isHotelStaff,
    isPolice,
    isHotelMember
};
