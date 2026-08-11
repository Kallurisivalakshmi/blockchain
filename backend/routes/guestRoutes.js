const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const guestController = require('../controllers/guestController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/guests
// @desc    Create a new guest
// @access  Private
router.post(
  '/',
  [
    authMiddleware.authenticate,
    authMiddleware.authorize(['hotel', 'admin', 'manager', 'staff']),
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('dateOfBirth', 'Date of birth is required').not().isEmpty(),
    check('dateOfBirth', 'Date of birth must be a valid date').isISO8601(),
    check('gender', 'Gender is required').not().isEmpty(),
    check('gender', 'Gender must be one of: male, female, other').isIn(['male', 'female', 'other']),
    check('nationality', 'Nationality is required').not().isEmpty(),
    check('passportNumber', 'Passport number is required').not().isEmpty(),
    check('passportExpiry', 'Passport expiry is required').not().isEmpty(),
    check('passportExpiry', 'Passport expiry must be a valid date').isISO8601(),
    check('contactNumber', 'Contact number is required').not().isEmpty(),
    check('checkInDate', 'Check-in date is required').not().isEmpty(),
    check('checkInDate', 'Check-in date must be a valid date').isISO8601(),
    check('checkOutDate', 'Check-out date is required').not().isEmpty(),
    check('checkOutDate', 'Check-out date must be a valid date').isISO8601(),
    check('roomNumber', 'Room number is required').not().isEmpty()
  ],
  guestController.createGuest
);

// @route   GET /api/guests
// @desc    Get all guests for the current hotel
// @access  Private
router.get('/', authMiddleware.authenticate, guestController.getAllGuests);

// @route   GET /api/guests/search
// @desc    Search guests
// @access  Private
router.get('/search', authMiddleware.authenticate, guestController.searchGuests);

// @route   GET /api/guests/verification/:status
// @desc    Get guests by verification status
// @access  Private
router.get('/verification/:status', authMiddleware.authenticate, guestController.getGuestsByVerificationStatus);

// @route   GET /api/guests/:id
// @desc    Get a single guest by ID
// @access  Private
router.get('/:id', authMiddleware.authenticate, guestController.getGuestById);

// @route   PUT /api/guests/:id
// @desc    Update a guest
// @access  Private
router.put(
  '/:id',
  [
    authMiddleware.authenticate,
    check('firstName', 'First name must not be empty').optional().not().isEmpty(),
    check('lastName', 'Last name must not be empty').optional().not().isEmpty(),
    check('dateOfBirth', 'Date of birth must be a valid date').optional().isISO8601(),
    check('gender', 'Gender must be one of: male, female, other').optional().isIn(['male', 'female', 'other']),
    check('passportExpiry', 'Passport expiry must be a valid date').optional().isISO8601(),
    check('checkInDate', 'Check-in date must be a valid date').optional().isISO8601(),
    check('checkOutDate', 'Check-out date must be a valid date').optional().isISO8601()
  ],
  guestController.updateGuest
);

// @route   PUT /api/guests/:id/verify
// @desc    Verify a guest
// @access  Private/Police
router.put(
  '/:id/verify',
  [
    authMiddleware.authenticate,
    authMiddleware.authorize(['police', 'admin']),
    check('verificationStatus', 'Verification status is required').not().isEmpty(),
    check('verificationStatus', 'Verification status must be one of: pending, verified, rejected, flagged').isIn(['pending', 'verified', 'rejected', 'flagged'])
  ],
  guestController.verifyGuest
);

// @route   DELETE /api/guests/:id
// @desc    Delete a guest
// @access  Private
router.delete('/:id', authMiddleware.authenticate, guestController.deleteGuest);

module.exports = router;