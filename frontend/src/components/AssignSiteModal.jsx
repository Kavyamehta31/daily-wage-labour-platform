import React, { useState, useEffect } from 'react';
import { fetchSites } from '../api/sites';

export default function AssignSiteModal({ worker, onAssign, onClose }) {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSites = async () => {
      setLoading(true);
      setError(null);
      try {
        const contractorSites = await fetchSites();
        setSites(contractorSites);
        if (contractorSites.length > 0) {
          setSelectedSiteId(String(contractorSites[0].id));
        }
      } catch (err) {
        setError(err.message || 'Failed to load sites.');
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteId) {
      setError('Please select a construction site.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAssign(Number(selectedSiteId));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign worker to site.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Assign Construction Site</h3>
        <p className="modal-subtitle">
          Assign <strong>{worker?.name}</strong> to an active work site.
        </p>

        {loading ? (
          <div className="state-message">Loading construction sites...</div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <p>No construction sites registered yet. Please create a site under Dashboard first.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Construction Site *</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                required
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.site_name} {site.location ? `(${site.location})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Assigning...' : 'Assign to Site'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
