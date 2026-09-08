import React, { useState, useEffect } from 'react';
import SiteList from './SiteList';
import SiteFormModal from './SiteFormModal';
import WorkerManagement from './WorkerManagement';
import Attendance from './Attendance';
import Wages from './Wages';
import Payments from './Payments';
import { fetchSites, createSite, updateSite, deleteSite } from '../api/sites';

export default function Dashboard({ user, activeTab }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  const loadSites = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSites();
      setSites(data);
    } catch (err) {
      setError(err.message || 'Failed to load sites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadSites();
    }
  }, [activeTab]);

  const handleAddClick = () => {
    setEditingSite(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (site) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this construction site?')) {
      return;
    }
    try {
      await deleteSite(siteId);
      loadSites();
    } catch (err) {
      alert(err.message || 'Failed to delete site.');
    }
  };

  const handleSaveSite = async (siteData) => {
    if (editingSite) {
      await updateSite(editingSite.id, siteData);
    } else {
      await createSite(siteData);
    }
    loadSites();
  };

  if (activeTab === 'workers') {
    return <WorkerManagement user={user} />;
  }

  if (activeTab === 'attendance') {
    return <Attendance user={user} />;
  }

  if (activeTab === 'wages') {
    return <Wages user={user} />;
  }

  if (activeTab === 'payments') {
    return <Payments user={user} />;
  }

  if (activeTab !== 'dashboard') {
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    return (
      <div className="module-placeholder">
        <h2>{capitalize(activeTab)} Module</h2>
        <p>This module will be implemented in subsequent project phases.</p>
      </div>
    );
  }

  return (
    <main className="dashboard-content">
      <div className="welcome-banner">
        <h2>Welcome, {user?.name || 'Contractor'}</h2>
        <p>Manage your daily wage labour operations, construction sites, and workforce assignments.</p>
      </div>

      <SiteList
        sites={sites}
        loading={loading}
        error={error}
        onAddClick={handleAddClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {isModalOpen && (
        <SiteFormModal
          site={editingSite}
          onSave={handleSaveSite}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </main>
  );
}
