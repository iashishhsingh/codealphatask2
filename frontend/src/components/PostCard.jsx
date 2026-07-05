import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import CommentSection from './CommentSection';

const PostCard = ({ post, onNavigate, onPostUpdated, onPostDeleted }) => {
  const { user, API_URL, setAuthUser, resolveAssetUrl } = useContext(AuthContext);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(post.image ? resolveAssetUrl(post.image) : '');
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const isLiked = post.likes.includes(user._id);
  const isFollowing = user.following.includes(post.author._id);
  const isSelf = post.author._id === user._id;

  // Close card settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async () => {
    // Optimistic UI updates
    const updatedLikes = isLiked
      ? post.likes.filter((id) => id !== user._id)
      : [...post.likes, user._id];

    onPostUpdated({ ...post, likes: updatedLikes });

    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      onPostUpdated(data);
    } catch (err) {
      console.error(err);
      onPostUpdated(post); // Revert
    }
  };

  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/${post.author._id}/follow`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to follow/unfollow');
      }

      const data = await response.json();
      setAuthUser(data.currentUser);
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${post._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      if (onPostDeleted) {
        onPostDeleted(post._id);
      }
    } catch (err) {
      alert(err.message || 'Error deleting post.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    setEditLoading(true);
    setEditError('');

    try {
      const formData = new FormData();
      formData.append('content', editContent);
      if (editImage) {
        formData.append('image', editImage);
      }
      if (removeImageFlag) {
        formData.append('removeImage', 'true');
      }

      const response = await fetch(`${API_URL}/posts/${post._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update post');
      }

      onPostUpdated(data);
      setIsEditing(false);
      setEditImage(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setEditError('File size too large. Limit is 5MB.');
      return;
    }

    setEditError('');
    setEditImage(file);
    setEditImagePreview(URL.createObjectURL(file));
    setRemoveImageFlag(false);
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditImagePreview('');
    setRemoveImageFlag(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author-info" onClick={() => onNavigate('profile', post.author.username)}>
          <img
            src={resolveAssetUrl(post.author.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${post.author.username}`}
            alt={post.author.username}
            className="post-author-avatar"
          />
          <div className="post-author-meta">
            <span className="post-author-name">{post.author.username}</span>
            <span className="post-time">{formatDate(post.createdAt)}</span>
          </div>
        </div>

        <div className="post-header-actions">
          {/* Follow/Unfollow badge */}
          {!isSelf && (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`follow-badge ${isFollowing ? 'following' : ''}`}
            >
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {/* Settings Menu: Edit/Delete for Authors */}
          {isSelf && (
            <div className="post-menu-container" ref={menuRef}>
              <button className="post-menu-trigger" onClick={() => setShowMenu(!showMenu)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              {showMenu && (
                <div className="post-menu-dropdown">
                  <button className="post-menu-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                    Edit Post
                  </button>
                  <button className="post-menu-item danger" onClick={() => { handleDeletePost(); setShowMenu(false); }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="post-content">{post.content}</div>

      {/* Render uploaded image file if present */}
      {post.image && (
        <img
          src={resolveAssetUrl(post.image)}
          alt="Post attachment"
          className="post-card-image"
        />
      )}

      <div className="post-actions">
        <button
          className={`post-action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>{post.likes.length}</span>
        </button>

        <button
          className="post-action-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{post.comments ? post.comments.length : 0}</span>
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post._id}
          initialComments={post.comments}
          onCommentAdded={(updatedComments) => onPostUpdated({ ...post, comments: updatedComments })}
          onNavigate={onNavigate}
        />
      )}

      {/* EDIT POST MODAL */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Edit Post</h3>
              <button className="modal-close-btn" onClick={() => setIsEditing(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && <div className="alert-banner alert-error">{editError}</div>}
                
                <div className="form-group">
                  <label className="form-label">Post Content</label>
                  <textarea
                    className="form-input form-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    disabled={editLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Post Photo</label>
                  
                  {editImagePreview ? (
                    <div className="image-preview-container">
                      <img src={editImagePreview} alt="Post preview" className="image-preview-img" />
                      <button type="button" className="image-preview-remove-btn" onClick={handleRemoveEditImage}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="upload-btn-label" style={{ width: '100%', justifyContent: 'center' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      Choose New Photo
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="upload-input-hidden"
                        onChange={handleEditImageChange}
                        disabled={editLoading}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setIsEditing(false)} disabled={editLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={editLoading || !editContent.trim()}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
