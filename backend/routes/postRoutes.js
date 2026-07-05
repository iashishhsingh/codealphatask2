const express = require('express');
const router = express.Router();
const {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  addComment,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getPosts)
  .post(protect, upload.single('image'), createPost);

router.route('/:id')
  .put(protect, upload.single('image'), updatePost)
  .delete(protect, deletePost);

router.put('/:id/like', protect, toggleLikePost);
router.post('/:id/comments', protect, addComment);

module.exports = router;
