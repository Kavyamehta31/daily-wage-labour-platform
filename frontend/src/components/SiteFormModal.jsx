import React, { useState, useEffect } from 'react';

export default function SiteFormModal({ site, onSave, onClose }) {
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(site);

  useEffect(() => {
    if (site) {
      setSiteName(site.site_name || '');
      setLocation(site.location || '');
    } else {
      setSiteName('');
      setLocation('');
    }
  }, [site]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!siteName.trim()) {
      setError('Site Name is required.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        site_name: siteName.trim(),
        location: location.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>{isEditing ? 'Edit Construction Site' : 'Add New Construction Site'}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Site Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Downtown Commercial Plaza"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="e.g. Block B, Main Highway, Sector 4"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Site' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
