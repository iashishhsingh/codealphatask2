import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';

function AppContent() {
  const { user, loading } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState({ name: 'feed', param: null });

  // Routing Handler
  const navigate = (viewName, paramValue = null) => {
    setCurrentView({ name: viewName, param: paramValue });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Redirect Logic when User Login/Logout status changes
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentView.name === 'login' || currentView.name === 'signup') {
          navigate('feed');
        }
      } else {
        if (currentView.name !== 'login' && currentView.name !== 'signup') {
          navigate('login');
        }
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F6F5F5',
        color: '#0C359E'
      }}>
        <div className="loading-spinner" style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e2e8f0',
          borderTop: '5px solid #0C359E',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Loading connectnext...</span>
      </div>
    );
  }

  // Render auth screens if no session is active
  if (!user) {
    if (currentView.name === 'signup') {
      return <Signup onNavigate={navigate} />;
    }
    return <Login onNavigate={navigate} />;
  }

  // Render core dashboard view
  return (
    <div className="app-container">
      <Navbar currentView={currentView} onNavigate={navigate} />
      
      {currentView.name === 'feed' && <Feed onNavigate={navigate} />}
      
      {currentView.name === 'profile' && (
        <Profile
          username={currentView.param || user.username}
          onNavigate={navigate}
          key={currentView.param} // key forces component recreation on user change
        />
      )}
    </div>
  );
}

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
