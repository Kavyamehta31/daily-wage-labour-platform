import React, { useState, useEffect } from 'react';
import WorkerList from './WorkerList';
import WorkerFormModal from './WorkerFormModal';
import AssignSiteModal from './AssignSiteModal';
import {
  fetchWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  assignWorkerToSite,
} from '../api/workers';

export default function WorkerManagement({ user }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningWorker, setAssigningWorker] = useState(null);

  const loadWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkers();
      setWorkers(data);
    } catch (err) {
      setError(err.message || 'Failed to load workers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleAddClick = () => {
    setEditingWorker(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (worker) => {
    setEditingWorker(worker);
    setIsFormModalOpen(true);
  };

  const handleAssignSiteClick = (worker) => {
    setAssigningWorker(worker);
    setIsAssignModalOpen(true);
  };

  const handleDeleteClick = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker profile?')) {
      return;
    }
    try {
      await deleteWorker(workerId);
      loadWorkers();
    } catch (err) {
      alert(err.message || 'Failed to delete worker.');
    }
  };

  const handleSaveWorker = async (workerData) => {
    if (editingWorker) {
      await updateWorker(editingWorker.id, workerData);
    } else {
      await createWorker(workerData);
    }
    loadWorkers();
  };

  const handleAssignSiteSubmit = async (siteId) => {
    if (assigningWorker) {
      await assignWorkerToSite(assigningWorker.id, siteId);
      loadWorkers();
    }
  };

  return (
    <main className="dashboard-content">
      <div className="welcome-banner">
        <h2>Worker Management</h2>
        <p>Register workers, set daily wage rates, and assign workers to active construction sites.</p>
      </div>

      <WorkerList
        workers={workers}
        loading={loading}
        error={error}
        onAddClick={handleAddClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onAssignSite={handleAssignSiteClick}
      />

      {isFormModalOpen && (
        <WorkerFormModal
          worker={editingWorker}
          onSave={handleSaveWorker}
          onClose={() => setIsFormModalOpen(false)}
        />
      )}

      {isAssignModalOpen && (
        <AssignSiteModal
          worker={assigningWorker}
          onAssign={handleAssignSiteSubmit}
          onClose={() => setIsAssignModalOpen(false)}
        />
      )}
    </main>
  );
}
