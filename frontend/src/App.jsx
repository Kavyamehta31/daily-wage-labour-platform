import React, { useEffect, useState } from 'react';
import { getMe, removeToken } from './api/auth';
import AuthForm from './components/AuthForm';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadUserSession = async () => {
    setLoading(true);
    try {
      const currentUser = await getMe();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserSession();
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <h1 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.5rem' }}>
            Daily Wage Labour Platform
          </h1>
          <AuthForm onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
        onLogout={handleLogout}
      />
      {user?.role === 'ADMIN' ? (
        <AdminDashboard user={user} activeTab={activeTab} />
      ) : (
        <Dashboard user={user} activeTab={activeTab} />
      )}
    </div>
  );
}
