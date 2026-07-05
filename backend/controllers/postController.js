const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Helper function to delete uploaded image file from disk
const deleteDiskFile = (imagePath) => {
  if (!imagePath) return;
  try {
    // If path starts with /uploads/, parse the actual filename
    if (imagePath.startsWith('/uploads/')) {
      const filename = imagePath.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../uploads/', filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Failed to delete image file from disk:', error.message);
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username email avatar bio followers following')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching posts', error: error.message });
  }
};

// @desc    Create a post with optional image upload
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      // If content is empty but file is uploaded, remove the uploaded file to avoid orphaned files
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Post content cannot be empty' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const post = await Post.create({
      author: req.user.id,
      content,
      image: imagePath,
      likes: [],
      comments: [],
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username email avatar bio followers following')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error creating post', error: error.message });
  }
};

// @desc    Update post content or picture
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
  try {
    const { content } = req.body;
    let post = await Post.findById(req.params.id);

    if (!post) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'User not authorized to edit this post' });
    }

    // Update fields
    if (content) post.content = content;

    // Handle image replacement
    if (req.file) {
      // Delete old file from disk
      if (post.image) {
        deleteDiskFile(post.image);
      }
      post.image = `/uploads/${req.file.filename}`;
    } else if (req.body.removeImage === 'true') {
      // User explicitly wants to remove image
      if (post.image) {
        deleteDiskFile(post.image);
      }
      post.image = '';
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username email avatar bio followers following')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error updating post', error: error.message });
  }
};

// @desc    Delete post, comments, and image file
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'User not authorized to delete this post' });
    }

    // Delete post image from disk
    if (post.image) {
      deleteDiskFile(post.image);
    }

    // Delete comments associated with post
    await Comment.deleteMany({ post: post._id });

    // Delete post
    await Post.findByIdAndDelete(post._id);

    res.status(200).json({ message: 'Post and associated comments deleted successfully', postId: post._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting post', error: error.message });
  }
};

// @desc    Toggle like on a post
// @route   PUT /api/posts/:id/like
// @access  Private
const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the post has already been liked by this user
    const likeIndex = post.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Post is already liked, so unlike it
      post.likes.splice(likeIndex, 1);
    } else {
      // Post is not liked, so like it
      post.likes.push(req.user.id);
    }

    await post.save();

    // Populate post author and comments
    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username email avatar bio followers following')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        }
      });

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error toggling like', error: error.message });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create the comment
    const comment = await Comment.create({
      author: req.user.id,
      post: req.params.id,
      content,
    });

    // Add comment to post's comments array
    post.comments.push(comment._id);
    await post.save();

    // Fetch the fully populated comment to return
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username avatar');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding comment', error: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  addComment,
};
