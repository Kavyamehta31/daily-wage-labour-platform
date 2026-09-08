import React from 'react';

export default function Navbar({ user, activeTab, onTabChange, onLogout }) {
  const navItems = user?.role === 'ADMIN'
    ? [
        { id: 'dashboard', label: 'Admin Dashboard' },
        { id: 'contractors', label: 'Contractors' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'workers', label: 'Workers' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'wages', label: 'Wages' },
        { id: 'payments', label: 'Payments' },
      ];

  return (
    <header className="app-navbar">
      <div className="navbar-brand">
        <h1>Daily Wage Labour Platform</h1>
        {user && <span className="user-badge">{user.role}</span>}
      </div>

      <nav className="navbar-menu">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="navbar-user">
        {user && <span className="user-name">{user.name}</span>}
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
