const { Watchlist, Guest, Alert } = require('../models');
const { validationResult } = require('express-validator');

// Add a person to the watchlist
const addToWatchlist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const watchlistData = { ...req.body, createdBy: req.user.id };
    
    // Check if this person is already in the watchlist
    const existingEntry = await Watchlist.findOne({
      passportNumber: watchlistData.passportNumber,
      firstName: watchlistData.firstName,
      lastName: watchlistData.lastName
    });

    if (existingEntry && existingEntry.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This person is already in the watchlist'
      });
    }

    const watchlistEntry = new Watchlist(watchlistData);
    await watchlistEntry.save();

    // Check if any existing guests match this watchlist entry
    const matchingGuests = await Guest.find({
      passportNumber: watchlistData.passportNumber,
      verificationStatus: { $ne: 'flagged' }
    });

    // Create alerts for matching guests
    for (const guest of matchingGuests) {
      await Alert.create({
        guestId: guest._id,
        alertType: 'watchlist_match',
        title: `New Watchlist Match: ${guest.firstName} ${guest.lastName}`,
        description: `Guest passport number matches newly added watchlist entry. Reason: ${watchlistData.reason}`,
        severity: watchlistData.severity || 'high',
        createdBy: req.user.id
      });

      // Update guest verification status
      await Guest.findByIdAndUpdate(guest._id, {
        isInWatchlist: true,
        watchlistReason: watchlistData.reason,
        verificationStatus: 'flagged'
      });
    }

    res.status(201).json({
      success: true,
      data: watchlistEntry
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding to watchlist'
    });
  }
};

// Get all watchlist entries
const getAllWatchlistEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, severity, isActive, search } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (severity) {
      query.severity = severity;
    }

    if (isActive) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { passportNumber: searchRegex },
        { reason: searchRegex }
      ];
    }

    const entries = await Watchlist.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('createdBy', 'username fullName role');

    const total = await Watchlist.countDocuments(query);

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching watchlist entries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watchlist entries'
    });
  }
};

// Get a single watchlist entry by ID
const getWatchlistEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Watchlist.findById(id).populate('createdBy', 'username fullName role');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching watchlist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watchlist entry'
    });
  }
};

// Update a watchlist entry
const updateWatchlistEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const entry = await Watchlist.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist entry not found'
      });
    }

    const updates = req.body;
    const updatedEntry = await Watchlist.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedEntry
    });
  } catch (error) {
    console.error('Error updating watchlist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating watchlist entry'
    });
  }
};

// Deactivate a watchlist entry
const deactivateWatchlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Watchlist.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist entry not found'
      });
    }

    const updatedEntry = await Watchlist.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    // Clear watchlist status for guests that matched this entry
    await Guest.updateMany(
      { watchlistReason: entry.reason },
      { isInWatchlist: false, watchlistReason: '', verificationStatus: 'pending' }
    );

    res.json({
      success: true,
      data: updatedEntry
    });
  } catch (error) {
    console.error('Error deactivating watchlist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating watchlist entry'
    });
  }
};

// Delete a watchlist entry
const deleteWatchlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Watchlist.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist entry not found'
      });
    }

    await Watchlist.findByIdAndDelete(id);

    // Clear watchlist status for guests that matched this entry
    await Guest.updateMany(
      { watchlistReason: entry.reason },
      { isInWatchlist: false, watchlistReason: '', verificationStatus: 'pending' }
    );

    res.json({
      success: true,
      message: 'Watchlist entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting watchlist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting watchlist entry'
    });
  }
};

// Check if a guest is in the watchlist
const checkWatchlist = async (req, res) => {
  try {
    const { passportNumber, firstName, lastName } = req.query;

    if (!passportNumber) {
      return res.status(400).json({
        success: false,
        message: 'Passport number is required'
      });
    }

    const query = { passportNumber, isActive: true };

    if (firstName) {
      query.firstName = new RegExp(firstName, 'i');
    }

    if (lastName) {
      query.lastName = new RegExp(lastName, 'i');
    }

    const entries = await Watchlist.find(query);

    res.json({
      success: true,
      data: entries,
      isInWatchlist: entries.length > 0
    });
  } catch (error) {
    console.error('Error checking watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking watchlist'
    });
  }
};

// Reactivate a watchlist entry
const reactivateWatchlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Watchlist.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist entry not found'
      });
    }

    const updatedEntry = await Watchlist.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    // Re-flag guests that match this entry
    const matchingGuests = await Guest.find({
      passportNumber: entry.passportNumber,
      verificationStatus: { $ne: 'flagged' }
    });

    for (const guest of matchingGuests) {
      await Guest.findByIdAndUpdate(guest._id, {
        isInWatchlist: true,
        watchlistReason: entry.reason,
        verificationStatus: 'flagged'
      });

      // Create an alert for the match
      await Alert.create({
        guestId: guest._id,
        alertType: 'watchlist_match',
        title: `Reactivated Watchlist Match: ${guest.firstName} ${guest.lastName}`,
        description: `Guest passport number matches reactivated watchlist entry. Reason: ${entry.reason}`,
        severity: entry.severity || 'high',
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      data: updatedEntry
    });
  } catch (error) {
    console.error('Error reactivating watchlist entry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reactivating watchlist entry'
    });
  }
};

module.exports = {
  addToWatchlist,
  getAllWatchlistEntries,
  getWatchlistEntryById,
  updateWatchlistEntry,
  deactivateWatchlistEntry,
  deleteWatchlistEntry,
  checkWatchlist,
  reactivateWatchlistEntry
};