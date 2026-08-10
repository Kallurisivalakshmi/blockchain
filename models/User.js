const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        unique: true,
        maxlength: [50, 'Username cannot exceed 50 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
        index: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        unique: true,
        lowercase: true,
        maxlength: [100, 'Email cannot exceed 100 characters'],
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Never return password in queries
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'manager', 'staff', 'security'],
            message: 'Role must be one of: admin, manager, staff, security'
        },
        default: 'staff',
        index: true
    },
    hotel: {
        type: String,
        trim: true,
        maxlength: [100, 'Hotel name cannot exceed 100 characters'],
        index: true
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters'],
        match: [/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number']
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    passwordChangedAt: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ hotel: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual for display name (username or full name)
UserSchema.virtual('displayName').get(function() {
    return this.fullName || this.username;
});

// Pre-save hook to hash password and update timestamps
UserSchema.pre('save', async function(next) {
    this.updatedAt = Date.now();
    
    // Only hash password if it's modified (or new)
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.passwordChangedAt = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
UserSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id,
        username: this.username,
        email: this.email,
        role: this.role,
        hotel: this.hotel
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: process.env.JWT_EXPIRE || '1h'
    });
};

// Method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Method to check if password was changed after token was issued
UserSchema.methods.isPasswordChangedAfterTokenIssued = function(tokenTimestamp) {
    if (this.passwordChangedAt) {
        const passwordChangedTimestamp = this.passwordChangedAt.getTime() / 1000;
        return passwordChangedTimestamp > tokenTimestamp;
    }
    return false;
};

// Static method to find user by email
UserSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email }).select('+password');
};

// Static method to find user by username
UserSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: username }).select('+password');
};

// Static method to find users by role
UserSchema.statics.findByRole = function(role) {
    return this.find({ role: role, isActive: true }).sort({ createdAt: -1 });
};

// Static method to find users by hotel
UserSchema.statics.findByHotel = function(hotelName) {
    return this.find({ hotel: hotelName, isActive: true }).sort({ createdAt: -1 });
};

// Method to update last login
UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = Date.now();
    this.loginAttempts = 0; // Reset login attempts on successful login
    return this.save();
};

// Method to increment login attempts
UserSchema.methods.incrementLoginAttempts = function() {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
    }
    
    return this.save();
};

// Method to unlock account
UserSchema.methods.unlockAccount = function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
};

// Method to check if account is locked
UserSchema.methods.isLocked = function() {
    return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', UserSchema);