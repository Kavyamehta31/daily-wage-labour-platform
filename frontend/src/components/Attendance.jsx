import React, { useState, useEffect } from 'react';
import { fetchSites } from '../api/sites';
import { fetchWorkers } from '../api/workers';
import { saveAttendance, fetchAttendanceRecords } from '../api/attendance';
import { exportAttendanceCsv, triggerCsvDownload } from '../api/export';

export default function Attendance({ user }) {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv').substring(0, 10)); // YYYY-MM-DD
  
  const [workers, setWorkers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [initialAttendanceData, setInitialAttendanceData] = useState({});
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (selectedSiteId) params.site_id = selectedSiteId;
      const csvData = await exportAttendanceCsv(params);
      const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
      triggerCsvDownload(csvData, `attendance_muster_roll_${todayStr}.csv`);
    } catch (err) {
      alert(err.message || 'Failed to export attendance CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Load initial lists
  useEffect(() => {
    const initData = async () => {
      try {
        const sitesList = await fetchSites();
        setSites(sitesList);
        if (sitesList.length > 0) {
          // Default to first site
          setSelectedSiteId(sitesList[0].id.toString());
        }
      } catch (err) {
        setError(err.message || 'Failed to initialization site data.');
      }
      loadHistory();
    };

    initData();
  }, []);

  // Reload history logs
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const records = await fetchAttendanceRecords();
      setHistory(records);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Reload site + worker list and corresponding attendance state
  useEffect(() => {
    if (!selectedSiteId || !selectedDate) {
      setWorkers([]);
      setAttendanceData({});
      setInitialAttendanceData({});
      return;
    }

    const loadSiteData = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        // 1. Fetch only workers assigned to this site
        const siteWorkers = await fetchWorkers({ site_id: selectedSiteId });
        setWorkers(siteWorkers);

        // 2. Fetch existing marked attendance for this site and date
        const existingAttendance = await fetchAttendanceRecords({
          site_id: selectedSiteId,
          date: selectedDate
        });

        // 3. Map existing attendance statuses
        const dataMap = {};
        existingAttendance.forEach(record => {
          dataMap[record.worker_id] = record.status;
        });

        setAttendanceData(dataMap);
        setInitialAttendanceData({ ...dataMap });
      } catch (err) {
        setError(err.message || 'Failed to load site attendance data.');
      } finally {
        setLoading(false);
      }
    };

    loadSiteData();
  }, [selectedSiteId, selectedDate]);

  const handleStatusChange = (workerId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [workerId]: status
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedSiteId || !selectedDate) return;

    setSaveLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = [];
      
      // Determine which worker statuses have changed from page load
      for (const worker of workers) {
        const currentStatus = attendanceData[worker.id];
        const initialStatus = initialAttendanceData[worker.id];

        if (currentStatus && currentStatus !== initialStatus) {
          updates.push({
            worker_id: worker.id,
            site_id: parseInt(selectedSiteId),
            date: selectedDate,
            status: currentStatus
          });
        }
      }

      if (updates.length === 0) {
        setSuccess('No changes to save.');
        setSaveLoading(false);
        return;
      }

      // Execute upserts in parallel
      await Promise.all(updates.map(update => saveAttendance(update)));

      setSuccess('Attendance saved successfully!');
      
      // Refresh current states
      const refreshedAttendance = await fetchAttendanceRecords({
        site_id: selectedSiteId,
        date: selectedDate
      });
      const dataMap = {};
      refreshedAttendance.forEach(record => {
        dataMap[record.worker_id] = record.status;
      });
      setAttendanceData(dataMap);
      setInitialAttendanceData({ ...dataMap });

      // Refresh history log panel
      loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to save attendance records.');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDate = (dateStr) => {
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
        <h2>Attendance Management</h2>
        <p>Mark daily attendance statuses (Present, Half Day, Absent) for workers assigned to your construction sites.</p>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label htmlFor="site-select">Select Construction Site</label>
          <select
            id="site-select"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            <option value="">-- Choose a Site --</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date-input">Select Date</label>
          <input
            id="date-input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {success && <div className="success-alert">{success}</div>}
      {error && <div className="error-alert">{error}</div>}

      <div className="attendance-layout">
        {/* Activemarking List */}
        <div className="sites-section">
          <div className="section-header">
            <div>
              <h2>Assigned Workers</h2>
              <p className="section-subtitle">
                Mark status for {selectedDate ? formatDate(selectedDate) : 'selected date'}
              </p>
            </div>
          </div>

          {!selectedSiteId ? (
            <div className="empty-state">
              <p>Please select a construction site to manage attendance.</p>
            </div>
          ) : loading ? (
            <div className="state-message">Loading assigned workers...</div>
          ) : workers.length === 0 ? (
            <div className="empty-state">
              <p>No workers are currently assigned to this site.</p>
              <p className="section-subtitle">Use the Workers tab to assign workers first.</p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="sites-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {workers.map(worker => {
                  const currentStatus = attendanceData[worker.id] || '';
                  return (
                    <div
                      key={worker.id}
                      className="site-card"
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ flex: '1', minWidth: '150px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{worker.name}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span className="role-badge">{worker.role}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Wage: ₹{Number(worker.daily_wage).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="attendance-status-group" style={{ minWidth: '240px' }}>
                        <button
                          type="button"
                          className={`status-option-btn variant-present ${currentStatus === 'PRESENT' ? 'selected' : ''}`}
                          onClick={() => handleStatusChange(worker.id, 'PRESENT')}
                        >
                          PRESENT
                        </button>
                        <button
                          type="button"
                          className={`status-option-btn variant-half_day ${currentStatus === 'HALF_DAY' ? 'selected' : ''}`}
                          onClick={() => handleStatusChange(worker.id, 'HALF_DAY')}
                        >
                          HALF DAY
                        </button>
                        <button
                          type="button"
                          className={`status-option-btn variant-absent ${currentStatus === 'ABSENT' ? 'selected' : ''}`}
                          onClick={() => handleStatusChange(worker.id, 'ABSENT')}
                        >
                          ABSENT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {saveLoading ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* History records sidebar */}
        <div className="history-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Recent Attendance Records</h2>
              <p className="section-subtitle" style={{ margin: 0 }}>Audited contractor attendance logs</p>
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

          {historyLoading && history.length === 0 ? (
            <div className="state-message">Loading history logs...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <p>No attendance logs found.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(record => (
                <div key={record.id} className="history-item">
                  <div className="history-item-details">
                    <span className="history-item-name">{record.worker_name}</span>
                    <div className="history-item-meta">
                      📍 {record.site_name} | 📅 {formatDate(record.date)}
                    </div>
                  </div>
                  <span className={`status-badge ${record.status.toLowerCase()}`}>
                    {record.status === 'HALF_DAY' ? 'HALF DAY' : record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
