import React, { useState, useEffect } from 'react';
import { fetchWagesSummary, fetchWorkerWageDetail } from '../api/wages';
import { exportWagesCsv, triggerCsvDownload } from '../api/export';

export default function Wages({ user }) {
  const [period, setPeriod] = useState('weekly'); // daily, weekly, custom
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv').substring(0, 10)); // YYYY-MM-DD
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('sv').substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('sv').substring(0, 10));
  
  const [summaries, setSummaries] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (period === 'daily') {
        params.period = 'daily';
        params.date = selectedDate;
      } else if (period === 'weekly') {
        params.period = 'weekly';
        params.date = selectedDate;
      } else if (period === 'custom') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const csvData = await exportWagesCsv(params);
      const filename = `wages_report_${period}_${new Date().toLocaleDateString('sv').substring(0, 10)}.csv`;
      triggerCsvDownload(csvData, filename);
    } catch (err) {
      alert(err.message || 'Failed to export wages CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Load summaries whenever period or dates change
  useEffect(() => {
    loadSummaries();
  }, [period, selectedDate, startDate, endDate]);

  const loadSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (period === 'daily') {
        params.period = 'daily';
        params.date = selectedDate;
      } else if (period === 'weekly') {
        params.period = 'weekly';
        params.date = selectedDate;
      } else if (period === 'custom') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const data = await fetchWagesSummary(params);
      setSummaries(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch wage summaries.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (workerId) => {
    setSelectedWorkerId(workerId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setWorkerDetail(null);
    try {
      const params = {};
      if (period === 'daily') {
        params.period = 'daily';
        params.date = selectedDate;
      } else if (period === 'weekly') {
        params.period = 'weekly';
        params.date = selectedDate;
      } else if (period === 'custom') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const detail = await fetchWorkerWageDetail(workerId, params);
      setWorkerDetail(detail);
    } catch (err) {
      setDetailError(err.message || 'Failed to fetch worker details.');
    } finally {
      setDetailLoading(false);
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
        <h2>Wage Calculation</h2>
        <p>Review worker summaries, calculate earnings, and evaluate pending dues directly from PostgreSQL records.</p>
      </div>

      {/* Period Selection Controls */}
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-sm ${period === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('daily')}
            style={{ minWidth: '90px' }}
          >
            Daily
          </button>
          <button
            type="button"
            className={`btn-sm ${period === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('weekly')}
            style={{ minWidth: '90px' }}
          >
            Weekly
          </button>
          <button
            type="button"
            className={`btn-sm ${period === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('custom')}
            style={{ minWidth: '90px' }}
          >
            Custom Range
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {period !== 'custom' ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="wages-target-date">Target Date</label>
              <input
                id="wages-target-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.35rem 0.5rem' }}
              />
            </div>
          ) : (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="wages-start-date">Start Date</label>
                <input
                  id="wages-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="wages-end-date">End Date</label>
                <input
                  id="wages-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Summaries List Grid */}
      <div className="sites-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2>Contractor Worker Summaries</h2>
            <p className="section-subtitle">
              Displaying authoritative payroll values for the selected interval
            </p>
          </div>
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

        {loading ? (
          <div className="state-message">Calculating salaries from database...</div>
        ) : summaries.length === 0 ? (
          <div className="empty-state">
            <p>No workers are registered under your account.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table className="wages-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Worker Name</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Daily Wage</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Present</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Half Day</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Absent</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Total Earnings</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Paid</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Pending Dues</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((worker) => (
                  <tr key={worker.worker_id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.1s' }} className="wages-row">
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{worker.name}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}><span className="role-badge">{worker.role}</span></td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#334155' }}>{formatCurrency(worker.daily_wage)}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#15803d', textAlign: 'center', fontWeight: 600 }}>{worker.present_days}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#a16207', textAlign: 'center', fontWeight: 600 }}>{worker.half_day_days}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#b91c1c', textAlign: 'center', fontWeight: 600 }}>{worker.absent_days}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold' }}>{formatCurrency(worker.total_earnings)}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#475569' }}>{formatCurrency(worker.payments_made)}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: worker.pending_dues > 0 ? '#b91c1c' : '#15803d', fontWeight: 'bold' }}>
                      {formatCurrency(worker.pending_dues)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() => handleOpenDetail(worker.worker_id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Dialog / Modal */}
      {detailModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Worker Wage Details</h3>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="state-message" style={{ padding: '2rem 0' }}>Loading details from PostgreSQL...</div>
            ) : detailError ? (
              <div className="error-alert">{detailError}</div>
            ) : !workerDetail ? (
              <div className="state-message">No detailed data found.</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Name</label>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{workerDetail.name}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Role</label>
                    <span className="role-badge">{workerDetail.role}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Daily Wage</label>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{formatCurrency(workerDetail.daily_wage)}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Evaluation Interval</label>
                    <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                      {getLocalDateString(workerDetail.start_date)} – {getLocalDateString(workerDetail.end_date)}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
                    Attendance Breakdown
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#15803d' }}>{workerDetail.present_days}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>PRESENT</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a16207' }}>{workerDetail.half_day_days}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>HALF DAY</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b91c1c' }}>{workerDetail.absent_days}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ABSENT</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{workerDetail.total_attendance_records}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>TOTAL</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatCurrency(workerDetail.total_earnings)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>Total Earnings</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#475569' }}>
                      {formatCurrency(workerDetail.payments_made)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>Payments Made</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: workerDetail.pending_dues > 0 ? '#fee2e2' : '#dcfce7', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: workerDetail.pending_dues > 0 ? '#b91c1c' : '#15803d' }}>
                      {formatCurrency(workerDetail.pending_dues)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: workerDetail.pending_dues > 0 ? '#b91c1c' : '#15803d', marginTop: '0.25rem', fontWeight: 600 }}>
                      Pending Dues
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setDetailModalOpen(false)}
                    style={{ minWidth: '100px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
