const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('username', 'Username must be at least 3 characters').isLength({ min: 3 }),
    check('password', 'Password is required').not().isEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('email', 'Email is required').not().isEmpty(),
    check('email', 'Please provide a valid email').isEmail(),
    check('fullName', 'Full name is required').not().isEmpty(),
    check('role', 'Role must be one of: admin, hotel, police, manager, staff, security').optional().isIn(['admin', 'hotel', 'police', 'manager', 'staff', 'security'])
  ],
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required').not().isEmpty()
  ],
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    authMiddleware.authenticate,
    check('fullName', 'Full name must not be empty').optional().not().isEmpty(),
    check('email', 'Please provide a valid email').optional().isEmail()
  ],
  authController.updateProfile
);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  [
    authMiddleware.authenticate,
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.changePassword
);

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', authMiddleware.authenticate, authMiddleware.authorize(['admin']), authController.getAllUsers);

// @route   PUT /api/auth/users/:id
// @desc    Update user by ID (admin only)
// @access  Private/Admin
router.put('/users/:id', authMiddleware.authenticate, authMiddleware.authorize(['admin']), authController.updateUser);

// @route   PUT /api/auth/users/:id/deactivate
// @desc    Deactivate user (admin only)
// @access  Private/Admin
router.put('/users/:id/deactivate', authMiddleware.authenticate, authMiddleware.authorize(['admin']), authController.deactivateUser);

module.exports = router;