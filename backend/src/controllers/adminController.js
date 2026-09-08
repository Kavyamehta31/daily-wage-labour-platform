import pool from '../config/db.js';

export const getStats = async (req, res, next) => {
  try {
    const contractorsQuery = pool.query(
      "SELECT COUNT(*)::int as count FROM users WHERE role = 'CONTRACTOR';"
    );
    const workersQuery = pool.query("SELECT COUNT(*)::int as count FROM workers;");
    const sitesQuery = pool.query("SELECT COUNT(*)::int as count FROM sites;");
    const attendanceQuery = pool.query("SELECT COUNT(*)::int as count FROM attendance;");
    const paymentsQuery = pool.query(
      "SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0.00)::numeric(10, 2) as amount FROM payments;"
    );

    // system-wide earnings (cases calculation)
    const earningsQuery = pool.query(
      `SELECT COALESCE(
         SUM(
           CASE a.status 
             WHEN 'PRESENT' THEN w.daily_wage * 1.0 
             WHEN 'HALF_DAY' THEN w.daily_wage * 0.5 
             ELSE 0.00 
           END
         ), 0.00
       )::numeric(10, 2) as total_earnings
       FROM attendance a 
       JOIN workers w ON a.worker_id = w.id;`
    );

    // system-wide pending dues: SUM(GREATEST(0, earnings - payments)) per worker
    const duesQuery = pool.query(
      `SELECT COALESCE(SUM(GREATEST(0, w.earnings - w.payments)), 0.00)::numeric(10, 2) as total_pending_dues
       FROM (
         SELECT 
           wk.id,
           COALESCE(
             (
               SELECT SUM(
                 CASE status 
                   WHEN 'PRESENT' THEN wk.daily_wage * 1.0 
                   WHEN 'HALF_DAY' THEN wk.daily_wage * 0.5 
                   ELSE 0.00 
                 END
               ) FROM attendance WHERE worker_id = wk.id
             ), 0.00
           ) as earnings,
           COALESCE(
             (SELECT SUM(amount) FROM payments WHERE worker_id = wk.id), 0.00
           ) as payments
         FROM workers wk
       ) w;`
    );

    const [
      contractorsRes,
      workersRes,
      sitesRes,
      attendanceRes,
      paymentsRes,
      earningsRes,
      duesRes
    ] = await Promise.all([
      contractorsQuery,
      workersQuery,
      sitesQuery,
      attendanceQuery,
      paymentsQuery,
      earningsQuery,
      duesQuery
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        totalContractors: contractorsRes.rows[0].count,
        totalWorkers: workersRes.rows[0].count,
        totalSites: sitesRes.rows[0].count,
        totalAttendance: attendanceRes.rows[0].count,
        totalPaymentsCount: paymentsRes.rows[0].count,
        totalPaymentsAmount: parseFloat(paymentsRes.rows[0].amount),
        totalEarnings: parseFloat(earningsRes.rows[0].total_earnings),
        totalPendingDues: parseFloat(duesRes.rows[0].total_pending_dues)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getContractors = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE role = 'CONTRACTOR' ORDER BY created_at DESC;"
    );
    return res.status(200).json({
      status: 'success',
      contractors: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getContractorById = async (req, res, next) => {
  try {
    const contractorId = parseInt(req.params.id, 10);
    if (isNaN(contractorId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid contractor ID.'
      });
    }

    const contractorCheck = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1 AND role = 'CONTRACTOR'",
      [contractorId]
    );

    if (contractorCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Contractor not found.'
      });
    }

    const contractor = contractorCheck.rows[0];

    const sitesCountRes = pool.query(
      "SELECT COUNT(*)::int as count FROM sites WHERE contractor_id = $1",
      [contractorId]
    );
    const workersCountRes = pool.query(
      "SELECT COUNT(*)::int as count FROM workers WHERE contractor_id = $1",
      [contractorId]
    );

    const earningsRes = pool.query(
      `SELECT COALESCE(
         SUM(
           CASE a.status 
             WHEN 'PRESENT' THEN w.daily_wage * 1.0 
             WHEN 'HALF_DAY' THEN w.daily_wage * 0.5 
             ELSE 0.00 
           END
         ), 0.00
       )::numeric(10, 2) as earnings 
       FROM attendance a 
       JOIN workers w ON a.worker_id = w.id 
       WHERE w.contractor_id = $1;`,
      [contractorId]
    );

    const paymentsRes = pool.query(
      `SELECT COALESCE(SUM(p.amount), 0.00)::numeric(10, 2) as payments 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE w.contractor_id = $1;`,
      [contractorId]
    );

    const duesRes = pool.query(
      `SELECT COALESCE(SUM(GREATEST(0, w.earnings - w.payments)), 0.00)::numeric(10, 2) as pending_dues
       FROM (
         SELECT 
           wk.id,
           COALESCE(
             (
               SELECT SUM(
                 CASE status 
                   WHEN 'PRESENT' THEN wk.daily_wage * 1.0 
                   WHEN 'HALF_DAY' THEN wk.daily_wage * 0.5 
                   ELSE 0.00 
                 END
               ) FROM attendance WHERE worker_id = wk.id
             ), 0.00
           ) as earnings,
           COALESCE(
             (SELECT SUM(amount) FROM payments WHERE worker_id = wk.id), 0.00
           ) as payments
         FROM workers wk
         WHERE wk.contractor_id = $1
       ) w;`,
      [contractorId]
    );

    const sitesListRes = pool.query(
      `SELECT s.id, s.site_name, s.location, s.created_at, COUNT(wsa.id)::int as assigned_workers_count
       FROM sites s
       LEFT JOIN worker_site_assignments wsa ON s.id = wsa.site_id
       WHERE s.contractor_id = $1
       GROUP BY s.id
       ORDER BY s.site_name ASC;`,
      [contractorId]
    );

    const workersListRes = pool.query(
      `SELECT 
         w.id,
         w.name,
         w.role,
         w.daily_wage::numeric(10, 2) as daily_wage,
         w.created_at,
         COALESCE(
           (
             SELECT JSON_AGG(JSON_BUILD_OBJECT('id', s.id, 'site_name', s.site_name))
             FROM worker_site_assignments wsa
             JOIN sites s ON wsa.site_id = s.id
             WHERE wsa.worker_id = w.id
           ), 
           '[]'::json
         ) as assigned_sites
       FROM workers w
       WHERE w.contractor_id = $1
       ORDER BY w.name ASC;`,
      [contractorId]
    );

    const [
      sCount,
      wCount,
      earn,
      pay,
      dues,
      sitesList,
      workersList
    ] = await Promise.all([
      sitesCountRes,
      workersCountRes,
      earningsRes,
      paymentsRes,
      duesRes,
      sitesListRes,
      workersListRes
    ]);

    return res.status(200).json({
      status: 'success',
      contractor: {
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        created_at: contractor.created_at,
        site_count: sCount.rows[0].count,
        worker_count: wCount.rows[0].count,
        earnings: parseFloat(earn.rows[0].earnings),
        payments: parseFloat(pay.rows[0].payments),
        pending_dues: parseFloat(dues.rows[0].pending_dues),
        sites: sitesList.rows,
        workers: workersList.rows
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (req, res, next) => {
  try {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid worker ID.'
      });
    }

    const workerQuery = await pool.query(
      `SELECT w.id, w.name, w.role, w.daily_wage::numeric(10, 2) as daily_wage, w.created_at,
              u.name as contractor_name, u.email as contractor_email
       FROM workers w
       JOIN users u ON w.contractor_id = u.id
       WHERE w.id = $1`,
      [workerId]
    );

    if (workerQuery.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.'
      });
    }

    const worker = workerQuery.rows[0];

    const sitesQuery = pool.query(
      `SELECT s.id, s.site_name, s.location
       FROM worker_site_assignments wsa
       JOIN sites s ON wsa.site_id = s.id
       WHERE wsa.worker_id = $1
       ORDER BY s.site_name ASC;`,
      [workerId]
    );

    const attendanceQuery = pool.query(
      `SELECT a.id, a.date::text as date, a.status, a.site_id, s.site_name
       FROM attendance a
       JOIN sites s ON a.site_id = s.id
       WHERE a.worker_id = $1
       ORDER BY a.date DESC;`,
      [workerId]
    );

    const paymentsQuery = pool.query(
      `SELECT id, amount::numeric(10, 2) as amount, payment_date::text as payment_date, created_at
       FROM payments
       WHERE worker_id = $1
       ORDER BY payment_date DESC;`,
      [workerId]
    );

    const attendanceSummaryQuery = pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)::int as present_days,
         COALESCE(SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END), 0)::int as half_day_days,
         COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END), 0)::int as absent_days,
         COUNT(id)::int as total_records,
         COALESCE(
           SUM(
             CASE status 
               WHEN 'PRESENT' THEN $2 * 1.0 
               WHEN 'HALF_DAY' THEN $2 * 0.5 
               ELSE 0.00 
             END
           ), 0.00
         )::numeric(10, 2) as total_earnings
       FROM attendance
       WHERE worker_id = $1;`,
      [workerId, worker.daily_wage]
    );

    const paymentsMadeQuery = pool.query(
      `SELECT COALESCE(SUM(amount), 0.00)::numeric(10, 2) as total_paid
       FROM payments
       WHERE worker_id = $1;`,
      [workerId]
    );

    const [
      sites,
      attendance,
      payments,
      attSummary,
      pmtPaid
    ] = await Promise.all([
      sitesQuery,
      attendanceQuery,
      paymentsQuery,
      attendanceSummaryQuery,
      paymentsMadeQuery
    ]);

    const totalEarnings = parseFloat(attSummary.rows[0].total_earnings);
    const paymentsMade = parseFloat(pmtPaid.rows[0].total_paid);
    const pendingDues = Math.max(0, totalEarnings - paymentsMade);

    return res.status(200).json({
      status: 'success',
      worker: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        daily_wage: parseFloat(worker.daily_wage),
        created_at: worker.created_at,
        contractor_name: worker.contractor_name,
        contractor_email: worker.contractor_email,
        assigned_sites: sites.rows,
        attendance_logs: attendance.rows,
        payment_logs: payments.rows,
        wage_summary: {
          present_days: attSummary.rows[0].present_days,
          half_day_days: attSummary.rows[0].half_day_days,
          absent_days: attSummary.rows[0].absent_days,
          total_attendance_records: attSummary.rows[0].total_records,
          total_earnings: totalEarnings,
          payments_made: paymentsMade,
          pending_dues: parseFloat(pendingDues.toFixed(2))
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getSiteById = async (req, res, next) => {
  try {
    const siteId = parseInt(req.params.id, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid site ID.'
      });
    }

    const siteQuery = await pool.query(
      `SELECT s.id, s.site_name, s.location, s.created_at, u.name as contractor_name
       FROM sites s
       JOIN users u ON s.contractor_id = u.id
       WHERE s.id = $1`,
      [siteId]
    );

    if (siteQuery.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.'
      });
    }

    const site = siteQuery.rows[0];

    const workersQuery = await pool.query(
      `SELECT w.id, w.name, w.role, w.daily_wage::numeric(10, 2) as daily_wage
       FROM worker_site_assignments wsa
       JOIN workers w ON wsa.worker_id = w.id
       WHERE wsa.site_id = $1
       ORDER BY w.name ASC;`,
      [siteId]
    );

    return res.status(200).json({
      status: 'success',
      site: {
        id: site.id,
        site_name: site.site_name,
        location: site.location,
        created_at: site.created_at,
        contractor_name: site.contractor_name,
        assigned_workers: workersQuery.rows
      }
    });

  } catch (error) {
    next(error);
  }
};
