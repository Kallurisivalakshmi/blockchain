const { Alert, Guest } = require('../models');
const { validationResult } = require('express-validator');

// Create a new alert
const createAlert = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { guestId, alertType, title, description, severity, metadata } = req.body;

    // Verify guest exists
    const guest = await Guest.findById(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    const alert = new Alert({
      guestId,
      alertType,
      title,
      description,
      severity,
      createdBy: req.user.id,
      metadata: metadata || {}
    });

    await alert.save();

    // Update guest verification status if this is a serious alert
    if (['high', 'critical'].includes(severity)) {
      await Guest.findByIdAndUpdate(guestId, { verificationStatus: 'flagged' });
    }

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating alert'
    });
  }
};

// Get all alerts
const getAllAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, severity, guestId } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (guestId) {
      query.guestId = guestId;
    }

    // If user is not admin or police, only show alerts for their guests
    if (req.user.role !== 'admin' && req.user.role !== 'police') {
      const guestIds = await Guest.find({ hotelId: req.user.id }).select('_id');
      query.guestId = { $in: guestIds.map(g => g._id) };
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('guestId', 'firstName lastName passportNumber')
      .populate('createdBy', 'username fullName role')
      .populate('assignedTo', 'username fullName')
      .populate('resolvedBy', 'username fullName');

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching alerts'
    });
  }
};

// Get a single alert by ID
const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id)
      .populate('guestId', 'firstName lastName passportNumber hotelId')
      .populate('createdBy', 'username fullName role')
      .populate('assignedTo', 'username fullName')
      .populate('resolvedBy', 'username fullName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if alert belongs to a guest from current user's hotel (unless admin or police)
    if (req.user.role !== 'admin' && req.user.role !== 'police') {
      const guest = await Guest.findById(alert.guestId);
      if (!guest || guest.hotelId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This alert does not belong to your hotel.'
        });
      }
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching alert'
    });
  }
};

// Update an alert
const updateAlert = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if alert belongs to a guest from current user's hotel (unless admin or police)
    if (req.user.role !== 'admin' && req.user.role !== 'police') {
      const guest = await Guest.findById(alert.guestId);
      if (!guest || guest.hotelId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This alert does not belong to your hotel.'
        });
      }
    }

    const updates = req.body;
    const updatedAlert = await Alert.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedAlert
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating alert'
    });
  }
};

// Assign alert to a user
const assignAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if assigned user exists
    const User = require('../models/User');
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User to assign not found'
      });
    }

    // Update alert status to in_progress if it was open
    const updates = {
      assignedTo,
      status: alert.status === 'open' ? 'in_progress' : alert.status
    };

    const updatedAlert = await Alert.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedAlert
    });
  } catch (error) {
    console.error('Error assigning alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning alert'
    });
  }
};

// Resolve an alert
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const updates = {
      status: 'resolved',
      resolutionNotes,
      resolvedAt: new Date(),
      resolvedBy: req.user.id
    };

    const updatedAlert = await Alert.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedAlert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving alert'
    });
  }
};

// Close an alert
const closeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const updates = {
      status: 'closed',
      resolutionNotes: resolutionNotes || alert.resolutionNotes,
      resolvedAt: alert.resolvedAt || new Date(),
      resolvedBy: alert.resolvedBy || req.user.id
    };

    const updatedAlert = await Alert.findByIdAndUpdate(id, updates, { new: true });

    res.json({
      success: true,
      data: updatedAlert
    });
  } catch (error) {
    console.error('Error closing alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while closing alert'
    });
  }
};

// Delete an alert
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if alert belongs to a guest from current user's hotel (unless admin)
    if (req.user.role !== 'admin') {
      const guest = await Guest.findById(alert.guestId);
      if (!guest || guest.hotelId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This alert does not belong to your hotel.'
        });
      }
    }

    await Alert.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting alert'
    });
  }
};

// Get alerts count by status
const getAlertsCountByStatus = async (req, res) => {
  try {
    const query = {};

    // If user is not admin or police, only count alerts for their guests
    if (req.user.role !== 'admin' && req.user.role !== 'police') {
      const guestIds = await Guest.find({ hotelId: req.user.id }).select('_id');
      query.guestId = { $in: guestIds.map(g => g._id) };
    }

    const counts = await Alert.aggregate([
      { $match: query },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    const result = {};
    counts.forEach(item => {
      result[item._id] = item.count;
    });

    // Ensure all statuses are present
    ['open', 'in_progress', 'resolved', 'closed'].forEach(status => {
      if (!result[status]) {
        result[status] = 0;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching alerts count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching alerts count'
    });
  }
};

module.exports = {
  createAlert,
  getAllAlerts,
  getAlertById,
  updateAlert,
  assignAlert,
  resolveAlert,
  closeAlert,
  deleteAlert,
  getAlertsCountByStatus
};