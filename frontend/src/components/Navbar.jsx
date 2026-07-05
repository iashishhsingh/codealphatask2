import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ currentView, onNavigate }) => {
  const { user, logout, API_URL, setAuthUser, resolveAssetUrl } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results on query change
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSearchLoading(true);
      setShowDropdown(true);

      try {
        const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user.token]);

  const handleFollowToggle = async (e, targetUserId, isCurrentlyFollowing) => {
    e.stopPropagation(); // Avoid triggering navigation

    try {
      const response = await fetch(`${API_URL}/users/${targetUserId}/follow`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Follow toggle failed');
      }

      const data = await response.json();

      // Update current user's global session details (e.g. following count)
      setAuthUser(data.currentUser);

      // Instantly update local searchResults row state
      setSearchResults((prevResults) =>
        prevResults.map((u) => {
          if (u._id === targetUserId) {
            let updatedFollowers = [...u.followers];
            if (data.isFollowing) {
              if (!updatedFollowers.includes(user._id)) {
                updatedFollowers.push(user._id);
              }
            } else {
              updatedFollowers = updatedFollowers.filter((id) => id !== user._id);
            }
            return { ...u, followers: updatedFollowers };
          }
          return u;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleResultClick = (targetUsername) => {
    setSearchQuery('');
    setShowDropdown(false);
    onNavigate('profile', targetUsername);
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => onNavigate('feed')}>
        connect<span>next</span>
      </div>

      {/* Instagram-style User Search bar */}
      <div className="search-container" ref={dropdownRef}>
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim() !== '') setShowDropdown(true);
            }}
          />
        </div>

        {showDropdown && (
          <div className="search-dropdown">
            {searchLoading ? (
              <div className="search-empty">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="search-empty">No users found</div>
            ) : (
              searchResults.map((searchUser) => {
                const isTargetSelf = searchUser._id === user._id;
                const isUserFollowed = user.following.includes(searchUser._id);

                return (
                  <div key={searchUser._id} className="search-result-row">
                    <div
                      className="search-user-info"
                      onClick={() => handleResultClick(searchUser.username)}
                    >
                      <img
                        src={resolveAssetUrl(searchUser.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${searchUser.username}`}
                        alt={searchUser.username}
                        className="search-avatar"
                      />
                      <div className="search-meta">
                        <span className="search-username">{searchUser.username}</span>
                        <span className="search-bio-snippet">{searchUser.bio}</span>
                      </div>
                    </div>

                    {!isTargetSelf && (
                      <button
                        onClick={(e) => handleFollowToggle(e, searchUser._id, isUserFollowed)}
                        className={`search-follow-btn ${isUserFollowed ? 'following' : ''}`}
                      >
                        {isUserFollowed ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="nav-links">
        <button
          className={`nav-link ${currentView.name === 'feed' ? 'active' : ''}`}
          onClick={() => onNavigate('feed')}
          style={{ background: 'none', border: 'none' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Feed
        </button>

        <button
          className={`nav-link ${currentView.name === 'profile' && currentView.param === user.username ? 'active' : ''}`}
          onClick={() => onNavigate('profile', user.username)}
          style={{ background: 'none', border: 'none' }}
        >
          <img
            src={resolveAssetUrl(user.avatar) || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.username}`}
            alt="Profile Avatar"
            className="nav-avatar"
          />
          Profile
        </button>

        <button
          className="nav-link"
          onClick={logout}
          style={{ background: 'none', border: 'none' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
