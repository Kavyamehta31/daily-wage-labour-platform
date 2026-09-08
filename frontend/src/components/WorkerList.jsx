import React from 'react';

export default function WorkerList({
  workers,
  loading,
  error,
  onAddClick,
  onEdit,
  onDelete,
  onAssignSite,
}) {
  if (loading) {
    return <div className="state-message">Loading workers list...</div>;
  }

  if (error) {
    return <div className="state-message error">{error}</div>;
  }

  return (
    <div className="sites-section">
      <div className="section-header">
        <div>
          <h2>Registered Workers</h2>
          <p className="section-subtitle">Manage workforce, daily wage rates, and site assignments</p>
        </div>
        <button className="btn-primary" onClick={onAddClick}>
          + Add Worker
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="empty-state">
          <p>No workers registered yet.</p>
          <button className="btn-secondary" onClick={onAddClick}>
            Register your first worker
          </button>
        </div>
      ) : (
        <div className="sites-grid">
          {workers.map((worker) => {
            const assignedSites = Array.isArray(worker.assigned_sites)
              ? worker.assigned_sites
              : [];

            return (
              <div key={worker.id} className="site-card worker-card">
                <div className="site-card-header">
                  <h3>{worker.name}</h3>
                  <span className="role-badge">{worker.role}</span>
                </div>

                <div className="site-card-body">
                  <p className="wage-amount">
                    <strong>Daily Wage:</strong> ₹{Number(worker.daily_wage).toFixed(2)}
                  </p>

                  <div className="assigned-sites-section">
                    <strong>Assigned Sites:</strong>
                    {assignedSites.length === 0 ? (
                      <span className="no-sites-label"> Unassigned</span>
                    ) : (
                      <div className="site-badges-container">
                        {assignedSites.map((site) => (
                          <span key={site.id} className="site-badge">
                            📍 {site.site_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="site-card-actions">
                  <button className="btn-sm btn-secondary" onClick={() => onAssignSite(worker)}>
                    + Assign Site
                  </button>
                  <button className="btn-sm btn-secondary" onClick={() => onEdit(worker)}>
                    Edit
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => onDelete(worker.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
