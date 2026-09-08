import pool from '../config/db.js';
import { generateCsv } from '../utils/csvHelper.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (str) => {
  return typeof str === 'string' && DATE_REGEX.test(str) && !isNaN(Date.parse(str));
};

const getPastDateStr = (dateStr, daysToSubtract) => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - daysToSubtract);
  return date.toLocaleDateString('sv').substring(0, 10);
};

const parsePeriod = (reqQuery) => {
  const { start_date, end_date, period, date } = reqQuery;
  const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
  const baseDateStr = date || todayStr;

  if (date && !isValidDate(date)) {
    throw new Error('Invalid date parameter format. Must be YYYY-MM-DD.');
  }

  if (start_date || end_date) {
    if (!start_date || !end_date) {
      throw new Error('Both start_date and end_date are required for a custom range query.');
    }
    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      throw new Error('Invalid start_date or end_date parameter format. Must be YYYY-MM-DD.');
    }
    if (start_date > end_date) {
      throw new Error('start_date cannot be after end_date.');
    }
    return { startDate: start_date, endDate: end_date };
  }

  if (period) {
    if (period !== 'daily' && period !== 'weekly') {
      throw new Error('Invalid period parameter. Must be "daily" or "weekly".');
    }
    if (period === 'daily') {
      return { startDate: baseDateStr, endDate: baseDateStr };
    } else {
      const start = getPastDateStr(baseDateStr, 6);
      return { startDate: start, endDate: baseDateStr };
    }
  }

  // Default: current 7-day period
  const start = getPastDateStr(todayStr, 6);
  return { startDate: start, endDate: todayStr };
};

/**
 * Export Attendance Muster Roll as CSV
 * Columns: Worker Name, Site Name, Date, Attendance Status, Daily Wage
 */
export const exportAttendanceCsv = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const { site_id, date, start_date, end_date, worker_id } = req.query;

    let queryText = `
      SELECT 
        w.name AS worker_name,
        s.site_name,
        a.date::text AS attendance_date,
        a.status AS attendance_status,
        w.daily_wage::NUMERIC(10, 2) AS daily_wage
      FROM attendance a
      JOIN workers w ON a.worker_id = w.id
      JOIN sites s ON a.site_id = s.id
      WHERE w.contractor_id = $1 AND s.contractor_id = $1
    `;
    const queryParams = [contractorId];
    let paramIndex = 2;

    if (site_id) {
      queryText += ` AND a.site_id = $${paramIndex++}`;
      queryParams.push(site_id);
    }

    if (worker_id) {
      queryText += ` AND a.worker_id = $${paramIndex++}`;
      queryParams.push(worker_id);
    }

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ status: 'error', message: 'Invalid date parameter. Must be YYYY-MM-DD.' });
      }
      queryText += ` AND a.date = $${paramIndex++}`;
      queryParams.push(date);
    } else if (start_date && end_date) {
      if (!isValidDate(start_date) || !isValidDate(end_date)) {
        return res.status(400).json({ status: 'error', message: 'Invalid start_date or end_date format.' });
      }
      queryText += ` AND a.date >= $${paramIndex++} AND a.date <= $${paramIndex++}`;
      queryParams.push(start_date, end_date);
    }

    queryText += ` ORDER BY a.date DESC, w.name ASC`;

    const result = await pool.query(queryText, queryParams);

    const headers = ['Worker Name', 'Site Name', 'Date', 'Attendance Status', 'Daily Wage'];
    const rows = result.rows.map((row) => [
      row.worker_name,
      row.site_name,
      row.attendance_date,
      row.attendance_status,
      Number(row.daily_wage).toFixed(2),
    ]);

    const csvContent = generateCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_muster_roll.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Wage Report as CSV
 * Columns: Worker Name, Period Start, Period End, Present Days, Half Days, Absent Days, Total Earnings, Paid, Pending Dues
 */
export const exportWagesCsv = async (req, res, next) => {
  try {
    const contractorId = req.user.id;

    let parsedDates;
    try {
      parsedDates = parsePeriod(req.query);
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    const { startDate, endDate } = parsedDates;

    const result = await pool.query(
      `SELECT 
         w.id,
         w.name,
         w.daily_wage::NUMERIC(10, 2) as daily_wage,
         COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_days,
         COALESCE(SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END), 0) as half_day_days,
         COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent_days,
         COALESCE(SUM(
           CASE 
             WHEN a.status = 'PRESENT' THEN w.daily_wage * 1.0 
             WHEN a.status = 'HALF_DAY' THEN w.daily_wage * 0.5 
             ELSE 0.00 
           END
         ), 0.00)::NUMERIC(10, 2) as total_earnings,
         (
           SELECT COALESCE(SUM(p.amount), 0.00)::NUMERIC(10, 2)
           FROM payments p
           WHERE p.worker_id = w.id
             AND p.payment_date >= $2
             AND p.payment_date <= $3
         ) as payments_made
       FROM workers w
       LEFT JOIN attendance a ON a.worker_id = w.id 
         AND a.date >= $2 
         AND a.date <= $3
         AND EXISTS (SELECT 1 FROM sites s WHERE s.id = a.site_id AND s.contractor_id = $1)
       WHERE w.contractor_id = $1
       GROUP BY w.id
       ORDER BY w.name ASC`,
      [contractorId, startDate, endDate]
    );

    const headers = [
      'Worker Name',
      'Period Start',
      'Period End',
      'Present Days',
      'Half Days',
      'Absent Days',
      'Total Earnings',
      'Paid',
      'Pending Dues',
    ];

    const rows = result.rows.map((row) => {
      const totalEarnings = parseFloat(row.total_earnings);
      const paymentsMade = parseFloat(row.payments_made);
      const pendingDues = Math.max(0, totalEarnings - paymentsMade);

      return [
        row.name,
        startDate,
        endDate,
        parseInt(row.present_days, 10),
        parseInt(row.half_day_days, 10),
        parseInt(row.absent_days, 10),
        totalEarnings.toFixed(2),
        paymentsMade.toFixed(2),
        pendingDues.toFixed(2),
      ];
    });

    const csvContent = generateCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="wage_report_${startDate}_to_${endDate}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Payment Report as CSV
 * Columns: Worker Name, Payment Date, Amount
 */
export const exportPaymentsCsv = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const { worker_id, start_date, end_date } = req.query;

    let queryText = `
      SELECT 
        w.name AS worker_name,
        p.payment_date::text AS payment_date,
        p.amount::NUMERIC(10, 2) AS amount
      FROM payments p
      JOIN workers w ON p.worker_id = w.id
      WHERE w.contractor_id = $1
    `;
    const queryParams = [contractorId];
    let paramIndex = 2;

    if (worker_id) {
      queryText += ` AND p.worker_id = $${paramIndex++}`;
      queryParams.push(worker_id);
    }

    if (start_date && end_date) {
      if (!isValidDate(start_date) || !isValidDate(end_date)) {
        return res.status(400).json({ status: 'error', message: 'Invalid start_date or end_date format.' });
      }
      queryText += ` AND p.payment_date >= $${paramIndex++} AND p.payment_date <= $${paramIndex++}`;
      queryParams.push(start_date, end_date);
    }

    queryText += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const result = await pool.query(queryText, queryParams);

    const headers = ['Worker Name', 'Payment Date', 'Amount'];
    const rows = result.rows.map((row) => [
      row.worker_name,
      row.payment_date,
      Number(row.amount).toFixed(2),
    ]);

    const csvContent = generateCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_report.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
