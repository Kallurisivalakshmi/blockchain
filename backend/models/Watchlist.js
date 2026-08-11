const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: [50, 'Nationality cannot exceed 50 characters']
  },
  passportNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Passport number cannot exceed 50 characters']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['criminal', 'suspicious', 'missing_person', 'wanted', 'other'],
    default: 'suspicious'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
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
  timestamps: true
});

// Indexes
WatchlistSchema.index({ passportNumber: 1 });
WatchlistSchema.index({ lastName: 1, firstName: 1 });
WatchlistSchema.index({ category: 1 });
WatchlistSchema.index({ severity: 1 });

module.exports = mongoose.model('Watchlist', WatchlistSchema);