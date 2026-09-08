import React, { useState, useEffect } from 'react';
import { fetchWorkers } from '../api/workers';
import {
  fetchPayments,
  fetchWorkerPayments,
  recordPayment,
  updatePayment,
  deletePayment
} from '../api/payments';
import { exportPaymentsCsv, triggerCsvDownload } from '../api/export';

export default function Payments({ user }) {
  const [payments, setPayments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvData = await exportPaymentsCsv();
      const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
      triggerCsvDownload(csvData, `payments_report_${todayStr}.csv`);
    } catch (err) {
      alert(err.message || 'Failed to export payments CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Modals & Forms
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWorkerHistoryOpen, setIsWorkerHistoryOpen] = useState(false);

  // Form Fields: Record
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('sv').substring(0, 10)); // YYYY-MM-DD
  const [formError, setFormError] = useState(null);

  // Form Fields: Edit
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editFormError, setEditFormError] = useState(null);

  // Form Fields: Worker-specific history view
  const [historyWorker, setHistoryWorker] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsData, workersData] = await Promise.all([
        fetchPayments(),
        fetchWorkers()
      ]);
      setPayments(paymentsData);
      setWorkers(workersData);
    } catch (err) {
      setError(err.message || 'Failed to load payments or workers.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordModal = () => {
    setSelectedWorkerId('');
    setAmount('');
    setPaymentDate(new Date().toLocaleDateString('sv').substring(0, 10));
    setFormError(null);
    setSuccessMessage(null);
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedWorkerId) {
      setFormError('Please select a worker.');
      return;
    }

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setFormError('Amount must be positive and greater than 0.');
      return;
    }

    if (!paymentDate) {
      setFormError('Please pick a payment date.');
      return;
    }

    try {
      await recordPayment({
        worker_id: parseInt(selectedWorkerId, 10),
        amount: amtNum,
        payment_date: paymentDate
      });
      setSuccessMessage('Payment recorded successfully.');
      setIsRecordModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to record payment.');
    }
  };

  const handleOpenEditModal = (payment) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount.toString());
    setEditPaymentDate(payment.payment_date);
    setEditFormError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError(null);
    setSuccessMessage(null);

    const amtNum = parseFloat(editAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setEditFormError('Amount must be positive and greater than 0.');
      return;
    }

    if (!editPaymentDate) {
      setEditFormError('Please pick a payment date.');
      return;
    }

    try {
      await updatePayment(editingPayment.id, {
        amount: amtNum,
        payment_date: editPaymentDate
      });
      setSuccessMessage('Payment updated successfully.');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      setEditFormError(err.message || 'Failed to update payment.');
    }
  };

  const handleDeleteClick = async (paymentId) => {
    setSuccessMessage(null);
    if (!window.confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      await deletePayment(paymentId);
      setSuccessMessage('Payment successfully deleted.');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete payment.');
    }
  };

  const handleViewWorkerHistory = async (workerId, workerName) => {
    setHistoryWorker({ id: workerId, name: workerName });
    setIsWorkerHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryList([]);

    try {
      const data = await fetchWorkerPayments(workerId);
      setHistoryList(data);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load history list.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return '₹' + Number(val).toFixed(2);
  };

  const getLocalDateString = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="dashboard-content">
      <div className="welcome-banner">
        <h2>Payment Tracking</h2>
        <p>Record worker payments, track history, and review pending balances directly from backend records.</p>
      </div>

      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenRecordModal}
        >
          + Record Payment
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleExportCsv}
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          📥 {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {successMessage && <div className="success-alert" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a3f7bf', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontWeight: 500 }}>{successMessage}</div>}
      {error && <div className="error-alert">{error}</div>}

      {/* Contractor payments table */}
      <div className="sites-section">
        <div className="section-header">
          <div>
            <h2>Payments History</h2>
            <p className="section-subtitle">
              Displaying all payment records logged under your assigned workforce
            </p>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading payments ledger...</div>
        ) : payments.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No payments recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table className="wages-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Worker Name</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Payment Amount</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Payment Date</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="wages-row">
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{payment.worker_name}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}><span className="role-badge">{payment.worker_role}</span></td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold' }}>{formatCurrency(payment.amount)}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#475569' }}>{getLocalDateString(payment.payment_date)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-sm btn-secondary"
                          onClick={() => handleViewWorkerHistory(payment.worker_id, payment.worker_name)}
                        >
                          View History
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          onClick={() => handleOpenEditModal(payment)}
                          style={{ backgroundColor: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-danger"
                          onClick={() => handleDeleteClick(payment.id)}
                          style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Payment */}
      {isRecordModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Record Worker Payment</h3>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {formError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{formError}</div>}

            <form onSubmit={handleRecordSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="record-worker">Select Worker *</label>
                <select
                  id="record-worker"
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </option>
                  ))}
                  {workers.length === 0 && (
                    <option value="">No workers available</option>
                  )}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="record-amount">Amount (₹) *</label>
                <input
                  id="record-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="record-date">Payment Date *</label>
                <input
                  id="record-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Payment */}
      {isEditModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Edit Worker Payment</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {editFormError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{editFormError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Worker Selection (Locked)</label>
                <input
                  type="text"
                  disabled
                  value={editingPayment ? editingPayment.worker_name : ''}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="edit-amount">Amount (₹) *</label>
                <input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="edit-date">Payment Date *</label>
                <input
                  id="edit-date"
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Worker Payment History */}
      {isWorkerHistoryOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                Payment History: {historyWorker ? historyWorker.name : ''}
              </h3>
              <button
                type="button"
                onClick={() => setIsWorkerHistoryOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {historyLoading ? (
              <div className="state-message">Loading history logs...</div>
            ) : historyError ? (
              <div className="error-alert">{historyError}</div>
            ) : historyList.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No payments recorded yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <table className="wages-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Paid Amount</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Recorded On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((hist) => (
                      <tr key={hist.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="wages-row">
                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: '#0f172a' }}>{getLocalDateString(hist.payment_date)}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(hist.amount)}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: '#64748b' }}>{getLocalDateString(hist.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsWorkerHistoryOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
