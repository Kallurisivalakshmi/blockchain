const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GuestSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Guest name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    idNumber: {
        type: String,
        required: [true, 'ID number is required'],
        trim: true,
        unique: true,
        maxlength: [50, 'ID number cannot exceed 50 characters']
    },
    hotel: {
        type: String,
        required: [true, 'Hotel name is required'],
        trim: true,
        maxlength: [100, 'Hotel name cannot exceed 100 characters']
    },
    checkIn: {
        type: Date,
        required: [true, 'Check-in date is required'],
        default: Date.now
    },
    verification: {
        type: Boolean,
        default: false
    },
    transactionId: {
        type: String,
        trim: true,
        maxlength: [100, 'Transaction ID cannot exceed 100 characters']
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
GuestSchema.index({ idNumber: 1 }, { unique: true });
GuestSchema.index({ hotel: 1 });
GuestSchema.index({ checkIn: 1 });
GuestSchema.index({ verification: 1 });
GuestSchema.index({ name: 'text', hotel: 'text' });

// Virtual for formatted guest information
GuestSchema.virtual('guestInfo').get(function() {
    return `${this.name} (${this.idNumber}) - ${this.hotel}`;
});

// Pre-save hook to update the updatedAt field
GuestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find guests by hotel
GuestSchema.statics.findByHotel = function(hotelName) {
    return this.find({ hotel: hotelName }).sort({ checkIn: -1 });
};

// Static method to find verified guests
GuestSchema.statics.findVerified = function() {
    return this.find({ verification: true }).sort({ checkIn: -1 });
};

// Static method to find guests by date range
GuestSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        checkIn: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ checkIn: 1 });
};

// Method to toggle verification status
GuestSchema.methods.toggleVerification = function() {
    this.verification = !this.verification;
    this.updatedAt = Date.now();
    return this.save();
};

module.exports = mongoose.model('Guest', GuestSchema);