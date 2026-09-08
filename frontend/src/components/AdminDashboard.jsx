import React, { useState, useEffect } from 'react';
import {
  fetchAdminStats,
  fetchContractors,
  fetchContractorDetails,
  fetchSiteDetails,
  fetchWorkerDetails
} from '../api/admin';

export default function AdminDashboard({ user, activeTab }) {
  // Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // Contractors State
  const [contractors, setContractors] = useState([]);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [contractorsError, setContractorsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down State
  const [selectedContractorId, setSelectedContractorId] = useState(null);
  const [contractorDetails, setContractorDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Inspector Modals State
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [siteDetails, setSiteDetails] = useState(null);
  const [siteLoading, setSiteLoading] = useState(false);

  const [activeWorkerId, setActiveWorkerId] = useState(null);
  const [workerDetails, setWorkerDetails] = useState(null);
  const [workerLoading, setWorkerLoading] = useState(false);

  // Load Dashboard Global Stats
  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setStatsError(err.message || 'Failed to load system stats.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Contractors List
  const loadContractors = async () => {
    setContractorsLoading(true);
    setContractorsError(null);
    try {
      const list = await fetchContractors();
      setContractors(list);
    } catch (err) {
      setContractorsError(err.message || 'Failed to load contractors list.');
    } finally {
      setContractorsLoading(false);
    }
  };

  // Load Contractor Details Drill-Down
  const loadContractorDetails = async (id) => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const details = await fetchContractorDetails(id);
      setContractorDetails(details);
    } catch (err) {
      setDetailsError(err.message || 'Failed to load contractor details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Load Site Inspector details
  const loadSiteInspector = async (id) => {
    setActiveSiteId(id);
    setSiteLoading(true);
    try {
      const data = await fetchSiteDetails(id);
      setSiteDetails(data);
    } catch (err) {
      alert(err.message || 'Failed to load site audit.');
    } finally {
      setSiteLoading(false);
    }
  };

  // Load Worker Auditor details
  const loadWorkerAuditor = async (id) => {
    setActiveWorkerId(id);
    setWorkerLoading(true);
    try {
      const data = await fetchWorkerDetails(id);
      setWorkerDetails(data);
    } catch (err) {
      alert(err.message || 'Failed to load worker audit details.');
    } finally {
      setWorkerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'contractors') {
      loadContractors();
      setSelectedContractorId(null);
      setContractorDetails(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedContractorId) {
      loadContractorDetails(selectedContractorId);
    }
  }, [selectedContractorId]);

  // Helpers
  const formatRupees = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(num).replace('INR', '₹');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Switch tabs render logic
  if (activeTab === 'contractors') {
    // ---------------- CONTRACTORS MAIN VIEW OR DRILL DOWN ----------------
    return (
      <main className="dashboard-content">
        {selectedContractorId && contractorDetails ? (
          // Contractor Drill-Down Details Panel
          <div>
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedContractorId(null);
                  setContractorDetails(null);
                }}
              >
                &lsaquo; Back to Contractors
              </button>
              <h2>Contractor Audit Details</h2>
            </div>

            {detailsLoading ? (
              <p>Loading details...</p>
            ) : detailsError ? (
              <div className="error-alert">{detailsError}</div>
            ) : (
              <div>
                {/* Contractor profile details info card */}
                <div className="welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>{contractorDetails.name}</h3>
                    <p style={{ color: '#64748b' }}>Email: {contractorDetails.email}</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Contractor registered on: {formatDate(contractorDetails.created_at)}</p>
                  </div>
                  {/* Aggregated sums stats box for contractor */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Earnings</span>
                      <h4 style={{ color: '#0f172a', fontSize: '1.1rem' }}>{formatRupees(contractorDetails.earnings)}</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#16a34a', fontWeight: 600 }}>Paid</span>
                      <h4 style={{ color: '#16a34a', fontSize: '1.1rem' }}>{formatRupees(contractorDetails.payments)}</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#dc2626', fontWeight: 600 }}>Pending Dues</span>
                      <h4 style={{ color: '#dc2626', fontSize: '1.1rem' }}>{formatRupees(contractorDetails.pending_dues)}</h4>
                    </div>
                  </div>
                </div>

                {/* Substats summary count widgets */}
                <div className="sites-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div className="site-card" style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Construction Sites registered</span>
                    <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0' }}>{contractorDetails.site_count}</h3>
                  </div>
                  <div className="site-card" style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Workforce Strength (Workers)</span>
                    <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0' }}>{contractorDetails.worker_count}</h3>
                  </div>
                </div>

                {/* Sites Section list */}
                <div className="sites-section" style={{ marginBottom: '2rem' }}>
                  <div className="section-header">
                    <h2>Construction Sites Owned ({contractorDetails.sites.length})</h2>
                  </div>
                  {contractorDetails.sites.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No construction sites registered by this contractor.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '0.75rem 1rem' }}>Site Name</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Created Date</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Assigned Workers</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractorDetails.sites.map(site => (
                            <tr key={site.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{site.site_name}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{site.location || 'N/A'}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{formatDate(site.created_at)}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{site.assigned_workers_count} Workers</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  onClick={() => loadSiteInspector(site.id)}
                                >
                                  Inspect Site
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Workers Section list */}
                <div className="sites-section">
                  <div className="section-header">
                    <h2>Workforce Directory ({contractorDetails.workers.length})</h2>
                  </div>
                  {contractorDetails.workers.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No workers registered by this contractor.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '0.75rem 1rem' }}>Worker Name</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Job Role</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Daily Wage</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Assigned Sites</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractorDetails.workers.map(worker => (
                            <tr key={worker.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{worker.name}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{worker.role}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{formatRupees(worker.daily_wage)}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {worker.assigned_sites && worker.assigned_sites.length > 0 ? (
                                  worker.assigned_sites.map(s => (
                                    <span key={s.id} className="user-badge" style={{ marginRight: '0.25rem', background: '#475569', fontSize: '0.65rem' }}>
                                      {s.site_name}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not Assigned</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  onClick={() => loadWorkerAuditor(worker.id)}
                                >
                                  Audit Wages
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Contractors List Landing grid
          <div>
            <div className="welcome-banner">
              <h2>Registered Contractors Directory</h2>
              <p>Audit user profiles, view registered sites, and track overall outstanding dues across general contractor tenancies.</p>
            </div>

            {/* Filter Search element */}
            <div className="filter-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search contractors by name or email address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {contractorsLoading ? (
              <p>Loading contractors list...</p>
            ) : contractorsError ? (
              <div className="error-alert">{contractorsError}</div>
            ) : (
              <div className="sites-section">
                {contractors.length === 0 ? (
                  <p style={{ color: '#64748b' }}>No contractors registered in the system.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Contractor Name</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Registration Date</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractors
                          .filter(u =>
                            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.name}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{c.email}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{formatDate(c.created_at)}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  onClick={() => setSelectedContractorId(c.id)}
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
            )}
          </div>
        )}

        {/* Site inspector modal */}
        {activeSiteId && siteDetails && (
          <div className="modal-backdrop" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, padding: '1rem' }}>
            <div className="modal-content" style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '8px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Site Inspector: {siteDetails.site_name}</h3>
                <button type="button" className="btn-secondary btn-sm" onClick={() => { setActiveSiteId(null); setSiteDetails(null); }}>Close</button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 1rem', color: '#64748b' }}>
                  <strong>Location:</strong> {siteDetails.location || 'N/A'} <br />
                  <strong>Contractor Owner:</strong> {siteDetails.contractor_name}
                </p>
                <h4 style={{ marginBottom: '0.5rem', color: '#0f172a', fontSize: '1rem' }}>Assigned workforce ({siteDetails.assigned_workers.length})</h4>
                {siteDetails.assigned_workers.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>No workers physically assigned to this building site.</p>
                ) : (
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem' }}>Name</th>
                        <th style={{ padding: '0.5rem' }}>Role</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Daily Wage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteDetails.assigned_workers.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 500 }}>{w.name}</td>
                          <td style={{ padding: '0.5rem' }}>{w.role}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatRupees(w.daily_wage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Worker auditor inspector modal */}
        {activeWorkerId && workerDetails && (
          <div className="modal-backdrop" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, padding: '1rem' }}>
            <div className="modal-content" style={{ width: '100%', maxWidth: '800px', background: '#ffffff', borderRadius: '8px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Worker Auditor: {workerDetails.name}</h3>
                <button type="button" className="btn-secondary btn-sm" onClick={() => { setActiveWorkerId(null); setWorkerDetails(null); }}>Close</button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', pb: '1rem', mb: '1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, color: '#64748b' }}>
                      <strong>Job Role:</strong> {workerDetails.role}<br />
                      <strong>Daily Wage Rate:</strong> {formatRupees(workerDetails.daily_wage)}/day<br />
                      <strong>Contractor Employer:</strong> {workerDetails.contractor_name} ({workerDetails.contractor_email})
                    </p>
                  </div>
                  {/* Detailed aggregate wages counts */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Earnings</span>
                      <p style={{ margin: 0, fontWeight: 700 }}>{formatRupees(workerDetails.wage_summary.total_earnings)}</p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #cbd5e1', paddingLeft: '1rem' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#16a34a', fontWeight: 600 }}>Paid</span>
                      <p style={{ margin: 0, fontWeight: 700, color: '#16a34a' }}>{formatRupees(workerDetails.wage_summary.payments_made)}</p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #cbd5e1', paddingLeft: '1rem' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#dc2626', fontWeight: 600 }}>Pending</span>
                      <p style={{ margin: 0, fontWeight: 700, color: '#dc2626' }}>{formatRupees(workerDetails.wage_summary.pending_dues)}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Attendance Log Card list */}
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: '#0f172a' }}>
                      Attendance Audit ({workerDetails.wage_summary.total_attendance_records} logs)
                    </h4>
                    <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                      {workerDetails.attendance_logs.length === 0 ? (
                        <p style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No attendance recorded.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', stickyHeader: true }}>
                            <tr>
                              <th style={{ padding: '0.4rem 0.5rem' }}>Date</th>
                              <th style={{ padding: '0.4rem 0.5rem' }}>Site</th>
                              <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workerDetails.attendance_logs.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.5rem' }}>{formatDate(log.date)}</td>
                                <td style={{ padding: '0.4rem 0.5rem' }}>{log.site_name}</td>
                                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{log.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Payment History Log details */}
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: '#0f172a' }}>
                      Payment History
                    </h4>
                    <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                      {workerDetails.payment_logs.length === 0 ? (
                        <p style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No payments recorded.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                              <th style={{ padding: '0.4rem 0.5rem' }}>Date</th>
                              <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workerDetails.payment_logs.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.5rem' }}>{formatDate(p.payment_date)}</td>
                                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatRupees(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ---------------- ADMIN DASHBOARD VIEW (SYSTEM TOTALS) ----------------
  return (
    <main className="dashboard-content">
      <div className="welcome-banner">
        <h2>System Administration Console</h2>
        <p>Holistic system performance metrics, registered contractors, workforce attendance, and financial pending dues tracking.</p>
      </div>

      {statsLoading ? (
        <p>Loading administration stats...</p>
      ) : statsError ? (
        <div className="error-alert">{statsError}</div>
      ) : stats ? (
        <div>
          {/* Card grid representation of stats */}
          <div className="sites-grid" style={{ marginBottom: '2rem' }}>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Contractors</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0' }}>{stats.totalContractors}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Registered contractor user accounts</p>
            </div>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Workers</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0' }}>{stats.totalWorkers}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Labourers in workforce registry</p>
            </div>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Active Sites</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0' }}>{stats.totalSites}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Registered building assignments</p>
            </div>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Attendance Records</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0' }}>{stats.totalAttendance}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Marked present/absent/half-day days</p>
            </div>
          </div>

          <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
            <h2>Authoritative Platform Ledger</h2>
          </div>

          {/* Ledger/Financial Aggregates grid */}
          <div className="sites-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem', background: '#f8fafc' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>System Gross Earnings</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0 0.5rem', color: '#0f172a' }}>{formatRupees(stats.totalEarnings)}</h3>
              <div style={{ height: '4px', background: '#cbd5e1', borderRadius: '2px' }}></div>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.4rem', margin: 0 }}>Authoritative worker wages sum</p>
            </div>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>Total Payments Settled</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0 0.5rem', color: '#16a34a' }}>{formatRupees(stats.totalPaymentsAmount)}</h3>
              <div style={{ height: '4px', background: '#bbf7d0', borderRadius: '2px' }}>
                <div style={{ width: stats.totalEarnings > 0 ? `${Math.min(100, (stats.totalPaymentsAmount / stats.totalEarnings) * 100)}%` : '0%', height: '100%', background: '#16a34a', borderRadius: '2px' }}></div>
              </div>
              <p style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.4rem', margin: 0 }}>
                {stats.totalPaymentsCount} payment transactions settled
              </p>
            </div>
            <div className="site-card" style={{ padding: '1.25rem 1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
              <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>Total Outstanding Dues</span>
              <h3 style={{ fontSize: '2rem', margin: '0.25rem 0 0.5rem', color: '#dc2626' }}>{formatRupees(stats.totalPendingDues)}</h3>
              <div style={{ height: '4px', background: '#fecaca', borderRadius: '2px' }}>
                <div style={{ width: stats.totalEarnings > 0 ? `${Math.min(100, (stats.totalPendingDues / stats.totalEarnings) * 100)}%` : '0%', height: '100%', background: '#dc2626', borderRadius: '2px' }}></div>
              </div>
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.4rem', margin: 0 }}>Remaining net system balance dues</p>
            </div>
          </div>
        </div>
      ) : (
        <p>No statistics found.</p>
      )}
    </main>
  );
}
