import pool from '../config/db.js';

const ALLOWED_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const markAttendance = async (req, res, next) => {
  try {
    const { worker_id, site_id, date, status } = req.body;
    const contractorId = req.user.id;

    if (!worker_id) {
      return res.status(400).json({
        status: 'error',
        message: 'worker_id is required.',
      });
    }

    if (!site_id) {
      return res.status(400).json({
        status: 'error',
        message: 'site_id is required.',
      });
    }

    if (!date || typeof date !== 'string' || !DATE_REGEX.test(date) || isNaN(Date.parse(date))) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid date in YYYY-MM-DD format is required.',
      });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // 1. Verify worker ownership
    const workerCheck = await pool.query(
      'SELECT id FROM workers WHERE id = $1 AND contractor_id = $2',
      [worker_id, contractorId]
    );
    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    // 2. Verify site ownership
    const siteCheck = await pool.query(
      'SELECT id FROM sites WHERE id = $1 AND contractor_id = $2',
      [site_id, contractorId]
    );
    if (siteCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    // 3. Verify worker is assigned to the site
    const assignmentCheck = await pool.query(
      'SELECT id FROM worker_site_assignments WHERE worker_id = $1 AND site_id = $2',
      [worker_id, site_id]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Worker is not assigned to this construction site.',
      });
    }

    // 4. Upsert attendance record
    const result = await pool.query(
      `INSERT INTO attendance (worker_id, site_id, date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (worker_id, site_id, date)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING id, worker_id, site_id, date, status, created_at`,
      [worker_id, site_id, date, status]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Attendance recorded successfully.',
      attendance: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const { worker_id, site_id, date } = req.query;

    let queryText = `
      SELECT 
        a.id, a.worker_id, w.name AS worker_name, w.role AS worker_role,
        a.site_id, s.site_name, s.location AS site_location,
        a.date, a.status, a.created_at
      FROM attendance a
      JOIN workers w ON a.worker_id = w.id
      JOIN sites s ON a.site_id = s.id
      WHERE w.contractor_id = $1 AND s.contractor_id = $1
    `;
    const queryParams = [contractorId];
    let paramIndex = 2;

    if (worker_id) {
      queryText += ` AND a.worker_id = $${paramIndex++}`;
      queryParams.push(worker_id);
    }

    if (site_id) {
      queryText += ` AND a.site_id = $${paramIndex++}`;
      queryParams.push(site_id);
    }

    if (date) {
      queryText += ` AND a.date = $${paramIndex++}`;
      queryParams.push(date);
    }

    queryText += ` ORDER BY a.date DESC, a.created_at DESC`;

    const result = await pool.query(queryText, queryParams);

    return res.status(200).json({
      status: 'success',
      attendance: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerAttendanceHistory = async (req, res, next) => {
  try {
    const workerId = req.params.workerId;
    const contractorId = req.user.id;

    // Verify worker ownership
    const workerCheck = await pool.query(
      'SELECT id FROM workers WHERE id = $1 AND contractor_id = $2',
      [workerId, contractorId]
    );
    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    const result = await pool.query(
      `SELECT 
         a.id, a.worker_id, w.name AS worker_name,
         a.site_id, s.site_name, s.location AS site_location,
         a.date, a.status, a.created_at
       FROM attendance a
       JOIN workers w ON a.worker_id = w.id
       JOIN sites s ON a.site_id = s.id
       WHERE a.worker_id = $1 AND w.contractor_id = $2 AND s.contractor_id = $2
       ORDER BY a.date DESC`,
      [workerId, contractorId]
    );

    return res.status(200).json({
      status: 'success',
      history: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getSiteAttendance = async (req, res, next) => {
  try {
    const siteId = req.params.siteId;
    const contractorId = req.user.id;
    const { date } = req.query;

    // Verify site ownership
    const siteCheck = await pool.query(
      'SELECT id FROM sites WHERE id = $1 AND contractor_id = $2',
      [siteId, contractorId]
    );
    if (siteCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    let queryText = `
      SELECT 
        a.id, a.worker_id, w.name AS worker_name, w.role AS worker_role,
        a.site_id, s.site_name,
        a.date, a.status, a.created_at
      FROM attendance a
      JOIN workers w ON a.worker_id = w.id
      JOIN sites s ON a.site_id = s.id
      WHERE a.site_id = $1 AND s.contractor_id = $2 AND w.contractor_id = $2
    `;
    const queryParams = [siteId, contractorId];

    if (date) {
      queryText += ` AND a.date = $3`;
      queryParams.push(date);
    }

    queryText += ` ORDER BY a.date DESC, w.name ASC`;

    const result = await pool.query(queryText, queryParams);

    return res.status(200).json({
      status: 'success',
      attendance: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;
    const contractorId = req.user.id;

    const result = await pool.query(
      `SELECT 
         a.id, a.worker_id, w.name AS worker_name, w.role AS worker_role,
         a.site_id, s.site_name, s.location AS site_location,
         a.date, a.status, a.created_at
       FROM attendance a
       JOIN workers w ON a.worker_id = w.id
       JOIN sites s ON a.site_id = s.id
       WHERE a.id = $1 AND w.contractor_id = $2 AND s.contractor_id = $2`,
      [attendanceId, contractorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      attendance: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;
    const contractorId = req.user.id;

    // Verify ownership before delete
    const checkResult = await pool.query(
      `SELECT a.id 
       FROM attendance a
       JOIN workers w ON a.worker_id = w.id
       JOIN sites s ON a.site_id = s.id
       WHERE a.id = $1 AND w.contractor_id = $2 AND s.contractor_id = $2`,
      [attendanceId, contractorId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found.',
      });
    }

    await pool.query('DELETE FROM attendance WHERE id = $1', [attendanceId]);

    return res.status(200).json({
      status: 'success',
      message: 'Attendance record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
