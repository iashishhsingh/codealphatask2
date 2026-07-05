import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Login = ({ onNavigate }) => {
  const { login } = useContext(AuthContext);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;

    setLoading(true);
    setError('');

    try {
      await login(usernameOrEmail, password);
      onNavigate('feed');
    } catch (err) {
      setError(err.message || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">connect<span>next</span></h1>
          <p className="auth-subtitle">Welcome back! Please login to your account.</p>
        </div>

        {error && <div className="alert-banner alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="usernameOrEmail">Username or Email</label>
            <input
              type="text"
              id="usernameOrEmail"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your username or email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <span className="auth-link" onClick={() => onNavigate('signup')}>
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
