import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const CommentSection = ({ postId, initialComments, onCommentAdded, onNavigate }) => {
  const { user, API_URL, resolveAssetUrl } = useContext(AuthContext);
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }

      const updatedComments = [...comments, data];
      setComments(updatedComments);
      setNewComment('');

      if (onCommentAdded) {
        onCommentAdded(updatedComments);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-drawer">
      <div className="comment-list">
        {comments.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="comment-bubble-container">
              <img
                src={resolveAssetUrl(comment.author.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${comment.author.username}`}
                alt={comment.author.username}
                className="comment-avatar"
              />
              <div className="comment-bubble">
                <div
                  className="comment-author"
                  onClick={() => onNavigate('profile', comment.author.username)}
                >
                  {comment.author.username}
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="alert-banner alert-error" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-wrapper">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
            required
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className="btn btn-comment-submit"
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
