const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const watchlistController = require('../controllers/watchlistController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/watchlist
// @desc    Add a person to the watchlist
// @access  Private/Police
router.post(
  '/',
  [
    authMiddleware.authenticate,
    authMiddleware.authorize(['police', 'admin']),
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('reason', 'Reason is required').not().isEmpty(),
    check('reason', 'Reason cannot exceed 1000 characters').optional().isLength({ max: 1000 }),
    check('category', 'Category must be one of: criminal, suspicious, missing_person, wanted, other').optional().isIn(['criminal', 'suspicious', 'missing_person', 'wanted', 'other']),
    check('severity', 'Severity must be one of: low, medium, high, critical').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  watchlistController.addToWatchlist
);

// @route   GET /api/watchlist
// @desc    Get all watchlist entries
// @access  Private/Police
router.get('/', authMiddleware.authenticate, authMiddleware.authorize(['police', 'admin']), watchlistController.getAllWatchlistEntries);

// @route   GET /api/watchlist/check
// @desc    Check if a person is in the watchlist
// @access  Private
router.get('/check', authMiddleware.authenticate, watchlistController.checkWatchlist);

// @route   GET /api/watchlist/:id
// @desc    Get a single watchlist entry by ID
// @access  Private/Police
router.get('/:id', authMiddleware.authenticate, authMiddleware.authorize(['police', 'admin']), watchlistController.getWatchlistEntryById);

// @route   PUT /api/watchlist/:id
// @desc    Update a watchlist entry
// @access  Private/Police
router.put(
  '/:id',
  [
    authMiddleware.authenticate,
    authMiddleware.authorize(['police', 'admin']),
    check('reason', 'Reason cannot exceed 1000 characters').optional().isLength({ max: 1000 }),
    check('category', 'Category must be one of: criminal, suspicious, missing_person, wanted, other').optional().isIn(['criminal', 'suspicious', 'missing_person', 'wanted', 'other']),
    check('severity', 'Severity must be one of: low, medium, high, critical').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  watchlistController.updateWatchlistEntry
);

// @route   PUT /api/watchlist/:id/deactivate
// @desc    Deactivate a watchlist entry
// @access  Private/Police
router.put('/:id/deactivate', authMiddleware.authenticate, authMiddleware.authorize(['police', 'admin']), watchlistController.deactivateWatchlistEntry);

// @route   PUT /api/watchlist/:id/reactivate
// @desc    Reactivate a watchlist entry
// @access  Private/Police
router.put('/:id/reactivate', authMiddleware.authenticate, authMiddleware.authorize(['police', 'admin']), watchlistController.reactivateWatchlistEntry);

// @route   DELETE /api/watchlist/:id
// @desc    Delete a watchlist entry
// @access  Private/Police
router.delete('/:id', authMiddleware.authenticate, authMiddleware.authorize(['police', 'admin']), watchlistController.deleteWatchlistEntry);

module.exports = router;