const User = require('../models/User');
const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');

// Helper function to delete custom uploaded files from disk
const deleteDiskFile = (filePath) => {
  if (!filePath) return;
  try {
    if (filePath.startsWith('/uploads/')) {
      const filename = filePath.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../uploads/', filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Failed to delete avatar image file from disk:', error.message);
  }
};

// @desc    Get user profile details and their posts
// @route   GET /api/users/profile/:username
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username avatar bio')
      .populate('following', 'username avatar bio');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all posts by this user
    const posts = await Post.find({ author: user._id })
      .populate('author', 'username email avatar bio followers following')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      user,
      posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user profile', error: error.message });
  }
};

// @desc    Toggle follow/unfollow user
// @route   PUT /api/users/:id/follow
// @access  Private
const toggleFollowUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    const followIndex = currentUser.following.indexOf(targetUser._id);
    const followerIndex = targetUser.followers.indexOf(currentUser._id);

    let isFollowing = false;

    if (followIndex > -1) {
      // Unfollow
      currentUser.following.splice(followIndex, 1);
      if (followerIndex > -1) {
        targetUser.followers.splice(followerIndex, 1);
      }
      isFollowing = false;
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      isFollowing = true;
    }

    await currentUser.save();
    await targetUser.save();

    const updatedCurrentUser = await User.findById(currentUser._id).select('-password');

    res.status(200).json({
      message: isFollowing ? 'Followed successfully' : 'Unfollowed successfully',
      isFollowing,
      currentUser: updatedCurrentUser,
      targetUserFollowersCount: targetUser.followers.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error toggling follow state', error: error.message });
  }
};

// @desc    Search users by username
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(200).json([]);
    }

    // Case-insensitive regex search
    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    })
      .select('username avatar bio followers following')
      .limit(10); // Limit search results

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during user search', error: error.message });
  }
};

// @desc    Update user profile (bio & avatar)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update bio if supplied
    if (bio !== undefined) {
      user.bio = bio;
    }

    // Handle avatar image file upload
    if (req.file) {
      // If user had a custom disk avatar uploaded, delete it
      if (user.avatar && user.avatar.startsWith('/uploads/')) {
        deleteDiskFile(user.avatar);
      }
      user.avatar = `/uploads/${req.file.filename}`;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error updating user profile', error: error.message });
  }
};

module.exports = {
  getUserProfile,
  toggleFollowUser,
  searchUsers,
  updateUserProfile,
};
