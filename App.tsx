
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import { AuthState, User } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  // Load user from local storage if exists
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setAuth({
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      });
    }
  }, []);

  const login = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ user, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('last_username');
    setAuth({ user: null, isAuthenticated: false });
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setAuth(prev => ({ ...prev, user: updatedUser }));
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto relative overflow-x-hidden border-x border-slate-900 shadow-2xl">
        <Routes>
          <Route 
            path="/login" 
            element={auth.isAuthenticated ? <Navigate to="/" /> : <Login onLogin={login} />} 
          />
          <Route 
            path="/" 
            element={auth.isAuthenticated && auth.user ? <Home user={auth.user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={auth.isAuthenticated && auth.user ? <Profile user={auth.user} onLogout={logout} onUserUpdate={updateUser} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="*" 
            element={<Navigate to="/" />} 
          />
        </Routes>
        
        {auth.isAuthenticated && <Navigation />}
      </div>
    </Router>
  );
};

export default App;
