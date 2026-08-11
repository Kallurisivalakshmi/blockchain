const { Guest, Watchlist, Alert } = require('../models');
const { validationResult } = require('express-validator');

// Create a new guest
const createGuest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const guestData = { ...req.body, hotelId: req.user.id };
    
    // Check if guest with this passport already exists
    const existingGuest = await Guest.findOne({ passportNumber: guestData.passportNumber });
    if (existingGuest) {
      return res.status(400).json({
        success: false,
        message: 'A guest with this passport number already exists'
      });
    }

    // Check if passport is in watchlist
    const watchlistEntry = await Watchlist.findOne({ passportNumber: guestData.passportNumber });
    if (watchlistEntry) {
      guestData.isInWatchlist = true;
      guestData.watchlistReason = watchlistEntry.reason;
      guestData.verificationStatus = 'flagged';
      
      // Create an alert for watchlist match
      await Alert.create({
        guestId: guestData._id,
        alertType: 'watchlist_match',
        title: `Watchlist Match: ${guestData.firstName} ${guestData.lastName}`,
        description: `Guest passport number matches watchlist entry. Reason: ${watchlistEntry.reason}`,
        severity: watchlistEntry.severity || 'high',
        createdBy: req.user.id
      });
    }

    const guest = new Guest(guestData);
    await guest.save();

    res.status(201).json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating guest'
    });
  }
};

// Get all guests for the current hotel
const getAllGuests = async (req, res) => {
  try {
    const { page = 1, limit = 10, verificationStatus, isInWatchlist } = req.query;
    const query = { hotelId: req.user.id };

    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    if (isInWatchlist) {
      query.isInWatchlist = isInWatchlist === 'true';
    }

    const guests = await Guest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('hotelId', 'username fullName');

    const total = await Guest.countDocuments(query);

    res.json({
      success: true,
      data: guests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching guests'
    });
  }
};

// Get a single guest by ID
const getGuestById = async (req, res) => {
  try {
    const { id } = req.params;
    const guest = await Guest.findById(id).populate('hotelId', 'username fullName');

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check if guest belongs to current hotel or user is police
    if (guest.hotelId._id.toString() !== req.user.id && req.user.role !== 'police' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This guest does not belong to your hotel.'
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
      message: 'Server error while fetching guest'
    });
  }
};

// Update a guest
const updateGuest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const guest = await Guest.findById(id);

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check if guest belongs to current hotel
    if (guest.hotelId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This guest does not belong to your hotel.'
      });
    }

    const updates = req.body;
    const updatedGuest = await Guest.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedGuest
    });
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating guest'
    });
  }
};

// Verify a guest
const verifyGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, verificationNotes } = req.body;

    const guest = await Guest.findById(id);
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Only police can verify guests
    if (req.user.role !== 'police' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only police officers can verify guests'
      });
    }

    const updates = { verificationStatus, verificationNotes, isVerified: verificationStatus === 'verified' };
    const updatedGuest = await Guest.findByIdAndUpdate(id, updates, { new: true });

    // Create an alert if verification failed or was rejected
    if (verificationStatus === 'rejected' || verificationStatus === 'flagged') {
      await Alert.create({
        guestId: id,
        alertType: 'verification_failed',
        title: `Verification ${verificationStatus}: ${updatedGuest.firstName} ${updatedGuest.lastName}`,
        description: `Guest verification ${verificationStatus}. Notes: ${verificationNotes || 'No notes provided'}`,
        severity: 'high',
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      data: updatedGuest
    });
  } catch (error) {
    console.error('Error verifying guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying guest'
    });
  }
};

// Delete a guest
const deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const guest = await Guest.findById(id);

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check if guest belongs to current hotel or user is admin
    if (guest.hotelId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This guest does not belong to your hotel.'
      });
    }

    await Guest.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting guest'
    });
  }
};

// Search guests
const searchGuests = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(query, 'i');
    const dbQuery = {
      hotelId: req.user.id,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { passportNumber: searchRegex },
        { nationality: searchRegex }
      ]
    };

    // If user is police or admin, search all guests
    if (req.user.role === 'police' || req.user.role === 'admin') {
      delete dbQuery.hotelId;
    }

    const guests = await Guest.find(dbQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('hotelId', 'username fullName');

    const total = await Guest.countDocuments(dbQuery);

    res.json({
      success: true,
      data: guests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error searching guests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching guests'
    });
  }
};

// Get guests by verification status
const getGuestsByVerificationStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'verified', 'rejected', 'flagged'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid verification status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const query = { verificationStatus: status };
    
    // If user is not police or admin, only show guests from their hotel
    if (req.user.role !== 'police' && req.user.role !== 'admin') {
      query.hotelId = req.user.id;
    }

    const guests = await Guest.find(query)
      .sort({ createdAt: -1 })
      .populate('hotelId', 'username fullName');

    res.json({
      success: true,
      data: guests
    });
  } catch (error) {
    console.error('Error fetching guests by verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching guests by verification status'
    });
  }
};

module.exports = {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  verifyGuest,
  deleteGuest,
  searchGuests,
  getGuestsByVerificationStatus
};