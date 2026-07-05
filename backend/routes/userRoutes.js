const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  toggleFollowUser,
  searchUsers,
  updateUserProfile,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Get search query first
router.get('/search', protect, searchUsers);

// Update profile must be registered before the profile username wildcard
router.put('/profile', protect, upload.single('avatar'), updateUserProfile);

// Get user profile details
router.get('/profile/:username', protect, getUserProfile);

// Toggle follow relationship
router.put('/:id/follow', protect, toggleFollowUser);

module.exports = router;
