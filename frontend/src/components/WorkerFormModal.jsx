import React, { useState, useEffect } from 'react';

export default function WorkerFormModal({ worker, onSave, onClose }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(worker);

  useEffect(() => {
    if (worker) {
      setName(worker.name || '');
      setRole(worker.role || '');
      setDailyWage(worker.daily_wage !== undefined ? String(worker.daily_wage) : '');
    } else {
      setName('');
      setRole('');
      setDailyWage('');
    }
  }, [worker]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Worker Name is required.');
      return;
    }

    if (!role.trim()) {
      setError('Role / Job Type is required.');
      return;
    }

    const wageNumber = Number(dailyWage);
    if (dailyWage === '' || isNaN(wageNumber) || wageNumber < 0) {
      setError('Daily Wage must be a valid non-negative number.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim(),
        daily_wage: wageNumber,
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
        <h3>{isEditing ? 'Edit Worker Profile' : 'Add New Worker'}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Worker Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Role / Job Type *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mason, Electrician, Labourer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Daily Wage (₹) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="e.g. 800"
              value={dailyWage}
              onChange={(e) => setDailyWage(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Worker' : 'Create Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
