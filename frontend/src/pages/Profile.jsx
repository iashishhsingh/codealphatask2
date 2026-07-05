import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const Profile = ({ username, onNavigate }) => {
  const { user, API_URL, setAuthUser, resolveAssetUrl } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile Edit modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const fileInputRef = useRef(null);

  const isSelf = user.username === username;
  const isFollowing = profileUser && user.following.includes(profileUser._id);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/users/profile/${username}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('User not found');
      }

      const data = await response.json();
      setProfileUser(data.user);
      setPosts(data.posts);
      
      // Initialize edit fields
      setEditBio(data.user.bio || '');
      setEditAvatarPreview(resolveAssetUrl(data.user.avatar) || '');
    } catch (err) {
      setError(err.message || 'Error loading user profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username, user.token]);

  const handleFollowToggle = async () => {
    if (followLoading || !profileUser) return;
    setFollowLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/${profileUser._id}/follow`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle follow');
      }

      const data = await response.json();
      setAuthUser(data.currentUser);

      setProfileUser((prev) => {
        if (!prev) return null;
        let updatedFollowers = [...prev.followers];
        if (data.isFollowing) {
          if (!updatedFollowers.some(f => f._id === user._id)) {
            updatedFollowers.push({
              _id: user._id,
              username: user.username,
              avatar: user.avatar,
              bio: user.bio
            });
          }
        } else {
          updatedFollowers = updatedFollowers.filter(f => f._id !== user._id);
        }
        return { ...prev, followers: updatedFollowers };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post._id === updatedPost._id ? updatedPost : post))
    );
  };

  const handlePostDeleted = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  // Submit profile edits
  const handleProfileEditSubmit = async (e) => {
    e.preventDefault();
    setEditProfileLoading(true);
    setEditProfileError('');

    try {
      const formData = new FormData();
      formData.append('bio', editBio);
      if (editAvatar) {
        formData.append('avatar', editAvatar);
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update global context
      setAuthUser(data);
      
      // Update local profile stats/details
      setProfileUser((prev) => ({
        ...prev,
        bio: data.bio,
        avatar: data.avatar,
      }));

      setIsEditingProfile(false);
      setEditAvatar(null);
    } catch (err) {
      setEditProfileError(err.message);
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setEditProfileError('Avatar size too large. Limit is 5MB.');
      return;
    }

    setEditProfileError('');
    setEditAvatar(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        Loading profile...
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="main-content">
        <div className="alert-banner alert-error" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Profile Error</h3>
          <p style={{ marginTop: '0.5rem' }}>{error || 'Requested user does not exist.'}</p>
          <button className="btn btn-primary" onClick={() => onNavigate('feed')} style={{ marginTop: '1rem', width: 'auto' }}>
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-info">
            <img
              src={resolveAssetUrl(profileUser.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profileUser.username}`}
              alt={profileUser.username}
              className="profile-avatar"
            />
            <h1 className="profile-name">{profileUser.username}</h1>
            <p className="profile-bio">{profileUser.bio || "This user hasn't written a bio yet."}</p>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{posts.length}</span>
                <span className="stat-label">Posts</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{profileUser.followers ? profileUser.followers.length : 0}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{profileUser.following ? profileUser.following.length : 0}</span>
                <span className="stat-label">Following</span>
              </div>
            </div>

            <div className="profile-actions">
              {isSelf ? (
                <button
                  className="btn btn-outline"
                  onClick={() => setIsEditingProfile(true)}
                  style={{ borderRadius: '50px' }}
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                  style={{ borderRadius: '50px' }}
                >
                  {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="section-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ verticalAlign: 'middle', marginRight: '0.25rem' }}
            >
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            Posts by {profileUser.username}
          </h2>

          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Posts Yet</div>
              <div className="empty-state-subtitle">{isSelf ? "You haven't posted anything yet. Share an update!" : "This user hasn't posted anything yet."}</div>
            </div>
          ) : (
            <div className="posts-container">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onNavigate={onNavigate}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Edit Profile</h3>
              <button className="modal-close-btn" onClick={() => setIsEditingProfile(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleProfileEditSubmit}>
              <div className="modal-body">
                {editProfileError && <div className="alert-banner alert-error">{editProfileError}</div>}

                {/* Avatar upload with circular preview */}
                <div className="avatar-edit-preview-container">
                  <img
                    src={editAvatarPreview || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profileUser.username}`}
                    alt="Avatar preview"
                    className="avatar-edit-preview"
                  />
                  <label className="avatar-upload-label">
                    Upload New Avatar
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="upload-input-hidden"
                      onChange={handleAvatarChange}
                      disabled={editProfileLoading}
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editBio">Bio</label>
                  <textarea
                    id="editBio"
                    className="form-input form-textarea"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    maxLength={150}
                    disabled={editProfileLoading}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" style={{ width: 'auto' }} onClick={() => setIsEditingProfile(false)} disabled={editProfileLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={editProfileLoading}>
                  {editProfileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
