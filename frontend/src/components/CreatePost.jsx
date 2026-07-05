import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';

const CreatePost = ({ onPostCreated }) => {
  const { user, API_URL, resolveAssetUrl } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Limit is 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    setError('');
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Use FormData to allow file uploads
      const formData = new FormData();
      formData.append('content', content);
      if (image) {
        formData.append('image', image);
      }

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          // Note: Do NOT set Content-Type header when sending FormData,
          // the browser will set it automatically with the correct boundary.
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create post');
      }

      setContent('');
      setImage(null);
      setImagePreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onPostCreated) {
        onPostCreated(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-card">
      <form onSubmit={handleSubmit}>
        <div className="create-post-header">
          <img
            src={resolveAssetUrl(user.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.username}`}
            alt="User Avatar"
            className="composer-avatar"
          />
          <textarea
            placeholder={`What's on your mind, ${user.username}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="composer-textarea"
            maxLength={500}
            required
            disabled={loading}
          />
        </div>

        {/* Local Image Attachment Preview */}
        {imagePreview && (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Upload preview" className="image-preview-img" />
            <button type="button" className="image-preview-remove-btn" onClick={handleRemoveImage}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        {error && (
          <div className="alert-banner alert-error" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        <div className="create-post-footer">
          {/* File Upload Selector Button */}
          <label className="upload-btn-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Photo
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="upload-input-hidden"
              onChange={handleImageChange}
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            className="btn btn-post-submit"
            disabled={loading || !content.trim()}
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
