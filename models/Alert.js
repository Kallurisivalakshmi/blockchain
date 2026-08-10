const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlertSchema = new Schema({
    guest: {
        type: Schema.Types.ObjectId,
        ref: 'Guest',
        required: [true, 'Guest reference is required']
    },
    hotel: {
        type: String,
        required: [true, 'Hotel name is required'],
        trim: true,
        maxlength: [100, 'Hotel name cannot exceed 100 characters'],
        index: true
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
            values: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED'],
            message: 'Status must be one of: PENDING, ACKNOWLEDGED, RESOLVED, ESCALATED'
        },
        default: 'PENDING',
        index: true
    },
    type: {
        type: String,
        enum: {
            values: ['CHECK_IN', 'MATCH_FOUND', 'SUSPICIOUS_ACTIVITY', 'VERIFICATION_FAILED'],
            message: 'Type must be one of: CHECK_IN, MATCH_FOUND, SUSPICIOUS_ACTIVITY, VERIFICATION_FAILED'
        },
        default: 'CHECK_IN',
        index: true
    },
    message: {
        type: String,
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    priority: {
        type: String,
        enum: {
            values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            message: 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL'
        },
        default: 'MEDIUM',
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
AlertSchema.index({ guest: 1 });
AlertSchema.index({ hotel: 1 });
AlertSchema.index({ status: 1 });
AlertSchema.index({ type: 1 });
AlertSchema.index({ priority: 1 });
AlertSchema.index({ createdAt: -1 });

// Compound indexes
AlertSchema.index({ hotel: 1, status: 1 });
AlertSchema.index({ status: 1, priority: -1, createdAt: -1 });
AlertSchema.index({ type: 1, createdAt: -1 });

// Virtual for formatted alert information
AlertSchema.virtual('alertInfo').get(function() {
    return `${this.type} alert for guest at ${this.hotel} (${this.status})`;
});

// Pre-save hook to update the updatedAt field
AlertSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find active alerts
AlertSchema.statics.findActive = function() {
    return this.find({ 
        status: { $in: ['PENDING', 'ACKNOWLEDGED', 'ESCALATED'] } 
    }).sort({ priority: -1, createdAt: -1 }).populate('guest');
};

// Static method to find alerts by hotel
AlertSchema.statics.findByHotel = function(hotelName) {
    return this.find({ hotel: hotelName })
        .sort({ createdAt: -1 })
        .populate('guest');
};

// Static method to find unresolved alerts
AlertSchema.statics.findUnresolved = function() {
    return this.find({ 
        status: { $ne: 'RESOLVED' } 
    }).sort({ priority: -1, createdAt: -1 }).populate('guest');
};

// Static method to find high priority alerts
AlertSchema.statics.findHighPriority = function() {
    return this.find({ 
        priority: { $in: ['HIGH', 'CRITICAL'] },
        status: { $ne: 'RESOLVED' }
    }).sort({ priority: -1, createdAt: -1 }).populate('guest');
};

// Method to acknowledge alert
AlertSchema.methods.acknowledge = function(acknowledgedBy) {
    this.status = 'ACKNOWLEDGED';
    this.updatedAt = Date.now();
    return this.save();
};

// Method to resolve alert
AlertSchema.methods.resolve = function(resolvedBy, notes) {
    this.status = 'RESOLVED';
    this.resolvedBy = resolvedBy;
    this.resolvedAt = Date.now();
    if (notes) {
        this.notes = notes;
    }
    this.updatedAt = Date.now();
    return this.save();
};

// Method to escalate alert
AlertSchema.methods.escalate = function() {
    this.status = 'ESCALATED';
    this.priority = this.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    this.updatedAt = Date.now();
    return this.save();
};

module.exports = mongoose.model('Alert', AlertSchema);