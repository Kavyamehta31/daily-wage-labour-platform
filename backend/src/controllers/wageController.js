import pool from '../config/db.js';

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

  // Validate dates if they are provided
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
      // weekly: date and previous 6 days inclusive
      const start = getPastDateStr(baseDateStr, 6);
      return { startDate: start, endDate: baseDateStr };
    }
  }

  // Default: current 7-day period (today and previous 6 days inclusive)
  const start = getPastDateStr(todayStr, 6);
  return { startDate: start, endDate: todayStr };
};

export const getWorkerWageSummary = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const workerIdStr = req.params.workerId;
    const workerId = parseInt(workerIdStr, 10);

    if (isNaN(workerId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid worker ID.'
      });
    }

    let parsedDates;
    try {
      parsedDates = parsePeriod(req.query);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }

    const { startDate, endDate } = parsedDates;

    // Verify worker exists and belongs to the authenticated contractor
    const workerCheck = await pool.query(
      'SELECT id, name, role, daily_wage FROM workers WHERE id = $1 AND contractor_id = $2',
      [workerId, contractorId]
    );

    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found or unauthorized.'
      });
    }

    const worker = workerCheck.rows[0];

    // Compute counts and earnings using database NUMERIC arithmetic
    const result = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_days,
         COALESCE(SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END), 0) as half_day_days,
         COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent_days,
         COUNT(a.id) as total_attendance_records,
         COALESCE(SUM(
           CASE 
             WHEN a.status = 'PRESENT' THEN w.daily_wage * 1.0 
             WHEN a.status = 'HALF_DAY' THEN w.daily_wage * 0.5 
             ELSE 0.00 
           END
         ), 0.00)::NUMERIC(10, 2) as total_earnings,
         (
           SELECT COALESCE(SUM(amount), 0.00)::NUMERIC(10, 2)
           FROM payments
           WHERE worker_id = $1
             AND payment_date >= $3
             AND payment_date <= $4
         ) as payments_made
       FROM attendance a
       JOIN workers w ON a.worker_id = w.id
       JOIN sites s ON a.site_id = s.id
       WHERE a.worker_id = $1 
         AND w.contractor_id = $2 
         AND s.contractor_id = $2
         AND a.date >= $3
         AND a.date <= $4`,
      [workerId, contractorId, startDate, endDate]
    );

    const row = result.rows[0];
    const totalEarnings = parseFloat(row.total_earnings);
    const paymentsMade = parseFloat(row.payments_made);
    // Safe subtraction preventing negative pending dues
    const pendingDues = Math.max(0, totalEarnings - paymentsMade);

    return res.status(200).json({
      status: 'success',
      summary: {
        worker_id: worker.id,
        name: worker.name,
        role: worker.role,
        daily_wage: parseFloat(worker.daily_wage),
        start_date: startDate,
        end_date: endDate,
        present_days: parseInt(row.present_days, 10),
        half_day_days: parseInt(row.half_day_days, 10),
        absent_days: parseInt(row.absent_days, 10),
        total_attendance_records: parseInt(row.total_attendance_records, 10),
        total_earnings: totalEarnings,
        payments_made: paymentsMade,
        pending_dues: parseFloat(pendingDues.toFixed(2))
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getContractorWagesSummary = async (req, res, next) => {
  try {
    const contractorId = req.user.id;

    let parsedDates;
    try {
      parsedDates = parsePeriod(req.query);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }

    const { startDate, endDate } = parsedDates;

    // Single query computing summary table for all contractor's workers
    const result = await pool.query(
      `SELECT 
         w.id,
         w.name,
         w.role,
         w.daily_wage::NUMERIC(10, 2) as daily_wage,
         COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_days,
         COALESCE(SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END), 0) as half_day_days,
         COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent_days,
         COUNT(a.id) as total_attendance_records,
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

    const summaries = result.rows.map(row => {
      const totalEarnings = parseFloat(row.total_earnings);
      const paymentsMade = parseFloat(row.payments_made);
      const pendingDues = Math.max(0, totalEarnings - paymentsMade);

      return {
        worker_id: row.id,
        name: row.name,
        role: row.role,
        daily_wage: parseFloat(row.daily_wage),
        start_date: startDate,
        end_date: endDate,
        present_days: parseInt(row.present_days, 10),
        half_day_days: parseInt(row.half_day_days, 10),
        absent_days: parseInt(row.absent_days, 10),
        total_attendance_records: parseInt(row.total_attendance_records, 10),
        total_earnings: totalEarnings,
        payments_made: paymentsMade,
        pending_dues: parseFloat(pendingDues.toFixed(2))
      };
    });

    return res.status(200).json({
      status: 'success',
      summaries
    });

  } catch (error) {
    next(error);
  }
};
