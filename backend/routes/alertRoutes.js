const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/alerts
// @desc    Create a new alert
// @access  Private
router.post(
  '/',
  [
    authMiddleware.authenticate,
    check('guestId', 'Guest ID is required').not().isEmpty(),
    check('alertType', 'Alert type is required').not().isEmpty(),
    check('alertType', 'Alert type must be one of: suspicious_activity, watchlist_match, verification_failed, passport_expiry, custom').isIn(['suspicious_activity', 'watchlist_match', 'verification_failed', 'passport_expiry', 'custom']),
    check('title', 'Title is required').not().isEmpty(),
    check('title', 'Title cannot exceed 100 characters').optional().isLength({ max: 100 }),
    check('description', 'Description is required').not().isEmpty(),
    check('severity', 'Severity must be one of: low, medium, high, critical').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  alertController.createAlert
);

// @route   GET /api/alerts
// @desc    Get all alerts
// @access  Private
router.get('/', authMiddleware.authenticate, alertController.getAllAlerts);

// @route   GET /api/alerts/count
// @desc    Get alerts count by status
// @access  Private
router.get('/count', authMiddleware.authenticate, alertController.getAlertsCountByStatus);

// @route   GET /api/alerts/:id
// @desc    Get a single alert by ID
// @access  Private
router.get('/:id', authMiddleware.authenticate, alertController.getAlertById);

// @route   PUT /api/alerts/:id
// @desc    Update an alert
// @access  Private
router.put(
  '/:id',
  [
    authMiddleware.authenticate,
    check('title', 'Title cannot exceed 100 characters').optional().isLength({ max: 100 }),
    check('description', 'Description cannot exceed 1000 characters').optional().isLength({ max: 1000 }),
    check('severity', 'Severity must be one of: low, medium, high, critical').optional().isIn(['low', 'medium', 'high', 'critical']),
    check('status', 'Status must be one of: open, in_progress, resolved, closed').optional().isIn(['open', 'in_progress', 'resolved', 'closed'])
  ],
  alertController.updateAlert
);

// @route   PUT /api/alerts/:id/assign
// @desc    Assign alert to a user
// @access  Private
router.put(
  '/:id/assign',
  [
    authMiddleware.authenticate,
    check('assignedTo', 'Assigned to user ID is required').not().isEmpty()
  ],
  alertController.assignAlert
);

// @route   PUT /api/alerts/:id/resolve
// @desc    Resolve an alert
// @access  Private
router.put(
  '/:id/resolve',
  [
    authMiddleware.authenticate,
    check('resolutionNotes', 'Resolution notes cannot exceed 1000 characters').optional().isLength({ max: 1000 })
  ],
  alertController.resolveAlert
);

// @route   PUT /api/alerts/:id/close
// @desc    Close an alert
// @access  Private
router.put(
  '/:id/close',
  [
    authMiddleware.authenticate,
    check('resolutionNotes', 'Resolution notes cannot exceed 1000 characters').optional().isLength({ max: 1000 })
  ],
  alertController.closeAlert
);

// @route   DELETE /api/alerts/:id
// @desc    Delete an alert
// @access  Private
router.delete('/:id', authMiddleware.authenticate, alertController.deleteAlert);

module.exports = router;