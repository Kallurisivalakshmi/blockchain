const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WatchlistSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
            values: ['WANTED', 'ARRESTED', 'MISSING', 'SUSPECTED', 'CLEARED'],
            message: 'Status must be one of: WANTED, ARRESTED, MISSING, SUSPECTED, CLEARED'
        },
        default: 'WANTED',
        index: true
    },
    crime: {
        type: String,
        required: [true, 'Crime description is required'],
        trim: true,
        maxlength: [500, 'Crime description cannot exceed 500 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    severity: {
        type: String,
        enum: {
            values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            message: 'Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL'
        },
        default: 'MEDIUM',
        index: true
    },
    aliases: [{
        type: String,
        trim: true,
        maxlength: [50, 'Alias cannot exceed 50 characters']
    }],
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
WatchlistSchema.index({ name: 1 });
WatchlistSchema.index({ status: 1 });
WatchlistSchema.index({ severity: 1 });
WatchlistSchema.index({ crime: 'text' });
WatchlistSchema.index({ name: 'text' });

// Compound index for name and status
WatchlistSchema.index({ name: 1, status: 1 });

// Virtual for formatted watchlist entry
WatchlistSchema.virtual('watchlistInfo').get(function() {
    return `${this.name} - ${this.status} (${this.crime})`;
});

// Pre-save hook to update the updatedAt field
WatchlistSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find by status
WatchlistSchema.statics.findByStatus = function(status) {
    return this.find({ status: status }).sort({ severity: -1, updatedAt: -1 });
};

// Static method to find by severity
WatchlistSchema.statics.findBySeverity = function(severity) {
    return this.find({ severity: severity }).sort({ updatedAt: -1 });
};

// Static method to search watchlist by name or crime
WatchlistSchema.statics.search = function(query) {
    return this.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { crime: { $regex: query, $options: 'i' } },
            { aliases: { $regex: query, $options: 'i' } }
        ]
    }).sort({ severity: -1, updatedAt: -1 });
};

// Method to update status
WatchlistSchema.methods.updateStatus = function(newStatus) {
    this.status = newStatus;
    this.updatedAt = Date.now();
    return this.save();
};

// Method to add alias
WatchlistSchema.methods.addAlias = function(alias) {
    if (!this.aliases.includes(alias)) {
        this.aliases.push(alias);
        this.updatedAt = Date.now();
    }
    return this.save();
};

module.exports = mongoose.model('Watchlist', WatchlistSchema);