import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser({ ...data, token });
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (err) {
        console.error('Error verifying auth token:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (usernameOrEmail, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      setUser(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password, bio) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, bio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.setItem('token', data.token);
      setUser(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const setAuthUser = (updatedUserFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserFields } : null));
  };

  // Helper to resolve static asset paths
  const resolveAssetUrl = (urlPath) => {
    if (!urlPath) return '';
    if (urlPath.startsWith('/uploads/')) {
      return `http://localhost:5000${urlPath}`;
    }
    return urlPath;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        API_URL,
        login,
        signup,
        logout,
        setAuthUser,
        resolveAssetUrl,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
