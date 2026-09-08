import React from 'react';

export default function SiteList({ sites, loading, error, onEdit, onDelete, onAddClick }) {
  if (loading) {
    return <div className="state-message">Loading construction sites...</div>;
  }

  if (error) {
    return <div className="state-message error">{error}</div>;
  }

  return (
    <div className="sites-section">
      <div className="section-header">
        <div>
          <h2>Construction Sites</h2>
          <p className="section-subtitle">Manage your active work sites and locations</p>
        </div>
        <button className="btn-primary" onClick={onAddClick}>
          + Add Site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="empty-state">
          <p>No construction sites registered yet.</p>
          <button className="btn-secondary" onClick={onAddClick}>
            Create your first site
          </button>
        </div>
      ) : (
        <div className="sites-grid">
          {sites.map((site) => (
            <div key={site.id} className="site-card">
              <div className="site-card-header">
                <h3>{site.site_name}</h3>
              </div>
              <div className="site-card-body">
                <p className="site-location">
                  <strong>Location:</strong> {site.location || 'Not specified'}
                </p>
                <p className="site-date">
                  <small>Created: {new Date(site.created_at).toLocaleDateString()}</small>
                </p>
              </div>
              <div className="site-card-actions">
                <button className="btn-sm btn-secondary" onClick={() => onEdit(site)}>
                  Edit
                </button>
                <button className="btn-sm btn-danger" onClick={() => onDelete(site.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
